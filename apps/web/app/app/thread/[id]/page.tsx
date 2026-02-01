"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import LoadingScreen from "@/components/LoadingScreen";

type ChatToken =
  | { type: "text"; value: string }
  | { type: "mention"; label: string }
  | { type: "task"; label: string };

type Proposal = {
  summary: string;
  schedule?: { start: string; end: string; title?: string; participantIds: string[] };
  email?: { to: string[]; subject: string; bodySnippet: string };
};

const ACTIONS_STUB = [
  "create a new email",
  "schedule a meeting",
  "send follow-up",
  "draft a reply",
  "find a time",
];

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  /** When thread API 404s (e.g. in-memory store cleared), we still show chat and create a new thread on send. */
  const [threadMissing, setThreadMissing] = useState(false);
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<ChatToken[]>([]);
  const [mode, setMode] = useState<"text" | "mention" | "task">("text");
  const [buffer, setBuffer] = useState("");
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [orgMembers, setOrgMembers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [geminiLastPrompt, setGeminiLastPrompt] = useState<string | null>(null);
  const [lastSubmittedTokens, setLastSubmittedTokens] = useState<ChatToken[]>([]);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [geminiResponseExpanded, setGeminiResponseExpanded] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [focusedTokenIndex, setFocusedTokenIndex] = useState<number | null>(null);
  const [geminiElapsedSec, setGeminiElapsedSec] = useState(0);
  const [geminiEstimateSec, setGeminiEstimateSec] = useState(30);
  const [geminiLiveText, setGeminiLiveText] = useState("");
  const [statusBoxPos, setStatusBoxPos] = useState<{ x: number; y: number } | null>(null);
  const [statusHoverFullscreen, setStatusHoverFullscreen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [orchestrateProposal, setOrchestrateProposal] = useState<Proposal | null>(null);
  const [orchestrateThread, setOrchestrateThread] = useState<{ id: string; status: string } | null>(null);
  /** Recipients/participants from orchestrate (for email: To; for schedule: attendees). Used for status head and success message. */
  const [participantsSummary, setParticipantsSummary] = useState<{ id: string; email: string; name: string }[]>([]);
  const [executing, setExecuting] = useState(false);
  /** When status is "done", show this prominently so the UI doesn't feel stuck on the long proposal. */
  const [lastSuccessMessage, setLastSuccessMessage] = useState<string | null>(null);
  /** After execute: our agent + other agent multi-turn conversation (streamed live). One entry per participant. */
  const [conversing, setConversing] = useState(false);
  const [liveTurns, setLiveTurns] = useState<Array<{ role: string; message: string; agentName: string }>>([]);
  const [conversationFinalResult, setConversationFinalResult] = useState<string | null>(null);
  const [otherAgentName, setOtherAgentName] = useState<string | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  /** Per-participant agent state: each gets their own block and conversation. */
  const [otherAgents, setOtherAgents] = useState<Array<{
    id: string;
    name: string;
    email: string;
    turns: Array<{ role: string; message: string; agentName: string }>;
    finalResult: string | null;
    done: boolean;
    error: string | null;
  }>>([]);
  /** Last turn role so we can pulse the connection in that direction. */
  const [lastTurnDirection, setLastTurnDirection] = useState<"our_agent" | "other_agent" | null>(null);
  /** Other agent block positions for drag + connection lines (one per other agent). */
  const [otherAgentBlockPositions, setOtherAgentBlockPositions] = useState<Array<{ x: number; y: number } | null>>([]);
  /** Card rects (relative to center block) for drawing connection lines from container edges. */
  const [statusCardRect, setStatusCardRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [otherAgentRects, setOtherAgentRects] = useState<Array<{ x: number; y: number; w: number; h: number } | null>>([]);
  const otherAgentCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRefOther = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; index: number } | null>(null);
  const centerBlockRef = useRef<HTMLDivElement>(null);
  const statusCardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);

  const otherPartyNames = participantsSummary.map((p) => p.name).filter(Boolean).join(", ");
  const executingLabel = orchestrateProposal?.email
    ? (otherPartyNames ? `Sending to ${otherPartyNames}…` : "Sending…")
    : "Scheduling…";
  /** Show done view when status is done and we have a success message (or derive from response if setState lag). */
  const doneViewMessage =
    lastSuccessMessage ??
    (orchestrateThread?.status === "done"
      ? geminiResponse?.includes("Meeting scheduled.")
        ? "Meeting scheduled."
        : geminiResponse?.includes("Email sent to")
          ? (geminiResponse.match(/Email sent to[^.]+\./)?.[0] ?? "Email sent.")
          : null
      : null);
  const showDoneView = Boolean(orchestrateThread?.status === "done" && doneViewMessage);
  /** When viewing a previous thread (loaded from API with no conversation turns), show other-agent blocks as title-only. */
  const isViewingPreviousOnly =
    otherAgents.length > 0 && otherAgents.every((a) => a.turns.length === 0 && a.done);
  /** For Details: strip duplicate success line and show recipient names instead of placeholder emails. */
  const detailsContent = (() => {
    let text = geminiResponse || "";
    if (lastSuccessMessage && text.endsWith(lastSuccessMessage)) {
      text = text.slice(0, text.length - lastSuccessMessage.length).trimEnd();
    }
    if (otherPartyNames && text.includes("@recipient.overlap.local")) {
      text = text.replace(/To: [^\n]+@recipient\.overlap\.local/g, `To: ${otherPartyNames}`);
    }
    return text || "(empty)";
  })();

  const handleStatusDragStart = (e: React.MouseEvent) => {
    if (!centerBlockRef.current || !statusCardRef.current) return;
    e.preventDefault();
    const block = centerBlockRef.current.getBoundingClientRect();
    const card = statusCardRef.current.getBoundingClientRect();
    const left = card.left - block.left;
    const top = card.top - block.top;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: left, startTop: top };
  };

  const handleOtherAgentDragStart = (e: React.MouseEvent, index: number) => {
    const el = otherAgentCardRefs.current[index];
    if (!centerBlockRef.current || !el) return;
    e.preventDefault();
    const block = centerBlockRef.current.getBoundingClientRect();
    const card = el.getBoundingClientRect();
    const left = card.left - block.left;
    const top = card.top - block.top;
    dragRefOther.current = { startX: e.clientX, startY: e.clientY, startLeft: left, startTop: top, index };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !centerBlockRef.current || !statusCardRef.current) return;
      const block = centerBlockRef.current.getBoundingClientRect();
      const card = statusCardRef.current.getBoundingClientRect();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      let x = d.startLeft + dx;
      let y = d.startTop + dy;
      const maxX = Math.max(0, block.width - card.width);
      const maxY = Math.max(0, block.height - card.height);
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      setStatusBoxPos({ x, y });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRefOther.current;
      if (!d || !centerBlockRef.current) return;
      const el = otherAgentCardRefs.current[d.index];
      if (!el) return;
      const block = centerBlockRef.current.getBoundingClientRect();
      const card = el.getBoundingClientRect();
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      let x = d.startLeft + dx;
      let y = d.startTop + dy;
      const maxX = Math.max(0, block.width - card.width);
      const maxY = Math.max(0, block.height - card.height);
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));
      setOtherAgentBlockPositions((prev) => {
        const next = [...prev];
        next[d.index] = { x, y };
        return next;
      });
    };
    const onUp = () => { dragRefOther.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (loading || notFound) return;
    fetch("/api/org-members")
      .then((r) => r.json())
      .then((d) => setOrgMembers(d.members ?? []))
      .catch(() => setOrgMembers([]));
  }, [loading, notFound]);

  const peopleMatches = useMemo(() => {
    if (mode !== "mention") return [];
    const q = buffer.toLowerCase().trim();
    return orgMembers
      .filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q)
      )
      .map((m) => m.name ?? m.email ?? m.id)
      .slice(0, 3);
  }, [mode, buffer, orgMembers]);

  const actionMatches = useMemo(() => {
    if (mode !== "task") return [];
    const q = buffer.toLowerCase().trim();
    return ACTIONS_STUB.filter((a) => a.toLowerCase().includes(q)).slice(0, 3);
  }, [mode, buffer]);

  const showDropdown = (mode === "mention" && peopleMatches.length > 0) || (mode === "task" && actionMatches.length > 0);
  const dropdownOptions = mode === "mention" ? peopleMatches : mode === "task" ? actionMatches : [];
  const selectedOption = dropdownOptions[dropdownIndex] ?? dropdownOptions[0];

  const commitCurrent = () => {
    const b = buffer.trim();
    if (mode === "mention" && b) {
      setTokens((prev) => [...prev, { type: "mention", label: b }]);
    } else if (mode === "task" && b) {
      setTokens((prev) => [...prev, { type: "task", label: b }]);
    }
    setMode("text");
    setBuffer("");
    setDropdownIndex(0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const cursorAtStart = input.selectionStart === 0 && input.selectionEnd === 0;

    if (e.key === "@" && mode === "text") {
      e.preventDefault();
      if (buffer) setTokens((prev) => [...prev, { type: "text", value: buffer }]);
      setMode("mention");
      setBuffer("");
      setDropdownIndex(0);
      return;
    }
    if (e.key === ">" && mode === "text") {
      e.preventDefault();
      if (buffer) setTokens((prev) => [...prev, { type: "text", value: buffer }]);
      setMode("task");
      setBuffer("");
      setDropdownIndex(0);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      commitCurrent();
      return;
    }
    if (e.key === "Enter" && showDropdown) {
      e.preventDefault();
      if (selectedOption) {
        if (mode === "mention") setTokens((prev) => [...prev, { type: "mention", label: selectedOption }]);
        else setTokens((prev) => [...prev, { type: "task", label: selectedOption }]);
        setMode("text");
        setBuffer("");
        setDropdownIndex(0);
      }
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !showDropdown) {
      e.preventDefault();
      handleSendFromChat();
      return;
    }
    if (e.key === "ArrowDown" && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, dropdownOptions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && showDropdown) {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "ArrowLeft" && cursorAtStart && tokens.length > 0) {
      e.preventDefault();
      const idx = tokens.length - 1;
      setFocusedTokenIndex(idx);
      requestAnimationFrame(() => {
        fieldRef.current?.querySelector<HTMLElement>(`[data-token-index="${idx}"]`)?.focus();
      });
      return;
    }
    if (e.key === "Backspace" && cursorAtStart && tokens.length > 0) {
      e.preventDefault();
      setTokens((prev) => prev.slice(0, -1));
      return;
    }
    if (e.key === "Delete" && cursorAtStart && tokens.length > 0) {
      e.preventDefault();
      setTokens((prev) => prev.slice(0, -1));
      return;
    }
  };

  const tokenToEditableString = (t: ChatToken): string => {
    if (t.type === "text") return t.value;
    return t.label;
  };

  const expandTokenIntoInput = (index: number) => {
    if (index < 0 || index >= tokens.length) return;
    const t = tokens[index];
    const str = tokenToEditableString(t);
    setTokens((prev) => prev.filter((_, i) => i !== index));
    if (t.type === "mention") {
      setMode("mention");
      setBuffer(str + buffer);
    } else if (t.type === "task") {
      setMode("task");
      setBuffer(str + buffer);
    } else {
      setMode("text");
      setBuffer(str + buffer);
    }
    setFocusedTokenIndex(null);
    setDropdownIndex(0);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const prefixLen = t.type === "mention" || t.type === "task" ? 1 : 0;
      el.setSelectionRange(prefixLen, prefixLen);
    });
  };

  const handleTokenKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index + 1 < tokens.length) {
        setFocusedTokenIndex(index + 1);
        requestAnimationFrame(() => {
          fieldRef.current?.querySelector<HTMLElement>(`[data-token-index="${index + 1}"]`)?.focus();
        });
      } else {
        setFocusedTokenIndex(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        setFocusedTokenIndex(index - 1);
        requestAnimationFrame(() => {
          fieldRef.current?.querySelector<HTMLElement>(`[data-token-index="${index - 1}"]`)?.focus();
        });
      } else {
        setFocusedTokenIndex(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      setTokens((prev) => prev.filter((_, i) => i !== index));
      if (index > 0) {
        setFocusedTokenIndex(index - 1);
        requestAnimationFrame(() => {
          fieldRef.current?.querySelector<HTMLElement>(`[data-token-index="${index - 1}"]`)?.focus();
        });
      } else {
        setFocusedTokenIndex(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      setTokens((prev) => prev.filter((_, i) => i !== index));
      if (index < tokens.length - 1) {
        setFocusedTokenIndex(index);
        requestAnimationFrame(() => {
          fieldRef.current?.querySelector<HTMLElement>(`[data-token-index="${index}"]`)?.focus();
        });
      } else {
        setFocusedTokenIndex(null);
        inputRef.current?.focus();
      }
      return;
    }
    if (e.key === "Enter" || e.key.length === 1 || e.key === " ") {
      e.preventDefault();
      expandTokenIntoInput(index);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (mode === "mention") {
      if (v.startsWith("@")) setBuffer(v.slice(1));
      else { setMode("text"); setBuffer(v); }
    } else if (mode === "task") {
      if (v.startsWith(">")) setBuffer(v.slice(1));
      else { setMode("text"); setBuffer(v); }
    } else {
      setBuffer(v);
    }
    setDropdownIndex(0);
  };

  const inputDisplayValue = (mode === "mention" ? "@" : mode === "task" ? ">" : "") + buffer;

  const REPLY_SUMMARY_LENGTH = 280;
  const getReplySummary = (text: string): string => {
    const t = text.trim();
    if (t.length <= REPLY_SUMMARY_LENGTH) return t;
    const cut = t.slice(0, REPLY_SUMMARY_LENGTH);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > REPLY_SUMMARY_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trim() + " …";
  };

  const CONFLICTS_MARKER = /Conflicts to verify:\s*/i;
  const parseReplyAndConflicts = (raw: string): { mainBody: string; conflicts: string[] } => {
    const t = raw.trim();
    const match = t.match(CONFLICTS_MARKER);
    if (!match) return { mainBody: t, conflicts: [] };
    const idx = t.indexOf(match[0]) + match[0].length;
    const mainBody = t.slice(0, t.indexOf(match[0])).trim();
    const conflictsBlock = t.slice(idx).trim();
    const conflicts = conflictsBlock
      .split(/\n+/)
      .map((s) => s.replace(/^[\s\-*•]\s*/, "").trim())
      .filter(Boolean);
    return { mainBody, conflicts };
  };

  const getChatPromptText = (): string => {
    const parts = [
      ...tokens.map((t) => (t.type === "text" ? t.value : t.type === "mention" ? `@${t.label}` : `>${t.label}`)),
      buffer.trim() ? (mode === "mention" ? `@${buffer}` : mode === "task" ? `>${buffer}` : buffer) : "",
    ].filter(Boolean);
    return parts.join(" ").trim();
  };

  function formatProposalForDisplay(proposal: Proposal, reasoning: string | null): string {
    const lines: string[] = [proposal.summary];
    if (reasoning?.trim()) lines.push("", reasoning.trim());
    if (proposal.schedule) {
      lines.push(
        "",
        `When: ${new Date(proposal.schedule.start).toLocaleString()} – ${new Date(proposal.schedule.end).toLocaleString()}`,
        proposal.schedule.title ? `Title: ${proposal.schedule.title}` : ""
      );
    }
    if (proposal.email) {
      lines.push(
        "",
        proposal.email.to.length ? `To: ${proposal.email.to.join(", ")}` : "",
        `Subject: ${proposal.email.subject}`,
        proposal.email.bodySnippet
      );
    }
    return lines.filter(Boolean).join("\n");
  }

  const sendOrchestrate = async (promptText: string, submittedTokens: ChatToken[]) => {
    if (!promptText.trim() || geminiLoading) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGeminiLoading(true);
    setGeminiElapsedSec(0);
    setGeminiEstimateSec(30);
    setGeminiError(null);
    setGeminiResponse(null);
    setGeminiLastPrompt(promptText.trim());
    setOrchestrateProposal(null);
    setOrchestrateThread(null);
    setParticipantsSummary([]);
    setLastSuccessMessage(null);
    setLiveTurns([]);
    setConversationFinalResult(null);
    setOtherAgentName(null);
    setConversationError(null);
    setLastTurnDirection(null);
    try {
      const res = await fetch("/api/thread/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText.trim(),
          threadId: orchestrateThread?.id ?? id,
          tokens: submittedTokens,
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGeminiError((data && data.error) ?? "Request failed");
        return;
      }
      const proposal = data && typeof data.proposal !== "undefined" ? data.proposal : null;
      const reasoning = data && typeof data.reasoning !== "undefined" ? data.reasoning : null;
      const threadData = (data && data.thread) ?? null;
      if (proposal && typeof proposal === "object" && proposal.summary) {
        setOrchestrateProposal(proposal);
        setOrchestrateThread(threadData ? { id: threadData.id, status: threadData.status } : null);
        const summary = Array.isArray(data.participantsSummary)
          ? (data.participantsSummary as { id: string; email: string; name: string }[]).filter(
              (x) => x && typeof x.id === "string"
            )
          : [];
        setParticipantsSummary(summary);
        setGeminiResponse(formatProposalForDisplay(proposal, reasoning));
        if (threadData?.id && threadData.id !== id) setThreadMissing(false);
        const tid = threadData?.id ?? id;
        if (tid && threadData?.status === "proposed") {
          setExecuting(true);
          fetch(`/api/thread/${tid}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposal }),
          })
            .then((r) => r.json().catch(() => ({})))
            .then((d) => {
              if (d?.thread) {
                const isEmail = proposal?.email != null;
                const names = summary.map((p) => p.name).filter(Boolean);
                const successMsg = isEmail
                  ? (names.length ? `Email sent to ${names.join(", ")}.` : "Email sent.")
                  : "Meeting scheduled.";
                setLastSuccessMessage(successMsg);
                setGeminiResponse((prev) => (prev ? `${prev}\n\n${successMsg}` : successMsg));
                setOrchestrateThread((t) => (t ? { ...t, status: "done" } : null));
                if (summary.length > 0 && proposal) {
                  setConversing(true);
                  setConversationError(null);
                  setLiveTurns([]);
                  setConversationFinalResult(null);
                  setOtherAgentName(null);
                  setLastTurnDirection(null);
                  setOtherAgents(summary.map((p) => ({
                    id: p.id,
                    name: p.name || p.email || "Other",
                    email: p.email,
                    turns: [],
                    finalResult: null,
                    done: false,
                    error: null,
                  })));
                  setOtherAgentBlockPositions(summary.map((_, i) => ({ x: 280 + i * 400, y: 140 })));
                  (async () => {
                    try {
                      for (let i = 0; i < summary.length; i++) {
                        const participant = summary[i];
                        const r = await fetch(`/api/thread/${tid}/converse`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ proposal, participantsSummary: [participant] }),
                        });
                        if (!r.ok) {
                          const data = await r.json().catch(() => ({}));
                          setConversationError((data && data.error) || `Conversation failed (${r.status})`);
                          setOtherAgents((prev) => {
                            const next = [...prev];
                            next[i] = { ...next[i], error: (data && data.error) || "Failed", done: true };
                            return next;
                          });
                          continue;
                        }
                        const reader = r.body?.getReader();
                        if (!reader) {
                          setOtherAgents((prev) => {
                            const n = [...prev];
                            n[i] = { ...n[i], error: "No response body", done: true };
                            return n;
                          });
                          continue;
                        }
                        const dec = new TextDecoder();
                        let buffer = "";
                        try {
                          for (;;) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            buffer += dec.decode(value, { stream: true });
                            const lines = buffer.split("\n");
                            buffer = lines.pop() ?? "";
                            for (const line of lines) {
                              if (!line.trim()) continue;
                              try {
                                const data = JSON.parse(line) as { type: string; turn?: { role: string; message: string; agentName: string }; finalResult?: string; otherName?: string; error?: string };
                                if (data.type === "turn" && data.turn) {
                                  setLastTurnDirection((data.turn.role as "our_agent" | "other_agent") || null);
                                  if (data.turn.role === "our_agent" && i === 0) {
                                    setLiveTurns((prev) => [...prev, data.turn!]);
                                  }
                                  setOtherAgents((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], turns: [...n[i].turns, data.turn!] };
                                    return n;
                                  });
                                } else if (data.type === "done") {
                                  if (i === 0) {
                                    if (data.finalResult != null) setConversationFinalResult(data.finalResult);
                                    if (data.otherName != null) setOtherAgentName(data.otherName);
                                  }
                                  setOtherAgents((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], finalResult: data.finalResult ?? null, done: true };
                                    return n;
                                  });
                                } else if (data.type === "error" && data.error) {
                                  setConversationError(data.error);
                                  setOtherAgents((prev) => {
                                    const n = [...prev];
                                    n[i] = { ...n[i], error: data.error ?? null, done: true };
                                    return n;
                                  });
                                }
                              } catch (_) {}
                            }
                          }
                          if (buffer.trim()) {
                            try {
                              const data = JSON.parse(buffer) as { type: string; turn?: { role: string; message: string; agentName: string }; finalResult?: string; otherName?: string; error?: string };
                              if (data.type === "done") {
                                if (i === 0) {
                                  if (data.finalResult != null) setConversationFinalResult(data.finalResult);
                                  if (data.otherName != null) setOtherAgentName(data.otherName);
                                }
                                setOtherAgents((prev) => {
                                  const n = [...prev];
                                  n[i] = { ...n[i], finalResult: data.finalResult ?? null, done: true };
                                  return n;
                                });
                              }
                            } catch (_) {}
                          }
                        } finally {
                          reader.releaseLock();
                        }
                      }
                    } catch {
                      setConversationError("Conversation failed");
                    } finally {
                      setConversing(false);
                    }
                  })();
                }
              } else if (d?.error) setGeminiError(d.error);
            })
            .finally(() => setExecuting(false));
        }
      } else {
        setGeminiResponse("No proposal returned.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setGeminiError("Stopped");
      } else {
        setGeminiError(e instanceof Error ? e.message : "Network error");
      }
    } finally {
      setGeminiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGemini = () => {
    abortControllerRef.current?.abort();
  };

  useEffect(() => {
    if (!geminiLoading) return;
    const t = setInterval(() => {
      setGeminiElapsedSec((s) => {
        const next = s + 1;
        setGeminiEstimateSec((est) =>
          next >= est - 5 ? Math.max(est, next + 10) : est
        );
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [geminiLoading]);

  const handleSendFromChat = () => {
    const promptText = getChatPromptText();
    if (!promptText || geminiLoading) return;
    const displayTokens: ChatToken[] = [...tokens];
    if (buffer.trim()) {
      if (mode === "mention") displayTokens.push({ type: "mention", label: buffer.trim() });
      else if (mode === "task") displayTokens.push({ type: "task", label: buffer.trim() });
      else displayTokens.push({ type: "text", value: buffer });
    }
    setLastSubmittedTokens(displayTokens);
    sendOrchestrate(promptText, displayTokens);
    setTokens([]);
    setBuffer("");
    setMode("text");
    setDropdownIndex(0);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/thread/${id}`, { credentials: "include" })
      .then((r) => {
        if (r.status === 404) {
          setThreadMissing(true);
          setNotFound(true);
        }
        if (r.status === 401) {
          setThreadMissing(true);
          setNotFound(true);
        }
        return r.json();
      })
      .then((d) => {
        const thread = d?.thread;
        if (!thread) {
          setThreadMissing(true);
          setNotFound(true);
          return;
        }
        setThreadMissing(false);
        setNotFound(false);
        setOrchestrateThread({ id: thread.id, status: thread.status });
        setOrchestrateProposal(thread.proposal ?? null);
        setParticipantsSummary(
          (thread.participants ?? []).map((p: { userId: string; email?: string; displayName?: string }) => ({
            id: p.userId,
            email: p.email ?? "",
            name: p.displayName ?? p.email ?? "Unknown",
          }))
        );
        setGeminiLastPrompt(thread.prompt ?? null);
        const proposal = thread.proposal;
        let displayText = proposal?.summary ?? "";
        if (thread.status === "done" && proposal) {
          const successMsg = proposal.email
            ? (proposal.email.to?.length
              ? `Email sent to ${proposal.email.to.join(", ")}.`
              : "Email sent.")
            : "Meeting scheduled.";
          displayText = displayText ? `${displayText}\n\n${successMsg}` : successMsg;
          setLastSuccessMessage(successMsg);
        }
        setGeminiResponse(displayText || null);
        if ((thread.participants ?? []).length > 0) {
          setOtherAgentBlockPositions(
            (thread.participants ?? []).map((_: unknown, i: number) => ({ x: 280 + i * 400, y: 140 }))
          );
          setOtherAgents(
            (thread.participants ?? []).map((p: { userId: string; email?: string; displayName?: string }) => ({
              id: p.userId,
              name: p.displayName ?? p.email ?? "Unknown",
              email: p.email ?? "",
              turns: [],
              finalResult: null,
              done: true,
              error: null,
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useLayoutEffect(() => {
    if (!showDoneView || !centerBlockRef.current || !statusCardRef.current) {
      setStatusCardRect(null);
      return;
    }
    const block = centerBlockRef.current.getBoundingClientRect();
    const card = statusCardRef.current.getBoundingClientRect();
    setStatusCardRect({
      x: card.left - block.left,
      y: card.top - block.top,
      w: card.width,
      h: card.height,
    });
  }, [showDoneView, statusBoxPos]);

  useLayoutEffect(() => {
    if (!showDoneView || !centerBlockRef.current || otherAgents.length === 0) {
      setOtherAgentRects([]);
      return;
    }
    const block = centerBlockRef.current.getBoundingClientRect();
    const rects: Array<{ x: number; y: number; w: number; h: number } | null> = [];
    for (let i = 0; i < otherAgents.length; i++) {
      const card = otherAgentCardRefs.current[i]?.getBoundingClientRect();
      if (card) {
        rects.push({
          x: card.left - block.left,
          y: card.top - block.top,
          w: card.width,
          h: card.height,
        });
      } else {
        rects.push(null);
      }
    }
    setOtherAgentRects(rects);
  }, [showDoneView, otherAgentBlockPositions, otherAgents.length]);

  const allConversationsComplete = otherAgents.length > 0 && otherAgents.every((a) => a.done);
  useEffect(() => {
    if (showDoneView && allConversationsComplete && inputRef.current) {
      const t = setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 400);
      return () => clearTimeout(t);
    }
  }, [showDoneView, allConversationsComplete]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  if (loading) {
    return <LoadingScreen message="Loading thread…" />;
  }

  return (
    <main className="threadPageWrap">
      <header className="threadPageTopbar">
        <div className="threadPageContainer threadPageTopbarInner">
          <Link href="/app?view=graph" className="threadPageBrand">
            <div className="threadPageLogoWrap">
              <Image src="/overlap_blue.png" alt="Overlap" width={88} height={88} priority />
            </div>
            <div className="threadPageBrandText">
              <span className="threadPageBrandTitle">Workthread Viewer</span>
              <span className="threadPageBrandSub">AI-to-AI coordination in all your workflows.</span>
            </div>
          </Link>
          <div className="threadPageProfileWrap" ref={profileRef}>
            <button
              type="button"
              className="threadPageAvatar"
              onClick={() => setOpen(!open)}
              aria-label="Profile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            {open && (
              <div className="threadPageProfileMenu">
                <Link href="/app/settings" className="threadPageProfileItem threadPageProfileItemLink" onClick={() => setOpen(false)}>
                  <span className="threadPageProfileIcon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </span>
                  Settings
                </Link>
                <div className="threadPageProfileDivider" />
                <button type="button" onClick={handleLogout} className="threadPageProfileItem threadPageProfileItemLogout">
                  <span className="threadPageProfileIcon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </span>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="threadPageMain">
        {notFound && (
          <div className="threadPageThreadContext">
            <Link href="/app?view=graph" className="threadPageBackLink">← Back to threads</Link>
            <p className="threadPageMuted" style={{ marginTop: 8 }}>
              This thread could not be loaded. It may have been deleted or you may not have access.
            </p>
          </div>
        )}
        {!loading && !notFound && (
          <>
            <div className="threadPageThreadContext">
              <Link href="/app?view=graph" className="threadPageBackLink">← Back to threads</Link>
              {orchestrateThread && (
                <span className="threadPageThreadLabel">Thread</span>
              )}
            </div>
          <div className="threadPageCenterBlock" ref={centerBlockRef}>
            {(() => {
              const hasStatusContent = geminiLoading || (geminiLastPrompt != null && (geminiResponse !== null || geminiError));
              return (
                <div
                  className={hasStatusContent ? "threadPageStatusCardWrap" : undefined}
                  onMouseEnter={hasStatusContent ? () => setStatusHoverFullscreen(true) : undefined}
                  onMouseLeave={hasStatusContent ? () => { if (!statusModalOpen) setStatusHoverFullscreen(false); } : undefined}
                  onClick={hasStatusContent ? () => { setStatusModalOpen(true); setStatusHoverFullscreen(false); } : undefined}
                >
            <div
              ref={statusCardRef}
              className={`threadPageCenterCard ${geminiLoading ? "threadPageCenterCardLoading" : ""} ${!geminiLoading && !geminiLastPrompt && !geminiResponse && !geminiError ? "threadPageCenterCardDormant" : ""} ${!geminiLoading && geminiLastPrompt != null && (geminiResponse !== null || geminiError) ? "threadPageCenterCardOutput" : ""}`}
              style={
                geminiLoading ||
                (!geminiLastPrompt && !geminiResponse && !geminiError) ||
                (geminiLastPrompt != null && (geminiResponse !== null || geminiError))
                  ? {
                      position: "absolute",
                      left: statusBoxPos !== null ? statusBoxPos.x : "50%",
                      top: statusBoxPos !== null ? statusBoxPos.y : "50%",
                      transform: statusBoxPos !== null ? undefined : "translate(-50%, -50%)",
                    }
                  : undefined
              }
            >
              {geminiLoading && (
                <div className="threadPageStatusBox" aria-live="polite">
                  <span
                    className="threadPageStatusAgentName threadPageStatusAgentNameDraggable"
                    onMouseDown={handleStatusDragStart}
                    onClick={(e) => e.stopPropagation()}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to move container"
                  >
                    AI (Yours)
                  </span>
                  <div className="threadPageStatusRingWrap">
                    <svg className="threadPageStatusRing" viewBox="0 0 36 36" aria-hidden>
                      <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="threadPageStatusRingBg" />
                      <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${Math.min((geminiElapsedSec / Math.max(1, geminiEstimateSec)) * 100.5, 100.5)} 100.5`}
                        strokeLinecap="round"
                        className="threadPageStatusRingProgress"
                      />
                    </svg>
                    <div className="threadPageStatusIconWrap">
                      <div className="threadPageCenterSpinner threadPageStatusSpinner" aria-hidden />
                    </div>
                  </div>
                  <div className="threadPageStatusTime">
                    <span className="threadPageStatusElapsed">
                      {Math.floor(geminiElapsedSec / 60)}:{String(geminiElapsedSec % 60).padStart(2, "0")}
                    </span>
                    <span className="threadPageStatusEst"> / ~{geminiEstimateSec}s</span>
                  </div>
                  <div className="threadPageStatusGenerating threadPageStatusGeneratingLive">
                    {geminiLiveText ? (
                      <span className="threadPageStatusLiveText">{geminiLiveText}</span>
                    ) : (
                      "Planning…"
                    )}
                  </div>
                  <button
                    type="button"
                    className="threadPageCenterHeaderStop threadPageStatusStop"
                    onClick={handleStopGemini}
                    aria-label="Stop"
                  >
                    Stop
                  </button>
                </div>
              )}
              {!geminiLoading && !geminiLastPrompt && !geminiResponse && !geminiError && (
                <div className="threadPageStatusBox threadPageStatusBoxDormant" aria-live="polite">
                  <span
                    className="threadPageStatusAgentName threadPageStatusAgentNameDraggable"
                    onMouseDown={handleStatusDragStart}
                    onClick={(e) => e.stopPropagation()}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to move container"
                  >
                    AI (Yours)
                  </span>
                  <div className="threadPageStatusRingWrap">
                    <svg className="threadPageStatusRing" viewBox="0 0 36 36" aria-hidden>
                      <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="threadPageStatusRingBg" />
                    </svg>
                    <div className="threadPageStatusIconWrap">
                      <svg className="threadPageStatusClock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                  </div>
                  <div className="threadPageStatusGenerating threadPageStatusHint">
                    {orchestrateThread ? "This thread has no plan yet. Type below to get started." : "Type below and press Send"}
                  </div>
                </div>
              )}
              {!geminiLoading && geminiLastPrompt != null && (geminiResponse !== null || geminiError) && (
                <>
                  {geminiError && (
                    <span className="threadPageStatusErrorBadge" aria-hidden>
                      <span className="threadPageStatusErrorBadgeCircle" />
                      <span className="threadPageStatusErrorBadgeX">✕</span>
                    </span>
                  )}
                  {!geminiError && geminiResponse !== null && (
                    <span className="threadPageStatusSuccessBadge" aria-hidden>
                      <span className="threadPageStatusSuccessBadgeCircle" />
                      <span className="threadPageStatusSuccessCheck">✓</span>
                    </span>
                  )}
                  <div className="threadPageStatusBox threadPageStatusBoxOutput" aria-live="polite">
                    <div className="threadPageStatusOutputHead">
                      <span
                        className="threadPageStatusTitleLine threadPageStatusAgentNameDraggable"
                        onMouseDown={handleStatusDragStart}
                        onClick={(e) => e.stopPropagation()}
                        role="button"
                        tabIndex={0}
                        aria-label="Drag to move container"
                        title="AI (Yours)"
                      >
                        AI (Yours)
                        {(otherAgents.length > 0 && otherAgents.every((a) => a.done)) && <sup className="threadPageConversationCheck" aria-label="Complete">✓</sup>}
                      </span>
                    </div>
                    <div className="threadPageStatusOutputBody">
                    {geminiError ? (
                      <span className="threadPageStatusErrorText">{geminiError}</span>
                    ) : showDoneView ? (
                      <>
                        <div className="threadPageStatusDoneMessage" aria-live="polite">
                          {doneViewMessage}
                        </div>
                        {conversing && (
                          <p className="threadPageStatusDoneHint">
                            Connecting with {otherPartyNames || "their"} agent… (this may take a minute)
                          </p>
                        )}
                        {conversationError && (
                          <div className="threadPageConversationError" role="alert">
                            <p className="threadPageStatusErrorText">
                              Agent conversation: {conversationError}
                            </p>
                            <p className="threadPageStatusDoneHint">
                              Add OPENROUTER_API_KEY to .env.local to enable agent-to-agent conversation.
                            </p>
                          </div>
                        )}
                        {((otherAgents.length > 0 && otherAgents[0].turns.length > 0) || liveTurns.length > 0 || conversationFinalResult != null) && (
                          <>
                            <div className="threadPageAgentBlockContent">
                              <p className="threadPageStatusDoneHint">AI (Yours) ↔ {otherAgents[0]?.name ?? "other"}</p>
                              {(otherAgents.length > 0 ? otherAgents[0].turns : liveTurns).map((turn, i) => (
                                <div key={i} className={`threadPageTurn threadPageTurn_${turn.role} ${turn.role === "other_agent" ? "threadPageTurn_other_index_0" : ""}`}>
                                  <p className="threadPageTurnMessage">{turn.message}</p>
                                </div>
                              ))}
                              {conversationFinalResult != null && (
                                <>
                                  <p className="threadPageFinalResultLabel">Final result</p>
                                  <p className="threadPageFinalResult">{conversationFinalResult}</p>
                                  <p className="threadPageStatusDoneHint">Saved to thread.</p>
                                </>
                              )}
                            </div>
                          </>
                        )}
                        <details className="threadPageStatusDetails">
                          <summary>Details</summary>
                          <pre className="threadPageStatusOutputText">{detailsContent}</pre>
                        </details>
                      </>
                    ) : (
                      (() => {
                        const { mainBody, conflicts } = parseReplyAndConflicts(geminiResponse || "");
                        return (
                          <>
                            <pre className="threadPageStatusOutputText">{mainBody || "(empty)"}</pre>
                            {conflicts.length > 0 && (
                              <div className="threadPageStatusConflicts">
                                <span className="threadPageStatusConflictsLabel">Conflicts to verify</span>
                                <ul className="threadPageStatusConflictsList">
                                  {conflicts.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {executing && (
                              <div className="threadPageStatusActions">
                                <span className="threadPageMuted">{executingLabel}</span>
                              </div>
                            )}
                          </>
                        );
                      })()
                    )}
                    </div>
                  </div>
                </>
              )}
            </div>
                </div>
              );
            })()}
            {/* Connection lines from right edge of Your agent to left edge of each Other agent; pulse only while not all complete */}
            {showDoneView && otherAgents.length > 0 && (() => {
              const fromEdge = statusCardRect != null;
              const x1 = fromEdge ? statusCardRect.x + statusCardRect.w : (statusBoxPos?.x ?? 0) + 120;
              const y1 = fromEdge ? statusCardRect.y + statusCardRect.h / 2 : (statusBoxPos?.y ?? 0) + 90;
              const allComplete = otherAgents.length > 0 && otherAgents.every((a) => a.done);
              return (
                <svg
                  className="threadPageConnectionSvg"
                  aria-hidden
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                >
                  {otherAgents.map((_, i) => {
                    const rect = otherAgentRects[i];
                    const pos = otherAgentBlockPositions[i];
                    const toEdge = rect != null;
                    const x2 = toEdge ? rect.x : (pos?.x ?? 280 + i * 400);
                    const y2 = toEdge ? rect.y + rect.h / 2 : (pos?.y ?? 140) + 90;
                    const pulsePathOurToOther = `M ${x1} ${y1} L ${x2} ${y2}`;
                    const pulsePathOtherToOur = `M ${x2} ${y2} L ${x1} ${y1}`;
                    return (
                      <g key={i}>
                        <line
                          className={`threadPageConnectionLine ${!allComplete && lastTurnDirection ? "threadPageConnectionLine_pulse" : ""}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="var(--thread-muted)"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                        />
                        {!allComplete && lastTurnDirection && i === 0 && (
                          <circle className="threadPageConnectionPulse" r="5" fill="var(--thread-text)" opacity="0.9">
                            <animateMotion dur="1.5s" repeatCount="indefinite" path={lastTurnDirection === "our_agent" ? pulsePathOurToOther : pulsePathOtherToOur} />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
            {/* Other agent blocks: one per participant */}
            {showDoneView && otherAgents.map((agent, i) => (
              <div
                key={agent.id}
                ref={(el) => {
                  otherAgentCardRefs.current[i] = el;
                }}
                className={`threadPageCenterCard threadPageCenterCardOutput threadPageAgentBlockOther ${isViewingPreviousOnly ? "threadPageAgentBlockOtherPrevious" : ""}`}
                style={{
                  position: "absolute",
                  left: otherAgentBlockPositions[i]?.x ?? 280 + i * 400,
                  top: otherAgentBlockPositions[i]?.y ?? 140,
                  minWidth: 140,
                  maxWidth: 180,
                }}
              >
                {agent.done && (
                  <span className="threadPageAgentBlockDoneBadge" aria-label="Complete">
                    <span className="threadPageAgentBlockDoneBadgeCircle" />
                    <span className="threadPageAgentBlockDoneBadgeCheck">✓</span>
                  </span>
                )}
                <div className="threadPageStatusOutputHead">
                  <span
                    className="threadPageStatusTitleLine threadPageStatusAgentNameDraggable"
                    onMouseDown={(e) => handleOtherAgentDragStart(e, i)}
                    onClick={(e) => e.stopPropagation()}
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to move"
                    title={`${agent.name}'s agent`}
                  >
                    {agent.name}&apos;s agent
                  </span>
                </div>
                {!isViewingPreviousOnly && (
                  <div className="threadPageStatusOutputBody">
                    <div className="threadPageAgentBlockContent">
                      {agent.error && (
                        <p className="threadPageStatusErrorText">{agent.error}</p>
                      )}
                      {agent.turns.map((turn, j) => (
                        <div key={j} className={`threadPageTurn threadPageTurn_${turn.role} ${turn.role === "other_agent" ? `threadPageTurn_other_index_${i}` : ""}`}>
                          <p className="threadPageTurnMessage">{turn.message}</p>
                        </div>
                      ))}
                      {agent.done && agent.finalResult != null && (
                        <>
                          <p className="threadPageFinalResultLabel">Final result</p>
                          <p className="threadPageFinalResult">{agent.finalResult}</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Fullscreen overlay on hover */}
            {statusHoverFullscreen && (geminiLoading || (geminiLastPrompt != null && (geminiResponse !== null || geminiError))) && (
              <div
                className="threadPageStatusFullscreenOverlay"
                onMouseLeave={() => { if (!statusModalOpen) setStatusHoverFullscreen(false); }}
                onClick={() => { setStatusModalOpen(true); setStatusHoverFullscreen(false); }}
                role="presentation"
              >
                <div className="threadPageStatusFullscreenContent">
                  {geminiLoading && (
                    <div className="threadPageStatusBox threadPageStatusBoxFullscreen" aria-live="polite">
                      <span className="threadPageStatusAgentName">AI (Yours)</span>
                      <div className="threadPageStatusRingWrap">
                        <svg className="threadPageStatusRing" viewBox="0 0 36 36" aria-hidden>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="threadPageStatusRingBg" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${Math.min((geminiElapsedSec / Math.max(1, geminiEstimateSec)) * 100.5, 100.5)} 100.5`} strokeLinecap="round" className="threadPageStatusRingProgress" />
                        </svg>
                        <div className="threadPageStatusIconWrap">
                          <div className="threadPageCenterSpinner threadPageStatusSpinner" aria-hidden />
                        </div>
                      </div>
                      <div className="threadPageStatusTime">
                        <span className="threadPageStatusElapsed">{Math.floor(geminiElapsedSec / 60)}:{String(geminiElapsedSec % 60).padStart(2, "0")}</span>
                        <span className="threadPageStatusEst"> / ~{geminiEstimateSec}s</span>
                      </div>
                      <div className="threadPageStatusGenerating threadPageStatusGeneratingLive threadPageStatusGeneratingFullscreen">
                        {geminiLiveText ? <span className="threadPageStatusLiveText">{geminiLiveText}</span> : "Planning…"}
                      </div>
                      <button type="button" className="threadPageCenterHeaderStop threadPageStatusStop" onClick={handleStopGemini} aria-label="Stop">Stop</button>
                    </div>
                  )}
                  {!geminiLoading && geminiLastPrompt != null && (geminiResponse !== null || geminiError) && (
                    <>
                      {geminiError && (
                        <span className="threadPageStatusErrorBadge threadPageStatusErrorBadgeFullscreen" aria-hidden>
                          <span className="threadPageStatusErrorBadgeCircle" /><span className="threadPageStatusErrorBadgeX">✕</span>
                        </span>
                      )}
                      {!geminiError && geminiResponse !== null && (
                        <span className="threadPageStatusSuccessBadge threadPageStatusSuccessBadgeFullscreen" aria-hidden>
                          <span className="threadPageStatusSuccessBadgeCircle" /><span className="threadPageStatusSuccessCheck">✓</span>
                        </span>
                      )}
                      <div className="threadPageStatusBox threadPageStatusBoxOutput threadPageStatusBoxOutputFullscreen">
                        <div className="threadPageStatusOutputHead">
                          <span className="threadPageStatusTitleLine" title="AI (Yours)">
                            AI (Yours)
                          </span>
                        </div>
                        <div className="threadPageStatusOutputBody threadPageStatusOutputBodyExpanded">
                          {geminiError ? (
                            <span className="threadPageStatusErrorText">{geminiError}</span>
                          ) : showDoneView ? (
                            <>
                              <div className="threadPageStatusDoneMessage" aria-live="polite">
                                {doneViewMessage}
                              </div>
                              {conversing && (
                                <p className="threadPageStatusDoneHint">
                                  Connecting with {otherPartyNames || "their"} agent… (this may take a minute)
                                </p>
                              )}
                              {conversationError && (
                                <div className="threadPageConversationError" role="alert">
                                  <p className="threadPageStatusErrorText">Agent conversation: {conversationError}</p>
                                  <p className="threadPageStatusDoneHint">
                                    Add OPENROUTER_API_KEY to .env.local to enable agent-to-agent conversation.
                                  </p>
                                </div>
                              )}
                              {((otherAgents.length > 0 && otherAgents[0].turns.length > 0) || liveTurns.length > 0 || conversationFinalResult != null) && (
                                <div className="threadPageConversation">
                                  <p className="threadPageStatusDoneHint">AI (Yours) ↔ {otherAgents[0]?.name ?? "other"}</p>
                                  {(otherAgents.length > 0 ? otherAgents[0].turns : liveTurns).map((turn, i) => (
                                    <div key={i} className={`threadPageTurn threadPageTurn_${turn.role}`}>
                                      <p className="threadPageTurnMessage">{turn.message}</p>
                                    </div>
                                  ))}
                                  {conversationFinalResult != null && (
                                    <>
                                      <p className="threadPageFinalResultLabel">Final result</p>
                                      <p className="threadPageFinalResult">{conversationFinalResult}</p>
                                      <p className="threadPageStatusDoneHint">Saved to thread.</p>
                                    </>
                                  )}
                                </div>
                              )}
                              <details className="threadPageStatusDetails">
                                <summary>Details</summary>
                                <pre className="threadPageStatusOutputText">{detailsContent}</pre>
                              </details>
                            </>
                          ) : (
                            (() => {
                              const { mainBody, conflicts } = parseReplyAndConflicts(geminiResponse || "");
                              return (
                                <>
                                  <pre className="threadPageStatusOutputText">{mainBody || "(empty)"}</pre>
                                  {conflicts.length > 0 && (
                                    <div className="threadPageStatusConflicts">
                                      <span className="threadPageStatusConflictsLabel">Conflicts to verify</span>
                                      <ul className="threadPageStatusConflictsList">{conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul>
                                    </div>
                                  )}
                                  {executing && (
                                    <div className="threadPageStatusActions">
                                      <span className="threadPageMuted">{executingLabel}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Modal on click */}
            {statusModalOpen && (geminiLoading || (geminiLastPrompt != null && (geminiResponse !== null || geminiError))) && (
              <div className="threadPageStatusModalOverlay" onClick={() => { setStatusModalOpen(false); setStatusHoverFullscreen(false); }} role="dialog" aria-modal="true" aria-label="Full output">
                <div className="threadPageStatusModal" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="threadPageStatusModalClose" onClick={() => { setStatusModalOpen(false); setStatusHoverFullscreen(false); }} aria-label="Close">×</button>
                  {geminiLoading && (
                    <div className="threadPageStatusBox threadPageStatusBoxModal" aria-live="polite">
                      <span className="threadPageStatusAgentName">AI (Yours)</span>
                      <div className="threadPageStatusRingWrap">
                        <svg className="threadPageStatusRing" viewBox="0 0 36 36" aria-hidden>
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="threadPageStatusRingBg" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${Math.min((geminiElapsedSec / Math.max(1, geminiEstimateSec)) * 100.5, 100.5)} 100.5`} strokeLinecap="round" className="threadPageStatusRingProgress" />
                        </svg>
                        <div className="threadPageStatusIconWrap">
                          <div className="threadPageCenterSpinner threadPageStatusSpinner" aria-hidden />
                        </div>
                      </div>
                      <div className="threadPageStatusTime">
                        <span className="threadPageStatusElapsed">{Math.floor(geminiElapsedSec / 60)}:{String(geminiElapsedSec % 60).padStart(2, "0")}</span>
                        <span className="threadPageStatusEst"> / ~{geminiEstimateSec}s</span>
                      </div>
                      <div className="threadPageStatusGenerating threadPageStatusGeneratingLive threadPageStatusGeneratingModal">
                        {geminiLiveText ? <span className="threadPageStatusLiveText">{geminiLiveText}</span> : "Planning…"}
                      </div>
                      <button type="button" className="threadPageCenterHeaderStop threadPageStatusStop" onClick={handleStopGemini} aria-label="Stop">Stop</button>
                    </div>
                  )}
                  {!geminiLoading && geminiLastPrompt != null && (geminiResponse !== null || geminiError) && (
                    <>
                      {geminiError && (
                        <span className="threadPageStatusErrorBadge threadPageStatusErrorBadgeModal" aria-hidden>
                          <span className="threadPageStatusErrorBadgeCircle" /><span className="threadPageStatusErrorBadgeX">✕</span>
                        </span>
                      )}
                      {!geminiError && geminiResponse !== null && (
                        <span className="threadPageStatusSuccessBadge threadPageStatusSuccessBadgeModal" aria-hidden>
                          <span className="threadPageStatusSuccessBadgeCircle" /><span className="threadPageStatusSuccessCheck">✓</span>
                        </span>
                      )}
                      <div className="threadPageStatusBox threadPageStatusBoxOutput threadPageStatusBoxOutputModal">
                        <div className="threadPageStatusOutputHead">
                          <span className="threadPageStatusTitleLine" title="AI (Yours)">
                            AI (Yours)
                          </span>
                        </div>
                        <div className="threadPageStatusOutputBody threadPageStatusOutputBodyModal">
                          {geminiError ? (
                            <span className="threadPageStatusErrorText">{geminiError}</span>
                          ) : showDoneView ? (
                            <>
                              <div className="threadPageStatusDoneMessage" aria-live="polite">
                                {doneViewMessage}
                              </div>
                              {conversing && (
                                <p className="threadPageStatusDoneHint">
                                  Connecting with {otherPartyNames || "their"} agent…
                                </p>
                              )}
                              {conversationError && (
                                <div className="threadPageConversationError" role="alert">
                                  <p className="threadPageStatusErrorText">Agent conversation: {conversationError}</p>
                                  <p className="threadPageStatusDoneHint">
                                    Add OPENROUTER_API_KEY to .env.local to enable agent-to-agent conversation.
                                  </p>
                                </div>
                              )}
                              {(liveTurns.length > 0 || conversationFinalResult != null) && (
                                <div className="threadPageConversation">
                                  <p className="threadPageStatusDoneHint">AI (Yours) ↔ {otherAgents[0]?.name ?? "other"}</p>
                                  {(otherAgents.length > 0 ? otherAgents[0].turns : liveTurns).map((turn, i) => (
                                    <div key={i} className={`threadPageTurn threadPageTurn_${turn.role}`}>
                                      <p className="threadPageTurnMessage">{turn.message}</p>
                                    </div>
                                  ))}
                                  {conversationFinalResult != null && (
                                    <>
                                      <p className="threadPageFinalResultLabel">Final result</p>
                                      <p className="threadPageFinalResult">{conversationFinalResult}</p>
                                      <p className="threadPageStatusDoneHint">Saved to thread.</p>
                                    </>
                                  )}
                                </div>
                              )}
                              <details className="threadPageStatusDetails">
                                <summary>Details</summary>
                                <pre className="threadPageStatusOutputText">{detailsContent}</pre>
                              </details>
                            </>
                          ) : (
                            (() => {
                              const { mainBody, conflicts } = parseReplyAndConflicts(geminiResponse || "");
                              return (
                                <>
                                  <pre className="threadPageStatusOutputText">{mainBody || "(empty)"}</pre>
                                  {conflicts.length > 0 && (
                                    <div className="threadPageStatusConflicts">
                                      <span className="threadPageStatusConflictsLabel">Conflicts to verify</span>
                                      <ul className="threadPageStatusConflictsList">{conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul>
                                    </div>
                                  )}
                                  {executing && (
                                    <div className="threadPageStatusActions">
                                      <span className="threadPageMuted">{executingLabel}</span>
                                    </div>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
        )}
      </div>

      {!loading && !notFound && (
        <div className="threadPageChatbox">
          <div className="threadPageChatboxInner">
            {lastSubmittedTokens.length > 0 && (
              <div className="threadPageComposedBar" aria-live="polite">
                <span className="threadPageComposedPrefix">You asked to </span>
                {lastSubmittedTokens.map((t, i) =>
                  t.type === "text" ? (
                    <span key={i} className="threadPageComposedText">{t.value}</span>
                  ) : t.type === "mention" ? (
                    <span key={i} className="threadPageChatboxChip threadPageChatboxChipMention threadPageComposedChip">
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span key={i} className="threadPageChatboxChip threadPageChatboxChipTask threadPageComposedChip">
                      <span className="threadPageChatboxChipSymbol">&gt;</span>
                      {t.label}
                    </span>
                  )
                )}
              </div>
            )}
            <div className="threadPageChatboxRow">
              <div
                ref={fieldRef}
                className="threadPageChatboxField"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-token-index]") == null) inputRef.current?.focus();
                }}
              >
                {tokens.map((t, i) => {
                  const common = {
                    "data-token-index": i,
                    tabIndex: 0,
                    role: "button" as const,
                    onFocus: () => setFocusedTokenIndex(i),
                    onKeyDown: (ev: React.KeyboardEvent) => handleTokenKeyDown(ev, i),
                    className: "threadPageChatboxTokenFocusable",
                  };
                  return t.type === "text" ? (
                    <span key={i} {...common} className="threadPageChatboxText threadPageChatboxTokenFocusable">
                      {t.value}
                    </span>
                  ) : t.type === "mention" ? (
                    <span key={i} {...common} className="threadPageChatboxChip threadPageChatboxChipMention threadPageChatboxTokenFocusable">
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span key={i} {...common} className="threadPageChatboxChip threadPageChatboxChipTask threadPageChatboxTokenFocusable">
                      <span className="threadPageChatboxChipSymbol">&gt;</span>
                      {t.label}
                    </span>
                  );
                })}
                <input
                  ref={inputRef}
                  type="text"
                  className="threadPageChatboxInput"
                  placeholder={tokens.length === 0 ? "Message… @ people in your org, > task" : ""}
                  value={inputDisplayValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setFocusedTokenIndex(null)}
                  aria-label="Chat input"
                  autoComplete="off"
                />
              </div>
              {showDropdown && (
                <div className="threadPageChatboxDropdown" role="listbox">
                  {dropdownOptions.map((opt, i) => (
                    <button
                      key={`${mode}-${i}-${opt}`}
                      type="button"
                      role="option"
                      aria-selected={i === dropdownIndex}
                      className={`threadPageChatboxDropdownItem ${i === dropdownIndex ? "threadPageChatboxDropdownItemActive" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (mode === "mention") setTokens((prev) => [...prev, { type: "mention", label: opt }]);
                        else setTokens((prev) => [...prev, { type: "task", label: opt }]);
                        setMode("text");
                        setBuffer("");
                        setDropdownIndex(0);
                        inputRef.current?.focus();
                      }}
                    >
                      {mode === "mention" ? opt : opt}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="threadPageChatboxSend"
                aria-label="Plan / Send"
                onClick={handleSendFromChat}
                disabled={geminiLoading || !getChatPromptText()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <line x1="7" y1="14" x2="17" y2="14" />
                  <line x1="7" y1="18" x2="13" y2="18" />
                </svg>
              </button>
            </div>
            <p className="threadPageChatboxLegend">
              <span><strong>@</strong> people in your organization</span>
              <span><strong>{">"}</strong> task</span>
              <span>ESC to finish</span>
              <span><strong>Ctrl+Enter</strong> or <strong>⌘+Enter</strong> to send</span>
            </p>
          </div>
        </div>
      )}

      <style>{threadPageCss}</style>
    </main>
  );
}

const threadPageCss = `
:root{
  --thread-text:#0f172a;
  --thread-muted:#5b6475;
  --thread-border:rgba(15,23,42,.10);
  --thread-accent:#2563eb;
  --thread-accent2:#7c3aed;
}
.threadPageWrap{
  min-height:100vh;
  background:#dde2f0;
  background-image:linear-gradient(165deg, #f0f4ff 0%, #e2e8f7 40%, #d4dbf0 100%);
  position:relative;
}
.threadPageWrap::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(120deg, rgba(37,99,235,.22) 0%, transparent 45%, rgba(124,58,237,.18) 100%);
}
.threadPageWrap::after{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(circle, rgba(167,139,250,.36) 1.5px, transparent 1.5px),
    radial-gradient(circle, rgba(129,140,248,.26) 1px, transparent 1px);
  background-size: 32px 32px, 18px 18px;
  background-position: 0 0, 9px 9px;
}
.threadPageWrap > *{position:relative;z-index:1}

.threadPageTopbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--thread-border);
}
.threadPageContainer{max-width:1100px;margin:0 auto;padding:0 20px}
.threadPageTopbarInner{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px 0;
}
.threadPageBrand{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}
.threadPageLogoWrap{
  flex-shrink:0;
  width:88px;height:88px;
  display:block;
  line-height:0;
}
.threadPageLogoWrap img{width:100%;height:100%;object-fit:contain;display:block}
.threadPageBrandText{display:flex;flex-direction:column;gap:2px}
.threadPageBrandTitle{font-size:18px;font-weight:900;letter-spacing:-.02em;color:var(--thread-text)}
.threadPageBrandSub{font-size:14px;color:var(--thread-muted);font-weight:500}

.threadPageProfileWrap{position:relative}
.threadPageAvatar{
  width:44px;height:44px;
  border-radius:12px;
  background:linear-gradient(135deg, var(--thread-accent), var(--thread-accent2));
  color:#fff;
  border:1px solid rgba(37,99,235,.25);
  cursor:pointer;
  display:grid;place-items:center;
  box-shadow:0 4px 12px rgba(37,99,235,.15);
  transition:transform .15s ease, box-shadow .15s ease;
}
.threadPageAvatar:hover{
  transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(37,99,235,.25);
}
.threadPageProfileMenu{
  position:absolute;
  right:0;
  top:calc(100% + 10px);
  min-width:200px;
  background:rgba(255,255,255,.98);
  backdrop-filter:blur(12px);
  border:1px solid var(--thread-border);
  border-radius:16px;
  box-shadow:0 10px 40px rgba(15,23,42,.12);
  overflow:hidden;
}
.threadPageProfileItem{
  display:flex;
  align-items:center;
  gap:12px;
  width:100%;
  padding:12px 16px;
  font-size:14px;
  font-weight:600;
  font-family:inherit;
  border:none;
  background:none;
  cursor:pointer;
  text-decoration:none;
  color:var(--thread-text);
  transition:background .15s ease;
  text-align:left;
  box-sizing:border-box;
}
.threadPageProfileIcon{
  flex-shrink:0;
  width:36px;height:36px;
  border-radius:10px;
  display:grid;
  place-items:center;
  color:var(--thread-muted);
}
.threadPageProfileItemLink{color:var(--thread-text)}
.threadPageProfileItemLink:hover{background:rgba(37,99,235,.06)}
.threadPageProfileDivider{height:1px;background:var(--thread-border);margin:0 12px}
.threadPageProfileItemLogout{color:#dc2626}
.threadPageProfileItemLogout:hover{background:rgba(220,38,38,.08)}

.threadPageMain{
  max-width:1100px;
  margin:0 auto;
  padding:32px 20px;
  padding-bottom:calc(120px + 50vh);
  min-height:60vh;
  box-sizing:border-box;
}
.threadPageThreadContext{
  display:flex;
  align-items:center;
  gap:16px;
  flex-wrap:wrap;
  margin-bottom:20px;
}
.threadPageBackLink{
  font-size:14px;
  font-weight:600;
  color:var(--thread-accent);
  text-decoration:none;
}
.threadPageBackLink:hover{text-decoration:underline}
.threadPageThreadLabel{
  font-size:13px;
  font-weight:600;
  color:var(--thread-muted);
  text-transform:uppercase;
  letter-spacing:.04em;
}
.threadPageMuted{color:var(--thread-muted);font-size:14px}
.threadPageLink{color:var(--thread-accent);font-weight:600}
.threadPageLink:hover{text-decoration:underline}

.threadPageCenterHeader{
  max-width:1100px;
  margin:0 auto;
  padding:0 20px 16px;
  border-bottom:1px solid var(--thread-border);
}
.threadPageCenterHeaderInner{
  max-width:560px;
  margin:0 auto;
}
.threadPageCenterHeaderLabel{
  display:block;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:var(--thread-muted);
  margin-bottom:6px;
}
.threadPageCenterHeaderPrompt{
  font-size:15px;
  font-weight:600;
  color:var(--thread-text);
  margin:0 0 10px;
  line-height:1.4;
}
.threadPageCenterHeaderMeta{
  display:flex;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
}
.threadPageCenterHeaderTimer{
  font-size:13px;
  color:var(--thread-muted);
  font-weight:500;
}
.threadPageCenterHeaderStop{
  font-size:12px;
  font-weight:600;
  color:#dc2626;
  background:none;
  border:1px solid rgba(220,38,38,.4);
  border-radius:8px;
  padding:4px 10px;
  cursor:pointer;
  font-family:inherit;
  transition:background .15s ease, color .15s ease;
}
.threadPageCenterHeaderStop:hover{
  background:rgba(220,38,38,.08);
}

.threadPageCenterBlock{
  position:relative;
  display:flex;
  justify-content:center;
  align-items:flex-start;
  min-height:320px;
  padding:24px 0;
}
.threadPageCenterCard{
  width:100%;
  max-width:560px;
  background:rgba(255,255,255,.92);
  border:1px solid var(--thread-border);
  border-radius:16px;
  padding:28px 24px;
  box-shadow:0 4px 20px rgba(15,23,42,.06);
  transition:min-height .2s ease, padding .2s ease;
}
.threadPageCenterCardLoading{
  min-height:220px;
  max-width:200px;
  margin:0 auto;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px 16px;
}
.threadPageCenterCardHasOutput{
  min-height:240px;
}

.threadPageStatusBox{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:12px;
  width:100%;
  max-width:180px;
}
.threadPageCenterCardOutput .threadPageStatusBox{
  max-width:none;
  align-items:stretch;
}
.threadPageStatusAgentName{
  display:block;
  font-size:12px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.06em;
  color:var(--thread-muted);
  margin-bottom:2px;
}
.threadPageStatusAgentNameDraggable{
  cursor:grab;
  user-select:none;
  padding:4px 0;
  margin:-4px 0 2px;
  border-radius:6px;
}
.threadPageStatusAgentNameDraggable:active{
  cursor:grabbing;
}
.threadPageCenterCardDormant{
  min-height:220px;
  max-width:200px;
  margin:0 auto;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px 16px;
}
.threadPageStatusBoxDormant .threadPageCenterCardHasOutput{min-height:auto}
.threadPageStatusRingWrap{
  position:relative;
  width:88px;
  height:88px;
  flex-shrink:0;
}
.threadPageStatusRing{
  width:100%;
  height:100%;
  transform:rotate(-90deg);
  color:var(--thread-accent);
}
.threadPageStatusRingBg{
  opacity:.2;
}
.threadPageStatusRingProgress{
  transition:stroke-dasharray .4s ease;
}
.threadPageStatusIconWrap{
  position:absolute;
  inset:0;
  display:grid;
  place-items:center;
}
.threadPageCenterSpinner{
  width:32px;
  height:32px;
  border:2px solid var(--thread-border);
  border-top-color:var(--thread-accent);
  border-radius:50%;
  animation:threadPageSpin .85s linear infinite;
}
.threadPageStatusSpinner{
  margin:0;
}
.threadPageStatusClock{
  width:32px;
  height:32px;
  color:var(--thread-muted);
}
.threadPageStatusTime{
  font-size:13px;
  font-weight:600;
  color:var(--thread-text);
}
.threadPageStatusEst{
  font-weight:500;
  color:var(--thread-muted);
}
.threadPageStatusGenerating{
  font-size:12px;
  font-weight:600;
  color:var(--thread-muted);
  text-transform:uppercase;
  letter-spacing:.04em;
  padding:6px 10px;
  background:rgba(15,23,42,.06);
  border-radius:8px;
  border:1px solid var(--thread-border);
  width:100%;
  max-width:100%;
  box-sizing:border-box;
}
.threadPageStatusGeneratingLive{
  min-height:2.5em;
  max-height:120px;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
  text-transform:none;
  letter-spacing:0;
}
.threadPageStatusLiveText{
  display:block;
  font-size:11px;
  font-weight:500;
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
  line-height:1.4;
}
.threadPageCenterCardOutput{
  min-height:220px;
  max-height:min(70vh, 520px);
  width:100%;
  max-width:100%;
  margin:0;
  display:flex;
  flex-direction:column;
  align-items:stretch;
  justify-content:flex-start;
  padding:20px 16px;
  position:relative;
  overflow:hidden;
  box-sizing:border-box;
}
.threadPageStatusBoxOutput{
  width:100%;
  min-width:0;
  max-width:100%;
  display:flex;
  flex-direction:column;
  gap:10px;
  box-sizing:border-box;
  flex:1;
  min-height:0;
  overflow:hidden;
}
.threadPageStatusErrorBadge{
  position:absolute;
  top:-14px;
  right:-14px;
  z-index:3;
  display:flex;
  align-items:center;
  justify-content:center;
  width:44px;
  height:44px;
  flex-shrink:0;
  pointer-events:none;
}
.threadPageStatusErrorBadgeCircle{
  position:absolute;
  inset:0;
  border-radius:50%;
  background:#dc2626;
  border:3px solid #fff;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
}
.threadPageStatusErrorBadgeX{
  position:relative;
  font-size:24px;
  font-weight:700;
  color:#fff;
  line-height:1;
}
.threadPageStatusSuccessBadge{
  position:absolute;
  top:-14px;
  right:-14px;
  z-index:3;
  display:flex;
  align-items:center;
  justify-content:center;
  width:44px;
  height:44px;
  flex-shrink:0;
  pointer-events:none;
}
.threadPageStatusSuccessBadgeCircle{
  position:absolute;
  inset:0;
  border-radius:50%;
  background:#16a34a;
  border:3px solid #fff;
  box-shadow:0 2px 8px rgba(0,0,0,.25);
}
.threadPageStatusSuccessCheck{
  position:relative;
  font-size:22px;
  font-weight:700;
  color:#fff;
  line-height:1;
}
.threadPageStatusOutputHead{
  display:flex;
  align-items:flex-start;
  justify-content:flex-start;
  gap:0;
  position:relative;
  min-width:0;
  max-width:100%;
  overflow:hidden;
  flex-shrink:0;
}
.threadPageStatusOutputHead .threadPageStatusAgentName{
  flex-shrink:0;
}
.threadPageStatusOutputHead .threadPageStatusTitleLine{
  display:block;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:0;
  max-width:100%;
  font-size:12px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.06em;
  color:var(--thread-muted);
}
.threadPageStatusRecipient{
  font-size:12px;
  font-weight:600;
  color:var(--thread-muted);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:0;
  max-width:120px;
}
.threadPageConversationCheck{
  font-size:10px;
  font-weight:700;
  color:#16a34a;
  margin-left:2px;
  vertical-align:super;
  line-height:0;
}
.threadPageAgentBlockDoneBadge{
  position:absolute;
  top:-12px;
  right:-12px;
  z-index:3;
  display:flex;
  align-items:center;
  justify-content:center;
  width:36px;
  height:36px;
  flex-shrink:0;
  pointer-events:none;
}
.threadPageAgentBlockDoneBadgeCircle{
  position:absolute;
  inset:0;
  border-radius:50%;
  background:#16a34a;
  border:2px solid #fff;
  box-shadow:0 2px 6px rgba(0,0,0,.25);
}
.threadPageAgentBlockDoneBadgeCheck{
  position:relative;
  font-size:18px;
  font-weight:700;
  color:#fff;
  line-height:1;
}
.threadPageStatusDoneMessage{
  font-size:14px;
  font-weight:600;
  color:var(--thread-text);
  margin-bottom:6px;
  padding:8px 0 0;
}
.threadPageStatusDoneHint{
  font-size:12px;
  color:var(--thread-muted);
  margin:0 0 10px;
  padding:0;
}
.threadPageConversationError{
  margin-top:10px;
  padding:10px 12px;
  border-radius:8px;
  border:1px solid #dc2626;
  background:rgba(220,38,38,.08);
}
.threadPageConversationError .threadPageStatusErrorText{
  margin:0 0 4px;
}
.threadPageConversationError .threadPageStatusDoneHint{
  margin:0;
  font-size:11px;
}
.threadPageStatusDetails{
  font-size:12px;
  margin-top:6px;
}
.threadPageStatusDetails summary{
  cursor:pointer;
  color:var(--thread-muted);
  font-weight:500;
}
.threadPageStatusDetails pre{
  margin-top:8px;
  font-size:11px;
  max-height:120px;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
}
.threadPageConversation{
  margin-top:10px;
  margin-bottom:10px;
}
.threadPageTurns{
  display:flex;
  flex-direction:column;
  gap:10px;
  margin:8px 0;
}
.threadPageTurn{
  padding:8px 10px;
  border-radius:8px;
  border:1px solid var(--thread-border);
  background:rgba(15,23,42,.04);
}
.threadPageTurn_our_agent{
  border-left:4px solid #2563eb;
  background:rgba(37,99,235,.08);
}
.threadPageTurn_other_agent,
.threadPageTurn_other_index_0{
  border-left:4px solid #0d9488;
  background:rgba(13,148,136,.08);
}
.threadPageTurn_other_index_1{
  border-left:4px solid #7c3aed;
  background:rgba(124,58,237,.08);
}
.threadPageTurn_other_index_2{
  border-left:4px solid #dc2626;
  background:rgba(220,38,38,.08);
}
.threadPageTurn_other_index_3{
  border-left:4px solid #ca8a04;
  background:rgba(202,138,4,.08);
}
.threadPageTurn_other_index_4{
  border-left:4px solid #db2777;
  background:rgba(219,39,119,.08);
}
.threadPageTurn_our_agent .threadPageTurnMessage,
.threadPageTurn_other_agent .threadPageTurnMessage{color:var(--thread-text)}
.threadPageTurnAgent{
  font-size:11px;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:.05em;
  color:var(--thread-muted);
  display:block;
  margin-bottom:4px;
}
.threadPageTurnMessage{
  font-size:12px;
  color:var(--thread-text);
  margin:0;
  line-height:1.45;
  white-space:pre-wrap;
  word-break:break-word;
}
.threadPageFinalResultLabel{
  font-size:11px;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:.05em;
  color:var(--thread-muted);
  margin:12px 0 4px;
}
.threadPageFinalResult{
  font-size:13px;
  font-weight:500;
  color:var(--thread-text);
  margin:0 0 8px;
  line-height:1.5;
}
.threadPageAgentBlockContent{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.threadPageAgentBlockOther{
  display:flex;
  flex-direction:column;
  width:100%;
  max-width:160px;
  box-sizing:border-box;
  overflow:visible;
}
.threadPageAgentBlockOtherPrevious{
  min-height:0;
  max-height:none;
}
.threadPageAgentBlockOther .threadPageStatusOutputHead{
  flex-shrink:0;
}
.threadPageAgentBlockOther .threadPageStatusOutputBody{
  flex:1;
  min-width:0;
}
.threadPageAgentBlockOther .threadPageTurnMessage{
  margin:0;
}
.threadPageConnectionSvg{
  overflow:visible;
  position:absolute;
  z-index:0;
  pointer-events:none;
}
.threadPageCenterCardOutput,
.threadPageAgentBlockOther{
  position:relative;
  z-index:1;
}
.threadPageConnectionLine{
  transition:stroke-opacity .2s;
}
.threadPageConnectionLine_pulse{
  stroke-opacity:0.9;
}
.threadPageConnectionPulse{
  filter:drop-shadow(0 0 4px var(--thread-text));
}
@keyframes threadPagePulse{
  0%,100%{ opacity:0.7; }
  50%{ opacity:1; }
}
.threadPageStatusOutputBody{
  flex:1;
  min-width:0;
  min-height:100px;
  max-height:160px;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
  background:rgba(15,23,42,.06);
  border:1px solid var(--thread-border);
  border-radius:10px;
  padding:10px 12px;
}
.threadPageStatusOutputText{
  font-size:12px;
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
  margin:0;
  font-family:inherit;
  line-height:1.5;
}
.threadPageStatusErrorText{
  font-size:13px;
  color:#dc2626;
  font-weight:500;
}
.threadPageStatusConflicts{
  margin-top:10px;
  padding-top:10px;
  border-top:1px solid var(--thread-border);
}
.threadPageStatusConflictsLabel{
  display:block;
  font-size:10px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:var(--thread-muted);
  margin-bottom:6px;
}
.threadPageStatusConflictsList{
  margin:0;
  padding-left:18px;
  font-size:11px;
  color:var(--thread-text);
  line-height:1.45;
}
.threadPageStatusConflictsList li{
  margin-bottom:2px;
}
.threadPageStatusActions{
  display:flex;
  gap:8px;
  margin-top:12px;
  padding-top:10px;
  border-top:1px solid var(--thread-border);
}
.threadPageStatusApprove,.threadPageStatusCancel{
  padding:8px 14px;
  border-radius:8px;
  font-size:13px;
  font-weight:600;
  cursor:pointer;
  border:1px solid var(--thread-border);
  background:#fff;
  color:var(--thread-text);
  transition:background .15s ease, color .15s ease;
}
.threadPageStatusApprove{
  background:linear-gradient(135deg, var(--thread-accent), var(--thread-accent2));
  color:#fff;
  border-color:transparent;
}
.threadPageStatusApprove:hover:not(:disabled){
  filter:brightness(1.05);
}
.threadPageStatusCancel:hover:not(:disabled){
  background:rgba(15,23,42,.06);
}
.threadPageStatusApprove:disabled,.threadPageStatusCancel:disabled{
  opacity:.7;
  cursor:not-allowed;
}
.threadPageStatusHint{
  text-transform:none;
  letter-spacing:0;
  font-weight:500;
  text-align:center;
  line-height:1.3;
}
.threadPageStatusStop{
  margin-top:4px;
}

/* Status card hover fullscreen + modal */
.threadPageStatusCardWrap{
  cursor:pointer;
  position:relative;
  z-index:1;
  width:100%;
  max-width:180px;
  min-width:140px;
  margin:0 auto;
  min-height:320px;
}
.threadPageStatusFullscreenOverlay{
  position:fixed;
  inset:0;
  z-index:1000;
  background:rgba(15,23,42,.5);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  animation:threadPageStatusFadeIn .2s ease;
  cursor:pointer;
}
@keyframes threadPageStatusFadeIn{
  from{opacity:0}
  to{opacity:1}
}
.threadPageStatusFullscreenContent{
  max-width:min(90vw, 520px);
  max-height:85vh;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
  background:#fff;
  border-radius:16px;
  box-shadow:0 24px 48px rgba(0,0,0,.2);
  border:1px solid var(--thread-border);
  padding:24px;
  position:relative;
}
.threadPageStatusBoxFullscreen{
  max-width:100%;
  width:100%;
}
.threadPageStatusBoxFullscreen .threadPageStatusRingWrap{width:120px;height:120px}
.threadPageStatusGeneratingFullscreen{
  max-height:50vh;
  min-height:80px;
}
.threadPageStatusOutputBodyExpanded{
  max-height:60vh;
  min-height:120px;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
}
.threadPageStatusErrorBadgeFullscreen{top:8px;right:8px}
.threadPageStatusSuccessBadgeFullscreen{top:8px;right:8px}

.threadPageStatusModalOverlay{
  position:fixed;
  inset:0;
  z-index:1001;
  background:rgba(15,23,42,.5);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  animation:threadPageStatusFadeIn .2s ease;
}
.threadPageStatusModal{
  position:relative;
  width:100%;
  max-width:min(90vw, 720px);
  max-height:90vh;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
  background:#fff;
  border-radius:16px;
  box-shadow:0 24px 48px rgba(0,0,0,.2);
  border:1px solid var(--thread-border);
  padding:32px 40px 32px 32px;
}
.threadPageStatusModalClose{
  position:absolute;
  top:12px;
  right:12px;
  width:36px;
  height:36px;
  border:none;
  background:rgba(15,23,42,.08);
  border-radius:10px;
  font-size:24px;
  line-height:1;
  color:var(--thread-text);
  cursor:pointer;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0;
  transition:background .15s ease;
}
.threadPageStatusModalClose:hover{
  background:rgba(15,23,42,.14);
}
.threadPageStatusBoxModal{max-width:100%;width:100%}
.threadPageStatusBoxModal .threadPageStatusRingWrap{width:100px;height:100px}
.threadPageStatusGeneratingModal{max-height:45vh;min-height:80px}
.threadPageStatusBoxOutputModal{max-width:100%;width:100%}
.threadPageStatusOutputBodyModal{
  max-height:65vh;
  min-height:160px;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
}
.threadPageStatusErrorBadgeModal{top:8px;right:8px}
.threadPageStatusSuccessBadgeModal{top:8px;right:8px}

@keyframes threadPageSpin{
  to{transform:rotate(360deg)}
}

.threadPageCenterError{
  font-size:14px;
  color:#dc2626;
  margin:0;
  padding:12px 0;
}

.threadPageCenterResult{
  display:flex;
  flex-direction:column;
  gap:20px;
}
.threadPageCenterPromptRow{
  padding-bottom:16px;
  border-bottom:1px solid var(--thread-border);
}
.threadPageCenterResultLabel{
  display:block;
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:var(--thread-muted);
  margin-bottom:8px;
}
.threadPageCenterPromptText{
  font-size:14px;
  color:var(--thread-text);
  margin:0;
  line-height:1.5;
  white-space:pre-wrap;
  word-break:break-word;
}
.threadPageCenterOutputWrap{
  flex:1;
  display:flex;
  flex-direction:column;
  min-height:120px;
}
.threadPageCenterReplyHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:8px;
}
.threadPageCenterExpandBtn{
  font-size:12px;
  font-weight:600;
  color:var(--thread-accent);
  background:none;
  border:none;
  cursor:pointer;
  padding:4px 8px;
  border-radius:6px;
  font-family:inherit;
  transition:background .15s ease, color .15s ease;
}
.threadPageCenterExpandBtn:hover{
  background:rgba(37,99,235,.08);
  color:var(--thread-accent);
}
.threadPageCenterOutputBox{
  flex:1;
  min-height:140px;
  max-height:50vh;
  overflow:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
  background:rgba(15,23,42,.04);
  border:1px solid var(--thread-border);
  border-radius:12px;
  padding:14px 16px;
}
.threadPageCenterOutputText{
  font-size:14px;
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
  margin:0;
  font-family:inherit;
  line-height:1.55;
}
.threadPageCenterConflicts{
  margin-top:16px;
  padding-top:16px;
  border-top:1px solid var(--thread-border);
}
.threadPageCenterConflictsList{
  margin:8px 0 0;
  padding-left:20px;
  font-size:13px;
  color:var(--thread-text);
  line-height:1.5;
}
.threadPageCenterConflictsList li{
  margin-bottom:4px;
}

.threadPageChatbox{
  position:fixed;
  bottom:0;
  left:50%;
  transform:translateX(-50%);
  width:100%;
  max-width:min(calc(100vw - 40px), 960px);
  z-index:40;
  background:rgba(255,255,255,.92);
  backdrop-filter:blur(12px);
  border:1px solid var(--thread-border);
  border-bottom:none;
  border-radius:20px 20px 0 0;
  padding:12px 20px 20px;
  box-shadow:0 -4px 24px rgba(15,23,42,.08);
  box-sizing:border-box;
}
.threadPageChatboxInner{
  width:100%;
  max-width:960px;
  margin:0 auto;
  box-sizing:border-box;
}
.threadPageComposedBar{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px 8px;
  width:fit-content;
  max-width:100%;
  margin-bottom:10px;
  padding:10px 14px;
  background:rgba(15,23,42,.04);
  border:1px solid var(--thread-border);
  border-radius:12px;
  font-size:14px;
  line-height:1.5;
  color:var(--thread-text);
}
.threadPageComposedPrefix{
  color:var(--thread-muted);
  font-weight:500;
}
.threadPageComposedText{
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
}
.threadPageComposedChip{
  display:inline-flex;
  align-items:center;
  gap:4px;
}
.threadPageChatboxRow{
  position:relative;
  display:flex;
  align-items:flex-end;
  gap:10px;
  width:100%;
  background:rgba(255,255,255,.95);
  border:1px solid var(--thread-border);
  border-radius:14px;
  padding:10px 12px;
  box-shadow:0 1px 3px rgba(15,23,42,.05);
  box-sizing:border-box;
}
.threadPageChatboxField{
  flex:1;
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px 8px;
  min-height:44px;
  padding:6px 0;
}
.threadPageChatboxText{
  font-size:15px;
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
}
.threadPageChatboxTokenFocusable{
  cursor:text;
  outline:none;
  border-radius:4px;
}
.threadPageChatboxTokenFocusable:focus{
  outline:2px solid var(--thread-accent);
  outline-offset:2px;
}
.threadPageChatboxChip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:4px 10px;
  border-radius:999px;
  font-size:14px;
  font-weight:600;
  border:none;
  white-space:nowrap;
}
.threadPageChatboxChipSymbol{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:20px;
  height:20px;
  border-radius:50%;
  font-size:12px;
  font-weight:700;
  line-height:1;
}
.threadPageChatboxChipMention{
  background:rgba(234,88,12,.14);
  color:#c2410c;
}
.threadPageChatboxChipMention .threadPageChatboxChipSymbol{
  background:#c2410c;
  color:#fff;
}
.threadPageChatboxChipTask{
  background:rgba(22,163,74,.14);
  color:#15803d;
}
.threadPageChatboxChipTask .threadPageChatboxChipSymbol{
  background:#15803d;
  color:#fff;
}
.threadPageChatboxInput{
  flex:1;
  min-width:120px;
  min-height:32px;
  padding:6px 0;
  font-size:15px;
  font-family:inherit;
  line-height:1.45;
  border:none;
  background:transparent;
  color:var(--thread-text);
  outline:none;
}
.threadPageChatboxInput::placeholder{color:var(--thread-muted);opacity:.8}
.threadPageChatboxDropdown{
  position:absolute;
  left:12px;
  right:52px;
  bottom:100%;
  margin-bottom:6px;
  background:#fff;
  border:1px solid var(--thread-border);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(15,23,42,.12);
  overflow:hidden;
  z-index:10;
  max-height:180px;
  overflow-y:auto;
  padding-bottom:50vh;
  box-sizing:border-box;
}
.threadPageChatboxDropdownItem{
  display:block;
  width:100%;
  padding:10px 14px;
  font-size:14px;
  font-family:inherit;
  text-align:left;
  border:none;
  background:none;
  color:var(--thread-text);
  cursor:pointer;
  transition:background .1s ease;
}
.threadPageChatboxDropdownItem:hover,
.threadPageChatboxDropdownItemActive{
  background:rgba(37,99,235,.08);
}
.threadPageChatboxDropdownItemActive{
  font-weight:600;
}
.threadPageChatboxSend{
  flex-shrink:0;
  width:44px;
  height:44px;
  border-radius:12px;
  border:none;
  background:linear-gradient(135deg, var(--thread-accent), var(--thread-accent2));
  color:#fff;
  cursor:pointer;
  display:grid;
  place-items:center;
  transition:transform .15s ease, box-shadow .15s ease;
}
.threadPageChatboxSend:hover:not(:disabled){
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(37,99,235,.25);
}
.threadPageChatboxSend:disabled{
  opacity:.5;
  cursor:not-allowed;
}
.threadPageChatboxLegend{
  margin:8px 0 0;
  font-size:12px;
  color:var(--thread-muted);
  display:flex;
  flex-wrap:wrap;
  gap:12px 20px;
}
.threadPageChatboxLegend strong{color:var(--thread-text);font-weight:600}
`;
