export interface AuditEntry {
  threadId: string;
  action: string;
  userId?: string;
  payload?: unknown;
  at: string;
}

export interface AuditPort {
  log(entry: AuditEntry): Promise<void>;
}
