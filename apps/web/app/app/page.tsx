"use client";

import { useState } from "react";

type Kind = "schedule" | "email";

export default function AppPage() {
  const [kind, setKind] = useState<Kind>("schedule");
  const [prompt, setPrompt] = useState("");
  const [participants, setParticipants] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id?: string; error?: string } | null>(null);

  async function handleCreate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          prompt: prompt.trim(),
          participants: participants
            .split(/[\s,]+/)
            .filter(Boolean)
            .map((id) => ({ userId: id.trim() })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "Failed to create thread" });
        return;
      }
      setResult({ id: data.thread?.id });
      if (data.thread?.id) {
        window.location.href = `/app/thread/${data.thread.id}`;
      }
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = send, Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) handleCreate();
    }
  }

  return (
    <>
      <main className="wrap">
        {/* Top bar (same vibe as your landing) */}
        <header className="topbar">
          <div className="container topbarInner">
            <div className="brand">
              <div className="logoWrap" aria-hidden="true">
                {/* No next/image here (you asked not to change imports).
                    This uses public/overlap_blue.png */}
                <img src="/overlap_blue.png" alt="Overlap logo" />
              </div>
              <div className="brandText">
                <div className="brandName">Overlap</div>
                <div className="brandSub">AI-to-AI coordination for scheduling</div>
              </div>
            </div>

            <nav className="nav">
              <a className="navLink" href="/login">
                Account
              </a>
              <a className="btn btnPrimary" href="/login">
                Open app <span className="arrow">→</span>
              </a>
            </nav>
          </div>
        </header>

        {/* App canvas */}
        <section className="appShell">
          <div className="container appGrid">
            {/* Main canvas */}
            <div className="canvas">
              <div className="canvasTop">
                <div className="leftTop">
                  <div className="titleBlock">
                    <div className="canvasTitle">New thread</div>
                    <div className="canvasSub">
                      Describe what you want — we’ll plan it. You approve.
                    </div>
                  </div>
                </div>

                <div className="rightTop">
                  <div className="seg">
                    <button
                      type="button"
                      className={`segBtn ${kind === "schedule" ? "active" : ""}`}
                      onClick={() => setKind("schedule")}
                    >
                      <span className="segIcon" aria-hidden="true">
                        <CalendarIcon />
                      </span>
                      Schedule
                    </button>
                    <button
                      type="button"
                      className={`segBtn ${kind === "email" ? "active" : ""}`}
                      onClick={() => setKind("email")}
                    >
                      <span className="segIcon" aria-hidden="true">
                        <MailIcon />
                      </span>
                      Email
                    </button>
                  </div>
                </div>
              </div>

              <div className="canvasBody">
                <div className="emptyState">
                  <div className="emptyCard">
                    <div className="emptyKicker">
                      <span className="dot" aria-hidden="true" />
                      Preview canvas
                    </div>
                    <div className="emptyHeadline">
                      {kind === "schedule"
                        ? "Scheduling flow preview"
                        : "Email flow preview"}
                    </div>
                    <div className="emptyText">
                      {kind === "schedule" ? (
                        <>
                          Add participants, then type what meeting you want. We’ll propose
                          the best overlap windows and show a clear preview before booking.
                        </>
                      ) : (
                        <>
                          Add recipients, then type what email you want. We’ll draft a
                          polished email and show a preview before sending.
                        </>
                      )}
                    </div>

                    <div className="miniPreview">
                      <div className="miniMsg user">
                        <div className="miniMeta">
                          <span className="who">You</span>
                          <span className="when">just now</span>
                        </div>
                        <div className="miniText">
                          {kind === "schedule"
                            ? "30 min with Aditya + Peter next week, Tue–Thu afternoons."
                            : "Email the team with a quick status update and next steps."}
                        </div>
                      </div>

                      <div className="miniMsg agent">
                        <div className="miniMeta">
                          <span className="who">Overlap</span>
                          <span className="when">preview</span>
                        </div>
                        <div className="miniText">
                          {kind === "schedule"
                            ? "Found 3 ranked overlaps. Pick one to approve."
                            : "Drafted 2 tones. Pick one to approve."}
                        </div>

                        <div className="chips">
                          <span className="chip">Approval-first</span>
                          <span className="chip">Clear preview</span>
                          <span className="chip">Office-ready</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result?.error && (
                    <div className="errorBar" role="alert">
                      <span className="errorIcon" aria-hidden="true">
                        <AlertIcon />
                      </span>
                      <span className="errorText">{result.error}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Composer */}
              <div className="composerWrap">
                <div className="composerTop">
                  <div className="field">
                    <div className="label">Participants</div>
                    <input
                      className="input"
                      type="text"
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                      placeholder="IDs or emails (comma-separated)"
                    />
                  </div>
                </div>

                <div className="composer">
                  {/* Left: action button (NOT up-arrow) */}
                  <button
                    type="button"
                    className="iconBtn"
                    aria-label="New"
                    title="New"
                    onClick={() => {
                      setPrompt("");
                      setParticipants("");
                      setResult(null);
                    }}
                    disabled={loading}
                  >
                    <PlusIcon />
                  </button>

                  {/* Left: attach icon */}
                  <button
                    type="button"
                    className="iconBtn"
                    aria-label="Attach file"
                    title="Attach file (UI only)"
                    onClick={() => {}}
                    disabled={loading}
                  >
                    <PaperclipIcon />
                  </button>

                  {/* Prompt box */}
                  <div className="promptBox">
                    <textarea
                      className="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder={
                        kind === "schedule"
                          ? "Describe the meeting you want… (Enter to create, Shift+Enter for new line)"
                          : "Describe the email you want… (Enter to create, Shift+Enter for new line)"
                      }
                    />
                    <div className="hint">
                      <span className="hintKey">Enter</span> create •{" "}
                      <span className="hintKey">Shift</span>+
                      <span className="hintKey">Enter</span> new line
                    </div>
                  </div>

                  {/* Right: create */}
                  <button
                    type="button"
                    className="btn btnPrimary btnCreate"
                    onClick={handleCreate}
                    disabled={loading || !prompt.trim()}
                  >
                    {loading ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional side panel (light + clean, no functionality) */}
            <aside className="side">
              <div className="sideCard">
                <div className="sideTitle">Tips</div>
                <ul className="sideList">
                  <li>
                    Add participants as emails/IDs (comma-separated).
                  </li>
                  <li>
                    Write constraints: “Tue–Thu afternoons”, “avoid Fridays”, “30 min”.
                  </li>
                  <li>
                    You’ll always review before anything is sent or booked.
                  </li>
                </ul>
              </div>

              <div className="sideCard">
                <div className="sideTitle">Mode</div>
                <div className="sidePills">
                  <span className={`pill2 ${kind === "schedule" ? "on" : ""}`}>
                    Schedule
                  </span>
                  <span className={`pill2 ${kind === "email" ? "on" : ""}`}>
                    Email
                  </span>
                </div>
                <div className="sideMuted">
                  UI preview only — wiring calendar/email can come later.
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <style>{css}</style>
    </>
  );
}

