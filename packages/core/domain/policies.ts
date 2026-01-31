/**
 * Preview-before-execute: we never send email or create calendar event
 * without a user-approved proposal.
 */

import type { Thread, Action } from "./models.js";

export function canApprove(thread: Thread): boolean {
  return thread.status === "proposed" && thread.proposal != null;
}

export function canCancel(thread: Thread): boolean {
  return ["draft", "planning", "proposed"].includes(thread.status);
}

export function canRunPlanning(thread: Thread): boolean {
  return thread.status === "draft";
}

/** Build the concrete action from an approved thread (for execution). */
export function actionFromThread(thread: Thread): Action | null {
  if (thread.status !== "approved" || !thread.proposal) return null;
  const p = thread.proposal;
  if (p.schedule) {
    return {
      type: "create_event",
      start: p.schedule.start,
      end: p.schedule.end,
      title: p.schedule.title ?? "Meeting",
      participantIds: p.schedule.participantIds,
    };
  }
  if (p.email) {
    return {
      type: "send_email",
      to: p.email.to,
      subject: p.email.subject,
      body: p.email.bodySnippet, // in real impl, store full body
    };
  }
  return null;
}
