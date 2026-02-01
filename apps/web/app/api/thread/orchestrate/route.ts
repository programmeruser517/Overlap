import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import { getOrgMembers, resolveMentionsToUserIds } from "@/lib/org-members";
import { isEmailTask, isCalendarTask } from "@/lib/chat-context";
import { threadApi } from "@/lib/deps";

/**
 * Orchestration: 1) Decide intent (schedule vs email) from prompt. 2) Resolve @mentions to
 * participant user ids via org members. 3) Create or update thread, then run planning (schedule
 * agent uses calendars for free slots; email agent drafts). 4) Return thread + proposal + reasoning.
 * The client auto-calls approve with the proposal and shows "Meeting scheduled." / "Email sent to X."
 */

/** Extract @mention labels from prompt text (e.g. "Schedule with @alice and @bob" -> ["alice", "bob"]). */
function extractMentionsFromPrompt(prompt: string): string[] {
  const matches = prompt.match(/@(\S+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1).trim()).filter(Boolean))];
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt?: string; threadId?: string; tokens?: Array<{ type: string; value?: string; label?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const threadId = typeof body.threadId === "string" ? body.threadId.trim() : undefined;
  const tokens = Array.isArray(body.tokens) ? body.tokens : [];

  const mentionLabels =
    tokens.length > 0
      ? tokens.filter((t) => t.type === "mention" && t.label).map((t) => t.label!)
      : extractMentionsFromPrompt(prompt);

  const kind = isEmailTask(prompt) ? "email" : isCalendarTask(prompt) ? "schedule" : "schedule";

  const members = await getOrgMembers(userId);
  const resolvedIds = resolveMentionsToUserIds(mentionLabels, members, userId);
  const participantUserIds = [...new Set([userId, ...resolvedIds])];
  const participants = participantUserIds.map((uid) => ({ userId: uid }));

  let thread: Awaited<ReturnType<typeof threadApi.get>>;

  if (threadId) {
    const existing = await threadApi.get(threadId);
    if (existing) {
      if (existing.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await threadApi.update(threadId, { prompt, participants, kind });
      thread = (await threadApi.get(threadId)) ?? existing;
    } else {
      // Thread id in URL but not in store (e.g. in-memory cleared); create a new thread
      thread = await threadApi.create(kind, prompt, participants);
    }
  } else {
    thread = await threadApi.create(kind, prompt, participants);
  }

  try {
    const result = await threadApi.run(thread.id);
    const updated = result?.thread;
    let proposal = result?.proposal ?? updated?.proposal ?? null;
    const reasoning = result?.reasoning ?? null;
    if (!updated && !result?.proposal) {
      return NextResponse.json(
        { error: "Planning did not return a thread" },
        { status: 500 }
      );
    }
    // Email agent stub may return empty to[]; enrich with participant emails so approve and stub have recipients
    if (kind === "email" && proposal?.email && (!proposal.email.to || proposal.email.to.length === 0)) {
      const recipientIds = participantUserIds.filter((uid) => uid !== userId);
      const toEmails = recipientIds.map((uid) => {
        const m = members.find((x) => x.id === uid);
        return (m?.email && m.email.trim()) ? m.email.trim() : `${uid}@recipient.overlap.local`;
      });
      if (toEmails.length > 0) {
        proposal = {
          ...proposal,
          email: { ...proposal.email, to: toEmails },
        };
      }
    }
    const outThread = updated ?? { ...thread, status: "proposed" as const, proposal: result?.proposal ?? null, updatedAt: new Date().toISOString() };
    return NextResponse.json({
      thread: outThread,
      proposal: proposal ?? outThread.proposal ?? null,
      reasoning,
      // So frontend can show recipient names without re-matching (e.g. "Assistant → Xiangbo Cai")
      participantsSummary: participantUserIds
        .filter((uid) => uid !== userId)
        .map((uid) => {
          const m = members.find((x) => x.id === uid);
          return m ? { id: m.id, email: m.email, name: m.name } : null;
        })
        .filter(Boolean),
    });
  } catch (e) {
    console.error("[orchestrate] runPlanning failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Planning failed" },
      { status: 500 }
    );
  }
}
