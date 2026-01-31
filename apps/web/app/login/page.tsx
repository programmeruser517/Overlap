"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signInWithPassword, signInWithOtp } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      if (mode === "password") {
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
        window.location.href = "/app";
        return;
      }
      const { error } = await signInWithOtp(email.trim());
      if (error) {
        setMessage({ type: "err", text: error.message });
        setLoading(false);
        return;
      }
      setMessage({ type: "ok", text: "Check your email for the sign-in link." });
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
            <Link href="/" className="brand">
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
                <span className="brandSub">AI-to-AI coordination</span>
              </div>
            </Link>
            <nav className="nav">
              <Link className="navLink" href="/">
                Home
              </Link>
            </nav>
          </div>
        </header>

        <section className="loginSection">
          <div className="container">
            <div className="loginCard">
              <div className="loginCardTop">
                <h1 className="loginTitle">Sign in</h1>
                <p className="loginSub">Use your email and password, or get a magic link.</p>
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
                {mode === "password" && (
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
                    {loading ? "…" : mode === "password" ? "Sign in" : "Send magic link"}
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnLarge"
                    onClick={() => {
                      setMode(mode === "password" ? "magic" : "password");
                      setMessage(null);
                    }}
                  >
                    {mode === "password" ? "Use magic link instead" : "Use password instead"}
                  </button>
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
  background:
    radial-gradient(1200px 500px at 15% 0%, rgba(37,99,235,.10), transparent 60%),
    radial-gradient(1000px 520px at 90% 10%, rgba(124,58,237,.10), transparent 55%),
    linear-gradient(180deg, #ffffff, var(--bg));
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
  -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
.loginWrap{min-height:100vh}
.container{max-width:1100px;margin:0 auto;padding:0 20px}
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
.navLink{font-size:14px;color:var(--muted);padding:10px;border-radius:10px;transition:background .15s ease,color .15s ease}
.navLink:hover{background:rgba(15,23,42,.05);color:var(--text)}
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
.btn:disabled{opacity:.7;cursor:not-allowed;transform:none}
.loginSection{padding:48px 0}
.loginCard{
  max-width:420px;margin:0 auto;
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
`;
