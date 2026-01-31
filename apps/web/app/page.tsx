// apps/web/app/page.tsx
import Link from "next/link";


import Image from "next/image";



export default function HomePage() {
  return (
    <>
      <main className="wrap">
        {/* Top bar */}
        <header className="topbar">
          <div className="container topbarInner">
            <div className="brand">
              <div className="logoWrap" aria-hidden="true">
  <Image
    src="/overlap_blue.png"
    alt="Overlap logo"
    width={42}
    height={42}
    priority
  />
</div>

              <div className="brandText">
                <div className="brandName"></div>
                <div className="brandSub">AI-to-AI coordination for scheduling</div>
              </div>
            </div>

            <nav className="nav">
              <a className="navLink" href="#how">
                How it works
              </a>
              <a className="navLink" href="#flows">
                Flows
              </a>
              <a className="btn btnPrimary" href="#demo">
                Request access <span className="arrow">→</span>
              </a>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="container heroGrid">
            <div className="heroLeft">
              <div className="pill">
                <span className="pillDot" aria-hidden="true" />
                v0.1 • internal preview • approval-first
              </div>

              <h1 className="h1">
                Meetings that schedule themselves.
                <span className="h1Muted"> Your agent negotiates time with their agents.</span>
              </h1>

              <p className="sub">
                Overlap coordinates multi-person scheduling by letting AI agents compare availability and propose the best
                common windows - with a strict approval step before anything is finalized.
              </p>

              <div className="ctaRow">
                <a className="btn btnPrimary btnLarge" href="#demo">
                  See the flow <span className="arrow">→</span>
                </a>
                <a className="btn btnGhost btnLarge" href="#how">
                  How it works
                </a>
              </div>

              <div className="stats">
                <div className="stat">
                  <div className="statNum">30s</div>
                  <div className="statLabel">to get options</div>
                </div>
                <div className="stat">
                  <div className="statNum">2–4</div>
                  <div className="statLabel">ranked proposals</div>
                </div>
                <div className="stat">
                  <div className="statNum">0</div>
                  <div className="statLabel">back-and-forth emails</div>
                </div>
              </div>

              <div className="trustRow" aria-label="Office-ready notes">
                <span className="tag">Approval-first</span>
                <span className="tag">Audit trail via threads</span>
                <span className="tag">Multi-party</span>
                <span className="tag">Office-ready</span>
              </div>
            </div>

            {/* Preview panel */}
            <div className="heroRight" id="demo">
              <div className="panel">
                <div className="panelTop">
                  <div>
                    <div className="panelTitle">Scheduling thread</div>
                    <div className="panelSub">Draft • not yet connected to calendar</div>
                  </div>
                  <div className="status">
                    <span className="statusDot" />
                    Active
                  </div>
                </div>

                <div className="panelBody">
                  <div className="msg msgUser">
                    <div className="msgMeta">
                      <span className="msgWho">You</span>
                      <span className="msgWhen">2:14 PM</span>
                    </div>
                    <div className="msgText">
                      Set up a 30-minute sync with Aditya + Peter next week. Prefer Tue–Thu afternoons.
                    </div>
                  </div>

                  <div className="msg msgAgent">
                    <div className="msgMeta">
                      <span className="msgWho">Overlap Agent</span>
                      <span className="msgWhen">2:14 PM</span>
                    </div>
                    <div className="msgText">
                      I compared availability and found the best overlaps. Pick one to finalize:
                    </div>

                    <div className="slots">
                      <div className="slot">
                        <div className="slotTop">
                          <div className="slotDay">Tue</div>
                          <div className="slotBadge good">High</div>
                        </div>
                        <div className="slotTime">2:30-3:00 PM</div>
                        <div className="slotMeta">30 min • 3 attendees • East Lansing time</div>
                      </div>

                      <div className="slot">
                        <div className="slotTop">
                          <div className="slotDay">Wed</div>
                          <div className="slotBadge good">High</div>
                        </div>
                        <div className="slotTime">4:00-4:30 PM</div>
                        <div className="slotMeta">30 min • 3 attendees • East Lansing time</div>
                      </div>

                      <div className="slot">
                        <div className="slotTop">
                          <div className="slotDay">Thu</div>
                          <div className="slotBadge warn">Medium</div>
                        </div>
                        <div className="slotTime">3:00–3:30 PM</div>
                        <div className="slotMeta">30 min • 3 attendees • East Lansing time</div>
                      </div>
                    </div>

                    <div className="panelActions">
                      <button className="btn btnPrimary btnSmall" type="button">
                        Approve
                      </button>
                      <button className="btn btnGhost btnSmall" type="button">
                        Ask for alternatives
                      </button>
                    </div>

                    <div className="note">
                      v0.1: this is a UI preview. Calendar creation + email sending can be added later.
                    </div>
                  </div>
                </div>
              </div>

              <div className="sideCards">
                <div className="miniCard">
                  <div className="miniTitle">Security posture</div>
                  <div className="miniText">
                    Approval-first design: no actions without explicit confirmation.
                  </div>
                </div>
                <div className="miniCard">
                  <div className="miniTitle">Office workflow</div>
                  <div className="miniText">
                    Threads keep constraints + decisions visible for teams.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section" id="how">
          <div className="container">
            <div className="sectionHead">
              <div>
                <h2 className="h2">How it works</h2>
                <p className="muted">
                  Simple model: a thread stores context, agents negotiate, you approve.
                </p>
              </div>
            </div>

            <div className="grid4">
              <div className="step">
                <div className="stepNum">01</div>
                <div className="stepTitle">Create a request</div>
                <div className="stepText">Participants, duration, preferences, constraints.</div>
              </div>
              <div className="step">
                <div className="stepNum">02</div>
                <div className="stepTitle">Agents coordinate</div>
                <div className="stepText">Availability comparison + constraint resolution.</div>
              </div>
              <div className="step">
                <div className="stepNum">03</div>
                <div className="stepTitle">Ranked proposals</div>
                <div className="stepText">2–4 options, confidence tagged.</div>
              </div>
              <div className="step">
                <div className="stepNum">04</div>
                <div className="stepTitle">Approve & finalize</div>
                <div className="stepText">You approve before anything is created/sent.</div>
              </div>
            </div>
          </div>
        </section>

        {/* Flows */}
        <section className="section" id="flows">
          <div className="container">
            <div className="sectionHead">
              <div>
                <h2 className="h2">Two flows (v0.1)</h2>
                <p className="muted">Keep it focused for office use: scheduling + email drafting.</p>
              </div>
            </div>

            <div className="grid2">
              <div className="card">
                <div className="cardTop">
                  <div>
                    <div className="cardTitle">Schedule</div>
                    <div className="cardSub">Agents propose common time windows.</div>
                  </div>
                  <div className="chip">Core</div>
                </div>
                <ul className="list">
                  <li>Multi-person coordination</li>
                  <li>Time-zone aware proposals</li>
                  <li>Approval before booking</li>
                  <li>Thread audit trail</li>
                </ul>
              </div>

              <div className="card">
                <div className="cardTop">
                  <div>
                    <div className="cardTitle">Email</div>
                    <div className="cardSub">Draft professionally from prompt + thread context.</div>
                  </div>
                  <div className="chip">Support</div>
                </div>
                <ul className="list">
                  <li>Two tone options (concise / formal)</li>
                  <li>Auto-fill context from the thread</li>
                  <li>Approval before sending</li>
                  <li>Consistent office voice</li>
                </ul>
              </div>
            </div>

            <div className="ctaBar">
              <div>
                <div className="ctaTitle">Want this integrated with real calendars?</div>
                <div className="ctaText">This page stays static — integrations come later when you’re ready.</div>
              </div>
              <a className="btn btnPrimary btnLarge" href="#demo">
                View preview <span className="arrow">→</span>
              </a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container footerInner">
            <div>
              <div className="footerName">Overlap</div>
              <div className="muted">AI-to-AI coordination for scheduling and email drafting.</div>
            </div>
            <div className="footerLinks">
              <a className="navLink" href="#how">
                How it works
              </a>
              <a className="navLink" href="#flows">
                Flows
              </a>
              <a className="navLink" href="#demo">
                Preview
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* Plain style tag (server-component safe) */}
      <style>{css}</style>
    </>
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
.topbarInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0}

