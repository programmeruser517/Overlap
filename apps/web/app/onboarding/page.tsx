"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function OnboardingPage() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [saving, setSaving] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    job: "",
    aboutYou: "",
    hoursStart: "09:00",
    hoursEnd: "17:00",
    timezone: "America/New_York",
    location: "Remote (video call)",
    time: "No preference",
    buffer: "No buffer"
  });
  const router = useRouter();

  useEffect(() => {
    document.title = "Onboarding";
  }, []);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d.onboarding_data && typeof d.onboarding_data === "object") {
          setFormData((prev) => ({ ...prev, ...d.onboarding_data }));
        }
        if (d.get_to_main === false && d.onboarding_data && typeof d.onboarding_data === "object" && (d.onboarding_data as { name?: string }).name) {
          router.replace("/onboarding/organization");
        }
      })
      .catch(() => {});
  }, [router]);

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
      if (data.ok) {
        router.push("/onboarding/organization");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData((prev) => ({
      name: prev.name,
      job: prev.job,
      aboutYou: prev.aboutYou,
      hoursStart: "09:00",
      hoursEnd: "17:00",
      timezone: "America/New_York",
      location: "Remote (video call)",
      time: "No preference",
      buffer: "No buffer"
    }));
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
      label: "What's your job or role?",
      hint: "Helps your agent tailor context",
      field: "job",
      type: "text",
      placeholder: "e.g. Product Manager, Engineer"
    },
    {
      label: "1–2 sentences about you",
      hint: "Optional: role, focus, or how you like to work",
      field: "aboutYou",
      type: "textarea",
      placeholder: "e.g. I lead GTM and prefer async updates. I'm in PST and usually free after 2pm."
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

  const currentQuestion = questions[step];
  const isLastStep = step === questions.length;

  if (showFinal) {
    return (
      <main className="onboardingWrap onboardingFinal">
        <header className="topbar">
          <div className="container topbarInner">
            <div className="brand">
              <div className="logoWrap">
                <Image src="/overlap_blue.png" alt="Overlap" width={88} height={88} priority />
              </div>
              <div className="brandText">
                <span className="brandSub">AI-to-AI coordination in all your workflows.</span>
              </div>
            </div>
            <div className="profileWrap" ref={profileRef}>
              <button className="avatar" onClick={() => setOpen(!open)} aria-label="Profile menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              {open && (
                <div className="profileMenu">
                  <button onClick={handleLogout} className="profileItem">Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <section className="hero">
          <div className="container heroGrid single">
            <div className="centerStack">
              <h1 className="h1 small">You&apos;re all set.</h1>
              <p className="sub center">Your preferences are saved. Go to the app to get started.</p>
              <button
                type="button"
                className="btn btnPrimary btnLarge"
                onClick={() => router.push("/app")}
              >
                Go to app <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </section>
        <style>{css}</style>
      </main>
    );
  }

  return (
    <main className="onboardingWrap">
      {/* Top bar */}
      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="logoWrap">
              <Image
                src="/overlap_blue.png"
                alt="Overlap"
                width={88}
                height={88}
                priority
              />
            </div>
             <div className="brandText">
                <span className="brandTitle">Onboarding</span>
                <span className="brandSub">AI-to-AI coordination in all your workflows.</span>
              </div>
          </div>

          <div className="profileWrap" ref={profileRef}>
            <button
              className="avatar"
              onClick={() => setOpen(!open)}
              aria-label="Profile menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {open && (
              <div className="profileMenu">
                <button onClick={handleLogout} className="profileItem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="hero">
        <div className="container heroGrid single">
          <div className="centerStack">
            {/* Rotating logo */}
            <div className="orbit">
              <div className="orbitRing" />
              <div className="orbitRing2" />
              <div className="orbitLogo">
                <Image
                  src="/overlap_blue_no_text.png"
                  alt=""
                  width={64}
                  height={64}
                />
              </div>
            </div>

       

            <h1 className="h1 small">
              Tell your agent how you work.
            </h1>
            <p className="sub center">
              Give your agent context to coordinate on your behalf. Your information stays private.
            </p>

            {/* Progress dots */}
            <div className="progress">
              {questions.map((_, i) => (
                <div key={i} className={`dot ${i <= step ? "active" : ""} ${i === step ? "current" : ""}`} />
              ))}
            </div>

            {/* Card */}
            <div className="card wide">
              {!isLastStep ? (
                <>
                  <div className="questionHeader">
                    <div className="stepLabel">Step {step + 1} of {questions.length}</div>
                    <div className="questionTitle">{currentQuestion.label}</div>
                    {currentQuestion.hint && (
                      <div className="questionHint">{currentQuestion.hint}</div>
                    )}
                  </div>

                  <div className="questionField">
                    {currentQuestion.type === "text" ? (
                      <input
                        type="text"
                        className="questionInput"
                        placeholder={currentQuestion.placeholder}
                        value={formData[currentQuestion.field as keyof typeof formData]}
                        onChange={(e) => setFormData({...formData, [currentQuestion.field]: e.target.value})}
                        autoFocus
                      />
                    ) : currentQuestion.type === "textarea" ? (
                      <textarea
                        className="questionInput questionTextarea"
                        placeholder={currentQuestion.placeholder}
                        value={formData[currentQuestion.field as keyof typeof formData]}
                        onChange={(e) => setFormData({...formData, [currentQuestion.field]: e.target.value})}
                        rows={4}
                        autoFocus
                      />
                    ) : currentQuestion.type === "timerange" ? (
                      <div className="timeRange">
                        <div className="timeRangeItem">
                          <label className="timeRangeLabel">Start</label>
                          <select
                            className="questionSelect"
                            value={formData.hoursStart}
                            onChange={(e) => setFormData({...formData, hoursStart: e.target.value})}
                            autoFocus
                          >
                            {timeSlots.map((slot) => (
                              <option key={slot.value} value={slot.value}>{slot.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="timeRangeSep">→</div>
                        <div className="timeRangeItem">
                          <label className="timeRangeLabel">End</label>
                          <select
                            className="questionSelect"
                            value={formData.hoursEnd}
                            onChange={(e) => setFormData({...formData, hoursEnd: e.target.value})}
                          >
                            {timeSlots.map((slot) => (
                              <option key={slot.value} value={slot.value}>{slot.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <select
                        className="questionSelect"
                        value={formData[currentQuestion.field as keyof typeof formData]}
                        onChange={(e) => setFormData({...formData, [currentQuestion.field]: e.target.value})}
                        autoFocus
                      >
                        {currentQuestion.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="wizardActions">
                    {step > 0 && (
                      <button className="btn btnGhost" onClick={handleBack}>
                        ← Back
                      </button>
                    )}
                    <button 
                      className="btn btnPrimary btnLarge" 
                      onClick={handleNext}
                      disabled={step === 0 && !formData.name.trim()}
                    >
                      Continue <span className="arrow">→</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="reviewHeader">
                    <div className="reviewIcon">✓</div>
                    <div className="reviewTitle">Review your information</div>
                    <div className="reviewSub">Confirm everything looks good before saving</div>
                  </div>

                  <div className="reviewGrid">
                    <div className="reviewItem">
                      <div className="reviewLabel">Name</div>
                      <div className="reviewValue">{formData.name || "Not set"}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Job / role</div>
                      <div className="reviewValue">{formData.job || "Not set"}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">About you</div>
                      <div className="reviewValue">{formData.aboutYou ? formData.aboutYou : "Not set"}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Working hours</div>
                      <div className="reviewValue">
                        {timeSlots.find(t => t.value === formData.hoursStart)?.label} – {timeSlots.find(t => t.value === formData.hoursEnd)?.label}
                      </div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Time zone</div>
                      <div className="reviewValue">{formData.timezone}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Meeting location</div>
                      <div className="reviewValue">{formData.location}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Preferred time</div>
                      <div className="reviewValue">{formData.time}</div>
                    </div>
                    <div className="reviewItem">
                      <div className="reviewLabel">Buffer time</div>
                      <div className="reviewValue">{formData.buffer}</div>
                    </div>
                  </div>

                  <div className="actionRow">
                    <button
                      className="btn btnPrimary btnLarge full"
                      onClick={handleSavePreferences}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save preferences"} <span className="arrow">→</span>
                    </button>
                    <div className="actionRowSplit">
                      <button className="btn btnGhost" onClick={handleBack}>
                        ← Back
                      </button>
                      <button className="btn btnGhost" onClick={handleReset}>
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
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
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
}
a{color:inherit;text-decoration:none}

.onboardingWrap{
  min-height:100vh;
  background:#faf8fc;
  background-image:
    radial-gradient(ellipse 100% 100% at 80% 20%, rgba(196,181,253,.35), transparent 55%),
    radial-gradient(ellipse 90% 80% at 15% 70%, rgba(167,139,250,.22), transparent 50%),
    radial-gradient(ellipse 70% 60% at 50% 40%, rgba(253,224,71,.08), transparent 45%),
    radial-gradient(ellipse 120% 100% at -10% 50%, rgba(129,140,248,.18), transparent 50%),
    linear-gradient(165deg, #f5f3ff 0%, #faf8fc 40%, #fefce8 100%);
  position:relative;
}
.onboardingWrap::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(circle, rgba(167,139,250,.14) 1.5px, transparent 1.5px),
    radial-gradient(circle, rgba(129,140,248,.08) 1px, transparent 1px);
  background-size: 32px 32px, 18px 18px;
  background-position: 0 0, 9px 9px;
}
.onboardingWrap::after{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(circle at 10% 15%, rgba(196,181,253,.2) 0%, transparent 25%),
    radial-gradient(circle at 88% 80%, rgba(167,139,250,.18) 0%, transparent 28%),
    radial-gradient(circle at 70% 25%, rgba(253,224,71,.12) 0%, transparent 22%),
    radial-gradient(circle at 25% 85%, rgba(129,140,248,.15) 0%, transparent 30%),
    radial-gradient(circle at 95% 45%, rgba(196,181,253,.12) 0%, transparent 20%),
    radial-gradient(circle at 50% 95%, rgba(167,139,250,.1) 0%, transparent 35%);
  background-size: 100% 100%;
}
.onboardingWrap > *{position:relative;z-index:1}

/* You're all set: different pattern only (diagonal lines + soft rings) */
.onboardingWrap.onboardingFinal::before{
  background-image:
    linear-gradient(105deg, rgba(167,139,250,.06) 0%, transparent 50%),
    linear-gradient(75deg, transparent 0%, rgba(129,140,248,.05) 50%);
  background-size: 60px 100%, 100px 80px;
  background-position: 0 0, 0 0;
}
.onboardingWrap.onboardingFinal::after{
  background-image:
    radial-gradient(ellipse 80% 50% at 50% 50%, rgba(255,255,255,.25) 0%, transparent 55%),
    radial-gradient(ellipse 60% 40% at 20% 80%, rgba(196,181,253,.08) 0%, transparent 45%),
    radial-gradient(ellipse 50% 60% at 85% 20%, rgba(167,139,250,.06) 0%, transparent 45%);
  background-size: 100% 100%;
}

.container{max-width:1100px;margin:0 auto;padding:0 20px}

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
.profileMenu{
  position:absolute;
  right:-20px;
  top:46px;
  background:#fff;
  border:1px solid var(--border);
  border-radius:14px;
  box-shadow:var(--shadow2);
  overflow:hidden;
  min-width:120px;
  animation:slideDown .2s ease;
}
@keyframes slideDown{
  from{opacity:0;transform:translateY(-8px)}
  to{opacity:1;transform:translateY(0)}
}
.profileHeader{
  padding:14px 14px;
  display:flex;gap:12px;align-items:center;
  background:rgba(37,99,235,.06);
}
.profileAvatar{
  width:40px;height:40px;
  border-radius:10px;
  background:linear-gradient(135deg, var(--accent), var(--accent2));
  display:grid;place-items:center;
  color:#fff;
  font-weight:800;
  font-size:14px;
  border:1px solid rgba(37,99,235,.25);
}
.profileName{font-weight:700;font-size:14px;color:var(--text)}
.profileEmail{font-size:12px;color:var(--muted);margin-top:2px}
.profileDivider{height:1px;background:var(--border)}
.profileItem{
  display:block;
  padding:11px 14px;
  font-size:14px;
  color:#ef4444;
  text-align:center;
  transition:background .15s ease;
  width:100%;
  background:none;
  border:none;
  cursor:pointer;
  font-family:inherit;
}
.profileItem:hover{
  background:rgba(239,68,68,.08);
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
.questionTextarea{
  min-height:100px;
  resize:vertical;
  font-family:inherit;
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
