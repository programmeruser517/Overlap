import React from "react";

export interface ProposalPreviewProps {
  summary: string;
  schedule?: { start: string; end: string; title?: string };
  email?: { to: string[]; subject: string; bodySnippet: string };
}

export function ProposalPreview({
  summary,
  schedule,
  email,
}: ProposalPreviewProps): React.ReactElement {
  return (
    <section
      style={{
        padding: "1rem",
        background: "var(--surface, #141418)",
        borderRadius: 8,
        border: "1px solid var(--border, #26262c)",
      }}
    >
      <strong>Proposal</strong>
      <p style={{ marginTop: "0.5rem", color: "var(--muted, #a1a1aa)" }}>{summary}</p>
      {schedule && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {schedule.title ?? "Meeting"} · {new Date(schedule.start).toLocaleString()} – {new Date(schedule.end).toLocaleTimeString()}
        </p>
      )}
      {email && (
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
          To: {email.to.join(", ")} · {email.subject}
        </p>
      )}
    </section>
  );
}
