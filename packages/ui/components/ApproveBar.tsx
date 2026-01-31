import React from "react";

export interface ApproveBarProps {
  onApprove: () => void;
  onCancel?: () => void;
  approveLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export function ApproveBar({
  onApprove,
  onCancel,
  approveLabel = "Approve & execute",
  cancelLabel = "Cancel",
  loading = false,
}: ApproveBarProps): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onApprove}
        disabled={loading}
        style={{
          padding: "0.5rem 1rem",
          background: "#16a34a",
          border: "none",
          borderRadius: 6,
          color: "white",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "…" : approveLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: "transparent",
            border: "1px solid var(--border, #26262c)",
            borderRadius: 6,
            color: "var(--muted, #a1a1aa)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
}
