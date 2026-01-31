export default function SettingsPage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <p style={{ marginBottom: "1rem" }}>
        <a href="/app" style={{ fontSize: "0.9rem" }}>← Back to app</a>
      </p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Settings
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Calendar and email connections, preferences — coming in v0.2.
      </p>
      <section
        style={{
          padding: "1rem",
          background: "var(--surface)",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          No integrations linked yet. Stub user is active.
        </p>
      </section>
    </main>
  );
}
