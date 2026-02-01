"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type ChatToken =
  | { type: "text"; value: string }
  | { type: "mention"; label: string }
  | { type: "task"; label: string };

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
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<ChatToken[]>([]);
  const [mode, setMode] = useState<"text" | "mention" | "task">("text");
  const [buffer, setBuffer] = useState("");
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [orgMembers, setOrgMembers] = useState<{ id: string; email: string; name: string }[]>([]);
  const [geminiLastPrompt, setGeminiLastPrompt] = useState<string | null>(null);
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

  const sendChatToGemini = async (promptText: string) => {
    if (!promptText.trim() || geminiLoading) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGeminiLoading(true);
    setGeminiElapsedSec(0);
    setGeminiError(null);
    setGeminiResponse(null);
    setGeminiLastPrompt(promptText.trim());
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText.trim() }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setGeminiError(data.error ?? "Request failed");
        return;
      }
      setGeminiResponse(data.text ?? "");
      setGeminiResponseExpanded(false);
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
    const t = setInterval(() => setGeminiElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [geminiLoading]);

  const handleSendFromChat = () => {
    const promptText = getChatPromptText();
    if (!promptText || geminiLoading) return;
    sendChatToGemini(promptText);
    setTokens([]);
    setBuffer("");
    setMode("text");
    setDropdownIndex(0);
    inputRef.current?.focus();
  };

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
        {loading && <p className="threadPageMuted">Loading…</p>}
        {!loading && notFound && (
          <p className="threadPageMuted">
            Thread not found. <Link href="/app" className="threadPageLink">Back to app</Link>
          </p>
        )}
        {!loading && !notFound && geminiLastPrompt && (
          <div className="threadPageCenterHeader">
            <div className="threadPageCenterHeaderInner">
              <span className="threadPageCenterHeaderLabel">You asked</span>
              <p className="threadPageCenterHeaderPrompt">{geminiLastPrompt}</p>
              <div className="threadPageCenterHeaderMeta">
                {geminiLoading && (
                  <>
                    <span className="threadPageCenterHeaderTimer">
                      Est. ~30s · {Math.floor(geminiElapsedSec / 60)}:{String(geminiElapsedSec % 60).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      className="threadPageCenterHeaderStop"
                      onClick={handleStopGemini}
                      aria-label="Stop"
                    >
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {!loading && !notFound && (
          <div className="threadPageCenterBlock">
            <div className={`threadPageCenterCard ${geminiLoading ? "threadPageCenterCardLoading" : ""} ${geminiResponse !== null ? "threadPageCenterCardHasOutput" : ""}`}>
              {geminiLoading && (
                <div className="threadPageCenterSpinnerWrap" aria-hidden>
                  <div className="threadPageCenterSpinner" />
                  <span className="threadPageCenterSpinnerLabel">Gemma 3 12B thinking…</span>
                </div>
              )}
              {!geminiLoading && !geminiLastPrompt && !geminiResponse && (
                <div className="threadPageCenterDormant">
                  <p className="threadPageCenterDormantText">Reply from Gemma 3 12B will appear here.</p>
                  <p className="threadPageCenterDormantHint">Type in the box below and press Send.</p>
                </div>
              )}
              {!geminiLoading && geminiError && (
                <p className="threadPageCenterError">{geminiError}</p>
              )}
              {!geminiLoading && geminiLastPrompt != null && (
                <div className="threadPageCenterResult">
                  {geminiResponse !== null && (() => {
                    const { mainBody, conflicts } = parseReplyAndConflicts(geminiResponse || "");
                    const showExpand = mainBody.length > REPLY_SUMMARY_LENGTH;
                    return (
                      <div className="threadPageCenterOutputWrap">
                        <div className="threadPageCenterReplyHead">
                          <span className="threadPageCenterResultLabel">Reply</span>
                          {showExpand && (
                            <button
                              type="button"
                              className="threadPageCenterExpandBtn"
                              onClick={() => setGeminiResponseExpanded((e) => !e)}
                              aria-expanded={geminiResponseExpanded}
                            >
                              {geminiResponseExpanded ? "Collapse" : "See full"}
                            </button>
                          )}
                        </div>
                        <div className="threadPageCenterOutputBox">
                          <pre className="threadPageCenterOutputText">
                            {geminiResponseExpanded
                              ? mainBody || "(empty)"
                              : getReplySummary(mainBody) || "(empty)"}
                          </pre>
                        </div>
                        {conflicts.length > 0 && (
                          <div className="threadPageCenterConflicts">
                            <span className="threadPageCenterResultLabel">Conflicts to verify</span>
                            <ul className="threadPageCenterConflictsList">
                              {conflicts.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!loading && !notFound && (
        <div className="threadPageChatbox">
          <div className="threadPageChatboxInner">
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
                    <span {...common} className="threadPageChatboxChip threadPageChatboxChipMention threadPageChatboxTokenFocusable">
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span {...common} className="threadPageChatboxChip threadPageChatboxChipTask threadPageChatboxTokenFocusable">
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
  padding-bottom:120px;
  min-height:60vh;
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
  display:flex;
  justify-content:center;
  align-items:flex-start;
  min-height:200px;
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
  min-height:180px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.threadPageCenterCardHasOutput{
  min-height:240px;
}

.threadPageCenterDormant{
  text-align:center;
  padding:24px 16px;
}
.threadPageCenterDormantText{
  font-size:15px;
  color:var(--thread-muted);
  margin:0 0 6px;
  font-weight:500;
}
.threadPageCenterDormantHint{
  font-size:13px;
  color:var(--thread-muted);
  margin:0;
  opacity:.85;
}

.threadPageCenterSpinnerWrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:14px;
}
.threadPageCenterSpinner{
  width:44px;
  height:44px;
  border:3px solid var(--thread-border);
  border-top-color:var(--thread-accent);
  border-radius:50%;
  animation:threadPageSpin .85s linear infinite;
}
.threadPageCenterSpinnerLabel{
  font-size:13px;
  color:var(--thread-muted);
  font-weight:500;
}
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
  max-width:700px;
  margin:0 auto;
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
