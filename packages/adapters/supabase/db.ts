/**
 * Supabase DbPort implementation.
 * For web TODAY, desktop LATER. Requires SUPABASE_URL + SUPABASE_SERVICE_KEY.
 * Until wired, use createMemoryDb() from memory/db.ts.
 */

import type { Thread } from "@overlap/core";
import type { DbPort } from "@overlap/core";

export interface SupabaseDbConfig {
  url: string;
  serviceKey: string;
}

/**
 * Creates DbPort backed by Supabase. Throws if config missing.
 * Use memory/db.ts for local dev until Supabase is configured.
 */
export function createSupabaseDb(_config: SupabaseDbConfig): DbPort {
  // TODO: init Supabase client, map threads table to Thread domain
  return {
    async createThread(thread): Promise<Thread> {
      throw new Error("Supabase db not implemented yet; use createMemoryDb()");
    },
    async getThread(_id: string): Promise<Thread | null> {
      throw new Error("Supabase db not implemented yet; use createMemoryDb()");
    },
    async updateThread(_id: string, _patch: Partial<Thread>): Promise<Thread | null> {
      throw new Error("Supabase db not implemented yet; use createMemoryDb()");
    },
    async listThreadsForUser(_userId: string): Promise<Thread[]> {
      throw new Error("Supabase db not implemented yet; use createMemoryDb()");
    },
  };
}