.brand{display:flex;align-items:center;gap:12px}
.mark{
  width:42px;height:42px;border-radius:14px;
  background:linear-gradient(135deg, rgba(37,99,235,.12), rgba(124,58,237,.12));
  border:1px solid var(--border);
  box-shadow:var(--shadow2);
  display:grid;place-items:center;
}
.markInner{
  width:12px;height:12px;border-radius:999px;
  background:linear-gradient(180deg, var(--accent), var(--accent2));
  box-shadow:0 10px 26px rgba(37,99,235,.25);
}
.brandName{font-weight:750;letter-spacing:-.02em}
.brandSub{font-size:12px;color:var(--muted);margin-top:3px}

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
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
  cursor:pointer;
}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow2)}
.btn:focus{outline:none;box-shadow:var(--shadow2), var(--ring)}

.btnPrimary{
  border-color:rgba(37,99,235,.25);
  background:linear-gradient(180deg, rgba(37,99,235,.10), rgba(37,99,235,.04));
}
.btnPrimary:hover{border-color:rgba(37,99,235,.35)}
.btnGhost{
  background:rgba(255,255,255,.65);
}
.btnLarge{padding:12px 16px;border-radius:14px}
.btnSmall{padding:9px 12px;border-radius:12px;font-size:13px}
.arrow{opacity:.9}

