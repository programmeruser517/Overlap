import type { Thread } from "../domain/models.js";
import type { DbPort, ClockPort, MailPort, CalendarPort, AuditPort } from "../ports/index.js";
import { NotFoundError } from "../domain/errors.js";
import { canApprove, actionFromThread } from "../domain/policies.js";

export interface ApproveActionDeps {
  db: DbPort;
  clock: ClockPort;
  mail: MailPort;
  calendar: CalendarPort;
  audit: AuditPort;
}

export async function approveAction(
  threadId: string,
  userId: string,
  deps: ApproveActionDeps
): Promise<Thread> {
  const thread = await deps.db.getThread(threadId);
  if (!thread) throw new NotFoundError("Thread", threadId);
  if (thread.ownerId !== userId) throw new Error("Only thread owner can approve");
  if (!canApprove(thread)) {
    throw new Error(`Thread ${threadId} cannot be approved (status: ${thread.status})`);
  }

  const action = actionFromThread(thread);
  if (!action) throw new Error("No action derived from proposal");

  const now = deps.clock.now();
  await deps.db.updateThread(threadId, { status: "approved", updatedAt: now });

  if (action.type === "send_email") {
    await deps.mail.send({
      to: action.to,
      subject: action.subject,
      body: action.body,
    });
  } else if (action.type === "create_event") {
    await deps.calendar.createEvent(thread.ownerId, {
      start: action.start,
      end: action.end,
      title: action.title,
      participantIds: action.participantIds,
    });
  }

  const updated = await deps.db.updateThread(threadId, {
    status: "done",
    executedAt: now,
    updatedAt: now,
  });

  await deps.audit.log({
    threadId,
    action: "executed",
    userId,
    payload: { action: action.type },
    at: now,
  });

  return updated ?? thread;
}
