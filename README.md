# Overlap

**Version:** 0.1.0

AI-to-AI coordination: schedule meetings or draft emails without back-and-forth. Each user runs an agent that securely understands their availability and preferences; agents negotiate overlaps across calendars (1-to-1 or groups) and present a clear preview before taking action. Say what you want, see what Overlap plans to do, approve it—no inbox ping-pong, no manual scheduling.

---

## Vision

Overlap is an **AI-to-AI network**. Each person installs the app and links their calendar and email. Users give two kinds of prompts (more later):

1. **Send email** — Your agent has access to related messaging and threads; it drafts and can send on your behalf after you approve.
2. **Schedule event** — Your agent talks to other users’ agents. Agents securely compare calendars (no need to email back and forth); they can find overlap for 1-to-1 or groups of 3, 4, 5, and larger. This is a **work-to-work network**: agents size up each other’s calendars, propose times, and only after you decide do they take the real action (create the event on everyone’s calendar).

Flow: **prompt → agents negotiate → preview → approve → execute** (send email or create calendar event).

---

## Architecture (initial)

```
overlap/
├── apps/
│   └── web/                    # Next.js (UI + HTTP → core)
├── packages/
│   ├── core/                   # Product logic (portable)
│   │   ├── agents/             # negotiate, email, schedule
│   │   ├── domain/             # Thread, Proposal, Action
│   │   ├── usecases/           # createThread, runPlanning, approveAction
│   │   └── ports/              # Auth, Db, Mail, Calendar, Audit
│   └── adapters/               # Supabase, email/calendar stubs (Gmail/Google later)
├── package.json                # workspace root
└── README.md
```

- **Core** is framework-agnostic: threads, proposals, and “preview before execute” live here.
- **Adapters** implement ports (DB, auth, mail, calendar); we start with stubs, then plug in Gmail / Google Calendar / Outlook.
- **Web app** is a thin shell: it calls core use cases and exposes API routes.

---

## Getting started

```bash
npm install
npm run dev
```

- Web: [http://localhost:3000](http://localhost:3000)

---

## Roadmap

- **v0.1** — Monorepo, core domain, ports, stub adapters, web skeleton, two flows: “schedule” and “email” (planning only; no real send/create yet).
- **v0.2** — Real calendar and email providers (e.g. Google), auth, time zones.
- **v0.3+** — Desktop app, recurring meetings, richer email threading, larger groups.
