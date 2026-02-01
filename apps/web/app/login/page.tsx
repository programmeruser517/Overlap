"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signInWithPassword } from "@/lib/supabase/client";

export default function LoginPage() {
  useEffect(() => {
    document.title = "Login";
  }, []);

  const [intent, setIntent] = useState<"signin" | "signup">("signin");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminUnlocking, setAdminUnlocking] = useState(false);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (intent === "signin" && mode === "password") {
        if (!password.trim()) {
          setMessage({ type: "err", text: "Enter your password." });
          setLoading(false);
          return;
        }
        const { error } = await signInWithPassword(email.trim(), password);
        if (error) {
          setMessage({ type: "err", text: error.message });
          setLoading(false);
          return;
        }
        // Normal user login always goes to onboarding, never admin
        window.location.href = "/onboarding";
        return;
      }
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Something went wrong." });
        return;
      }
      setMessage({ type: "ok", text: data.message ?? "Check your email for the sign-in link." });
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="loginWrap">
        <header className="topbar">
          <div className="container topbarInner">
            <a href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
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
                <span className="brandHeader">Login</span>
                <span className="brandSub">AI-to-AI coordination in all your workflows.</span>
              </div>
            </a>
            <nav className="nav">
              <Link className="navLink" href="/#how">
                How it works
              </Link>
              <Link className="navLink" href="/#flows">
                Flows
              </Link>
            </nav>
          </div>
        </header>

        <section className="loginSection">
          <div className="container loginGrid">
            <div className="loginCard">
                <div className="loginCardTop">
                  <h1 className="loginTitle">{intent === "signup" ? "Sign up" : "Sign in"}</h1>
                  <p className="loginSub">
                    {intent === "signup"
                      ? "Enter your email and we’ll send you a magic link to create your account."
                      : mode === "password"
                        ? "Sign in with your email and password."
                        : "Enter your email and we’ll send you a magic link to sign in."}
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="loginForm">
                  <label className="loginLabel">
                    Email
                    <input
                      type="email"
                      className="loginInput"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </label>
                  {intent === "signin" && mode === "password" && (
                    <label className="loginLabel">
                      Password
                      <input
                        type="password"
                        className="loginInput"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </label>
                  )}
                  {message && (
                    <div className={message.type === "ok" ? "loginMessage ok" : "loginMessage err"}>
                      {message.text}
                    </div>
                  )}
                  <div className="loginActions">
                    <button type="submit" className="btn btnPrimary btnLarge" disabled={loading}>
                      {loading ? "…" : intent === "signin" && mode === "password" ? "Sign in" : "Send magic link"}
                    </button>
                    {intent === "signin" && (
                      <p className="loginSwitch">
                        <button
                          type="button"
                          className="loginPasswordToggle"
                          onClick={() => {
                            setMode(mode === "magic" ? "password" : "magic");
                            setMessage(null);
                            setPassword("");
                          }}
                        >
                          {mode === "magic" ? "Sign in with password" : "Use magic link instead"}
                        </button>
                      </p>
                    )}
                    <p className="loginSwitch">
                      {intent === "signup" ? (
                        <>Already have an account?{" "}
                          <button
                            type="button"
                            className="btn btnGhost btnSmall"
                            onClick={() => {
                              setIntent("signin");
                              setMessage(null);
                            }}
                          >
                            Sign in
                          </button>
                        </>
                      ) : (
                        <>Don&apos;t have an account?{" "}
                          <button
                            type="button"
                            className="btn btnGhost btnSmall"
                            onClick={() => {
                              setIntent("signup");
                              setMode("magic");
                              setMessage(null);
                              setPassword("");
                            }}
                          >
                            Sign up
                          </button>
                        </>
                      )}
                    </p>
                  </div>
                  <div style={{ marginTop: 8 }}>
  <details>
    <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>
      Admin login
    </summary>

    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
      <input
        type="password"
        className="loginInput"
        value={adminPassword}
        onChange={(e) => setAdminPassword(e.target.value)}
        placeholder="Password"
      />

      <button
        type="button"
        className="btn btnGhost btnSmall"
        disabled={adminUnlocking}
        onClick={async () => {
          setAdminUnlocking(true);
          setMessage(null);
          try {
            const res = await fetch("/api/admin/demo-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: adminPassword }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setMessage({ type: "err", text: data.error ?? "Failed to unlock admin" });
              return;
            }
            window.location.href = "/admin";
          } finally {
            setAdminUnlocking(false);
          }
        }}
      >
        {adminUnlocking ? "…" : "Unlock admin"}
      </button>
    </div>
  </details>
</div>

                </form>
            </div>
          </div>
        </section>
      </main>
      <style>{loginCss}</style>
    </>
  );
}

