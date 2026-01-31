import React from "react";

export interface AuditEntry {
  action: string;
  threadId: string;
  at: string;
  userId?: string;
}

export interface AuditLogProps {
  entries: AuditEntry[];
  maxItems?: number;
}

export function AuditLog({
  entries,
  maxItems = 20,
}: AuditLogProps): React.ReactElement {
  const slice = entries.slice(-maxItems).reverse();
  return (
    <section
      style={{
        padding: "1rem",
        background: "var(--surface, #141418)",
        borderRadius: 8,
        border: "1px solid var(--border, #26262c)",
      }}
    >
      <strong>Audit log</strong>
      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.9rem", color: "var(--muted, #a1a1aa)" }}>
        {slice.map((e, i) => (
          <li key={`${e.threadId}-${e.at}-${i}`}>
            {e.action} · {e.threadId.slice(0, 8)}… · {new Date(e.at).toLocaleString()}
          </li>
        ))}
        {slice.length === 0 && <li>No entries</li>}
      </ul>
    </section>
  );
}
