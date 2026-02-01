import { NextResponse } from "next/server";
import { getUserId } from "@/lib/supabase/server";
import {
  getChatContext,
  formatContextForPromptWithOptions,
  isEmailTask,
  isCalendarTask,
} from "@/lib/chat-context";

const GEMINI_MODEL = "gemma-3-12b-it";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
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
    contents: [{ parts: [{ text: fullPrompt }] }],
  });
  const maxRetries = 3;
  const retryableStatuses = [429, 503];

  let res: Response | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const errText = await res?.text() ?? "";
    console.error("Gemini API error:", res?.status, errText);
    const isOverloaded = res?.status === 503 || (errText && /overloaded|UNAVAILABLE/i.test(errText));
    const message = isOverloaded
      ? "The model is overloaded. Please try again in a moment."
      : "Gemini request failed. Please try again.";
    return NextResponse.json(
      { error: message, details: errText.slice(0, 300) },
      { status: 502 }
    );
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return NextResponse.json({ text });
}
