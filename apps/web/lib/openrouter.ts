/**
 * OpenRouter API client. Single non-streaming call.
 * Used by /api/llm and by /api/thread/[id]/converse (agent-to-agent).
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-5.1";

export type OpenRouterMessage = { role: "system" | "user" | "assistant"; content: string };

/** Model to use. If not provided, uses OPENROUTER_MODEL env or "openai/gpt-5.1". */
export const OPENROUTER_MODEL_GPT_5_1 = "openai/gpt-5.1";

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  modelOverride?: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const model = modelOverride ?? OPENROUTER_MODEL ?? OPENROUTER_MODEL_GPT_5_1;
  const body = JSON.stringify({
    model,
    messages,
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
        ...(process.env.NEXT_PUBLIC_APP_URL && {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
        }),
        ...(process.env.NEXT_PUBLIC_APP_NAME && {
          "X-Title": process.env.NEXT_PUBLIC_APP_NAME,
        }),
      },
      body,
    });
    if (res.ok) break;
    if (attempt < maxRetries && retryableStatuses.includes(res.status)) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    const errText = (await res?.text()) ?? "";
    throw new Error(
      res?.status === 503
        ? "Model overloaded. Try again."
        : `OpenRouter error: ${errText.slice(0, 200)}`
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
