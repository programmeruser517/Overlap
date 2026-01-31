import type { Thread } from "../domain/models.js";

export interface DbPort {
  createThread(thread: Omit<Thread, "id"> & { createdAt: string; updatedAt: string }): Promise<Thread>;
  getThread(id: string): Promise<Thread | null>;
  updateThread(id: string, patch: Partial<Thread>): Promise<Thread | null>;
  listThreadsForUser(userId: string): Promise<Thread[]>;
}
