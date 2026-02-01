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
                  width={88}
                  height={88}
                  priority
                />
              </div>
              <div className="brandText">
                <span className="brandSub">
                  AI-to-AI coordination for scheduling.
                </span>
              </div>
            </div>

            <nav className="nav">
              <a className="navLink" href="#how">
                How it works
              </a>
              <a className="navLink" href="#flows">
                Flows
              </a>
              <a className="btn btnPrimary" href="/login">
                Open app <span className="arrow">→</span>
              </a>
            </nav>
          </div>
        </header>

        {/* Hero (centered) */}
        <section className="hero">
          {/* Background image (fades in) */}
          <div className="heroBg" aria-hidden="true">
            <Image
              src="/overlap_blue_no_text.png"
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Overlay gradient to ensure text contrast */}
          <div className="heroOverlay" aria-hidden="true" />

          <div className="container heroSolo">
            <div className="heroLeft">
              <h1 className="h1">
                <span className="titleMain">Overlap</span>
                <br />
                <span className="titleSub">
                  Your personal AI agents for meeting scheduling
                </span>
              </h1>

              <p className="sub subFade">
                No manual coordination required. Say goodbye to communication
                barriers. Overlap brings AI agents into the office to manage
                schedules for everyone. Shaping the future of AI-driven
                workplaces.
              </p>

              <div className="ctaRow">
                <a className="btn btnPrimary btnLarge" href="/login">
                  Open app <span className="arrow">→</span>
                </a>
                <a className="btn btnGhost btnLarge" href="#how">
                  How it works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Preview section */}
        <section className="section" id="demo">
          <div className="container demoGrid">
            <div className="sectionHead demoHead">
              <div>
                <h2 className="h2">Preview</h2>
                <p className="muted">
                  Example thread: your prompt → agent compares calendars → you
                  see options and approve.
                </p>
              </div>

            </div>

            <div className="panel animateOnScroll">
              <div className="panelTop">
                <div>
                  <div className="panelTitle">Example thread (schedule)</div>
                  <div className="panelSub">
                    Your prompt → agent compares calendars → you see options and
                    approve
                  </div>
                </div>
                <div className="status">
                  <span className="statusDot" />
                  Preview
                </div>
              </div>

              <div className="panelBody">
                <div className="msg msgUser">
                  <div className="msgMeta">
                    <span className="msgWho">You</span>
                    <span className="msgWhen">2:14 PM</span>
                  </div>
                  <div className="msgText">
                    Schedule a 30-minute sync with the team next week. Prefer
                    Tue–Thu afternoons.
                  </div>
                </div>

                <div className="msg msgAgent">
                  <div className="msgMeta">
                    <span className="msgWho">Overlap</span>
                    <span className="msgWhen">2:14 PM</span>
                  </div>
                  <div className="msgText">
                    Compared availability across participants. Here are the best
                    overlaps — pick one to approve:
                  </div>

                  <div className="slots">
                    <div className="slot">
                      <div className="slotTop">
                        <div className="slotDay">Tue</div>
                        <div className="slotBadge good">Best fit</div>
                      </div>
                      <div className="slotTime">2:30–3:00 PM</div>
                      <div className="slotMeta">30 min • all free</div>
                    </div>

                    <div className="slot">
                      <div className="slotTop">
                        <div className="slotDay">Wed</div>
                        <div className="slotBadge good">Best fit</div>
                      </div>
                      <div className="slotTime">4:00–4:30 PM</div>
                      <div className="slotMeta">30 min • all free</div>
                    </div>

                    <div className="slot">
                      <div className="slotTop">
                        <div className="slotDay">Thu</div>
                        <div className="slotBadge warn">Alternative</div>
                      </div>
                      <div className="slotTime">3:00–3:30 PM</div>
                      <div className="slotMeta">30 min • all free</div>
                    </div>
                  </div>

                  <div className="panelActions">
                    <button className="btn btnPrimary btnSmall" type="button">
                      Approve & create event
                    </button>
                    <button className="btn btnGhost btnSmall" type="button">
                      Ask for other times
                    </button>
                  </div>

                  <div className="note">
                    Same flow for email: you say what you want → Overlap drafts →
                    you review and approve before sending.
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="sideCards">
              <div className="miniCard animateOnScroll">
                <div className="miniTitle">Your data stays yours</div>
                <div className="miniText">
                  Agents only share what’s needed for the thread (e.g.
                  availability); you approve before anything is sent or booked.
                </div>
                <div className="miniBullets">
                  <div className="miniBullet">
                    <span className="dot" />
                    You control what’s shared
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Least-privilege coordination
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Approval-first actions
                  </div>
                </div>
              </div>

              <div className="miniCard animateOnScroll">
                <div className="miniTitle">Schedule or email</div>
                <div className="miniText">
                  Two flows today: agents negotiate calendar overlap, or draft
                  email from your prompt; both require your approval.
                </div>
                <div className="miniBullets">
                  <div className="miniBullet">
                    <span className="dot" />
                    Meetings: propose best overlaps
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Email: draft from prompt + context
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    You review before sending/booking
                  </div>
                </div>
              </div>

              <div className="miniCard miniCardWide animateOnScroll">
                <div className="miniTitle">Approval-first by design</div>
                <div className="miniText">
                  Overlap can suggest, draft, and coordinate — but it won’t take
                  actions on your behalf without an explicit approval step.
                </div>
                <div className="miniBullets">
                  <div className="miniBullet">
                    <span className="dot" />
                    Clear preview before commit
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Ask for alternatives instantly
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Works 1-to-1 or groups
                  </div>
                </div>
              </div>

              {/* NEW block below "Approval-first by design" */}
              <div className="miniCard miniCardWide animateOnScroll">
                <div className="miniTitle">Team-ready coordination</div>
                <div className="miniText">
                  Built for real offices: coordinate across time zones, roles,
                  and preferences — while keeping the final decision with you.
                </div>
                <div className="miniBullets">
                  <div className="miniBullet">
                    <span className="dot" />
                    Time-zone aware suggestions
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Respect working hours & focus time
                  </div>
                  <div className="miniBullet">
                    <span className="dot" />
                    Fewer interruptions, faster alignment
                  </div>
                </div>

                <div className="miniActions">
                  <a className="btn btnGhost btnSmall" href="#flows">
                    See flows
                  </a>
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
                  Say what you want → agents negotiate (calendars or email
                  context) → you see a clear preview → you approve. No
                  back-and-forth.
                </p>
              </div>
            </div>

            <div className="grid4">
              <div className="step animateOnScroll">
                <div className="stepNum">01</div>
                <div className="stepTitle">Say what you want</div>
                <div className="stepText">
                  Schedule a meeting (who, when, prefs) or draft an email
                  (recipients, intent).
                </div>
              </div>
              <div className="step animateOnScroll">
                <div className="stepNum">02</div>
                <div className="stepTitle">Agents coordinate</div>
                <div className="stepText">
                  Your agent and others’ agents compare availability or context;
                  they find overlap.
                </div>
              </div>
              <div className="step animateOnScroll">
                <div className="stepNum">03</div>
                <div className="stepTitle">See the plan</div>
                <div className="stepText">
                  Overlap shows you a clear preview (times or draft) before any
                  action.
                </div>
              </div>
              <div className="step animateOnScroll">
                <div className="stepNum">04</div>
                <div className="stepTitle">Approve it</div>
                <div className="stepText">
                  You approve; only then do we create the event or send the
                  email.
                </div>
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
                <p className="muted">
                  Schedule meetings or draft emails — both with a clear preview
                  and your approval before anything happens.
                </p>
              </div>
            </div>

            <div className="grid2">
              <div className="card animateOnScroll">
                <div className="cardTop">
                  <div>
                    <div className="cardTitle">Schedule</div>
                    <div className="cardSub">
                      Agents negotiate across calendars; you see options and
                      approve.
                    </div>
                  </div>
                  <div className="chip">Core</div>
                </div>
                <ul className="list">
                  <li>1-to-1 or groups (3, 4, 5+)</li>
                  <li>Agents compare availability; no email ping-pong</li>
                  <li>Clear preview of proposed times</li>
                  <li>You approve before the event is created</li>
                </ul>
              </div>

              <div className="card animateOnScroll">
                <div className="cardTop">
                  <div>
                    <div className="cardTitle">Email</div>
                    <div className="cardSub">
                      Your agent drafts from your prompt (and thread context);
                      you review and approve before send.
                    </div>
                  </div>
                  <div className="chip">Support</div>
                </div>
                <ul className="list">
                  <li>Say what you want to communicate</li>
                  <li>Agent pulls related context when useful</li>
                  <li>You see the draft before it’s sent</li>
                  <li>No back-and-forth — approve and go</li>
                </ul>
              </div>
            </div>

            <div className="ctaBar animateOnScroll">
              <div>
                <div className="ctaTitle">Try the app</div>
                <div className="ctaText">
                  Create a thread, run planning, and approve a proposal —
                  calendar and email integrations can be wired later.
                </div>
              </div>
              <a className="btn btnPrimary btnLarge" href="/login">
                Open app <span className="arrow">→</span>
              </a>
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="container footerInner">
            <div>
              <div className="footerName">
                © 2026 Overlap. All rights reserved.
              </div>
              <div className="muted">Shaping future AI-driven offices.</div>
            </div>
          </div>
        </footer>
      </main>

      {/* Plain style tag (server-component safe) */}
      <style>{css}</style>

      {/* IntersectionObserver for "scale up on scroll" blocks */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  if (window.__overlapIO) return;
  window.__overlapIO = true;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    document.querySelectorAll('.animateOnScroll').forEach(function(el){
      el.classList.add('inView');
      el.style.setProperty('--reveal', '1');
    });
    return;
  }

  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.animateOnScroll').forEach(function(el){
      el.classList.add('inView');
      el.style.setProperty('--reveal', '1');
    });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting) {
        entry.target.classList.add('inView');
        entry.target.style.setProperty('--reveal', '1');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.animateOnScroll').forEach(function(el){
    el.style.setProperty('--reveal', '0');
    io.observe(el);
  });
})();
          `,
        }}
      />
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

/* Fix anchor jump under sticky header */
section[id]{ scroll-margin-top: 120px; }

.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.topbarInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0}

.brand{display:flex;align-items:center;gap:12px}
.logoWrap{flex-shrink:0;width:88px;height:88px;display:block;line-height:0}
.logoWrap img{width:100%;height:100%;object-fit:contain;display:block;vertical-align:middle}
.brandSub{font-size:14px;color:var(--muted);font-weight:500}

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
.btnGhost{background:rgba(255,255,255,.65)}
.btnLarge{padding:12px 16px;border-radius:14px}
.btnSmall{padding:9px 12px;border-radius:12px;font-size:13px}
.arrow{opacity:.9}

/* HERO with full-bleed background image */
.hero{
  position:relative;
  padding:56px 0 20px;
  overflow:hidden;
}
.heroBg{
  position:absolute;
  inset:0;
  z-index:0;
  opacity:0;
  animation: fadeIn 1.2s ease forwards;
  animation-delay:.05s;
}
.heroOverlay{
  position:absolute;
  inset:0;
  z-index:1;
  background:
    radial-gradient(900px 420px at 50% 40%, rgba(255,255,255,.82), rgba(255,255,255,.55) 55%, rgba(255,255,255,.25) 100%),
    linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,.18));
  pointer-events:none;
}

.heroSolo{
  position:relative;
  z-index:2;
  min-height: calc(100vh - 120px);
  display:grid;
  place-items:center;
  padding: 26px 0;
}
.heroLeft{
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  transform: translateY(-22px);
}
.ctaRow{justify-content:center}

/* Title sizes + animations */
.h1{
  margin:0;
  line-height:1.04;
  letter-spacing:-.045em;
  font-weight:900;
}
.titleMain{
  font-size:76px;
  line-height:0.95;
}
.titleSub{
  margin-top:10px;
  display:inline-block;
  font-size:46px;
  font-weight:900;
  letter-spacing:-.04em;
  color:rgba(15,23,42,.55);
  opacity:0;
  animation: fadeInUp .9s ease forwards;
  animation-delay: .15s;
}

/* Subtext fade-in */
.sub{
  margin:16px auto 0;
  color:rgba(15,23,42,.60);
  font-size:16px;
  line-height:1.8;
  max-width:72ch;
}
.subFade{
  opacity:0;
  animation: fadeInUp .9s ease forwards;
  animation-delay: .35s;
}

/* Motion prefs */
@media (prefers-reduced-motion: reduce){
  .heroBg{opacity:1; animation:none}
  .titleSub{opacity:1; animation:none}
  .subFade{opacity:1; animation:none}
  .animateOnScroll{transform:none !important; opacity:1 !important}
}

@keyframes fadeIn{
  from{opacity:0}
  to{opacity:1}
}
@keyframes fadeInUp{
  from{opacity:0; transform:translateY(6px)}
  to{opacity:1; transform:translateY(0)}
}

/* CTA row */
.ctaRow{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}

/* DEMO section */
.section{padding:56px 0}
.sectionHead{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
.h2{margin:0;font-size:22px;font-weight:850;letter-spacing:-.02em}
.muted{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.65;max-width:72ch}

.demoGrid{
  display:grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 22px;
  align-items:start;
}
.demoHead{grid-column: 1 / -1;}

/* Preview panel */
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

/* Right side cards */
.sideCards{
  margin-top:0;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
  align-content:start;
}
.miniCardWide{grid-column:1 / -1;}

.miniCard{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:16px;
  padding:14px 14px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.miniTitle{font-weight:850;letter-spacing:-.02em}
.miniText{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.55}
.miniBullets{margin-top:10px;display:grid;gap:8px}
.miniBullet{display:flex;align-items:center;gap:10px;color:rgba(15,23,42,.62);font-size:13px;line-height:1.4}
.dot{width:8px;height:8px;border-radius:999px;background:rgba(37,99,235,.55);box-shadow:0 0 0 6px rgba(37,99,235,.10)}
.miniActions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}

/* How it works + flows grids */
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

/* Scroll reveal: small -> big */
.animateOnScroll{
  opacity:0;
  transform: scale(.965);
  transition: transform .55s ease, opacity .55s ease;
  will-change: transform, opacity;
}
.animateOnScroll.inView{
  opacity:1;
  transform: scale(1);
}

.footer{
  padding:26px 0 44px;
  border-top:1px solid var(--border);
  background:rgba(255,255,255,.55);
}
.footerInner{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.footerName{font-weight:400;letter-spacing:-.02em}

/* responsive */
@media (max-width: 980px){
  .demoGrid{grid-template-columns:1fr}
  .grid4{grid-template-columns:1fr 1fr}
  .grid2{grid-template-columns:1fr}
  .sideCards{grid-template-columns:1fr}
  .miniCardWide{grid-column:auto}
  .titleMain{font-size:62px}
  .titleSub{font-size:38px}
  .heroLeft{transform:translateY(-14px)}
}
@media (max-width: 560px){
  .titleMain{font-size:48px}
  .titleSub{font-size:30px}
  .nav .navLink{display:none}
  .grid4{grid-template-columns:1fr}
  .ctaBar{flex-direction:column;align-items:stretch}
  .heroLeft{transform:translateY(-10px)}
}
`;
