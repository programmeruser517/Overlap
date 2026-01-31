export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Overlap
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
        AI-to-AI coordination: schedule meetings or draft emails without back-and-forth.
      </p>
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Two flows (v0.1)
        </h2>
        <ul style={{ color: "var(--muted)", paddingLeft: "1.25rem" }}>
          <li><strong style={{ color: "var(--text)" }}>Schedule</strong> — Your agent and others’ agents compare calendars and propose a time. You approve; we create the event.</li>
          <li><strong style={{ color: "var(--text)" }}>Email</strong> — Your agent drafts from your prompt (and related threads). You approve; we send.</li>
        </ul>
      </section>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
        <a href="/app">Open app</a> to create a thread and run planning (stub: no real calendar/email yet).
      </p>
    </main>
  );
}
