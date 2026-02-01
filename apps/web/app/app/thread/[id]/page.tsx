"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type ChatToken =
  | { type: "text"; value: string }
  | { type: "mention"; label: string }
  | { type: "task"; label: string };

type AgentRole = "userAgent" | "mentionAgent";

type Agent = {
  id: string;
  role: AgentRole;
  label: string; // "Your AI" or "@Alice's AI"
  key: string; // "Agent A", "Agent B"...
  accent: string; // css gradient
};

type AgentMessage = {
  id: string;
  agentId: string;
  agentKey: string;
  agentLabel: string;
  content: string;
  ts: number;
};

const ACTIONS_STUB = [
  "create a new email",
  "schedule a meeting",
  "send follow-up",
  "draft a reply",
  "find a time",
];

const MAX_TURNS_HARD_CAP = 12;

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function buildUserPrompt(tokens: ChatToken[], buffer: string, mode: "text" | "mention" | "task") {
  const parts = [
    ...tokens.map((t) =>
      t.type === "text" ? t.value : t.type === "mention" ? `@${t.label}` : `>${t.label}`
    ),
    buffer.trim()
      ? mode === "mention"
        ? `@${buffer.trim()}`
        : mode === "task"
        ? `>${buffer.trim()}`
        : buffer
      : "",
  ].filter(Boolean);
  return parts.join(" ").trim();
}

