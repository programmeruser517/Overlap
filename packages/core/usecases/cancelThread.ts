import type { Thread } from "../domain/models.js";
import type { DbPort, ClockPort, AuditPort } from "../ports/index.js";
import { NotFoundError } from "../domain/errors.js";
import { canCancel } from "../domain/policies.js";

export interface CancelThreadDeps {
  db: DbPort;
  clock: ClockPort;
  audit: AuditPort;
}

export async function cancelThread(
  threadId: string,
  userId: string,
  deps: CancelThreadDeps
): Promise<Thread> {
  const thread = await deps.db.getThread(threadId);
  if (!thread) throw new NotFoundError("Thread", threadId);
  if (thread.ownerId !== userId) throw new Error("Only thread owner can cancel");
  if (!canCancel(thread)) {
    throw new Error(`Thread ${threadId} cannot be cancelled (status: ${thread.status})`);
  }

  const now = deps.clock.now();
  const updated = await deps.db.updateThread(threadId, {
    status: "cancelled",
    updatedAt: now,
  });

  await deps.audit.log({
    threadId,
    action: "cancelled",
    userId,
    at: now,
  });

  return updated ?? thread;
}
