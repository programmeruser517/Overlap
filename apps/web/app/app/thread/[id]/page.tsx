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
  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      .filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .map((m) => m.name)
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
    if (e.key === "Backspace" && !buffer && tokens.length > 0) {
      e.preventDefault();
      setTokens((prev) => prev.slice(0, -1));
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
        {!loading && !notFound && <div className="threadPageEmpty" />}
      </div>

      {!loading && !notFound && (
        <div className="threadPageChatbox">
          <div className="threadPageChatboxInner">
            <div className="threadPageChatboxRow">
              <div className="threadPageChatboxField">
                {tokens.map((t, i) =>
                  t.type === "text" ? (
                    <span key={i} className="threadPageChatboxText">{t.value}</span>
                  ) : t.type === "mention" ? (
                    <span key={i} className="threadPageChatboxChip threadPageChatboxChipMention">
                      <span className="threadPageChatboxChipSymbol">@</span>
                      {t.label}
                    </span>
                  ) : (
                    <span key={i} className="threadPageChatboxChip threadPageChatboxChipTask">
                      <span className="threadPageChatboxChipSymbol">&gt;</span>
                      {t.label}
                    </span>
                  )
                )}
                <input
                  ref={inputRef}
                  type="text"
                  className="threadPageChatboxInput"
                  placeholder={tokens.length === 0 ? "Message… @ people in your org, > task" : ""}
                  value={inputDisplayValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
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
              <button type="button" className="threadPageChatboxSend" aria-label="Send">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="threadPageChatboxLegend">
              <span><strong>@</strong> people in your organization</span>
              <span><strong>{">"}</strong> task</span>
              <span>ESC to finish</span>
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
.threadPageEmpty{min-height:200px}

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
.threadPageChatboxSend:hover{
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(37,99,235,.25);
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
