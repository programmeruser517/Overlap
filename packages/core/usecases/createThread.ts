import type { Thread, PromptKind, Participant } from "../domain/models";
import type { DbPort, ClockPort } from "../ports/index";

export interface CreateThreadInput {
  ownerId: string;
  kind: PromptKind;
  prompt: string;
  participants: Participant[];
}

export interface CreateThreadDeps {
  db: DbPort;
  clock: ClockPort;
}

export async function createThread(
  input: CreateThreadInput,
  deps: CreateThreadDeps
): Promise<Thread> {
  const now = deps.clock.now();
  return deps.db.createThread({
    ownerId: input.ownerId,
    kind: input.kind,
    status: "draft",
    prompt: input.prompt,
    participants: input.participants,
    createdAt: now,
    updatedAt: now,
  });
}
