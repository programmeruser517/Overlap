/**
 * Agent interface: each user's agent understands availability and preferences.
 * Agents negotiate with each other (schedule) or draft (email).
 */

import type { Proposal, PromptKind, Participant } from "../domain/models.js";

export interface AgentContext {
  ownerId: string;
  participantIds: string[];
  prompt: string;
  kind: PromptKind;
}

export interface AgentResult {
  proposal: Proposal;
  /** Optional: transcript or reasoning for UI (later). */
  reasoning?: string;
}

export interface Agent {
  /** Plan: negotiate schedule or draft email; return a proposal for user approval. */
  plan(context: AgentContext): Promise<AgentResult>;
}
