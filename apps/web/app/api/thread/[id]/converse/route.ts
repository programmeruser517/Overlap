import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { getChatContext, getOtherUserContext } from "@/lib/chat-context";
import { callOpenRouter } from "@/lib/openrouter";

const MAX_TURNS = 6;

export type ConverseTurn = { role: "our_agent" | "other_agent"; message: string; agentName: string };

function streamLine(encoder: TextEncoder, obj: object) {
  return encoder.encode(JSON.stringify(obj) + "\n");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 503 }
    );
  }
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: threadId } = await params;
    let body: {
      proposal?: { summary?: string; email?: { subject: string; bodySnippet: string }; schedule?: { start: string; end: string; title?: string } };
      participantsSummary?: Array<{ id: string; email: string; name: string }>;
      maxTurns?: number;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const proposal = body.proposal;
    const participantsSummary = Array.isArray(body.participantsSummary) ? body.participantsSummary : [];
    const otherParticipant = participantsSummary[0];
    if (!otherParticipant?.id || !proposal?.summary) {
      return NextResponse.json(
        { error: "proposal and participantsSummary (with at least one participant) required" },
        { status: 400 }
      );
    }

    const otherUserId = otherParticipant.id;
    const otherName = otherParticipant.name || otherParticipant.email || "Other";
    const maxTurns = Math.min(Math.max(1, body.maxTurns ?? MAX_TURNS), 10);

    const ourContext = await getChatContext(userId, { includeEmailStub: false, includeCalendarStub: false });
    const otherContext = await getOtherUserContext(otherUserId);

    const ourContextStr = `[Your agent's context]\nOnboarding: ${JSON.stringify(ourContext.onboardingData)}\nOrg: ${ourContext.organizationName ?? "(none)"}`;
    const otherContextStr = `[${otherName}'s agent context – from DB]\nOnboarding: ${JSON.stringify(otherContext.onboardingData)}\nOrg: ${otherContext.organizationName ?? "(none)"}`;

    const isEmail = Boolean(proposal.email);
    const actionSummary = isEmail
      ? `You just sent an email to ${otherName}. Subject: ${proposal.email!.subject}. Body snippet: ${(proposal.email!.bodySnippet || "").slice(0, 150)}…`
      : `You just scheduled a meeting with ${otherName}. ${proposal.summary}`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let lastMessage = "";

          const initialSystem = `You are the current user's agent. ${actionSummary}
Your context: ${ourContextStr}
Write ONE short message (2-4 sentences) to ${otherName}'s agent: introduce what you sent/scheduled and ask for their response. Be professional and concise. Output only the message, no labels.`;
          const ourFirst = await callOpenRouter([{ role: "system", content: initialSystem }, { role: "user", content: "Generate your first message to the other agent." }]);
          lastMessage = ourFirst;
          const turn1: ConverseTurn = { role: "our_agent", message: ourFirst, agentName: "Your agent" };
          controller.enqueue(streamLine(encoder, { type: "turn", turn: turn1 }));

          for (let t = 0; t < maxTurns - 1; t++) {
            const otherSystem = `You are ${otherName}'s agent. You have access only to their stored context (you cannot see live inbox/calendar).
${otherContextStr}
The other user's agent just said to you:
---
${lastMessage}
---
Respond as ${otherName}'s agent in first person (e.g. "I received your email..."). One short paragraph. Output only the message.`;
            const otherReply = await callOpenRouter([{ role: "system", content: otherSystem }, { role: "user", content: "Respond to the message above." }]);
            lastMessage = otherReply;
            const turnOther: ConverseTurn = { role: "other_agent", message: otherReply, agentName: `${otherName}'s agent` };
            controller.enqueue(streamLine(encoder, { type: "turn", turn: turnOther }));

            const ourSystem = `You are the current user's agent. ${actionSummary}
${ourContextStr}
${otherName}'s agent just said:
---
${lastMessage}
---
Reply briefly. One short paragraph. Output only the message.`;
            const ourReply = await callOpenRouter([{ role: "system", content: ourSystem }, { role: "user", content: "Reply to the other agent." }]);
            lastMessage = ourReply;
            const turnOur: ConverseTurn = { role: "our_agent", message: ourReply, agentName: "Your agent" };
            controller.enqueue(streamLine(encoder, { type: "turn", turn: turnOur }));
          }

          controller.enqueue(streamLine(encoder, { type: "done", finalResult: lastMessage, otherName }));
        } catch (e) {
          controller.enqueue(streamLine(encoder, { type: "error", error: e instanceof Error ? e.message : "Conversation failed" }));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[converse]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Conversation failed" },
      { status: 500 }
    );
  }
}