const loginCss = `
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
  --ring:0 0 0 4px rgba(37,99,235,.12);
}
*{box-sizing:border-box}
html,body{height:100%;margin:0;color:var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
.loginWrap{
  min-height:100vh;
  background:var(--bg);
  background-image:
    radial-gradient(ellipse 140% 80% at 10% -20%, rgba(37,99,235,.18), transparent 50%),
    radial-gradient(ellipse 120% 70% at 95% 0%, rgba(124,58,237,.14), transparent 45%),
    radial-gradient(ellipse 80% 50% at 50% 110%, rgba(37,99,235,.06), transparent 40%),
    linear-gradient(180deg, #ffffff 0%, #f8f9fc 45%, var(--bg) 100%);
  position:relative;
}
.loginWrap::before{
  content:"";
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    linear-gradient(rgba(15,23,42,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,.02) 1px, transparent 1px);
  background-size:48px 48px;
}
.loginWrap > *{position:relative;z-index:1}
.container{max-width:1100px;margin:0 auto;padding:0 20px}
.topbar{
  position:sticky;top:0;z-index:50;
  background:rgba(255,255,255,.75);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);
}
.topbarInner{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0}
.brand{display:flex;align-items:center;gap:12px}
.logoWrap{flex-shrink:0;width:88px;height:88px;display:block;line-height:0}
.logoWrap img{width:100%;height:100%;object-fit:contain;display:block;vertical-align:middle}
.brandText{display:flex;flex-direction:column;gap:4px}
.brandHeader{font-size:18px;font-weight:700;color:var(--text);letter-spacing:-.02em}
.brandSub{font-size:14px;color:var(--muted);font-weight:500}
.nav{display:flex;align-items:center;gap:6px}
.navLink{
  font-size:14px;font-weight:600;color:var(--muted);
  padding:10px 14px;border-radius:10px;
  transition:background .15s ease,color .15s ease;
}
.navLink:hover{background:rgba(15,23,42,.06);color:var(--text)}
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
.btnPrimary{border-color:rgba(37,99,235,.25);background:linear-gradient(180deg, rgba(37,99,235,.10), rgba(37,99,235,.04))}
.btnPrimary:hover{border-color:rgba(37,99,235,.35)}
.btnGhost{background:rgba(255,255,255,.65)}
.btnLarge{padding:12px 16px;border-radius:14px}
.btnSmall{padding:6px 10px;font-size:13px}
.btn:disabled{opacity:.7;cursor:not-allowed;transform:none}
.loginSection{padding:48px 0 64px}
.loginGrid{max-width:420px;margin:0 auto}
.loginCard{
  background:rgba(255,255,255,.82);
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow:var(--shadow);
  overflow:hidden;
}
.loginCardTop{padding:24px 24px 0;border-bottom:1px solid var(--border);background:linear-gradient(180deg, rgba(255,255,255,.95), rgba(255,255,255,.75));padding-bottom:20px}
.loginTitle{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}
.loginSub{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.5}
.loginForm{padding:24px}
.loginLabel{display:block;margin-bottom:16px;font-size:14px;font-weight:600;color:var(--text)}
.loginInput{
  display:block;width:100%;margin-top:6px;
  padding:12px 14px;
  border:1px solid var(--border);
  border-radius:12px;
  background:#fff;
  font-size:15px;
  color:var(--text);
  box-shadow:0 1px 0 rgba(15,23,42,.04);
}
.loginInput:focus{outline:none;border-color:rgba(37,99,235,.4);box-shadow:var(--ring)}
.loginInput::placeholder{color:var(--muted)}
.loginMessage{margin-bottom:16px;padding:10px 12px;border-radius:12px;font-size:14px}
.loginMessage.ok{background:rgba(22,163,74,.1);border:1px solid rgba(22,163,74,.25);color:#0f5132}
.loginMessage.err{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);color:#991b1b}
.loginActions{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.loginSwitch{margin:0;font-size:14px;color:var(--muted)}
.loginPasswordToggle{background:none;border:none;padding:0;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;text-decoration:underline}
.loginPasswordToggle:hover{color:var(--accent)}
.loginMagicLinkBox{margin:16px 0;padding:16px;background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.25);border-radius:12px}
.loginMagicLinkButton{display:block;width:100%;padding:14px 16px;text-align:center;font-size:15px;font-weight:700;color:#fff;background:var(--accent);border-radius:12px;text-decoration:none;box-shadow:0 2px 8px rgba(37,99,235,.25);transition:transform .15s,box-shadow .15s}
.loginMagicLinkButton:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(37,99,235,.35)}
.loginMagicLinkNote{margin:10px 0 0;font-size:13px;color:var(--muted);text-align:center}
.loginLink{color:var(--accent);text-decoration:underline;cursor:pointer;font-weight:600}
.loginLink:hover{color:var(--accent2)}
`;
