"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Thread {
  id: string;
  kind: string;
  status: string;
  prompt: string;
  participants: { userId: string }[];
  proposal?: { summary: string };
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/thread/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setThread(d.thread ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function runPlanning() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/thread/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (data.thread) setThread(data.thread);
    } finally {
      setActionLoading(false);
    }
  }

  async function approve() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/thread/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.thread) setThread(data.thread);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p style={{ padding: "2rem" }}>Loading…</p>;
  if (!thread) return <p style={{ padding: "2rem" }}>Thread not found.</p>;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2rem 1rem" }}>
      <p style={{ marginBottom: "1rem" }}>
        <a href="/app" style={{ fontSize: "0.9rem" }}>← Back to app</a>
      </p>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Thread {thread.id.slice(0, 12)}…
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        {thread.kind} · {thread.status}
      </p>
      <section style={{ marginBottom: "1.5rem" }}>
        <p><strong>Prompt:</strong> {thread.prompt}</p>
        <p style={{ color: "var(--muted)" }}>
          Participants: {thread.participants?.map((p) => p.userId).join(", ") || "—"}
        </p>
      </section>
      {thread.proposal && (
        <section
          style={{
            padding: "1rem",
            background: "var(--surface)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            marginBottom: "1.5rem",
          }}
        >
          <strong>Proposal</strong>
          <p style={{ marginTop: "0.5rem", color: "var(--muted)" }}>{thread.proposal.summary}</p>
        </section>
      )}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {thread.status === "draft" && (
          <button
            onClick={runPlanning}
            disabled={actionLoading}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontWeight: 500,
              cursor: actionLoading ? "not-allowed" : "pointer",
            }}
          >
            {actionLoading ? "Running…" : "Run planning"}
          </button>
        )}
        {thread.status === "proposed" && (
          <button
            onClick={approve}
            disabled={actionLoading}
            style={{
              padding: "0.5rem 1rem",
              background: "#16a34a",
              border: "none",
              borderRadius: 6,
              color: "white",
              fontWeight: 500,
              cursor: actionLoading ? "not-allowed" : "pointer",
            }}
          >
            {actionLoading ? "Approving…" : "Approve & execute"}
          </button>
        )}
      </div>
    </main>
  );
}