.hero{padding:56px 0 20px}
.heroGrid{display:grid;grid-template-columns:1.05fr .95fr;gap:22px;align-items:start}

.pill{
  display:inline-flex;align-items:center;gap:10px;
  padding:8px 12px;border-radius:999px;
  background:rgba(255,255,255,.70);
  border:1px solid var(--border);
  color:var(--muted);
  font-size:13px;
}
.pillDot{width:8px;height:8px;border-radius:999px;background:var(--good);box-shadow:0 0 0 6px rgba(22,163,74,.10)}

.h1{
  margin:14px 0 0;
  font-size:46px;line-height:1.06;
  letter-spacing:-.04em;
  font-weight:800;
}
.h1Muted{color:var(--muted);font-weight:750}
.sub{
  margin:14px 0 0;
  color:var(--muted);
  font-size:16px;
  line-height:1.7;
  max-width:60ch;
}
.ctaRow{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}

.stats{
  margin-top:18px;
  display:flex;gap:12px;flex-wrap:wrap;
}
.stat{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:16px;
  padding:12px 14px;
  min-width:160px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.statNum{font-weight:850;font-size:18px;letter-spacing:-.02em}
.statLabel{color:var(--muted);font-size:13px;margin-top:4px}

.trustRow{margin-top:16px;display:flex;gap:10px;flex-wrap:wrap}
.tag{
  font-size:13px;color:var(--muted);
  background:rgba(255,255,255,.70);
  border:1px solid var(--border);
  padding:8px 10px;border-radius:999px;
}

.panel{
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow:var(--shadow);
  overflow:hidden;
}
.panelTop{
  padding:14px 16px;
  display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  border-bottom:1px solid var(--border);
  background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.75));
}
.panelTitle{font-weight:800;letter-spacing:-.02em}
.panelSub{font-size:12px;color:var(--muted);margin-top:4px}
.status{
  font-size:12px;color:var(--muted);
  display:flex;align-items:center;gap:8px;
  border:1px solid var(--border);
  background:#fff;
  padding:8px 10px;border-radius:999px;
}
.statusDot{width:8px;height:8px;border-radius:999px;background:var(--good)}

