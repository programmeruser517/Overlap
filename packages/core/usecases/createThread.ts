import type { Thread, PromptKind, Participant, ThreadViewMode } from "../domain/models";
import type { DbPort, ClockPort } from "../ports/index";

export interface CreateThreadInput {
  ownerId: string;
  kind: PromptKind;
  prompt: string;
  participants: Participant[];
  /** UI view mode when created (linear | graph); stored so thread opens in same view. */
  viewMode?: ThreadViewMode;
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
    viewMode: input.viewMode,
    createdAt: now,
    updatedAt: now,
  });
}
