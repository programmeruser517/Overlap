/**
 * Supabase AuthPort implementation.
 * For web TODAY, desktop LATER. Requires Supabase Auth (session).
 * Until wired, use createStubAuth() from memory/auth.ts.
 */

import type { AuthPort } from "@overlap/core";

export interface SupabaseAuthConfig {
  getSession: () => Promise<{ userId: string } | null>;
}

/**
 * Creates AuthPort backed by Supabase Auth. Pass a getSession that reads from Supabase.
 * Use memory/auth.ts for local dev until Supabase is configured.
 */
export function createSupabaseAuth(config: SupabaseAuthConfig): AuthPort {
  return {
    async getCurrentUserId(): Promise<string | null> {
      const session = await config.getSession();
      return session?.userId ?? null;
    },
  };
}
