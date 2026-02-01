"use client";

import { useEffect, useState } from "react";

type OrgReq = {
  id: string;
  user_id: string;
  organization_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export default function AdminPage() {
  const [rows, setRows] = useState<OrgReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/admin/check/organization-request", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setErr(data?.error ?? "Failed to load");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(data?.requests ?? []);
    setLastCheck(new Date().toLocaleTimeString());
    setLoading(false);
  }

  async function updateStatus(id: string, status: "accepted" | "rejected") {
    if (!id) {
      alert("Error: Invalid request ID");
      return;
    }
    
    setProcessingId(id);
    const res = await fetch(`/api/admin/check/organization-request/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error ?? "Failed to update");
      setProcessingId(null);
      return;
    }

    setProcessingId(null);
    load();
  }

  useEffect(() => {
    load();

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const pendingCount = rows.filter(r => r.status === "pending").length;
  const acceptedCount = rows.filter(r => r.status === "accepted").length;
  const rejectedCount = rows.filter(r => r.status === "rejected").length;

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px 0", color: "#0f172a" }}>
                Admin Approvals
              </h1>
              <p style={{ fontSize: 16, color: "#64748b", margin: 0 }}>
                Manage organization access requests
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button 
                onClick={() => load()}
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = "#1d4ed8")}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = "#2563eb")}
              >
                🔄 Refresh
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>Auto-refresh</span>
              </label>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            <div style={{ background: "white", padding: 16, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px 0", fontWeight: 600, textTransform: "uppercase" }}>Pending</p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#f59e0b" }}>{pendingCount}</p>
            </div>
            <div style={{ background: "white", padding: 16, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px 0", fontWeight: 600, textTransform: "uppercase" }}>Accepted</p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#10b981" }}>{acceptedCount}</p>
            </div>
            <div style={{ background: "white", padding: 16, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 8px 0", fontWeight: 600, textTransform: "uppercase" }}>Rejected</p>
              <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#ef4444" }}>{rejectedCount}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 10px 40px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          {/* Status Messages */}
          {loading && (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ display: "inline-block", fontSize: 24, animation: "spin 1s linear infinite" }}>⏳</div>
              <p style={{ fontSize: 16, color: "#64748b", margin: "16px 0 0 0" }}>Loading requests...</p>
            </div>
          )}

          {err && (
            <div style={{ padding: 24, margin: 16, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 12 }}>
              <p style={{ margin: 0, color: "#991b1b", fontWeight: 600 }}>⚠️ {err}</p>
            </div>
          )}

          {!loading && !err && rows.length === 0 && (
            <div style={{ padding: 60, textAlign: "center" }}>
              <p style={{ fontSize: 48, margin: "0 0 16px 0" }}>✨</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: "0 0 8px 0" }}>All caught up!</p>
              <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>No pending requests to review</p>
            </div>
          )}

          {!loading && !err && rows.length > 0 && (
            <div>
              {/* Table Header */}
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "2fr 1.5fr 1fr 1fr", 
                padding: "16px 24px", 
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Organization</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>User</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Action</div>
              </div>

              {/* Table Rows */}
              <div>
                {rows.map((r, idx) => (
                  <div 
                    key={r.id}
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "2fr 1.5fr 1fr 1fr", 
                      padding: "16px 24px", 
                      borderBottom: idx < rows.length - 1 ? "1px solid #e2e8f0" : "none",
                      alignItems: "center",
                      transition: "background 0.2s",
                      background: processingId === r.id ? "#f0f9ff" : "transparent"
                    }}
                    onMouseEnter={(e) => !processingId && (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = processingId === r.id ? "#f0f9ff" : "transparent")}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{r.organization_name}</p>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", wordBreak: "break-all" }}>{r.user_id}</div>
                    <div>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background: r.status === "pending" ? "#fef3c7" : r.status === "accepted" ? "#d1fae5" : "#fee2e2",
                        color: r.status === "pending" ? "#92400e" : r.status === "accepted" ? "#065f46" : "#991b1b"
                      }}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {r.status === "pending" ? (
                        <>
                          <button 
                            onClick={() => updateStatus(r.id, "accepted")}
                            disabled={processingId !== null}
                            style={{
                              padding: "6px 12px",
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              borderRadius: 6,
                              cursor: processingId !== null ? "not-allowed" : "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              opacity: processingId !== null ? 0.6 : 1,
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => processingId === null && (e.currentTarget.style.background = "#059669")}
                            onMouseLeave={(e) => processingId === null && (e.currentTarget.style.background = "#10b981")}
                          >
                            ✅ Approve
                          </button>
                          <button 
                            onClick={() => updateStatus(r.id, "rejected")}
                            disabled={processingId !== null}
                            style={{
                              padding: "6px 12px",
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: 6,
                              cursor: processingId !== null ? "not-allowed" : "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              opacity: processingId !== null ? 0.6 : 1,
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => processingId === null && (e.currentTarget.style.background = "#dc2626")}
                            onMouseLeave={(e) => processingId === null && (e.currentTarget.style.background = "#ef4444")}
                          >
                            ❌ Reject
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {lastCheck && !loading && (
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "16px 0 0 0", textAlign: "center" }}>
            Last checked: {lastCheck}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
