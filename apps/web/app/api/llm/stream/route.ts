import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import {
  getChatContext,
  formatContextForPromptWithOptions,
  isEmailTask,
  isCalendarTask,
} from "@/lib/chat-context";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-5.1";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const emailRequested = isEmailTask(prompt);
  const calendarRequested = isCalendarTask(prompt);

  const ctx = await getChatContext(userId, {
    includeEmailStub: emailRequested,
    includeCalendarStub: calendarRequested,
  });

  const fullPrompt = formatContextForPromptWithOptions(ctx, prompt, {
    emailRequested,
    calendarRequested,
  });

  const payload = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: [{ role: "user", content: fullPrompt }],
    stream: true,
  });

  const maxRetries = 3;
  const retryableStatuses = [429, 503];
  let res: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(process.env.NEXT_PUBLIC_APP_URL && { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL }),
        ...(process.env.NEXT_PUBLIC_APP_NAME && { "X-Title": process.env.NEXT_PUBLIC_APP_NAME }),
      },
      body: payload,
    });
    if (res.ok) break;
    if (attempt < maxRetries && retryableStatuses.includes(res.status)) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const errText = (await res?.text()) ?? "";
    console.error("OpenRouter stream API error:", res?.status, errText);
    let message = "OpenRouter request failed. Please try again.";
    try {
      const errJson = JSON.parse(errText) as { error?: { message?: string } };
      if (typeof errJson.error?.message === "string") message = errJson.error.message;
    } catch {
      // use default message
    }
    const isOverloaded = res?.status === 503 || (errText && /overloaded|UNAVAILABLE/i.test(errText));
    return NextResponse.json({ error: message }, { status: isOverloaded ? 503 : 502 });
  }

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const reader = res!.body!.getReader();
        const dec = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]" || data === "") continue;
              try {
                const json = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const text = json.choices?.[0]?.delta?.content ?? "";
                if (text) {
                  fullText += text;
                  controller.enqueue(encoder.encode(JSON.stringify({ delta: text }) + "\n"));
                }
              } catch {
                // skip malformed chunk
              }
            }
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ done: true, text: fullText }) + "\n"));
      } catch (e) {
        controller.enqueue(encoder.encode(JSON.stringify({ error: String(e) }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