/* --- Icons (inline SVG so no imports) --- */
function PaperclipIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8.5 12.5l7.6-7.6a3 3 0 114.2 4.2l-9 9a5 5 0 11-7.1-7.1l9.1-9.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v2M17 3v2M4 8h16M6.5 21h11A2.5 2.5 0 0020 18.5V7.5A2.5 2.5 0 0017.5 5h-11A2.5 2.5 0 004 7.5v11A2.5 2.5 0 006.5 21z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9A2.5 2.5 0 0117.5 19h-11A2.5 2.5 0 014 16.5v-9z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 7l6.5 5 6.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10.3 4.7l-8 14A2 2 0 004 22h16a2 2 0 001.7-3.3l-8-14a2 2 0 00-3.4 0z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const css = `
:root{
  --bg:#f7f8fb;
  --card:#ffffff;
  --text:#0f172a;
  --muted:#5b6475;
  --border:rgba(15,23,42,.10);
  --shadow:0 12px 40px rgba(15,23,42,.10);
  --shadow2:0 10px 26px rgba(15,23,42,.08);
  --accent:#2563eb;
  --accent2:#7c3aed;
  --good:#16a34a;
  --warn:#d97706;
  --ring:0 0 0 4px rgba(37,99,235,.12);
}

*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  color:var(--text);
  background:
    radial-gradient(1200px 500px at 15% 0%, rgba(37,99,235,.10), transparent 60%),
    radial-gradient(1000px 520px at 90% 10%, rgba(124,58,237,.10), transparent 55%),
    linear-gradient(180deg, #ffffff, var(--bg));
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}
a{color:inherit;text-decoration:none}

.wrap{min-height:100vh}
.container{max-width:1100px;margin:0 auto;padding:0 20px}

.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.topbarInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0}

.brand{display:flex;align-items:center;gap:12px}
.logoWrap{
  flex-shrink:0;
  width:52px;height:52px;
  border-radius:14px;
  overflow:hidden;
  border:1px solid var(--border);
  background:#fff;
  box-shadow:var(--shadow2);
  display:grid;place-items:center;
}
.logoWrap img{width:100%;height:100%;object-fit:contain;display:block}
.brandText{display:flex;flex-direction:column;gap:2px}
.brandName{font-weight:850;letter-spacing:-.02em;line-height:1}
.brandSub{font-size:12px;color:var(--muted);font-weight:500}

.nav{display:flex;align-items:center;gap:10px}
.navLink{
  font-size:14px;color:var(--muted);
  padding:10px 10px;border-radius:10px;
  transition:background .15s ease,color .15s ease,transform .15s ease;
}
.navLink:hover{background:rgba(15,23,42,.05);color:var(--text);transform:translateY(-1px)}

.btn{
  border:1px solid var(--border);
  background:#fff;
  border-radius:12px;
  padding:10px 14px;
  font-size:14px;
  font-weight:650;
  display:inline-flex;align-items:center;gap:8px;justify-content:center;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease, opacity .15s ease;
  cursor:pointer;
}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow2)}
.btn:focus{outline:none;box-shadow:var(--shadow2), var(--ring)}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:0 1px 0 rgba(15,23,42,.04)}

.btnPrimary{
  border-color:rgba(37,99,235,.25);
  background:linear-gradient(180deg, rgba(37,99,235,.10), rgba(37,99,235,.04));
}
.btnPrimary:hover{border-color:rgba(37,99,235,.35)}
.btnCreate{padding:12px 16px;border-radius:14px}

.arrow{opacity:.9}

/* App shell */
.appShell{padding:18px 0 40px}
.appGrid{display:grid;grid-template-columns:1fr 320px;gap:14px;align-items:start}

.canvas{
  background:rgba(255,255,255,.72);
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow:var(--shadow);
  overflow:hidden;
  min-height:calc(100vh - 140px);
  display:flex;
  flex-direction:column;
}

.canvasTop{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  padding:16px 16px;
  border-bottom:1px solid var(--border);
  background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.75));
}

.canvasTitle{font-weight:900;letter-spacing:-.02em;font-size:16px}
.canvasSub{color:var(--muted);font-size:13px;margin-top:6px;line-height:1.55}

.seg{
  display:flex;
  gap:6px;
  background:rgba(15,23,42,.04);
  border:1px solid var(--border);
  padding:6px;
  border-radius:14px;
}
.segBtn{
  border:1px solid transparent;
  background:transparent;
  border-radius:12px;
  padding:8px 10px;
  font-size:13px;
  font-weight:750;
  color:var(--muted);
  display:inline-flex;
  align-items:center;
  gap:8px;
  cursor:pointer;
  transition:background .15s ease, transform .15s ease, color .15s ease, border-color .15s ease;
}
.segBtn:hover{background:rgba(255,255,255,.75);transform:translateY(-1px);color:var(--text)}
.segBtn.active{
  background:#fff;
  border-color:rgba(37,99,235,.25);
  color:var(--text);
  box-shadow:0 1px 0 rgba(15,23,42,.05);
}
.segIcon{display:inline-flex;color:currentColor}

.canvasBody{
  padding:16px;
  flex:1;
  overflow:auto;
}

/* Empty preview */
.emptyState{display:grid;gap:12px}
.emptyCard{
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:18px;
  padding:16px;
  box-shadow:var(--shadow2);
}
.emptyKicker{
  display:inline-flex;align-items:center;gap:10px;
  padding:8px 12px;border-radius:999px;
  background:rgba(255,255,255,.75);
  border:1px solid var(--border);
  color:var(--muted);
  font-size:13px;
  width:fit-content;
}
.dot{width:8px;height:8px;border-radius:999px;background:var(--good);box-shadow:0 0 0 6px rgba(22,163,74,.10)}
.emptyHeadline{margin-top:14px;font-weight:950;letter-spacing:-.03em;font-size:20px}
.emptyText{margin-top:10px;color:var(--muted);font-size:14px;line-height:1.65;max-width:70ch}

.miniPreview{margin-top:14px;display:grid;gap:10px}
.miniMsg{
  border:1px solid var(--border);
  border-radius:16px;
  padding:12px;
  background:#fff;
}
.miniMsg.user{background:linear-gradient(180deg, rgba(37,99,235,.06), #fff)}
.miniMsg.agent{background:linear-gradient(180deg, rgba(124,58,237,.05), #fff)}
.miniMeta{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12px;margin-bottom:8px}
.miniMeta .who{font-weight:900;color:var(--text)}
.miniText{font-size:14px;line-height:1.6;color:var(--text)}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.chip{
  font-size:12px;
  color:var(--muted);
  border:1px solid var(--border);
  background:#fff;
  padding:6px 10px;border-radius:999px;
}

.errorBar{
  display:flex;align-items:center;gap:10px;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(220,38,38,.20);
  background:rgba(220,38,38,.06);
  color:#991b1b;
}
.errorIcon{display:inline-flex}
.errorText{font-size:13px;font-weight:650}

/* Composer */
.composerWrap{
  border-top:1px solid var(--border);
  background:linear-gradient(180deg, rgba(255,255,255,.80), rgba(255,255,255,.92));
  padding:12px 12px;
}
.composerTop{
  display:flex;
  gap:10px;
  align-items:end;
  padding:0 2px 10px;
}
.field{flex:1;min-width:220px}
.label{font-size:12px;color:var(--muted);font-weight:650;margin-bottom:6px}
.input{
  width:100%;
  border:1px solid var(--border);
  background:#fff;
  border-radius:14px;
  padding:10px 12px;
  font-size:14px;
  color:var(--text);
  outline:none;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.input:focus{box-shadow:var(--shadow2), var(--ring)}

.composer{
  display:flex;
  gap:10px;
  align-items:flex-end;
}

.iconBtn{
  width:44px;
  height:44px;
  border-radius:14px;
  border:1px solid var(--border);
  background:#fff;
  color:var(--muted);
  display:grid;
  place-items:center;
  cursor:pointer;
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.iconBtn:hover{transform:translateY(-1px);box-shadow:var(--shadow2);color:var(--text)}
.iconBtn:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:0 1px 0 rgba(15,23,42,.04)}

.promptBox{
  flex:1;
  min-height:44px;
  border:1px solid var(--border);
  background:#fff;
  border-radius:18px;
  padding:10px 12px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.promptBox:focus-within{box-shadow:var(--shadow2), var(--ring)}
.prompt{
  width:100%;
  border:none;
  outline:none;
  resize:none;
  font-size:14px;
  line-height:1.5;
  color:var(--text);
  background:transparent;
}
.hint{
  margin-top:6px;
  font-size:12px;
  color:rgba(91,100,117,.90);
  display:flex;
  gap:6px;
  align-items:center;
  flex-wrap:wrap;
}
.hintKey{
  border:1px solid var(--border);
  background:rgba(15,23,42,.02);
  padding:2px 6px;
  border-radius:8px;
  font-weight:750;
  font-size:11px;
}

/* Side panel */
.side{position:sticky;top:86px;align-self:start;display:grid;gap:12px}
.sideCard{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:18px;
  padding:14px;
  box-shadow:var(--shadow2);
}
.sideTitle{font-weight:900;letter-spacing:-.02em}
.sideList{margin:10px 0 0;padding-left:18px;color:var(--muted);line-height:1.7;font-size:13px}
.sideList li{margin:8px 0}
.sidePills{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pill2{
  font-size:12px;
  color:var(--muted);
  border:1px solid var(--border);
  background:#fff;
  padding:6px 10px;border-radius:999px;
}
.pill2.on{
  border-color:rgba(37,99,235,.25);
  background:linear-gradient(180deg, rgba(37,99,235,.10), rgba(37,99,235,.04));
  color:var(--text);
}
.sideMuted{margin-top:10px;color:var(--muted);font-size:13px;line-height:1.6}

/* responsive */
@media (max-width: 980px){
  .appGrid{grid-template-columns:1fr}
  .side{position:static}
}
@media (max-width: 560px){
  .nav .navLink{display:none}
  .composerTop{flex-direction:column;align-items:stretch}
  .iconBtn{width:42px;height:42px;border-radius:14px}
}
`;

