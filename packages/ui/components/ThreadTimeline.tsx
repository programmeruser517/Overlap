import React from "react";

export interface ThreadTimelineItem {
  status: string;
  at?: string;
  label?: string;
}

export interface ThreadTimelineProps {
  items: ThreadTimelineItem[];
}

export function ThreadTimeline({ items }: ThreadTimelineProps): React.ReactElement {
  return (
    <section
      style={{
        padding: "1rem",
        background: "var(--surface, #141418)",
        borderRadius: 8,
        border: "1px solid var(--border, #26262c)",
      }}
    >
      <strong>Timeline</strong>
      <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", fontSize: "0.9rem", color: "var(--muted, #a1a1aa)" }}>
        {items.map((item, i) => (
          <li key={i}>
            {item.label ?? item.status}
            {item.at ? ` · ${new Date(item.at).toLocaleString()}` : ""}
          </li>
        ))}
        {items.length === 0 && <li>—</li>}
      </ul>
    </section>
  );
}
