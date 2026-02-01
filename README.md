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

## Architecture

```
overlap/
├── apps/
│   ├── web/                         # Next.js web app (UI + thin HTTP adapter)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # landing
│   │   │   ├── login/page.tsx
│   │   │   ├── app/                 # in-app: nav (Home, Settings) + padded content
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx         # new thread
│   │   │   │   ├── thread/[id]/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── api/                 # HTTP wrapper that calls packages/core
│   │   │       ├── me/route.ts
│   │   │       ├── thread/route.ts
│   │   │       └── thread/[id]/
│   │   │           ├── route.ts
│   │   │           ├── run/route.ts
│   │   │           ├── approve/route.ts
│   │   │           └── cancel/route.ts
│   │   ├── globals.css
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── desktop/                     # lightweight Tauri 2 wrapper (loads web via URL)
│       ├── static/index.html        # redirect to web app (no Next.js build)
│       ├── src-tauri/
│       ├── package.json
│       └── docs/desktop-build.md
│
├── packages/
│   ├── core/                        # THE PRODUCT LOGIC (portable)
│   │   ├── agents/
│   │   │   ├── agent.ts
│   │   │   ├── negotiate.ts
│   │   │   ├── email.ts
│   │   │   └── schedule.ts
│   │   ├── domain/
│   │   │   ├── models.ts            # Thread/Proposal/Action domain objects
│   │   │   ├── policies.ts          # preview-before-execute rules
│   │   │   └── errors.ts
│   │   ├── usecases/
│   │   │   ├── createThread.ts
│   │   │   ├── runPlanning.ts
│   │   │   ├── approveAction.ts
│   │   │   └── cancelThread.ts
│   │   ├── validators/
│   │   │   ├── proposal.ts
│   │   │   └── action.ts
│   │   ├── ports/                   # interfaces (no Supabase/Next-specific code)
│   │   │   ├── AuthPort.ts
│   │   │   ├── DbPort.ts
│   │   │   ├── MailPort.ts
│   │   │   ├── CalendarPort.ts
│   │   │   ├── AuditPort.ts
│   │   │   └── ClockPort.ts
│   │   ├── types.ts
│   │   └── index.ts                 # exports for web/desktop shells
│   │
│   ├── adapters/                    # concrete implementations of ports
│   │   ├── memory/                  # in-memory for dev (Db, Auth)
│   │   ├── supabase/                # Db/Auth adapter for web TODAY, desktop LATER
│   │   │   ├── db.ts                # implements DbPort
│   │   │   ├── auth.ts              # implements AuthPort
│   │   │   └── schema.sql
│   │   ├── providers/               # actions (email/calendar) behind interfaces
│   │   │   ├── email_stub.ts       # MVP stub: "log only"
│   │   │   ├── calendar_stub.ts    # MVP stub: "log only"
│   │   │   ├── gmail.ts             # later
│   │   │   ├── google_calendar.ts   # later
│   │   │   ├── outlook.ts           # later
│   │   │   └── ms_calendar.ts       # later
│   │   └── audit/
│   │       ├── memory_audit.ts
│   │       └── supabase_audit.ts    # implements AuditPort
│   │
│   └── ui/                          # shared UI components (optional)
│       ├── components/
│       │   ├── PromptBox.tsx
│       │   ├── ParticipantsInput.tsx
│       │   ├── ProposalPreview.tsx
│       │   ├── ApproveBar.tsx
│       │   ├── AuditLog.tsx
│       │   └── ThreadTimeline.tsx
│       └── index.ts
│
├── README.md                        # architecture + how to add desktop later
├── package.json                     # monorepo workspace config
├── tsconfig.json
└── .env.local
```

- **Core** is framework-agnostic: threads, proposals, validators, and “preview before execute” live here.
- **Adapters** implement ports: memory/Supabase for Db/Auth; stubs (and later Gmail, Google Calendar, Outlook, MS) for mail/calendar.
- **Web app** is a thin shell: landing at `/`, in-app at `/app` with nav (Home, Settings) and padded content; API routes call core use cases.
- **Desktop** is a minimal Tauri 2 wrapper: static redirect loads the web app (no Next.js build). See `docs/desktop-build.md`.
- **packages/ui** holds shared components (PromptBox, ProposalPreview, ApproveBar, etc.) for web and desktop.

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
