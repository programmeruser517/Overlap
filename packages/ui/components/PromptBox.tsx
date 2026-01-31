import React from "react";

export interface PromptBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function PromptBox({
  value,
  onChange,
  placeholder = "e.g. Schedule 30min with alice and bob next week",
  disabled = false,
  "data-testid": testId,
}: PromptBoxProps): React.ReactElement {
  return (
    <textarea
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      style={{
        width: "100%",
        padding: "0.5rem 0.75rem",
        background: "var(--surface, #141418)",
        border: "1px solid var(--border, #26262c)",
        borderRadius: 6,
        color: "var(--text, #f4f4f5)",
        resize: "vertical",
      }}
    />
  );
}
