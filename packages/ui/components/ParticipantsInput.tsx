import React from "react";

export interface ParticipantsInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function ParticipantsInput({
  value,
  onChange,
  placeholder = "alice@example.com, bob",
  disabled = false,
  "data-testid": testId,
}: ParticipantsInputProps): React.ReactElement {
  return (
    <input
      data-testid={testId}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "0.5rem 0.75rem",
        background: "var(--surface, #141418)",
        border: "1px solid var(--border, #26262c)",
        borderRadius: 6,
        color: "var(--text, #f4f4f5)",
      }}
    />
  );
}
