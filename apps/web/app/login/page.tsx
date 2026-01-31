"use client";

import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    // Stub: no real auth yet; redirect to app
    window.location.href = "/app";
  }

  return (
    <main style={{ maxWidth: 400, margin: "4rem auto", padding: "2rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
        Sign in
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Auth is stubbed. Click to continue to the app.
      </p>
      <button
        onClick={handleLogin}
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
        {loading ? "…" : "Continue"}
      </button>
    </main>
  );
}