.panelBody{padding:14px;display:grid;gap:12px}
.msg{
  border:1px solid var(--border);
  border-radius:16px;
  background:#fff;
  padding:12px 12px;
}
.msgUser{background:linear-gradient(180deg, rgba(37,99,235,.06), rgba(255,255,255,1))}
.msgAgent{background:linear-gradient(180deg, rgba(124,58,237,.05), rgba(255,255,255,1))}

.msgMeta{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:12px;margin-bottom:8px}
.msgWho{font-weight:800;color:var(--text)}
.msgText{color:var(--text);font-size:14px;line-height:1.6}

.slots{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
.slot{
  border:1px solid var(--border);
  border-radius:14px;
  background:rgba(15,23,42,.02);
  padding:10px 10px;
}
.slotTop{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.slotDay{font-weight:850}
.slotBadge{
  font-size:12px;color:var(--muted);
  border:1px solid var(--border);
  background:#fff;
  padding:4px 8px;border-radius:999px;
}
.slotBadge.good{color:#0f5132;border-color:rgba(22,163,74,.25);background:rgba(22,163,74,.08)}
.slotBadge.warn{color:#5a3a00;border-color:rgba(217,119,6,.25);background:rgba(217,119,6,.10)}
.slotTime{font-weight:850;letter-spacing:-.01em}
.slotMeta{font-size:12px;color:var(--muted);margin-top:2px}

.panelActions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.note{margin-top:10px;font-size:12px;color:var(--muted)}

.sideCards{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.miniCard{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:16px;
  padding:12px 12px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.miniTitle{font-weight:850;letter-spacing:-.02em}
.miniText{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.55}

.section{padding:56px 0}
.sectionHead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
.h2{margin:0;font-size:22px;font-weight:850;letter-spacing:-.02em}
.muted{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.65;max-width:72ch}

.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:14px}
.step{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:18px;
  padding:16px 16px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.stepNum{
  display:inline-block;
  font-size:12px;color:var(--muted);
  padding:6px 10px;border-radius:999px;
  border:1px solid var(--border);
  background:#fff;
}
.stepTitle{margin-top:10px;font-weight:850;letter-spacing:-.02em}
.stepText{margin-top:8px;color:var(--muted);font-size:13px;line-height:1.55}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.card{
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:18px;
  padding:16px 16px;
  box-shadow:var(--shadow2);
}
.cardTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
.cardTitle{font-weight:900;letter-spacing:-.02em}
.cardSub{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.5}
.chip{
  font-size:12px;color:var(--muted);
  border:1px solid var(--border);
  background:#fff;
  padding:6px 10px;border-radius:999px;white-space:nowrap;
}
.list{margin:0;padding-left:18px;color:var(--text);line-height:1.85}
.list li{margin:6px 0;color:var(--muted)}
.list li::marker{color:rgba(37,99,235,.55)}

.ctaBar{
  margin-top:14px;
  background:linear-gradient(135deg, rgba(37,99,235,.10), rgba(124,58,237,.08));
  border:1px solid rgba(37,99,235,.18);
  border-radius:20px;
  padding:16px 16px;
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  box-shadow:var(--shadow2);
}
.ctaTitle{font-weight:900;letter-spacing:-.02em}
.ctaText{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.55}

.footer{
  padding:26px 0 44px;
  border-top:1px solid var(--border);
  background:rgba(255,255,255,.55);
}
.footerInner{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.footerName{font-weight:900;letter-spacing:-.02em}
.footerLinks{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}

/* responsive */
@media (max-width: 980px){
  .heroGrid{grid-template-columns:1fr}
  .grid4{grid-template-columns:1fr 1fr}
  .grid2{grid-template-columns:1fr}
  .sideCards{grid-template-columns:1fr}
}
@media (max-width: 560px){
  .h1{font-size:36px}
  .nav .navLink{display:none}
  .grid4{grid-template-columns:1fr}
  .ctaBar{flex-direction:column;align-items:stretch}
}
`;