function uniqMentions(tokens: ChatToken[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (t.type !== "mention") continue;
    const v = (t.label ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function extractTaskLabel(tokens: ChatToken[]) {
  const t = tokens.find((x) => x.type === "task") as { type: "task"; label: string } | undefined;
  return t?.label?.trim() || null;
}

/**
 * Stop condition (simple heuristic):
 * - any agent says "AGREEMENT:" or "FINAL:" or "✅" or "We agree" or "agreement reached"
 */
function looksLikeAgreement(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("agreement:") ||
    t.includes("final:") ||
    t.includes("✅") ||
    t.includes("we agree") ||
    t.includes("task agreement reached") ||
    t.includes("agreement reached")
  );
}

async function callLLM(prompt: string, signal: AbortSignal) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Request failed");
  return String(data?.text ?? "");
}

/**
 * maxTurns meaning:
 * - 0 = "Auto" (we still hard-cap at 12)
 * - 1..12 = exact cap
 */
function normalizeTurnCap(maxTurns: number) {
  if (maxTurns === 0) return MAX_TURNS_HARD_CAP;
  return Math.max(1, Math.min(MAX_TURNS_HARD_CAP, maxTurns));
}

// Deterministic palette (stable UI)
const AGENT_ACCENTS = [
  "linear-gradient(135deg, #2563eb, #7c3aed)", // A
  "linear-gradient(135deg, #f97316, #ef4444)", // B
  "linear-gradient(135deg, #10b981, #22c55e)", // C
  "linear-gradient(135deg, #06b6d4, #3b82f6)", // D
  "linear-gradient(135deg, #eab308, #f97316)", // E
  "linear-gradient(135deg, #a855f7, #ec4899)", // F
  "linear-gradient(135deg, #0ea5e9, #22c55e)", // G
  "linear-gradient(135deg, #f43f5e, #fb923c)", // H
  "linear-gradient(135deg, #14b8a6, #8b5cf6)", // I
  "linear-gradient(135deg, #84cc16, #10b981)", // J
  "linear-gradient(135deg, #6366f1, #06b6d4)", // K
  "linear-gradient(135deg, #f59e0b, #ef4444)", // L
];

function buildAgents(mentions: string[]) {
  const agents: Agent[] = [];
  agents.push({
    id: "agent-a",
    role: "userAgent",
    label: "Your AI",
    key: "Agent A",
    accent: AGENT_ACCENTS[0],
  });

  mentions.forEach((m, i) => {
    const idx = i + 1;
    const letter = String.fromCharCode("A".charCodeAt(0) + idx); // B, C, D...
    agents.push({
      id: `agent-${letter.toLowerCase()}`,
      role: "mentionAgent",
      label: `@${m}'s AI`,
      key: `Agent ${letter}`,
      accent: AGENT_ACCENTS[Math.min(idx, AGENT_ACCENTS.length - 1)],
    });
  });

  return agents;
}

function transcript(history: AgentMessage[]) {
  return history.map((m) => `${m.agentKey}: ${m.content}`.trim()).join("\n");
}

function buildAgentPrompt(opts: {
  speaker: Agent;
  allAgents: Agent[];
  mentionNames: string[];
  userPrompt: string;
  taskHint: string | null;
  history: AgentMessage[];
}) {
  const { speaker, allAgents, mentionNames, userPrompt, taskHint, history } = opts;

  const participantsLine =
    "Participants: " +
    allAgents
      .map((a, idx) => {
        const who = idx === 0 ? "user" : `mentioned person ${idx}`;
        return `${a.key} (${a.label}, ${who})`;
      })
      .join(", ");

  const taskLine = taskHint ? `Primary task: "${taskHint}".` : "Primary task: infer from the user's prompt.";

  const roleBlock =
    speaker.role === "userAgent"
      ? [`You are ${speaker.key} (${speaker.label}).`, "You represent the user’s interests and preferences."].join(
          "\n"
        )
      : (() => {
          const idx = allAgents.findIndex((a) => a.id === speaker.id);
          const mentionIndex = Math.max(0, idx - 1);
          const person = mentionNames[mentionIndex] ?? "the mentioned person";
          return [
            `You are ${speaker.key} (${speaker.label}).`,
            `You represent @${person}'s preferences and constraints.`,
            "If information is missing, make reasonable assumptions but mark them clearly as assumptions.",
          ].join("\n");
        })();

  const rules = [
    "Goal: negotiate with the other agents to reach a concrete task agreement.",
    "Rules:",
    "- Be concise and actionable.",
    "- Ask at most one question per turn.",
    '- If agreement is reached, start your message with "AGREEMENT:" and clearly state the final decision.',
    "",
  ].join("\n");

  const convo = transcript(history);

  return [
    roleBlock,
    participantsLine,
    `User request: "${userPrompt}".`,
    taskLine,
    rules,
    "Conversation so far:",
    convo || "(none yet)",
    "",
    `Now respond as ${speaker.key} only.`,
  ].join("\n");
}

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [open, setOpen] = useState(false);

  // token composer
  const [tokens, setTokens] = useState<ChatToken[]>([]);
  const [mode, setMode] = useState<"text" | "mention" | "task">("text");
  const [buffer, setBuffer] = useState("");
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [focusedTokenIndex, setFocusedTokenIndex] = useState<number | null>(null);

  // org members
  const [orgMembers, setOrgMembers] = useState<{ id: string; email: string; name: string }[]>([]);

  // multi-agent convo
  const [maxTurns, setMaxTurns] = useState<number>(0); // 0 = Auto
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedTokens, setLastSubmittedTokens] = useState<ChatToken[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agreementReached, setAgreementReached] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- load org members ---
  useEffect(() => {
    if (loading || notFound) return;
    fetch("/api/org-members")
      .then((r) => r.json())
      .then((d) => setOrgMembers(d.members ?? []))
      .catch(() => setOrgMembers([]));
  }, [loading, notFound]);

  // --- thread existence ---
  useEffect(() => {
    if (!id) return;
    fetch(`/api/thread/${id}`)
      .then((r) => {
        if (r.status === 404) setNotFound(true);
        return r.json();
      })
      .then((d) => {
        if (!d?.thread) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // --- profile menu close on outside click ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // --- running timer ---
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const peopleMatches = useMemo(() => {
    if (mode !== "mention") return [];
    const q = buffer.toLowerCase().trim();
    return orgMembers
      .filter(
        (m) =>
          (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)
      )
      .map((m) => m.name ?? m.email ?? m.id)
      .slice(0, 6);
  }, [mode, buffer, orgMembers]);

  const actionMatches = useMemo(() => {
    if (mode !== "task") return [];
    const q = buffer.toLowerCase().trim();
    return ACTIONS_STUB.filter((a) => a.toLowerCase().includes(q)).slice(0, 6);
  }, [mode, buffer]);

  const showDropdown =
    (mode === "mention" && peopleMatches.length > 0) || (mode === "task" && actionMatches.length > 0);

  const dropdownOptions =
    mode === "mention" ? peopleMatches : mode === "task" ? actionMatches : [];

  const selectedOption = dropdownOptions[dropdownIndex] ?? dropdownOptions[0];

  const commitCurrent = () => {
    const b = buffer.trim();
    if (mode === "mention" && b) setTokens((prev) => [...prev, { type: "mention", label: b }]);
    else if (mode === "task" && b) setTokens((prev) => [...prev, { type: "task", label: b }]);
    setMode("text");
    setBuffer("");
    setDropdownIndex(0);
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
          fieldRef.current
            ?.querySelector<HTMLElement>(`[data-token-index="${index + 1}"]`)
            ?.focus();
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
          fieldRef.current
            ?.querySelector<HTMLElement>(`[data-token-index="${index - 1}"]`)
            ?.focus();
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
          fieldRef.current
            ?.querySelector<HTMLElement>(`[data-token-index="${index - 1}"]`)
            ?.focus();
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
          fieldRef.current
            ?.querySelector<HTMLElement>(`[data-token-index="${index}"]`)
            ?.focus();
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
        if (mode === "mention")
          setTokens((prev) => [...prev, { type: "mention", label: selectedOption }]);
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
    if ((e.key === "Backspace" || e.key === "Delete") && cursorAtStart && tokens.length > 0) {
      e.preventDefault();
      setTokens((prev) => prev.slice(0, -1));
      return;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (mode === "mention") {
      if (v.startsWith("@")) setBuffer(v.slice(1));
      else {
        setMode("text");
        setBuffer(v);
      }
    } else if (mode === "task") {
      if (v.startsWith(">")) setBuffer(v.slice(1));
      else {
        setMode("text");
        setBuffer(v);
      }
    } else {
      setBuffer(v);
    }
    setDropdownIndex(0);
  };

  const inputDisplayValue = (mode === "mention" ? "@" : mode === "task" ? ">" : "") + buffer;

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  // ------------------ Multi-agent loop ------------------

  const stopRun = () => abortControllerRef.current?.abort();

  const runMultiAgents = async (displayTokens: ChatToken[], promptText: string) => {
    const mentions = uniqMentions(displayTokens);
    if (mentions.length === 0) {
      setError("Add at least one @mention to spawn other agents.");
      return;
    }

    // Practical cap for UI + prompt size
    const cappedMentions = mentions.slice(0, 8);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunning(true);
    setElapsedSec(0);
    setError(null);
    setAgreementReached(false);
    setMessages([]);

    const builtAgents = buildAgents(cappedMentions);
    setAgents(builtAgents);

    const taskHint = extractTaskLabel(displayTokens);

    // Seed message from Agent A
    const seed: AgentMessage = {
      id: uid(),
      agentId: builtAgents[0].id,
      agentKey: builtAgents[0].key,
      agentLabel: builtAgents[0].label,
      content:
        `I received the user request: "${promptText}". ` +
        (taskHint ? `Primary task: "${taskHint}". ` : "") +
        "I will propose a plan and ask the other agents to negotiate. " +
        'When agreement is reached, output a final agreement starting with "AGREEMENT:" including the agreed task + key details.',
      ts: Date.now(),
    };

    let history: AgentMessage[] = [seed];
    setMessages(history);

    // total messages allowed (includes seed); 0 => auto (12)
    const totalTurns = normalizeTurnCap(maxTurns);
    let turnCount = 1;

    // round-robin across ALL agents
    let nextIndex = 1; // start at Agent B

    try {
      while (turnCount < totalTurns) {
        if (controller.signal.aborted) throw new Error("Stopped");

        const speaker = builtAgents[nextIndex];

        const prompt = buildAgentPrompt({
          speaker,
          allAgents: builtAgents,
          mentionNames: cappedMentions,
          userPrompt: promptText,
          taskHint,
          history,
        });

        const raw = await callLLM(prompt, controller.signal);
        const content = (raw || "").trim() || "(empty)";

        const msg: AgentMessage = {
          id: uid(),
          agentId: speaker.id,
          agentKey: speaker.key,
          agentLabel: speaker.label,
          content,
          ts: Date.now(),
        };

        history = [...history, msg];
        setMessages(history);
        turnCount += 1;

        if (looksLikeAgreement(content)) {
          setAgreementReached(true);
          break;
        }

        nextIndex += 1;
        if (nextIndex >= builtAgents.length) nextIndex = 0;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setRunning(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendFromChat = () => {
    const promptText = buildUserPrompt(tokens, buffer, mode);
    if (!promptText.trim() || running) return;

    const displayTokens: ChatToken[] = [...tokens];
    if (buffer.trim()) {
      if (mode === "mention") displayTokens.push({ type: "mention", label: buffer.trim() });
      else if (mode === "task") displayTokens.push({ type: "task", label: buffer.trim() });
      else displayTokens.push({ type: "text", value: buffer });
    }

    setLastSubmittedTokens(displayTokens);
    setTokens([]);
    setBuffer("");
    setMode("text");
    setDropdownIndex(0);
    inputRef.current?.focus();

    runMultiAgents(displayTokens, promptText);
  };

  // ------------------ UI helpers ------------------

  const submittedMentions = useMemo(() => uniqMentions(lastSubmittedTokens), [lastSubmittedTokens]);
  const participantsLabel = useMemo(() => {
    if (submittedMentions.length === 0) return "Add @mentions to spawn agents.";
    const shown = submittedMentions.slice(0, 8).map((m) => `@${m}`);
    return `Agents: Your AI + ${shown.join(", ")}`;
  }, [submittedMentions]);

  const agentById = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const normalizedDisplayTurnCap = useMemo(() => normalizeTurnCap(maxTurns), [maxTurns]);

  return (
    <main className="threadPageWrap">
      <header className="threadPageTopbar">
        <div className="threadPageContainer threadPageTopbarInner">
          <Link href="/app" className="threadPageBrand">
            <div className="threadPageLogoWrap">
              <Image src="/overlap_blue.png" alt="Overlap" width={88} height={88} priority />
            </div>
            <div className="threadPageBrandText">
              <span className="threadPageBrandSub">AI-to-AI coordination in all your workflows.</span>
            </div>
          </Link>

          <div className="threadPageTopbarRight">
            <div className="threadPageRunControls">
              <label className="threadPageRunLabel">
                Max turns
                <select
                  className="threadPageRunSelect"
                  value={Math.max(0, Math.min(MAX_TURNS_HARD_CAP, maxTurns))}
                  onChange={(e) => setMaxTurns(Math.max(0, Math.min(MAX_TURNS_HARD_CAP, Number(e.target.value))))}
                  disabled={running}
                >
                  {Array.from({ length: MAX_TURNS_HARD_CAP + 1 }, (_, i) => i).map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "0 (Auto)" : n}
                    </option>
                  ))}
                </select>
              </label>

              {running ? (
                <button type="button" className="threadPageRunStop" onClick={stopRun}>
                  Stop
                </button>
              ) : (
                <span className="threadPageRunHint">Ctrl+Enter to start</span>
              )}
            </div>

            <div className="threadPageProfileWrap" ref={profileRef}>
              <button
                type="button"
                className="threadPageAvatar"
                onClick={() => setOpen(!open)}
                aria-label="Profile menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              {open && (
                <div className="threadPageProfileMenu">
                  <Link
                    href="/app/settings"
                    className="threadPageProfileItem threadPageProfileItemLink"
                    onClick={() => setOpen(false)}
                  >
                    <span className="threadPageProfileIcon" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </span>
                    Settings
                  </Link>
                  <div className="threadPageProfileDivider" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="threadPageProfileItem threadPageProfileItemLogout"
                  >
                    <span className="threadPageProfileIcon" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
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
        </div>
      </header>

      <div className="threadPageMain">
        {loading && <p className="threadPageMuted">Loading…</p>}

        {!loading && notFound && (
          <p className="threadPageMuted">
            Thread not found.{" "}
            <Link href="/app" className="threadPageLink">
              Back to app
            </Link>
          </p>
        )}

        {!loading && !notFound && (
          <>
            <div className="threadPageCenterHeader">
              <div className="threadPageCenterHeaderInner">
                <div className="threadPageHeaderRow">
                  <div className="threadPageHeaderMetaLeft">
                    <span className="threadPageCenterHeaderLabel">Multi-agent negotiation</span>
                    <p className="threadPageCenterHeaderPrompt">{participantsLabel}</p>

                    {agents.length > 0 && (
                      <div className="threadPageParticipants">
                        {agents.map((a) => (
                          <span key={a.id} className="threadPageParticipant" style={{ backgroundImage: a.accent }}>
                            {a.key}: {a.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="threadPageHeaderMetaRight">
                    {running ? (
                      <span className="threadPageCenterHeaderTimer">
                        Running · {Math.floor(elapsedSec / 60)}:
                        {String(elapsedSec % 60).padStart(2, "0")}
                      </span>
                    ) : agreementReached ? (
                      <span className="threadPageAgreementPill">Agreement reached</span>
                    ) : (
                      <span className="threadPageCenterHeaderTimer">
                        Idle · cap {normalizedDisplayTurnCap} msgs
                      </span>
                    )}
                  </div>
                </div>

                {error && <p className="threadPageCenterError">{error}</p>}

                {messages.length === 0 && !running && !error && (
                  <div className="threadPageCenterDormant">
                    <p className="threadPageCenterDormantText">
                      Type a request, include <strong>@people</strong> (2–4 is fine), then send.
                    </p>
                    <p className="threadPageCenterDormantHint">
                      Agents stop once they output <strong>AGREEMENT:</strong> or hit the max turns (Auto caps at{" "}
                      <strong>12</strong>).
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="threadPageConversationWrap">
              <div className="threadPageConversationInner">
                <div className="threadPageConversation">
                  {messages.map((m) => {
                    const a = agentById.get(m.agentId);
                    return (
                      <div key={m.id} className="threadPageMsgRow">
                        <div className="threadPageMsgBubble">
                          <div className="threadPageMsgTop">
                            <span className="threadPageMsgName">
                              <span
                                className="threadPageMsgBadge"
                                style={{ backgroundImage: a?.accent ?? AGENT_ACCENTS[0] }}
                              >
                                {m.agentKey}
                              </span>
                              {m.agentLabel}
                            </span>
                            <span className="threadPageMsgTime">
                              {new Date(m.ts).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="threadPageMsgBody">
                            <pre className="threadPageMsgText">{m.content}</pre>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {running && (
                    <div className="threadPageMsgRow" aria-hidden>
                      <div className="threadPageMsgBubble threadPageMsgGhost">
                        <div className="threadPageTyping">
                          <span className="threadPageTypingDot" />
                          <span className="threadPageTypingDot" />
                          <span className="threadPageTypingDot" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                    <span key={i} className="threadPageComposedText">
                      {t.value}
                    </span>
                  ) : t.type === "mention" ? (
                    <span
                      key={i}
                      className="threadPageChatboxChip threadPageChatboxChipMention threadPageComposedChip"
                    >
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span
                      key={i}
                      className="threadPageChatboxChip threadPageChatboxChipTask threadPageComposedChip"
                    >
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
                    key: i,
                    "data-token-index": i,
                    tabIndex: 0,
                    role: "button" as const,
                    onFocus: () => setFocusedTokenIndex(i),
                    onKeyDown: (ev: React.KeyboardEvent) => handleTokenKeyDown(ev, i),
                    className: "threadPageChatboxTokenFocusable",
                  };
                  return t.type === "text" ? (
                    <span {...common} className="threadPageChatboxText threadPageChatboxTokenFocusable">
                      {t.value}
                    </span>
                  ) : t.type === "mention" ? (
                    <span
                      {...common}
                      className="threadPageChatboxChip threadPageChatboxChipMention threadPageChatboxTokenFocusable"
                    >
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span
                      {...common}
                      className="threadPageChatboxChip threadPageChatboxChipTask threadPageChatboxTokenFocusable"
                    >
                      <span className="threadPageChatboxChipSymbol">&gt;</span>
                      {t.label}
                    </span>
                  );
                })}

                <input
                  ref={inputRef}
                  type="text"
                  className="threadPageChatboxInput"
                  placeholder={tokens.length === 0 ? "Message… @ multiple people, > task" : ""}
                  value={inputDisplayValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setFocusedTokenIndex(null)}
                  aria-label="Chat input"
                  autoComplete="off"
                  disabled={running}
                />
              </div>

              {showDropdown && !running && (
                <div className="threadPageChatboxDropdown" role="listbox">
                  {dropdownOptions.map((opt, i) => (
                    <button
                      key={`${mode}-${i}-${opt}`}
                      type="button"
                      role="option"
                      aria-selected={i === dropdownIndex}
                      className={`threadPageChatboxDropdownItem ${
                        i === dropdownIndex ? "threadPageChatboxDropdownItemActive" : ""
                      }`}
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
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="threadPageChatboxSend"
                aria-label="Run"
                onClick={handleSendFromChat}
                disabled={running || !buildUserPrompt(tokens, buffer, mode)}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>

            <p className="threadPageChatboxLegend">
              <span>
                <strong>@</strong> adds another agent
              </span>
              <span>
                <strong>{">"}</strong> task hint
              </span>
              <span>ESC to finish</span>
              <span>
                <strong>Ctrl+Enter</strong> or <strong>⌘+Enter</strong> to run
              </span>
              <span>Max total messages ≤ 12</span>
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

  /* reserve space for fixed chatbox so history never hides behind it */
  --chatbox-safe: 260px;
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
    radial-gradient(circle, rgba(167,139,250,.14) 1.5px, transparent 1.5px),
    radial-gradient(circle, rgba(129,140,248,.08) 1px, transparent 1px);
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
.threadPageBrandSub{font-size:14px;color:var(--thread-muted);font-weight:500}

.threadPageTopbarRight{
  display:flex;
  align-items:center;
  gap:14px;
}
.threadPageRunControls{
  display:flex;
  align-items:center;
  gap:10px;
  background:rgba(255,255,255,.7);
  border:1px solid var(--thread-border);
  border-radius:14px;
  padding:8px 10px;
}
.threadPageRunLabel{
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  color:var(--thread-muted);
  font-weight:700;
  white-space:nowrap;
}
.threadPageRunSelect{
  height:30px;
  border-radius:10px;
  border:1px solid var(--thread-border);
  background:#fff;
  padding:0 10px;
  font-size:12px;
  font-weight:900;
  color:var(--thread-text);
  outline:none;
}
.threadPageRunHint{
  font-size:12px;
  color:var(--thread-muted);
  font-weight:700;
  padding:0 6px;
}
.threadPageRunStop{
  height:30px;
  border-radius:10px;
  border:1px solid rgba(220,38,38,.4);
  background:rgba(220,38,38,.08);
  color:#dc2626;
  font-weight:900;
  font-size:12px;
  padding:0 10px;
  cursor:pointer;
}

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
  font-weight:700;
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
.threadPageProfileItemLink:hover{background:rgba(37,99,235,.06)}
.threadPageProfileDivider{height:1px;background:var(--thread-border);margin:0 12px}
.threadPageProfileItemLogout{color:#dc2626}
.threadPageProfileItemLogout:hover{background:rgba(220,38,38,.08)}

.threadPageMain{
  max-width:1100px;
  margin:0 auto;
  padding:20px 20px calc(var(--chatbox-safe) + 32px);
  min-height:60vh;
}
.threadPageMuted{color:var(--thread-muted);font-size:14px}
.threadPageLink{color:var(--thread-accent);font-weight:700}
.threadPageLink:hover{text-decoration:underline}

.threadPageCenterHeader{
  max-width:1100px;
  margin:0 auto;
  padding:18px 20px 12px;
  border-bottom:1px solid var(--thread-border);
}
.threadPageCenterHeaderInner{
  max-width:980px;
  margin:0 auto;
}
.threadPageHeaderRow{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
}
.threadPageCenterHeaderLabel{
  display:block;
  font-size:11px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:var(--thread-muted);
  margin-bottom:6px;
}
.threadPageCenterHeaderPrompt{
  font-size:15px;
  font-weight:800;
  color:var(--thread-text);
  margin:0 0 10px;
  line-height:1.4;
}
.threadPageCenterHeaderTimer{
  font-size:13px;
  color:var(--thread-muted);
  font-weight:800;
}
.threadPageAgreementPill{
  display:inline-flex;
  align-items:center;
  gap:8px;
  background:rgba(22,163,74,.12);
  border:1px solid rgba(22,163,74,.25);
  color:#15803d;
  font-weight:900;
  font-size:12px;
  border-radius:999px;
  padding:6px 10px;
  white-space:nowrap;
}
.threadPageCenterError{
  margin:10px 0 0;
  font-size:13px;
  color:#dc2626;
  font-weight:800;
}
.threadPageParticipants{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.threadPageParticipant{
  display:inline-flex;
  align-items:center;
  gap:8px;
  border-radius:999px;
  padding:6px 10px;
  color:#fff;
  font-size:12px;
  font-weight:900;
  box-shadow:0 4px 14px rgba(15,23,42,.10);
}

.threadPageCenterDormant{
  margin-top:12px;
  text-align:left;
  padding:12px 14px;
  background:rgba(255,255,255,.7);
  border:1px dashed rgba(15,23,42,.18);
  border-radius:14px;
}
.threadPageCenterDormantText{
  font-size:14px;
  color:var(--thread-text);
  margin:0 0 6px;
  font-weight:800;
}
.threadPageCenterDormantHint{
  font-size:13px;
  color:var(--thread-muted);
  margin:0;
  opacity:.95;
}

.threadPageConversationWrap{
  max-width:1100px;
  margin:0 auto;
  padding:18px 20px 0;
}
.threadPageConversationInner{
  display:grid;
  grid-template-columns: 1fr;
  gap:14px;
  align-items:start;
}
.threadPageConversation{
  background:rgba(255,255,255,.55);
  border:1px solid var(--thread-border);
  border-radius:18px;
  padding:14px;
  box-shadow:0 8px 28px rgba(15,23,42,.08);
  min-height:320px;
}
.threadPageMsgRow{
  display:flex;
  margin:10px 0;
}
.threadPageMsgBubble{
  width:100%;
  border-radius:16px;
  border:1px solid var(--thread-border);
  background:rgba(255,255,255,.92);
  box-shadow:0 2px 10px rgba(15,23,42,.06);
  overflow:hidden;
}
.threadPageMsgTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 12px;
  background:rgba(15,23,42,.03);
  border-bottom:1px solid var(--thread-border);
}
.threadPageMsgName{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:12px;
  font-weight:900;
  color:var(--thread-text);
}
.threadPageMsgBadge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:22px;
  border-radius:999px;
  padding:0 10px;
  color:#fff;
  font-weight:900;
  font-size:12px;
}
.threadPageMsgTime{
  font-size:11px;
  font-weight:800;
  color:var(--thread-muted);
}
.threadPageMsgBody{
  padding:10px 12px;
}
.threadPageMsgText{
  margin:0;
  font-family:inherit;
  font-size:13px;
  line-height:1.55;
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
}
.threadPageMsgGhost{
  opacity:.7;
  background:rgba(255,255,255,.8);
}
.threadPageTyping{
  display:flex;
  align-items:center;
  gap:8px;
  padding:14px 12px;
}
.threadPageTypingDot{
  width:8px;height:8px;border-radius:50%;
  background:rgba(15,23,42,.25);
  animation:threadTyping 1s infinite ease-in-out;
}
.threadPageTypingDot:nth-child(2){animation-delay:.12s}
.threadPageTypingDot:nth-child(3){animation-delay:.24s}
@keyframes threadTyping{
  0%,100%{transform:translateY(0);opacity:.5}
  50%{transform:translateY(-4px);opacity:1}
}

.threadPageChatbox{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  z-index:40;
  background:rgba(255,255,255,.92);
  backdrop-filter:blur(12px);
  border-top:1px solid var(--thread-border);
  padding:12px 20px 20px;
  box-shadow:0 -4px 24px rgba(15,23,42,.08);
}
.threadPageChatboxInner{
  max-width:900px;
  margin:0 auto;
}
.threadPageComposedBar{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:6px 8px;
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
  font-weight:700;
}
.threadPageComposedText{
  color:var(--thread-text);
  white-space:pre-wrap;
  word-break:break-word;
  font-weight:800;
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
  background:rgba(255,255,255,.95);
  border:1px solid var(--thread-border);
  border-radius:14px;
  padding:10px 12px;
  box-shadow:0 1px 3px rgba(15,23,42,.05);
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
  font-weight:900;
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
  font-weight:900;
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
  font-weight:900;
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
  gap:10px 18px;
}
.threadPageChatboxLegend strong{color:var(--thread-text);font-weight:900}
`;
