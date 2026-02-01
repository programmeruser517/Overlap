"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type OrgStatus = "none" | "pending" | "accepted" | "rejected" | null;

export default function OrganizationPage() {
  const [status, setStatus] = useState<OrgStatus>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/organization-request")
      .then((r) => r.json())
      .then((d) => {
        if (d.status) {
          setStatus(d.status as OrgStatus);
          setSubmittedName(d.organization_name ?? null);
        } else {
          setStatus("none");
        }
      })
      .catch(() => setStatus("none"))
      .finally(() => setLoading(false));
  }, []);

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

  const handleSubmitOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = organizationName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/organization-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_name: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return;
      }
      setStatus("pending");
      setSubmittedName(name);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoToApp = () => {
    router.push("/onboarding/connect");
  };

  return (
    <main className="orgWrap">
      <header className="orgTopbar">
        <div className="orgContainer orgTopbarInner">
          <Link href="/onboarding" className="orgBrand">
            <div className="orgLogoWrap">
              <Image src="/overlap_blue.png" alt="Overlap" width={56} height={56} priority />
            </div>
            <span className="orgBrandSub">Onboarding</span>
          </Link>
          <div className="orgTopbarRight">
            <Link href="/onboarding" className="orgBackLink">
              ← Back to preferences
            </Link>
            <div className="orgProfileWrap" ref={profileRef}>
            <button className="orgAvatar" onClick={() => setOpen(!open)} aria-label="Profile menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            {open && (
              <div className="orgProfileMenu">
                <button onClick={handleLogout} className="orgProfileItem">Log out</button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <div className="orgContent">
        <aside className="orgSide">
          <div className="orgSideBadge">Organization access</div>
          <h1 className="orgH1">Which organization are you part of?</h1>
          <p className="orgLead">
            Request access to your org. An admin will approve your request—you’ll be able to continue once accepted.
          </p>
          <div className="orgDeco" aria-hidden />
        </aside>

        <section className="orgMain">
          <div className="orgCard">
            {loading ? (
              <div className="orgState">
                <span className="orgSpinner" aria-hidden />
                <p className="orgStateText">Loading…</p>
              </div>
            ) : status === "none" ? (
              <form onSubmit={handleSubmitOrg} className="orgForm">
                <label className="orgLabel">
                  Organization name
                  <input
                    type="text"
                    className="orgInput"
                    placeholder="e.g. Acme Corp"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" className="orgBtn orgBtnPrimary" disabled={submitting}>
                  {submitting ? "Requesting…" : "Request access"}
                </button>
              </form>
            ) : status === "pending" ? (
              <div className="orgState">
                <div className="orgStateIcon orgStateIconPending" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h2 className="orgStateTitle">Request pending</h2>
                <p className="orgStateText">
                  Your request to join <strong>{submittedName}</strong> is under review. We’ll let you continue once an admin has accepted it.
                </p>
                <p className="orgStateHint">You can come back to this page to check your status.</p>
              </div>
            ) : status === "accepted" ? (
              <div className="orgState">
                <div className="orgStateIcon orgStateIconAccepted" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h2 className="orgStateTitle">You’re in</h2>
                <p className="orgStateText">Your access to <strong>{submittedName}</strong> has been approved.</p>
                <button
                  type="button"
                  className="orgBtn orgBtnPrimary orgBtnLarge"
                  onClick={handleGoToApp}
                >
                  Continue
                  <span className="orgArrow">→</span>
                </button>
              </div>
            ) : (
              <div className="orgState">
                <div className="orgStateIcon orgStateIconRejected" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <h2 className="orgStateTitle">Request not approved</h2>
                <p className="orgStateText">Your request was not accepted. Contact your org admin or try a different organization.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{orgCss}</style>
    </main>
  );
}

const orgCss = `
:root{
  --bg:#f7f8fb;
  --text:#0f172a;
  --muted:#5b6475;
  --border:rgba(15,23,42,.10);
  --accent:#2563eb;
  --accent2:#7c3aed;
  --good:#16a34a;
  --warn:#d97706;
  --err:#dc2626;
}
*{box-sizing:border-box}
a{color:inherit;text-decoration:none}

.orgWrap{
  min-height:100vh;
  background:#f0f2f8;
  background-image:
    linear-gradient(140deg, #f8f9fc 0%, #f0f2f8 50%, #e8ecf4 100%);
  position:relative;
}
.orgWrap::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(110deg, rgba(37,99,235,.05) 0%, transparent 40%),
    linear-gradient(260deg, rgba(124,58,237,.04) 0%, transparent 45%);
  background-size:100% 100%;
}
.orgWrap > *{position:relative;z-index:1}

.orgContainer{max-width:1100px;margin:0 auto;padding:0 24px}
.orgTopbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.85);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.orgTopbarInner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:12px 0;
}
.orgTopbarRight{
  display:flex;
  align-items:center;
  gap:16px;
}
.orgBackLink{
  font-size:14px;
  font-weight:600;
  color:var(--muted);
  transition:color .15s ease;
}
.orgBackLink:hover{color:var(--accent)}
.orgBrand{display:flex;align-items:center;gap:10px}
.orgLogoWrap{
  flex-shrink:0;
  width:56px;height:56px;
  display:block;
  line-height:0;
}
.orgLogoWrap img{width:100%;height:100%;object-fit:contain;display:block}
.orgBrandSub{font-size:13px;font-weight:600;color:var(--muted)}

.orgProfileWrap{position:relative}
.orgAvatar{
  width:40px;height:40px;
  border-radius:10px;
  background:linear-gradient(135deg, var(--accent), var(--accent2));
  color:#fff;
  border:1px solid rgba(37,99,235,.25);
  cursor:pointer;
  display:grid;place-items:center;
  transition:transform .15s ease, box-shadow .15s ease;
}
.orgAvatar:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.2)}
.orgProfileMenu{
  position:absolute;
  right:0;
  top:calc(100% + 8px);
  min-width:140px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(15,23,42,.1);
  overflow:hidden;
}
.orgProfileItem{
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
.orgProfileItem:hover{background:rgba(220,38,38,.08)}

.orgContent{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:48px;
  align-items:center;
  min-height:calc(100vh - 82px);
  padding:48px 24px 64px;
  max-width:1100px;
  margin:0 auto;
}
@media (max-width: 768px){
  .orgContent{grid-template-columns:1fr;gap:32px;padding:32px 20px 48px}
}

.orgSide{
  order:2;
}
@media (max-width: 768px){
  .orgSide{order:1;text-align:center}
}
.orgSideBadge{
  display:inline-block;
  font-size:12px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.06em;
  color:var(--accent);
  margin-bottom:16px;
}
.orgH1{
  margin:0 0 16px;
  font-size:28px;
  font-weight:800;
  letter-spacing:-.02em;
  line-height:1.25;
  color:var(--text);
}
.orgLead{
  margin:0 0 24px;
  font-size:16px;
  line-height:1.6;
  color:var(--muted);
  max-width:380px;
}
@media (max-width: 768px){
  .orgLead{margin-left:auto;margin-right:auto}
}
.orgDeco{
  width:120px;
  height:4px;
  border-radius:2px;
  background:linear-gradient(90deg, var(--accent), var(--accent2));
  opacity:.6;
}

.orgMain{order:1}
@media (max-width: 768px){
  .orgMain{order:2}
}
.orgCard{
  background:rgba(255,255,255,.95);
  border:1px solid var(--border);
  border-radius:20px;
  padding:32px;
  box-shadow:0 8px 32px rgba(15,23,42,.06);
  max-width:420px;
}
@media (max-width: 768px){
  .orgCard{margin:0 auto;max-width:100%}
}

.orgForm{display:flex;flex-direction:column;gap:20px}
.orgLabel{
  display:block;
  font-size:14px;
  font-weight:600;
  color:var(--text);
}
.orgInput{
  display:block;
  width:100%;
  margin-top:8px;
  padding:12px 14px;
  border:1px solid var(--border);
  border-radius:12px;
  background:#fff;
  font-size:15px;
  color:var(--text);
  font-family:inherit;
}
.orgInput:focus{
  outline:none;
  border-color:rgba(37,99,235,.4);
  box-shadow:0 0 0 3px rgba(37,99,235,.12);
}
.orgInput::placeholder{color:var(--muted)}

.orgBtn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:12px 18px;
  font-size:15px;
  font-weight:700;
  font-family:inherit;
  border-radius:12px;
  border:1px solid rgba(37,99,235,.25);
  background:linear-gradient(180deg, rgba(37,99,235,.12), rgba(37,99,235,.05));
  color:var(--accent);
  cursor:pointer;
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.orgBtn:hover:not(:disabled){
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(37,99,235,.2);
  border-color:rgba(37,99,235,.35);
}
.orgBtn:disabled{opacity:.7;cursor:not-allowed;transform:none}
.orgBtnPrimary{color:#fff;background:linear-gradient(135deg, var(--accent), var(--accent2));border-color:rgba(37,99,235,.3)}
.orgBtnLarge{padding:14px 20px;font-size:16px}
.orgArrow{opacity:.9}

.orgState{
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:16px;
}
.orgSpinner{
  width:28px;
  height:28px;
  border:3px solid var(--border);
  border-top-color:var(--accent);
  border-radius:50%;
  animation:orgSpin .8s linear infinite;
}
@keyframes orgSpin{
  to{transform:rotate(360deg)}
}
.orgStateIcon{
  width:56px;
  height:56px;
  border-radius:50%;
  display:grid;
  place-items:center;
}
.orgStateIconPending{background:rgba(217,119,6,.12);color:var(--warn)}
.orgStateIconAccepted{background:rgba(22,163,74,.12);color:var(--good)}
.orgStateIconRejected{background:rgba(220,38,38,.1);color:var(--err)}
.orgStateTitle{margin:0;font-size:20px;font-weight:800;color:var(--text)}
.orgStateText{margin:0;font-size:15px;line-height:1.5;color:var(--muted)}
.orgStateText strong{color:var(--text)}
.orgStateHint{margin:0;font-size:13px;color:var(--muted)}
`;
