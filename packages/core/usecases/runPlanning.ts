import type { Thread, Proposal } from "../domain/models";
import type { DbPort, ClockPort, AuditPort } from "../ports/index";
import type { Agent } from "../agents/agent";
import { NotFoundError } from "../domain/errors";
import { canRunPlanning } from "../domain/policies";

export interface RunPlanningDeps {
  db: DbPort;
  clock: ClockPort;
  audit: AuditPort;
  scheduleAgent: Agent;
  emailAgent: Agent;
}

export interface RunPlanningResult {
  thread: Thread;
  proposal: Proposal;
  reasoning?: string;
}

export async function runPlanning(
  threadId: string,
  deps: RunPlanningDeps
): Promise<RunPlanningResult> {
  const thread = await deps.db.getThread(threadId);
  if (!thread) throw new NotFoundError("Thread", threadId);
  if (!canRunPlanning(thread)) {
    throw new Error(`Thread ${threadId} cannot run planning (status: ${thread.status})`);
  }

  const now = deps.clock.now();
  await deps.db.updateThread(threadId, { status: "planning", updatedAt: now });

  const agent = thread.kind === "schedule" ? deps.scheduleAgent : deps.emailAgent;
  const participantIds = thread.participants.map((p: { userId: string }) => p.userId).filter((id: string) => id !== thread.ownerId);

  const { proposal, reasoning } = await agent.plan({
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

  const outThread = updated ?? thread;
  if (outThread) {
    await deps.audit.log({
      threadId,
      action: "planning_complete",
      userId: thread.ownerId,
      payload: { proposal: proposal.summary },
      at: deps.clock.now(),
    });
  }

  const threadWithProposal: Thread = { ...outThread, proposal, status: "proposed", updatedAt: deps.clock.now() };
  return { thread: threadWithProposal, proposal, reasoning };
}
