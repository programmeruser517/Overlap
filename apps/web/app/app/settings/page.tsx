"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import LoadingScreen from "@/components/LoadingScreen";

type SettingsSection = "profile" | "connect";
type LinkProvider = "google" | "microsoft";

const DEFAULT_FORM = {
  name: "",
  hoursStart: "09:00",
  hoursEnd: "17:00",
  timezone: "America/New_York",
  location: "Remote (video call)",
  time: "No preference",
  buffer: "No buffer",
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<SettingsSection>("profile");
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [linkedGoogle, setLinkedGoogle] = useState(false);
  const [linkedMicrosoft, setLinkedMicrosoft] = useState(false);
  const [modalProvider, setModalProvider] = useState<LinkProvider | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/onboarding").then((r) => r.json()),
      fetch("/api/me/linked-accounts").then((r) => r.json()),
    ])
      .then(([onboarding, linked]) => {
        if (onboarding?.onboarding_data && typeof onboarding.onboarding_data === "object") {
          setFormData((prev) => ({ ...prev, ...onboarding.onboarding_data }));
        }
        if (linked?.google === true) setLinkedGoogle(true);
        if (linked?.microsoft === true) setLinkedMicrosoft(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleLogout = async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const supabase = createBrowserClient(url, anon);
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  const handleModalConnect = () => {
    if (modalProvider === "google") {
      const returnTo = encodeURIComponent("/app/settings");
      window.location.href = `/api/auth/google/connect?returnTo=${returnTo}`;
      return;
    }
    if (modalProvider === "microsoft") setLinkedMicrosoft(true);
    setModalProvider(null);
  };

  const userInitials = formData.name
    ? formData.name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  if (loading) {
    return <LoadingScreen message="Loading settings…" />;
  }

  return (
    <main className="wrap appMain settingsMain">
      <header className="topbar">
        <div className="container topbarInner">
          <Link href="/app" className="brand">
            <div className="logoWrap">
              <Image src="/overlap_blue.png" alt="Overlap" width={88} height={88} priority />
            </div>
            <div className="brandText">
              <span className="brandTitle">Settings</span>
              <span className="brandSub">AI-to-AI coordination in all your workflows.</span>
            </div>
          </Link>
          <div className="profileWrap" ref={profileRef}>
            <button type="button" className="avatar" onClick={() => setOpen(!open)} aria-label="Profile menu">
              {userInitials ? (
                <span className="avatarInitials">{userInitials}</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </button>
            {open && (
              <div className="profileMenu">
                <Link href="/app" className="profileMenuItem profileMenuItemLink" onClick={() => setOpen(false)}>
                  <span className="profileMenuIcon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </span>
                  Back to app
                </Link>
                <div className="profileMenuDivider" />
                <button type="button" onClick={handleLogout} className="profileMenuItem profileMenuItemLogout">
                  <span className="profileMenuIcon" aria-hidden>
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

      <div className="settingsBody container">
        <nav className="settingsSidebar" aria-label="Settings sections">
          <button
            type="button"
            className={`settingsNavItem ${section === "profile" ? "settingsNavItemActive" : ""}`}
            onClick={() => setSection("profile")}
          >
            Profile & preferences
          </button>
          <button
            type="button"
            className={`settingsNavItem ${section === "connect" ? "settingsNavItemActive" : ""}`}
            onClick={() => setSection("connect")}
          >
            Calendar & Email
          </button>
        </nav>

        <div className="settingsContent">
          {section === "profile" && (
            <section className="settingsCard">
              <h2 className="settingsCardTitle">Profile & preferences</h2>
              <p className="settingsCardLead">Your name and preferences from onboarding. Edit these in onboarding if needed.</p>
              <dl className="settingsDefList">
                <div className="settingsDefRow">
                  <dt>Name</dt>
                  <dd>{formData.name || "—"}</dd>
                </div>
                <div className="settingsDefRow">
                  <dt>Working hours</dt>
                  <dd>{formData.hoursStart} – {formData.hoursEnd}</dd>
                </div>
                <div className="settingsDefRow">
                  <dt>Timezone</dt>
                  <dd>{formData.timezone}</dd>
                </div>
                <div className="settingsDefRow">
                  <dt>Meeting location</dt>
                  <dd>{formData.location}</dd>
                </div>
                <div className="settingsDefRow">
                  <dt>Preferred meeting time</dt>
                  <dd>{formData.time}</dd>
                </div>
                <div className="settingsDefRow">
                  <dt>Meeting buffer</dt>
                  <dd>{formData.buffer}</dd>
                </div>
              </dl>
              <Link href="/onboarding" className="settingsEditLink">Edit in onboarding →</Link>
            </section>
          )}

          {section === "connect" && (
            <section className="settingsCard">
              <h2 className="settingsCardTitle">Link Calendar & Email</h2>
              <p className="settingsCardLead">
                Connect your calendar and email so your agent can schedule meetings and send messages on your behalf.
              </p>
              <div className="settingsConnectButtons">
                <button
                  type="button"
                  className={`settingsConnectCard settingsConnectCardGoogle${linkedGoogle ? " settingsConnectCardLinked" : ""}`}
                  onClick={() => setModalProvider("google")}
                >
                  <span className="settingsConnectCardIcon" aria-hidden>
                    <Image src="/google.png" alt="" width={48} height={48} className="settingsConnectCardIconImg" />
                  </span>
                  <span className="settingsConnectCardLabel">Google</span>
                  <span className="settingsConnectCardMeta">{linkedGoogle ? "Connected" : "Calendar & Gmail"}</span>
                </button>
                <button
                  type="button"
                  className={`settingsConnectCard settingsConnectCardMicrosoft${linkedMicrosoft ? " settingsConnectCardLinked" : ""}`}
                  onClick={() => setModalProvider("microsoft")}
                  disabled
                  aria-disabled="true"
                >
                  <span className="settingsConnectCardIcon" aria-hidden>
                    <Image src="/microsoft.png" alt="" width={48} height={48} className="settingsConnectCardIconImg" />
                  </span>
                  <span className="settingsConnectCardLabel">Microsoft</span>
                  <span className="settingsConnectCardMeta">{linkedMicrosoft ? "Connected" : "Outlook Calendar & Mail"}</span>
                  <span className="settingsConnectCardBadge">Coming soon</span>
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {modalProvider && (
        <div
          className="settingsModalBackdrop"
          onClick={() => setModalProvider(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settingsModalTitle"
        >
          <div className="settingsModal" onClick={(e) => e.stopPropagation()}>
            <h2 id="settingsModalTitle" className="settingsModalTitle">
              Link {modalProvider === "google" ? "Google" : "Microsoft"}
            </h2>
            <p className="settingsModalBody">
              {modalProvider === "google"
                ? "Connect your Google account to use Calendar and Gmail with your agent. You can revoke access anytime here in Settings."
                : "Connect your Microsoft account to use Outlook Calendar and Mail with your agent. You can revoke access anytime here in Settings."}
            </p>
            <div className="settingsModalActions">
              <button type="button" className="settingsBtn settingsBtnGhost" onClick={() => setModalProvider(null)}>
                Cancel
              </button>
              <button type="button" className="settingsBtn settingsBtnPrimary" onClick={handleModalConnect}>
                Connect {modalProvider === "google" ? "Google" : "Microsoft"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{settingsCss}</style>
    </main>
  );
}

const settingsCss = `
:root{
  --text:#0f172a;
  --muted:#5b6475;
  --border:rgba(15,23,42,.10);
  --accent:#2563eb;
  --accent2:#7c3aed;
}
.wrap{min-height:100vh}
.appMain{
  position:relative;
  min-height:100vh;
  background:#eef0f7;
  background-image:linear-gradient(160deg, #f4f5fa 0%, #eef0f7 35%, #e6e9f4 100%);
}
.appMain::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(120deg, rgba(37,99,235,.06) 0%, transparent 40%),
    linear-gradient(240deg, rgba(124,58,237,.05) 0%, transparent 45%),
    linear-gradient(60deg, transparent 50%, rgba(37,99,235,.04) 100%);
  background-size: 100% 100%;
}
.appMain::after{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(ellipse 90% 60% at 10% 15%, rgba(37,99,235,.12) 0%, transparent 50%),
    radial-gradient(ellipse 80% 70% at 95% 85%, rgba(124,58,237,.1) 0%, transparent 50%);
  background-size: 100% 100%;
}
.appMain > *{position:relative;z-index:1}
.container{max-width:1100px;margin:0 auto;padding:0 20px}
.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.topbarInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}
.logoWrap{flex-shrink:0;width:88px;height:88px;display:block;line-height:0}
.logoWrap img{width:100%;height:100%;object-fit:contain;display:block}
.brandText{display:flex;flex-direction:column;gap:2px}
.brandTitle{font-size:18px;font-weight:900;letter-spacing:-.02em;color:var(--text)}
.brandSub{font-size:14px;color:var(--muted);font-weight:500}
.profileWrap{position:relative}
.avatar{
  width:44px;height:44px;
  border-radius:12px;
  background:linear-gradient(135deg, var(--accent), var(--accent2));
  color:#fff;
  font-weight:800;
  border:1px solid rgba(37,99,235,.25);
  cursor:pointer;
  font-size:14px;
  box-shadow:0 4px 12px rgba(37,99,235,.15);
  transition:transform .15s ease, box-shadow .15s ease;
  display:grid;place-items:center;
}
.avatar:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,.25)}
.avatarInitials{font-size:15px;letter-spacing:-.02em;line-height:1}
.profileMenu{
  position:absolute;
  right:0;
  top:calc(100% + 10px);
  min-width:200px;
  background:rgba(255,255,255,.98);
  backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:16px;
  box-shadow:0 10px 40px rgba(15,23,42,.12);
  overflow:hidden;
}
.profileMenuItem{
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
  color:var(--text);
  transition:background .15s ease;
  text-align:left;
  box-sizing:border-box;
}
.profileMenuIcon{flex-shrink:0;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:var(--muted)}
.profileMenuItemLink{color:var(--text)}
.profileMenuItemLink:hover{background:rgba(37,99,235,.06)}
.profileMenuItemLink:hover .profileMenuIcon{color:var(--accent);background:rgba(37,99,235,.08)}
.profileMenuDivider{height:1px;background:var(--border);margin:0 12px}
.profileMenuItemLogout{color:#dc2626}
.profileMenuItemLogout:hover{background:rgba(220,38,38,.08)}
.profileMenuItemLogout .profileMenuIcon{color:#dc2626}

.settingsMain{min-height:100vh;padding-bottom:48px}
.settingsBody{
  display:grid;
  grid-template-columns:220px 1fr;
  gap:32px;
  align-items:start;
  padding-top:32px;
  max-width:900px;
}
@media (max-width: 768px){
  .settingsBody{grid-template-columns:1fr;gap:24px}
}
.settingsSidebar{
  display:flex;
  flex-direction:column;
  gap:4px;
  position:sticky;
  top:80px;
}
.settingsNavItem{
  display:block;
  width:100%;
  padding:12px 16px;
  font-size:14px;
  font-weight:600;
  font-family:inherit;
  text-align:left;
  border:none;
  border-radius:12px;
  background:transparent;
  color:var(--muted);
  cursor:pointer;
  transition:background .15s ease, color .15s ease;
}
.settingsNavItem:hover{background:rgba(15,23,42,.06);color:var(--text)}
.settingsNavItemActive{
  background:rgba(37,99,235,.1);
  color:var(--accent);
}
.settingsContent{min-width:0}
.settingsCard{
  background:rgba(255,255,255,.92);
  border:1px solid var(--border);
  border-radius:16px;
  padding:28px 24px;
  box-shadow:0 4px 20px rgba(15,23,42,.06);
}
.settingsCardTitle{
  margin:0 0 8px;
  font-size:20px;
  font-weight:800;
  letter-spacing:-.02em;
  color:var(--text);
}
.settingsCardLead{
  margin:0 0 24px;
  font-size:14px;
  line-height:1.5;
  color:var(--muted);
}
.settingsDefList{margin:0;padding:0;list-style:none}
.settingsDefRow{
  display:grid;
  grid-template-columns:160px 1fr;
  gap:12px;
  padding:12px 0;
  border-bottom:1px solid var(--border);
}
.settingsDefRow:last-of-type{border-bottom:none}
.settingsDefRow dt{
  margin:0;
  font-size:13px;
  font-weight:600;
  color:var(--muted);
}
.settingsDefRow dd{margin:0;font-size:14px;color:var(--text)}
.settingsEditLink{
  display:inline-block;
  margin-top:20px;
  font-size:14px;
  font-weight:600;
  color:var(--accent);
  text-decoration:none;
}
.settingsEditLink:hover{text-decoration:underline}

.settingsConnectButtons{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:16px;
}
@media (max-width: 520px){.settingsConnectButtons{grid-template-columns:1fr}}
.settingsConnectCard{
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
}
.settingsConnectCard:hover:not(:disabled){
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(15,23,42,.08);
  border-color:rgba(37,99,235,.2);
}
.settingsConnectCard:disabled{cursor:default;opacity:.8}
.settingsConnectCardLinked{border-color:#16a34a;background:rgba(22,163,74,.04)}
.settingsConnectCardLinked .settingsConnectCardMeta{color:#16a34a;font-weight:600}
.settingsConnectCardIcon{
  display:flex;
  align-items:center;
  justify-content:center;
  width:56px;
  height:56px;
  border-radius:12px;
  overflow:hidden;
}
.settingsConnectCardIconImg{display:block;object-fit:contain}
.settingsConnectCardGoogle .settingsConnectCardIcon{background:rgba(255,255,255,.9)}
.settingsConnectCardMicrosoft .settingsConnectCardIcon{background:rgba(255,255,255,.9)}
.settingsConnectCardLabel{font-size:17px;font-weight:700;color:var(--text)}
.settingsConnectCardMeta{font-size:12px;color:var(--muted)}
.settingsConnectCardBadge{
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.05em;
  color:var(--muted);
  padding:2px 8px;
  background:rgba(15,23,42,.06);
  border-radius:6px;
}

.settingsModalBackdrop{
  position:fixed;
  inset:0;
  z-index:1000;
  background:rgba(15,23,42,.5);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px;
  cursor:pointer;
}
.settingsModal{
  background:#fff;
  border-radius:16px;
  padding:28px 24px;
  max-width:420px;
  width:100%;
  box-shadow:0 24px 48px rgba(0,0,0,.2);
  border:1px solid var(--border);
  cursor:default;
}
.settingsModalTitle{margin:0 0 12px;font-size:18px;font-weight:700;color:var(--text)}
.settingsModalBody{margin:0 0 24px;font-size:14px;line-height:1.5;color:var(--muted)}
.settingsModalActions{display:flex;gap:12px;justify-content:flex-end}
.settingsBtn{
  padding:10px 18px;
  font-size:14px;
  font-weight:600;
  font-family:inherit;
  border-radius:10px;
  border:1px solid var(--border);
  background:#fff;
  color:var(--text);
  cursor:pointer;
  transition:background .15s ease, color .15s ease;
}
.settingsBtnGhost:hover{background:rgba(15,23,42,.06)}
.settingsBtnPrimary{
  background:linear-gradient(135deg, var(--accent), var(--accent2));
  color:#fff;
  border-color:transparent;
}
.settingsBtnPrimary:hover{filter:brightness(1.05)}
`;
