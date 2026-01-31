/**
 * In-memory DbPort implementation for initial development.
 * Replace with Supabase (or other) adapter later.
 */

import type { Thread } from "@overlap/core";
import type { DbPort } from "@overlap/core";

const store = new Map<string, Thread>();

export function createMemoryDb(): DbPort {
  return {
    async createThread(thread): Promise<Thread> {
      const now = thread.createdAt ?? new Date().toISOString();
      const id = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const full: Thread = {
        ...thread,
        id,
        createdAt: now,
        updatedAt: now,
      };
      store.set(id, full);
      return full;
    },

    async getThread(id: string): Promise<Thread | null> {
      return store.get(id) ?? null;
    },

    async updateThread(id: string, patch: Partial<Thread>): Promise<Thread | null> {
      const existing = store.get(id);
      if (!existing) return null;
      const updated: Thread = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
      };
      store.set(id, updated);
      return updated;
    },

    async listThreadsForUser(userId: string): Promise<Thread[]> {
      return Array.from(store.values()).filter((t) => t.ownerId === userId);
    },
  };
}
