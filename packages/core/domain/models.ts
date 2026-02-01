/**
 * Domain models for Overlap: threads, proposals, and actions.
 * Preview-before-execute: user sees plan, then approves; only then do we send email or create event.
 */

export type PromptKind = "schedule" | "email";

export type ThreadStatus =
  | "draft"       // created, not yet run
  | "planning"    // agents negotiating
  | "proposed"    // proposal ready for user approval
  | "approved"    // user approved; executing
  | "done"        // action executed (email sent / event created)
  | "cancelled";

export interface Participant {
  userId: string;
  email?: string;
  displayName?: string;
}

/** View mode for the thread UI: linear (chatbot + Gemini) or graph (analyzer + OpenRouter). */
export type ThreadViewMode = "linear" | "graph";

export interface Thread {
  id: string;
  ownerId: string;
  kind: PromptKind;
  status: ThreadStatus;
  /** Raw user prompt, e.g. "Schedule 30min with alice and bob next week" or "Draft email to support re: refund" */
  prompt: string;
  /** For schedule: participant user ids. For email: recipients (can expand later). */
  participants: Participant[];
  /** Set when status is proposed or later; what the agents agreed to do. */
  proposal?: Proposal;
  /** When we actually executed (email sent / event created). */
  executedAt?: string;
  /** UI view this thread was created in; used so previous threads open in the same view. */
  viewMode?: ThreadViewMode;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  /** Human-readable summary for the user to approve. */
  summary: string;
  /** For schedule: chosen slot. For email: subject + snippet. */
  schedule?: ScheduleProposal;
  email?: EmailProposal;
}

export interface ScheduleProposal {
  start: string;   // ISO datetime
  end: string;
  title?: string;
  /** Which participants (by userId) are included. */
  participantIds: string[];
}

export interface EmailProposal {
  to: string[];
  subject: string;
  bodySnippet: string;  // first ~200 chars for preview
}

/** After approval, the concrete action we execute (send email or create calendar event). */
export type Action =
  | { type: "send_email"; to: string[]; subject: string; body: string }
  | { type: "create_event"; start: string; end: string; title: string; participantIds: string[] };
