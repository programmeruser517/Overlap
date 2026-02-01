"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type LinkProvider = "google" | "microsoft";

export default function ConnectPage() {
  const [ready, setReady] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [open, setOpen] = useState(false);
  const [linkedGoogle, setLinkedGoogle] = useState(false);
  const [linkedMicrosoft, setLinkedMicrosoft] = useState(false);
  const [modalProvider, setModalProvider] = useState<LinkProvider | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const hasLinkedService = linkedGoogle || linkedMicrosoft;

  useEffect(() => {
    Promise.all([
      fetch("/api/onboarding").then((r) => r.json()),
      fetch("/api/organization-request").then((r) => r.json()),
      fetch("/api/me/linked-accounts").then((r) => r.json()),
    ]).then(([onboarding, org, linked]) => {
      if (onboarding.get_to_main === true) {
        router.replace("/app");
        return;
      }
      if (org.status !== "accepted") {
        router.replace("/onboarding/organization");
        return;
      }
      if (linked?.google === true) setLinkedGoogle(true);
      if (linked?.microsoft === true) setLinkedMicrosoft(true);
      setReady(true);
    }).catch(() => router.replace("/onboarding/organization"));
  }, [router]);

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

  const handleContinueToApp = async () => {
    setContinuing(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_get_to_main: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.get_to_main) {
        router.push("/app");
      } else {
        setContinuing(false);
      }
    } catch {
      setContinuing(false);
    }
  };

  const handleModalConnect = () => {
    if (modalProvider === "google") {
      const returnTo = encodeURIComponent("/onboarding/connect");
      window.location.href = `/api/auth/google/connect?returnTo=${returnTo}`;
      return;
    }
    if (modalProvider === "microsoft") setLinkedMicrosoft(true);
    setModalProvider(null);
  };

  if (!ready) {
    return (
      <main className="connectWrap">
        <div className="connectLoader" role="status" aria-label="Loading">
          <Image src="/overlap_blue_no_text.png" alt="" width={56} height={56} priority />
          <span className="connectSpinner" aria-hidden />
        </div>
        <style>{connectCss}</style>
      </main>
    );
  }

  return (
    <main className="connectWrap">
      <header className="connectTopbar">
        <div className="connectContainer connectTopbarInner">
          <Link href="/onboarding/organization" className="connectBrand">
            <div className="connectLogoWrap">
              <Image src="/overlap_blue.png" alt="Overlap" width={48} height={48} priority />
            </div>
            <span className="connectBrandSub">Onboarding</span>
          </Link>
          <div className="connectTopbarRight">
            <Link href="/onboarding/organization" className="connectBackLink">
              ← Back to organization
            </Link>
            <Link href="/onboarding" className="connectBackLink connectBackLinkSecondary">
              Preferences
            </Link>
            <div className="connectProfileWrap" ref={profileRef}>
            <button className="connectAvatar" onClick={() => setOpen(!open)} aria-label="Profile menu">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            {open && (
              <div className="connectProfileMenu">
                <button onClick={handleLogout} className="connectProfileItem">Log out</button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <div className="connectContent">
        <div className="connectContentBox">
          <div className="connectJustify">
            <h1 className="connectH1">Link Calendar & Email</h1>
            <p className="connectLead">
              Connect your calendar and email so your agent can schedule meetings and send messages on your behalf—without you copying availability or drafting every reply.
            </p>
            <p className="connectWhy">
              <strong>Why connect now?</strong> Your agent uses your real availability and drafts in your tone; linking now means you can start a thread and get a concrete plan right away.
            </p>
          </div>

          <div className="connectActions">
            <p className="connectPrompt">Connect a service</p>
            <div className="connectButtons">
              <button
                type="button"
                className={`connectCard connectCardGoogle${linkedGoogle ? " connectCardLinked" : ""}`}
                onClick={() => setModalProvider("google")}
              >
                <span className="connectCardIcon" aria-hidden>
                  <Image src="/google.png" alt="" width={48} height={48} className="connectCardIconImg" />
                </span>
                <span className="connectCardLabel">Google</span>
                <span className="connectCardMeta">{linkedGoogle ? "Connected" : "Calendar & Gmail"}</span>
              </button>
              <button
                type="button"
                className={`connectCard connectCardMicrosoft connectCardComingSoon${linkedMicrosoft ? " connectCardLinked" : ""}`}
                onClick={() => setModalProvider("microsoft")}
                disabled
                aria-disabled="true"
              >
                <span className="connectCardIcon" aria-hidden>
                  <Image src="/microsoft.png" alt="" width={48} height={48} className="connectCardIconImg" />
                </span>
                <span className="connectCardLabel">Microsoft</span>
                <span className="connectCardMeta">{linkedMicrosoft ? "Connected" : "Outlook Calendar & Mail"}</span>
                <span className="connectCardBadge">Coming soon</span>
              </button>
            </div>

            <p className="connectMaybe">
              <strong>Maybe later?</strong> You can link Calendar and Email anytime from Settings. You’ll still be able to use the app; your agent will just need these connections to propose meeting times that actually fit your schedule or send emails for you.
            </p>
            <div className="connectMaybeLater">
              <button
                type="button"
                className="connectBtn connectBtnGhost"
                onClick={handleContinueToApp}
                disabled={continuing}
              >
                {continuing ? "…" : "Maybe later"}
              </button>
            </div>
          </div>

          <div className="connectContinue">
            <button
              type="button"
              className={`connectBtn connectBtnPrimary${hasLinkedService ? " connectBtnPulse" : ""}`}
              onClick={handleContinueToApp}
              disabled={continuing || !hasLinkedService}
            >
              {continuing ? "…" : "Continue to threads"}
              <span className="connectArrow">→</span>
            </button>
          </div>
        </div>
      </div>

      {modalProvider && (
        <div className="connectModalBackdrop" onClick={() => setModalProvider(null)} role="dialog" aria-modal="true" aria-labelledby="connectModalTitle">
          <div className="connectModal" onClick={(e) => e.stopPropagation()}>
            <h2 id="connectModalTitle" className="connectModalTitle">
              Link {modalProvider === "google" ? "Google" : "Microsoft"}
            </h2>
            <p className="connectModalBody">
              {modalProvider === "google"
                ? "Connect your Google account to use Calendar and Gmail with your agent. You’ll be able to revoke access anytime in Settings."
                : "Connect your Microsoft account to use Outlook Calendar and Mail with your agent. You’ll be able to revoke access anytime in Settings."}
            </p>
            <div className="connectModalActions">
              <button type="button" className="connectBtn connectBtnGhost" onClick={() => setModalProvider(null)}>
                Cancel
              </button>
              <button type="button" className="connectBtn connectBtnPrimary" onClick={handleModalConnect}>
                Connect {modalProvider === "google" ? "Google" : "Microsoft"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{connectCss}</style>
    </main>
  );
}

const connectCss = `
:root{
  --text:#0f172a;
  --muted:#5b6475;
  --border:rgba(15,23,42,.10);
  --accent:#2563eb;
  --accent2:#7c3aed;
}
*{box-sizing:border-box}
a{color:inherit;text-decoration:none}

.connectWrap{
  min-height:100vh;
  background:#e8ecf4;
  background-image:linear-gradient(200deg, #f0f2f8 0%, #e4e8f2 50%, #dce2f0 100%);
  position:relative;
}
.connectWrap::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(ellipse 70% 50% at 15% 85%, rgba(124,58,237,.14) 0%, transparent 50%),
    radial-gradient(ellipse 60% 45% at 88% 15%, rgba(37,99,235,.12) 0%, transparent 50%),
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(124,58,237,.06) 0%, transparent 55%);
  background-size:100% 100%;
}
.connectWrap::after{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(155deg, transparent 0%, transparent 48%, rgba(124,58,237,.07) 50%, transparent 52%, transparent 100%),
    linear-gradient(155deg, transparent 0%, transparent 48%, rgba(37,99,235,.05) 50%, transparent 52%, transparent 100%);
  background-size: 120px 100%, 120px 100%;
  background-position: 0 0, 60px 0;
}
.connectWrap > *{position:relative;z-index:1}

.connectLoader{
  position:fixed;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:20px;
  background:#f7f8fb;
}
.connectSpinner{
  width:24px;
  height:24px;
  border:2px solid rgba(15,23,42,.1);
  border-top-color:var(--accent);
  border-radius:50%;
  animation:connectSpin .7s linear infinite;
}
@keyframes connectSpin{to{transform:rotate(360deg)}}

.connectContainer{max-width:1000px;margin:0 auto;padding:0 24px}
.connectTopbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.9);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.connectTopbarInner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:10px 0;
}
.connectTopbarRight{
  display:flex;
  align-items:center;
  gap:14px;
}
.connectBackLink,.connectBackLinkSecondary{
  font-size:14px;
  font-weight:600;
  color:var(--muted);
  transition:color .15s ease;
}
.connectBackLink:hover,.connectBackLinkSecondary:hover{color:var(--accent)}
.connectBrand{display:flex;align-items:center;gap:8px}
.connectLogoWrap{flex-shrink:0;width:48px;height:48px;display:block;line-height:0}
.connectLogoWrap img{width:100%;height:100%;object-fit:contain;display:block}
.connectBrandSub{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.connectProfileWrap{position:relative}
.connectAvatar{
  width:36px;height:36px;
  border-radius:10px;
  background:linear-gradient(135deg, var(--accent), var(--accent2));
  color:#fff;
  border:none;
  cursor:pointer;
  display:grid;place-items:center;
  transition:transform .15s ease, box-shadow .15s ease;
}
.connectAvatar:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.2)}
.connectProfileMenu{
  position:absolute;
  right:0;
  top:calc(100% + 8px);
  min-width:120px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(15,23,42,.1);
  overflow:hidden;
}
.connectProfileItem{
  display:block;
  width:100%;
  padding:10px 14px;
  font-size:14px;
  font-weight:600;
  color:#dc2626;
  background:none;
  border:none;
  cursor:pointer;
  font-family:inherit;
  text-align:left;
  transition:background .15s ease;
}
.connectProfileItem:hover{background:rgba(220,38,38,.08)}

.connectContent{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:calc(100vh - 68px);
  padding:32px 24px;
  box-sizing:border-box;
}
.connectContentBox{
  display:grid;
  grid-template-columns:1fr 1fr;
  column-gap:48px;
  row-gap:0;
  align-items:start;
  width:100%;
  max-width:1000px;
  background:rgba(255,255,255,.95);
  border:1px solid var(--border);
  border-radius:20px;
  padding:40px 40px 16px;
  box-shadow:0 8px 32px rgba(15,23,42,.06);
  box-sizing:border-box;
}
@media (max-width: 768px){
  .connectContentBox{grid-template-columns:1fr;column-gap:0;row-gap:24px;padding:32px 24px 16px}
}

.connectJustify{
  padding-top:4px;
}
.connectH1{
  margin:0 0 16px;
  font-size:26px;
  font-weight:800;
  letter-spacing:-.02em;
  line-height:1.25;
  color:var(--text);
}
.connectLead{
  margin:0 0 20px;
  font-size:16px;
  line-height:1.6;
  color:var(--muted);
}
.connectWhy{
  margin:0;
  font-size:14px;
  line-height:1.6;
  color:var(--muted);
}
.connectWhy strong{color:var(--text)}

.connectActions{}
.connectPrompt{
  margin:0 0 16px;
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.05em;
  color:var(--muted);
}
.connectButtons{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
  margin-bottom:24px;
}
@media (max-width: 480px){
  .connectButtons{grid-template-columns:1fr}
}
.connectCard{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  padding:24px 20px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:16px;
  box-shadow:0 2px 8px rgba(15,23,42,.04);
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
  font:inherit;
  color:inherit;
  cursor:pointer;
  text-align:center;
  width:100%;
}
.connectCard:hover{
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(15,23,42,.08);
  border-color:rgba(37,99,235,.2);
}
.connectCard.connectCardLinked{
  border-color:rgba(34,197,94,.4);
  background:rgba(34,197,94,.04);
}
.connectCard.connectCardLinked .connectCardMeta{color:#16a34a;font-weight:600}
.connectCardComingSoon{
  opacity:.6;
  cursor:not-allowed;
}
.connectCardComingSoon:hover{transform:none;box-shadow:0 2px 8px rgba(15,23,42,.04)}
.connectCardBadge{
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.04em;
  color:var(--muted);
  margin-top:4px;
}
.connectCardIcon{
  width:48px;
  height:48px;
  border-radius:12px;
  display:grid;
  place-items:center;
  color:var(--muted);
}
.connectCardIconImg{display:block;object-fit:contain}
.connectCardGoogle .connectCardIcon{background:rgba(255,255,255,.9)}
.connectCardMicrosoft .connectCardIcon{background:rgba(255,255,255,.9)}
.connectCardLabel{font-size:17px;font-weight:700;color:var(--text)}
.connectCardMeta{font-size:12px;color:var(--muted)}

.connectMaybe{
  margin:0 0 8px;
  font-size:14px;
  line-height:1.6;
  color:var(--muted);
}
.connectMaybe strong{color:var(--text)}

.connectMaybeLater{
  display:flex;
  justify-content:flex-end;
  margin-top:0;
  margin-bottom:0;
}
.connectContinue{
  grid-column:1 / -1;
  display:flex;
  justify-content:center;
  align-items:center;
  padding-top:10px;
  margin-top:10px;
  padding-bottom:0;
  border-top:1px solid var(--border);
}
.connectBtn{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:12px 20px;
  font-size:15px;
  font-weight:700;
  font-family:inherit;
  border-radius:12px;
  cursor:pointer;
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
}
.connectBtn:disabled{opacity:.7;cursor:not-allowed;transform:none}
.connectBtnGhost{
  background:rgba(255,255,255,.8);
  border:1px solid var(--border);
  color:var(--text);
}
.connectBtnGhost:hover:not(:disabled){
  background:rgba(15,23,42,.04);
  border-color:rgba(15,23,42,.15);
}
.connectBtnPrimary{
  background:#1d4ed8;
  border:1px solid #1e40af;
  color:#fff;
  box-shadow:0 1px 3px rgba(0,0,0,.12);
}
.connectBtnPrimary:hover:not(:disabled){
  background:#1e40af;
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(0,0,0,.15);
}
.connectBtnPulse{
  animation:connectBtnPulse 2s ease-in-out infinite;
}
.connectBtnPulse:hover{animation:none}
@keyframes connectBtnPulse{
  0%, 100%{ box-shadow: 0 1px 3px rgba(0,0,0,.12); transform:scale(1); }
  50%{ box-shadow: 0 8px 32px rgba(29,78,216,.5), 0 0 0 12px rgba(29,78,216,.2); transform:scale(1.02); }
}
.connectArrow{opacity:.9}

.connectModalBackdrop{
  position:fixed;
  inset:0;
  z-index:100;
  background:rgba(15,23,42,.4);
  backdrop-filter:blur(4px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
}
.connectModal{
  background:#fff;
  border:1px solid var(--border);
  border-radius:20px;
  box-shadow:0 24px 48px rgba(15,23,42,.18);
  padding:32px 28px;
  max-width:420px;
  width:100%;
}
.connectModalTitle{
  margin:0 0 12px;
  font-size:20px;
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--text);
}
.connectModalBody{
  margin:0 0 24px;
  font-size:15px;
  line-height:1.6;
  color:var(--muted);
}
.connectModalActions{
  display:flex;
  justify-content:flex-end;
  gap:12px;
}
`;
