/**
 * Stub AuthPort: returns a fixed user for development.
 * Replace with Supabase auth (or other) later.
 */

import type { AuthPort } from "@overlap/core";

const STUB_USER_ID = "user_stub_1";

export function createStubAuth(userId?: string): AuthPort {
  return {
    async getCurrentUserId(): Promise<string | null> {
      return userId ?? STUB_USER_ID;
    },
  };
}
