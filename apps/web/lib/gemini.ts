/**
 * Single LLM non-streaming call (via OpenRouter). Used for initial AI pass and agent-to-agent turns.
 */

import { callOpenRouter } from "./openrouter";

export async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  return callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);
}
