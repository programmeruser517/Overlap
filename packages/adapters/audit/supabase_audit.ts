/**
 * Supabase AuditPort implementation.
 * Writes to audit_log table (see supabase/schema.sql).
 * Until wired, use createMemoryAudit() from audit/memory_audit.ts.
 */

import type { AuditPort, AuditEntry } from "@overlap/core";

export interface SupabaseAuditConfig {
  insert: (entry: AuditEntry) => Promise<void>;
}

/**
 * Creates AuditPort that inserts into Supabase audit_log.
 * Use memory_audit for local dev until Supabase is configured.
 */
export function createSupabaseAudit(config: SupabaseAuditConfig): AuditPort {
  return {
    async log(entry) {
      await config.insert(entry);
    },
  };
}
