/**
 * In-memory AuditPort for development.
 */

import type { AuditPort, AuditEntry } from "@overlap/core";

const log: AuditEntry[] = [];

export function createMemoryAudit(): AuditPort {
  return {
    async log(entry) {
      log.push(entry);
      console.log("[audit]", entry.action, entry.threadId, entry.at);
    },
  };
}
