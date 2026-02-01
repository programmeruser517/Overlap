"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import LoadingScreen from "@/components/LoadingScreen";

export default function AppHome() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [getToMain, setGetToMain] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [threads, setThreads] = useState<Array<{ id: string; prompt?: string; status?: string; proposal?: { summary?: string }; createdAt?: string; updatedAt?: string; viewMode?: "linear" | "graph" }>>([]);
  const [viewMode, setViewMode] = useState<"linear" | "graph">("linear");
  const profileRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    hoursStart: "09:00",
    hoursEnd: "17:00",
    timezone: "America/New_York",
    location: "Remote (video call)",
    time: "No preference",
    buffer: "No buffer"
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "linear" || v === "graph") setViewMode(v);
  }, [searchParams]);

  useEffect(() => {
    if (pathname !== "/app") return;
    setGetToMain(null);
    router.refresh();
    fetch("/api/onboarding", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setGetToMain(d.get_to_main === true);
        if (d.onboarding_data && typeof d.onboarding_data === "object") {
          setFormData((prev) => ({ ...prev, ...d.onboarding_data }));
        }
      })
      .catch(() => setGetToMain(false));
  }, [pathname, router]);

  useEffect(() => {
    if (getToMain === false) {
      router.replace("/onboarding");
    }
  }, [getToMain, router]);

  useEffect(() => {
    if (getToMain !== true || pathname !== "/app") return;
    fetch("/api/thread", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d?.threads) ? d.threads : [];
        setThreads(list.map((t: { id: string; viewMode?: string; [k: string]: unknown }) => ({
          ...t,
          viewMode: t.viewMode === "linear" || t.viewMode === "graph" ? t.viewMode : undefined,
        })));
      })
      .catch(() => setThreads([]));
  }, [getToMain, pathname]);

  useEffect(() => {
    if (getToMain !== true || pathname !== "/app") return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/thread", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const list = Array.isArray(d?.threads) ? d.threads : [];
          setThreads(list.map((t: { id: string; viewMode?: string; [k: string]: unknown }) => ({
            ...t,
            viewMode: t.viewMode === "linear" || t.viewMode === "graph" ? t.viewMode : undefined,
          })));
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [getToMain, pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const userInitials = useMemo(() => {
    const name = (formData?.name ?? "").trim();
    if (!name) return "";
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    return (first + last).toUpperCase().slice(0, 2);
  }, [formData?.name]);

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      await supabase.auth.signOut();
    }
    
    router.push("/login");
  };

  const handleNext = () => {
    // Don't allow proceeding from name field if empty
    if (step === 0 && !formData.name.trim()) {
      return;
    }
    setStep(step + 1);
  };
  const handleBack = () => setStep(step - 1);

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_data: formData,
          complete: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return;
      }
      if (data.get_to_main) {
        setGetToMain(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData((prev) => ({
      name: prev.name,
      hoursStart: "09:00",
      hoursEnd: "17:00",
      timezone: "America/New_York",
      location: "Remote (video call)",
      time: "No preference",
      buffer: "No buffer"
    }));
  };

  const handleNewThread = async () => {
    setCreatingThread(true);
    try {
      const res = await fetch("/api/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "schedule", prompt: "", participants: [], viewMode }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.thread?.id) {
        setThreads((prev) => [data.thread, ...prev]);
        router.push(`/app/thread/${data.thread.id}`);
      } else {
        setCreatingThread(false);
      }
    } catch {
      setCreatingThread(false);
    }
  };

  const timeSlots = Array.from({length: 48}, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? "00" : "30";
    const period = hours < 12 ? "AM" : "PM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return {
      value: `${String(hours).padStart(2, '0')}:${minutes}`,
      label: `${displayHours}:${minutes} ${period}`
    };
  });

  const timezones = [
    "Pacific/Midway",
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Caracas",
    "America/Santiago",
    "America/Sao_Paulo",
    "Atlantic/Azores",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Athens",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Karachi",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Bangkok",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Pacific/Auckland"
  ];

  const questions = [
    {
      label: "What's your name?",
      hint: "How you'll appear to others",
      field: "name",
      type: "text",
      placeholder: "e.g. Alex Johnson"
    },
    {
      label: "What are your working hours?",
      hint: "When you're typically available",
      field: "hours",
      type: "timerange"
    },
    {
      label: "What's your time zone?",
      hint: "Helps coordinate across regions",
      field: "timezone",
      type: "select",
      options: timezones
    },
    {
      label: "Preferred meeting location?",
      hint: "Default preference for meetings",
      field: "location",
      type: "select",
      options: [
        "Remote (video call)",
        "In person",
        "Hybrid (flexible)",
        "Phone call"
      ]
    },
    {
      label: "Preferred meeting time?",
      hint: "When do you prefer meetings?",
      field: "time",
      type: "select",
      options: [
        "Morning (9 AM – 12 PM)",
        "Afternoon (12 PM – 5 PM)",
        "Evening (5 PM – 8 PM)",
        "No preference"
      ]
    },
    {
      label: "Meeting buffer time?",
      hint: "Free time before/after meetings",
      field: "buffer",
      type: "select",
      options: [
        "No buffer",
        "5 minutes",
        "10 minutes",
        "15 minutes",
        "30 minutes"
      ]
    }
  ];

  if (getToMain !== true) {
    return <LoadingScreen />;
  }

  return (
      <main className="wrap appMain">
        <header className="topbar">
          <div className="container topbarInner">
            <div className="brand">
              <div className="logoWrap">
                <Image src="/overlap_blue.png" alt="Overlap" width={88} height={88} priority />
              </div>
              <div className="brandText">
                <span className="brandTitle">Workthreads</span>
                <span className="brandSub">AI-to-AI coordination in all your workflows.</span>
              </div>
            </div>
            <div className="profileWrap" ref={profileRef}>
              <button className="avatar" onClick={() => setOpen(!open)} aria-label="Profile menu">
                {userInitials ? (
                  <span className="avatarInitials">{userInitials}</span>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
              </button>
              {open && (
                <div className="profileMenu">
                  <Link href="/app/settings" className="profileMenuItem profileMenuItemLink" onClick={() => setOpen(false)}>
                    <span className="profileMenuIcon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </span>
                    Settings
                  </Link>
                  <div className="profileMenuDivider" />
                  <button type="button" onClick={handleLogout} className="profileMenuItem profileMenuItemLogout">
                    <span className="profileMenuIcon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                    </span>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <section className="hero">
          <div className="container heroGrid single">
            <div className="centerStack">
              <h1 className="h1 small">You&apos;re all set.</h1>
              <p className="sub center">Create a thread to get started.</p>
              <button
                type="button"
                className="btn btnPrimary btnLarge btnPulse"
                onClick={handleNewThread}
                disabled={creatingThread}
              >
                {creatingThread ? "Creating…" : "New thread"}
              </button>
              <div className="viewSliderWrap">
                <div className="viewSliderLabels">
                  <span className={`viewSliderLabelItem ${viewMode === "linear" ? "viewSliderLabelActive" : ""}`}>
                    <span className="viewSliderIcon" aria-hidden>
                      <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="2" y1="7" x2="8" y2="7" />
                        <line x1="8" y1="7" x2="14" y2="7" />
                        <line x1="14" y1="7" x2="22" y2="7" />
                      </svg>
                    </span>
                    linear
                  </span>
                  <span className={`viewSliderLabelItem ${viewMode === "graph" ? "viewSliderLabelActive" : ""}`}>
                    <span className="viewSliderIcon" aria-hidden>
                      <svg width="16" height="10" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 12 6 8 10 10 14 4 18 6 22 2" />
                      </svg>
                    </span>
                    graph
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={1}
                  value={viewMode === "graph" ? 1 : 0}
                  onChange={(e) => setViewMode(e.target.value === "1" ? "graph" : "linear")}
                  className="viewSlider"
                  aria-label="View mode: linear or graph"
                />
                <p className="viewSliderCaption">VIEW</p>
              </div>
            </div>
          </div>
        </section>
        <section className="container threadsSection">
          <h2 className="threadsTitle">Previous threads</h2>
          <div className="threadsTableWrap">
            <table className="threadsTable">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {threads.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)", padding: "24px 16px", textAlign: "center" }}>
                      No threads yet. Create one with &quot;New thread&quot; above.
                    </td>
                  </tr>
                ) : (
                  threads.map((t) => {
                    const title = t.proposal?.summary ?? (typeof t.prompt === "string" && t.prompt.trim() ? t.prompt.trim().slice(0, 80) + (t.prompt.length > 80 ? "…" : "") : "Untitled");
                    const dateStr = t.updatedAt ?? t.createdAt ?? "";
                    const displayDate = dateStr ? new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
                    return (
                      <tr key={t.id}>
                        <td>
                          <Link href={`/app/thread/${t.id}?view=${t.viewMode ?? viewMode}`} className="threadRowLink">
                            {title}
                          </Link>
                        </td>
                        <td style={{ color: "var(--muted)" }}>{displayDate}</td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/app/thread/${t.id}?view=${t.viewMode ?? viewMode}`} className="threadRowLink">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
        <style>{css}</style>
      </main>
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
/* /app unique background: no grid, no dots – gradient + soft bands + orbs */
.appMain{
  position:relative;
  min-height:100vh;
  background:#eef0f7;
  background-image:
    linear-gradient(160deg, #f4f5fa 0%, #eef0f7 35%, #e6e9f4 100%);
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
    radial-gradient(ellipse 80% 70% at 95% 85%, rgba(124,58,237,.1) 0%, transparent 50%),
    radial-gradient(ellipse 70% 50% at 50% 50%, rgba(37,99,235,.05) 0%, transparent 55%);
  background-size: 100% 100%;
}
.appMain > *{position:relative;z-index:1}
.container{max-width:1100px;margin:0 auto;padding:0 20px}

.threadsSection{margin-top:48px;padding-bottom:48px}
.threadsTitle{margin:0 0 16px;font-size:18px;font-weight:700;color:var(--text)}
.threadsTableWrap{
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:12px;
  overflow:hidden;
  box-shadow:0 1px 3px rgba(15,23,42,.06);
}
.threadsTable{width:100%;border-collapse:collapse;font-size:14px}
.threadsTable th{
  text-align:left;
  padding:12px 16px;
  font-weight:600;
  color:var(--muted);
  background:rgba(15,23,42,.03);
  border-bottom:1px solid var(--border);
}
.threadsTable th:last-child{text-align:right}
.threadsTable td{padding:12px 16px;border-bottom:1px solid var(--border);color:var(--text)}
.threadsTable tbody tr:last-child td{border-bottom:none}
.threadRowLink{color:var(--accent);font-weight:500}
.threadRowLink:hover{text-decoration:underline}

.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.topbarInner{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:10px 0;
}

.brand{display:flex;align-items:center;gap:12px}
.logoWrap{
  flex-shrink:0;
  width:88px;height:88px;
  display:block;
  line-height:0;
}
.logoWrap img{
  width:100%;height:100%;object-fit:contain;display:block;vertical-align:middle;
}
.brandText{display:flex;flex-direction:column;gap:2px}
.brandTitle{font-size:18px;font-weight:900;letter-spacing:-.02em;color:var(--text)}
.brandSub{font-size:14px;color:var(--muted);font-weight:500}

/* profile */
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
}
.avatar:hover{
  transform:translateY(-1px);
  box-shadow:0 6px 16px rgba(37,99,235,.25);
}
.avatar{display:grid;place-items:center}
.avatarInitials{font-size:15px;letter-spacing:-.02em;line-height:1}
.profileMenu{
  position:absolute;
  right:0;
  top:calc(100% + 10px);
  min-width:200px;
  background:rgba(255,255,255,.98);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:16px;
  box-shadow:0 10px 40px rgba(15,23,42,.12), 0 4px 12px rgba(15,23,42,.06);
  overflow:hidden;
  animation:profileMenuIn .2s ease;
}
@keyframes profileMenuIn{
  from{opacity:0;transform:translateY(-6px);}
  to{opacity:1;transform:translateY(0);}
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
  transition:background .15s ease, color .15s ease;
  text-align:left;
  box-sizing:border-box;
}
.profileMenuIcon{
  flex-shrink:0;
  width:36px;
  height:36px;
  border-radius:10px;
  display:grid;
  place-items:center;
  color:var(--muted);
  transition:color .15s ease, background .15s ease;
}
.profileMenuItemLink{
  color:var(--text);
}
.profileMenuItemLink:hover{
  background:rgba(37,99,235,.06);
  color:var(--text);
}
.profileMenuItemLink:hover .profileMenuIcon{
  color:var(--accent);
  background:rgba(37,99,235,.08);
}
.profileMenuDivider{
  height:1px;
  background:var(--border);
  margin:0 12px;
}
.profileMenuItemLogout{
  color:#dc2626;
}
.profileMenuItemLogout .profileMenuIcon{
  color:#dc2626;
}
.profileMenuItemLogout:hover{
  background:rgba(220,38,38,.08);
  color:#b91c1c;
}
.profileMenuItemLogout:hover .profileMenuIcon{
  color:#b91c1c;
  background:rgba(220,38,38,.12);
}

.hero{padding:56px 0 80px}
.heroGrid.single{
  display:flex;
  justify-content:center;
}

.centerStack{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:18px;
  max-width:620px;
  width:100%;
}

.viewSliderWrap{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
  margin-top:8px;
  width:100%;
  max-width:240px;
}
.viewSliderLabels{
  display:flex;
  justify-content:space-between;
  width:100%;
  font-size:12px;
  font-weight:600;
  color:var(--muted);
}
.viewSliderLabelItem{
  display:inline-flex;
  align-items:center;
  gap:6px;
}
.viewSliderLabels .viewSliderLabelActive{
  color:var(--accent);
}
.viewSliderLabels .viewSliderLabelActive .viewSliderIcon{
  color:var(--accent);
}
.viewSliderIcon{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  color:var(--muted);
  flex-shrink:0;
}
.viewSlider{
  width:100%;
  height:8px;
  -webkit-appearance:none;
  appearance:none;
  background:transparent;
}
.viewSlider::-webkit-slider-runnable-track{
  height:4px;
  background:var(--border);
  border-radius:2px;
}
.viewSlider::-moz-range-track{
  height:4px;
  background:var(--border);
  border-radius:2px;
}
.viewSlider::-webkit-slider-thumb{
  -webkit-appearance:none;
  appearance:none;
  width:16px;
  height:16px;
  border-radius:50%;
  background:var(--accent);
  border:2px solid #fff;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
  margin-top:-6px;
  cursor:pointer;
}
.viewSlider::-moz-range-thumb{
  width:16px;
  height:16px;
  border-radius:50%;
  background:var(--accent);
  border:2px solid #fff;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
  cursor:pointer;
}
.viewSliderCaption{
  font-size:11px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.08em;
  color:var(--muted);
  margin:0;
}

.pill{
  display:inline-flex;align-items:center;gap:10px;
  padding:8px 12px;border-radius:999px;
  background:rgba(255,255,255,.70);
  border:1px solid var(--border);
  color:var(--muted);
  font-size:13px;
}
.pillDot{
  width:8px;height:8px;border-radius:999px;
  background:var(--good);
  box-shadow:0 0 0 6px rgba(22,163,74,.10);
}

/* orbit logo */
.orbit{
  position:relative;
  width:120px;
  height:120px;
  margin-bottom:8px;
}
.orbitRing{
  position:absolute;
  inset:0;
  border-radius:50%;
  border:2.5px dashed rgba(37,99,235,.55);
  animation:spin 20s linear infinite;
}
.orbitRing2{
  position:absolute;
  inset:14px;
  border-radius:50%;
  border:2px dashed rgba(124,58,237,.45);
  animation:spin 30s linear infinite reverse;
}
.orbitLogo{
  position:absolute;
  inset:22px;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg, rgba(255,255,255,.95), rgba(247,248,251,.90));
  border-radius:50%;
  border:1px solid var(--border);
  box-shadow:
    0 0 0 1px rgba(15,23,42,.04),
    0 8px 24px rgba(15,23,42,.10),
    inset 0 1px 0 rgba(255,255,255,1);
  animation:spin 15s linear infinite;
}

@keyframes spin{
  from{transform:rotate(0)}
  to{transform:rotate(360deg)}
}

.h1.small{
  font-size:28px;
  text-align:center;
  font-weight:900;
  letter-spacing:-.04em;
  line-height:1.1;
  margin:0;
}

.sub.center{
  text-align:center;
  color:var(--muted);
  font-size:13px;
  line-height:1.5;
  max-width:48ch;
  margin:0;
}

/* progress dots */
.progress{
  display:flex;
  gap:8px;
  justify-content:center;
  margin:12px 0 6px;
}
.dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:var(--border);
  transition:all .3s ease;
}
.dot.active{
  background:rgba(37,99,235,.3);
}
.dot.current{
  background:var(--accent);
  width:24px;
  border-radius:999px;
}

/* card form */
.card.wide{
  width:100%;
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:20px;
  padding:28px 28px;
  box-shadow:var(--shadow);
  margin-top:6px;
  min-height:300px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

/* wizard question styles */
.questionHeader{
  text-align:center;
  margin-bottom:28px;
}
.stepLabel{
  font-size:11px;
  color:var(--muted);
  text-transform:uppercase;
  letter-spacing:.05em;
  font-weight:600;
  margin-bottom:10px;
}
.questionTitle{
  font-size:22px;
  font-weight:900;
  color:var(--text);
  letter-spacing:-.02em;
  margin-bottom:6px;
}
.questionHint{
  font-size:13px;
  color:var(--muted);
  line-height:1.5;
}

.questionField{
  margin-bottom:28px;
}
.questionInput,
.questionSelect{
  width:100%;
  padding:14px 16px;
  border-radius:14px;
  border:1px solid var(--border);
  background:#fff;
  color:var(--text);
  font-size:15px;
  transition:all .2s ease;
  text-align:center;
  font-family:inherit;
  appearance:none;
  -webkit-appearance:none;
  -moz-appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235b6475' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat:no-repeat;
  background-position:right 16px center;
  padding-right:40px;
}
.questionInput{
  background-image:none;
  padding-right:16px;
}
.questionInput:focus,
.questionSelect:focus{
  outline:none;
  border-color:var(--accent);
  box-shadow:var(--ring);
}
.questionInput::placeholder{
  color:var(--muted);
  opacity:.6;
}

.timeRange{
  display:flex;
  gap:16px;
  align-items:center;
  justify-content:center;
}
.timeRangeItem{
  flex:1;
  max-width:200px;
}
.timeRangeLabel{
  display:block;
  font-size:12px;
  color:var(--muted);
  font-weight:600;
  margin-bottom:8px;
  text-align:center;
}
.timeRangeSep{
  font-size:20px;
  color:var(--muted);
  margin-top:20px;
}

.wizardActions{
  display:flex;
  gap:12px;
  justify-content:center;
}

/* review screen */
.reviewHeader{
  text-align:center;
  margin-bottom:32px;
}
.reviewIcon{
  width:48px;
  height:48px;
  border-radius:50%;
  background:linear-gradient(135deg, rgba(22,163,74,.12), rgba(22,163,74,.08));
  border:1px solid rgba(22,163,74,.25);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  margin:0 auto 16px;
}
.reviewTitle{
  font-size:22px;
  font-weight:900;
  color:var(--text);
  letter-spacing:-.02em;
  margin-bottom:6px;
}
.reviewSub{
  font-size:14px;
  color:var(--muted);
}

.reviewGrid{
  display:grid;
  gap:16px;
  margin-bottom:32px;
}
.reviewItem{
  padding:14px 16px;
  background:rgba(15,23,42,.02);
  border:1px solid var(--border);
  border-radius:12px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.reviewLabel{
  font-size:13px;
  color:var(--muted);
  font-weight:600;
}
.reviewValue{
  font-size:14px;
  color:var(--text);
  font-weight:600;
}

.cardHeader{
  margin-bottom:24px;
  padding-bottom:20px;
  border-bottom:1px solid var(--border);
}
.cardTitle{
  font-weight:900;
  font-size:20px;
  letter-spacing:-.02em;
  color:var(--text);
}
.cardSub{
  margin-top:6px;
  font-size:13px;
  color:var(--muted);
  line-height:1.5;
}

.field{
  display:flex;
  flex-direction:column;
  gap:8px;
  margin-bottom:18px;
}
.field label{
  font-size:13px;
  color:var(--muted);
  font-weight:600;
  letter-spacing:-.01em;
}
.field input,
.field select{
  padding:12px 14px;
  border-radius:12px;
  border:1px solid var(--border);
  background:#fff;
  color:var(--text);
  font-size:14px;
  transition:border-color .15s ease, box-shadow .15s ease;
}
.field input:focus,
.field select:focus{
  outline:none;
  border-color:rgba(37,99,235,.35);
  box-shadow:var(--ring);
}
.field input::placeholder{
  color:var(--muted);
  opacity:.6;
}
.fieldHint{
  font-size:12px;
  color:var(--muted);
  opacity:.8;
}

.btn{
  border:1px solid var(--border);
  background:#fff;
  border-radius:12px;
  padding:12px 16px;
  font-size:14px;
  font-weight:650;
  display:inline-flex;align-items:center;gap:8px;justify-content:center;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease;
  cursor:pointer;
  color:var(--text);
}
.btn:hover{
  transform:translateY(-1px);
  box-shadow:var(--shadow2);
}
.btn:focus{
  outline:none;
  box-shadow:var(--shadow2), var(--ring);
}
.btn:disabled{
  opacity:0.4;
  cursor:not-allowed;
  transform:none;
}
.btn:disabled:hover{
  transform:none;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}

.btnPrimary{
  border-color:rgba(37,99,235,.25);
  background:linear-gradient(180deg, rgba(37,99,235,.10), rgba(37,99,235,.04));
}
.btnPrimary:hover{
  border-color:rgba(37,99,235,.35);
}
.btnGhost{
  background:rgba(255,255,255,.65);
}
.btnGhost:hover{
  background:rgba(15,23,42,.05);
}
.btnLarge{padding:12px 16px;border-radius:14px}
@keyframes btnPulse {
  0%, 100%{ box-shadow: 0 2px 12px rgba(37,99,235,.2), 0 1px 0 rgba(15,23,42,.04); }
  50%{ box-shadow: 0 8px 32px rgba(37,99,235,.4), 0 0 0 8px rgba(37,99,235,.12), 0 1px 0 rgba(15,23,42,.04); }
}
.btnPulse{
  animation: btnPulse 3.5s ease-in-out infinite;
}
.btnPulse:hover{ animation: none; }
.arrow{opacity:.9}

.actionRow{
  display:flex;gap:12px;flex-direction:column;
}
.actionRowSplit{
  display:flex;gap:12px;justify-content:center;
}

.full{
  width:100%;
}

.infoBox{
  margin-top:20px;
  padding:14px 16px;
  background:rgba(37,99,235,.06);
  border:1px solid rgba(37,99,235,.15);
  border-radius:14px;
  display:flex;gap:12px;align-items:flex-start;
}
.infoIcon{
  font-size:20px;
  line-height:1;
  flex-shrink:0;
}
.infoText{
  font-size:13px;
  color:var(--muted);
  line-height:1.6;
}

.sideCards{
  margin-top:24px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px;
  width:100%;
}
.miniCard{
  background:rgba(255,255,255,.78);
  border:1px solid var(--border);
  border-radius:16px;
  padding:16px 16px;
  box-shadow:0 1px 0 rgba(15,23,42,.04);
  transition:transform .15s ease, box-shadow .15s ease;
}
.miniCard:hover{
  transform:translateY(-2px);
  box-shadow:var(--shadow2);
}
.miniIcon{
  font-size:24px;
  margin-bottom:10px;
  line-height:1;
}
.miniTitle{
  font-weight:850;
  letter-spacing:-.02em;
  font-size:15px;
  color:var(--text);
}
.miniText{
  margin-top:8px;
  color:var(--muted);
  font-size:13px;
  line-height:1.6;
}

/* responsive */
@media (max-width: 680px){
  .h1.small{font-size:32px}
  .sideCards{grid-template-columns:1fr}
  .actionRow{flex-direction:column}
  .logoWrap{width:72px;height:72px}
  .brandTitle{font-size:16px}
}
`;
