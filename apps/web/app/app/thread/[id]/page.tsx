"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [atQuery, setAtQuery] = useState<string | null>(null);
  const [taskText, setTaskText] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const updateSymbolState = (value: string) => {
    setInputValue(value);
    const lastAt = value.lastIndexOf("@");
    const lastGt = value.lastIndexOf(">");
    const atSegment = lastAt >= 0 ? value.slice(lastAt + 1).split(/>/)[0].trim() : "";
    const taskSegment = lastGt >= 0 ? value.slice(lastGt + 1).trim() : "";
    setAtQuery(lastAt >= 0 ? atSegment : null);
    setTaskText(lastGt >= 0 ? taskSegment : null);
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
        {!loading && !notFound && <div className="threadPageEmpty" />}
      </div>

      {!loading && !notFound && (
        <div className="threadPageChatbox">
          <div className="threadPageChatboxInner">
            {(atQuery !== null || taskText !== null) && (
              <div className="threadPageChatboxHints">
                {atQuery !== null && (
                  <span className="threadPageChatboxHint threadPageChatboxHintAt">
                    <span className="threadPageChatboxHintSymbol">@</span> Search people in organization
                    {atQuery && <span className="threadPageChatboxHintQuery"> “{atQuery}”</span>}
                  </span>
                )}
                {taskText !== null && (
                  <span className="threadPageChatboxHint threadPageChatboxHintTask">
                    <span className="threadPageChatboxHintSymbol">&gt;</span> Task to do
                    {taskText && <span className="threadPageChatboxHintQuery"> “{taskText}”</span>}
                  </span>
                )}
              </div>
            )}
            <div className="threadPageChatboxRow">
              <textarea
                ref={inputRef}
                className="threadPageChatboxInput"
                placeholder="Message… Use @ to add people, &gt; for the task"
                value={inputValue}
                onChange={(e) => updateSymbolState(e.target.value)}
                rows={1}
                aria-label="Chat input"
              />
              <button type="button" className="threadPageChatboxSend" aria-label="Send">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="threadPageChatboxLegend">
              <span><strong>@</strong> search people in organization</span>
              <span><strong>&gt;</strong> task to do</span>
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
.threadPageChatboxHints{
  display:flex;
  flex-wrap:wrap;
  gap:10px 16px;
  margin-bottom:8px;
  font-size:13px;
  color:var(--thread-muted);
}
.threadPageChatboxHint{
  display:inline-flex;
  align-items:center;
  gap:4px;
}
.threadPageChatboxHintSymbol{
  font-weight:700;
  color:var(--thread-accent);
}
.threadPageChatboxHintTask .threadPageChatboxHintSymbol{color:var(--thread-accent2)}
.threadPageChatboxHintQuery{color:var(--thread-text);font-style:italic}
.threadPageChatboxRow{
  display:flex;
  align-items:flex-end;
  gap:10px;
  background:rgba(255,255,255,.95);
  border:1px solid var(--thread-border);
  border-radius:14px;
  padding:10px 12px;
  box-shadow:0 1px 3px rgba(15,23,42,.05);
}
.threadPageChatboxInput{
  flex:1;
  min-height:44px;
  max-height:120px;
  padding:10px 12px 8px;
  font-size:15px;
  font-family:inherit;
  line-height:1.45;
  border:none;
  background:transparent;
  color:var(--thread-text);
  resize:none;
  outline:none;
}
.threadPageChatboxInput::placeholder{color:var(--thread-muted);opacity:.8}
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
