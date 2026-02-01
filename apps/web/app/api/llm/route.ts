import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import {
  getChatContext,
  formatContextForPromptWithOptions,
  isEmailTask,
  isCalendarTask,
} from "@/lib/chat-context";
import { callOpenRouter, OPENROUTER_MODEL_GPT_5_1 } from "@/lib/openrouter";

export async function POST(request: Request) {
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

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
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

  try {
    const text = await callOpenRouter(
      [{ role: "user", content: fullPrompt }],
      OPENROUTER_MODEL_GPT_5_1
    );
    return NextResponse.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenRouter request failed. Please try again.";
    const isOverloaded = /overloaded|503/i.test(message);
    return NextResponse.json(
      { error: message, details: message.slice(0, 300) },
      { status: isOverloaded ? 503 : 502 }
    );
  }
}
