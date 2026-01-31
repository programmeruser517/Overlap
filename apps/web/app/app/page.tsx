"use client";

import { useState } from "react";

type Kind = "schedule" | "email";

export default function AppPage() {
  const [kind, setKind] = useState<Kind>("schedule");
  const [prompt, setPrompt] = useState("");
  const [participants, setParticipants] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);

  async function handleCreate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt: prompt.trim(),
          participants: participants
            .split(/[\s,]+/)
            .filter(Boolean)
            .map((id) => ({ userId: id.trim() })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Failed to create thread" });
        return;
      }
      setResult({ id: data.thread?.id });
      if (data.thread?.id) {
        window.location.href = `/app/thread/${data.thread.id}`;
      }
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
        New thread
      </h1>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          What do you want to do?
        </label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
          }}
        >
          <option value="schedule">Schedule a meeting</option>
          <option value="email">Draft / send email</option>
        </select>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            kind === "schedule"
              ? "e.g. 30min with alice and bob next week"
              : "e.g. Email support re: refund"
          }
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            resize: "vertical",
          }}
        />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          Participants (IDs or emails, comma-separated)
        </label>
        <input
          type="text"
          value={participants}
          onChange={(e) => setParticipants(e.target.value)}
          placeholder="alice@example.com, bob"
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
          }}
        />
      </div>
      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          background: "var(--accent)",
          border: "none",
          borderRadius: 6,
          color: "white",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Creating…" : "Create thread"}
      </button>
      {result?.error && (
        <p style={{ marginTop: "1rem", color: "#f87171" }}>{result.error}</p>
      )}
    </main>
  );
}
