import type { Thread } from "../domain/models.js";
import type { DbPort, ClockPort, AuditPort } from "../ports/index.js";
import type { Agent } from "../agents/agent.js";
import { NotFoundError } from "../domain/errors.js";
import { canRunPlanning } from "../domain/policies.js";

export interface RunPlanningDeps {
  db: DbPort;
  clock: ClockPort;
  audit: AuditPort;
  scheduleAgent: Agent;
  emailAgent: Agent;
}

export async function runPlanning(
  threadId: string,
  deps: RunPlanningDeps
): Promise<Thread> {
  const thread = await deps.db.getThread(threadId);
  if (!thread) throw new NotFoundError("Thread", threadId);
  if (!canRunPlanning(thread)) {
    throw new Error(`Thread ${threadId} cannot run planning (status: ${thread.status})`);
  }

  const now = deps.clock.now();
  await deps.db.updateThread(threadId, { status: "planning", updatedAt: now });

  const agent = thread.kind === "schedule" ? deps.scheduleAgent : deps.emailAgent;
  const participantIds = thread.participants.map((p) => p.userId).filter((id) => id !== thread.ownerId);

  const { proposal } = await agent.plan({
    ownerId: thread.ownerId,
    participantIds,
    prompt: thread.prompt,
    kind: thread.kind,
  });

  const updated = await deps.db.updateThread(threadId, {
    status: "proposed",
    proposal,
    updatedAt: deps.clock.now(),
  });

  if (updated) {
    await deps.audit.log({
      threadId,
      action: "planning_complete",
      userId: thread.ownerId,
      payload: { proposal: proposal.summary },
      at: deps.clock.now(),
    });
  }

  return updated ?? thread;
}
