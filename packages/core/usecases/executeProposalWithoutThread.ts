/**
 * Execute a proposal when the thread is not in the current worker's store
 * (e.g. in-memory multi-worker: orchestrate ran on worker A, approve on worker B).
 * Derives action from proposal, runs mail/calendar, logs audit, returns synthetic thread.
 */

import type { Thread, Proposal } from "../domain/models";
import type { ClockPort, MailPort, CalendarPort, AuditPort } from "../ports/index";
import { actionFromThread } from "../domain/policies";

export interface ExecuteProposalDeps {
  clock: ClockPort;
  mail: MailPort;
  calendar: CalendarPort;
  audit: AuditPort;
}

export async function executeProposalWithoutThread(
  threadId: string,
  userId: string,
  proposal: Proposal,
  deps: ExecuteProposalDeps
): Promise<Thread> {
  const now = deps.clock.now();
  const threadLike: Thread = {
    id: threadId,
    ownerId: userId,
    kind: proposal.email ? "email" : "schedule",
    status: "proposed",
    prompt: "",
    participants: [],
    proposal,
    createdAt: now,
    updatedAt: now,
  };
  const action = actionFromThread(threadLike);
  if (!action) throw new Error("No action derived from proposal");

  if (action.type === "send_email") {
    await deps.mail.send({
      to: action.to,
      subject: action.subject,
      body: action.body,
    });
  } else if (action.type === "create_event") {
    await deps.calendar.createEvent(userId, {
      start: action.start,
      end: action.end,
      title: action.title,
      participantIds: action.participantIds,
    });
  }

  await deps.audit.log({
    threadId,
    action: "executed",
    userId,
    payload: { action: action.type },
    at: now,
  });

  const synthetic: Thread = {
    id: threadId,
    ownerId: userId,
    kind: threadLike.kind,
    status: "done",
    prompt: "",
    participants: [],
    proposal,
    executedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  return synthetic;
}
