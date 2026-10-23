# ATG Consulting

Marketing website and client intake app for [atgconsulting.io](https://atgconsulting.io).

---

## Architecture decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Full-stack in one process; API routes, SSR, and static pages side by side. Ideal for the upcoming client portal and admin view. |
| Language | **TypeScript** | End-to-end type safety across form → API → DB → UI. |
| Styling | **Tailwind CSS v3** | Utility-first; consistent design tokens; no runtime CSS-in-JS overhead. |
| ORM | **Prisma** | Type-safe DB client; easy migrations; supports SQLite locally and Postgres in production with a one-line change. |
| Database | **SQLite** (local + Replit) → **Postgres** (production) | Zero-config for development; swap by changing `DATABASE_URL` and the `provider` in `prisma/schema.prisma`. |
| Auth | **Replit Auth** (boundary only — not yet implemented) | Replit injects `X-Replit-User-*` headers automatically. The adapter at `lib/auth.ts` exposes `getCurrentUser()`, `requireUser()`, and `requireAdmin()`. Swap for another provider by updating only that file. See **Auth** section below. |
| LLM | **OpenAI-compatible API** (provider-agnostic) | OpenAI, xAI Grok, Together, Fireworks, or local Ollama — set env vars to switch. See **LLM** section below. |
| Email | **Nodemailer** (off by default) | Any SMTP provider; activate with `EMAIL_ENABLED=true`. |

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env.local

# 3. Create the database (SQLite, first run only)
npm run db:push

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

The server binds to `0.0.0.0` and reads the `PORT` env var, so it works on Replit, Railway, Render, Fly.io, and any container platform without changes.

### Production build

```bash
npm run build   # generates Prisma client, then builds Next.js
npm run start   # serves on 0.0.0.0:$PORT (default 3000)
```

---

## Replit import

1. On Replit, click **Create Repl → Import from GitHub** and paste this repo URL.
2. Replit detects `package.json` and generates its own run configuration — no `.replit` file needed.
3. In the Replit Secrets panel, add the variables from `.env.example` (at minimum `DATABASE_URL`).
4. Click **Run** — the site will open on the public Replit URL.

> **First run on Replit:** if the DB hasn't been initialised yet, open the Shell tab and run `npm run db:push` before starting the server.

---

## Where to edit copy and placeholders

### Placeholders to fill before launch

Search for `[` in the codebase:

```bash
grep -rn '\[' app/ components/ --include="*.tsx" --include="*.ts"
```

| Placeholder | File | Notes |
|---|---|---|
| `[$ placeholder]` / `[$]` | `components/sections/Tiers.tsx`, `CompareTable.tsx` | Prices |
| `[number]` | `Tiers.tsx`, `CompareTable.tsx` | Number of live sessions in Guided |
| `[hours]` | `CompareTable.tsx` | Time commitment per tier |
| `[channel and window]` | `Tiers.tsx` | Q&A support channel |
| `[contact email]` | `Footer.tsx` | Public contact address |
| `[LinkedIn]` | `Footer.tsx` | Profile URL |
| `[privacy policy]` | `Footer.tsx` | Privacy page URL |
| `[Headshot placeholder]` | `About.tsx` | Replace `<div>` with `<Image>` |
| Various FAQ answers | `FAQ.tsx` | Pricing, timeframes, credit policy |
| `[OG image]` | `app/layout.tsx` metadata | Replace with real image URL |

### Section map

| File | Section |
|---|---|
| `components/Nav.tsx` | Navigation |
| `components/sections/Hero.tsx` | Hero headline + CTAs |
| `components/sections/Problem.tsx` | Pain points |
| `components/sections/HowItWorks.tsx` | 3-step process |
| `components/sections/WhatWeAutomate.tsx` | 4-area cards (exec, marketing, sales, support) |
| `components/sections/Tiers.tsx` | Self-serve / Guided / White glove |
| `components/sections/CompareTable.tsx` | Tier comparison table |
| `components/sections/WhoItsFor.tsx` | Target audience |
| `components/sections/Example.tsx` | Illustrative print-rep workflow |
| `components/sections/About.tsx` | Shea bio |
| `components/sections/FAQ.tsx` | Accordion FAQ |
| `components/sections/CTA.tsx` | Bottom CTA |
| `components/sections/Footer.tsx` | Footer |

### Intake form

| File | Purpose |
|---|---|
| `app/start/page.tsx` | `/start` page wrapper |
| `components/intake/IntakeForm.tsx` | Multi-step shell, validation, submit |
| `components/intake/Step1About.tsx` | Name, email, role, industry, biz size, areas |
| `components/intake/Step2Workflows.tsx` | AI comfort, tools, filtered time-sinks, automate-first |
| `components/intake/Step3Preferences.tsx` | Hours slider, preferred help, free text |
| `components/intake/TailoredResponse.tsx` | Response display |
| `app/api/intake/route.ts` | POST handler: validate → rate-limit → honeypot → DB → LLM → email |
| `types/intake.ts` | All shared types, labels, and area→time-sink mapping |
| `lib/llm.ts` | LLM prompt builder + fallback response |

---

## LLM configuration

Set **one** of these environment variables to enable AI-generated responses:

| Variable | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI (default model: `gpt-4o-mini`) |
| `XAI_API_KEY` + `LLM_BASE_URL=https://api.x.ai/v1` | xAI Grok |
| `LLM_API_KEY` + `LLM_BASE_URL=<url>` | Together, Fireworks, Ollama, etc. |

Override the model with `LLM_MODEL=gpt-4o` (or any compatible model name).

**Without an API key**, the app returns a rule-based template response that is still useful and personalised from the form data.

---

## Auth (Replit Auth)

Authentication is **not yet implemented**. The thin adapter at `lib/auth.ts` exposes three functions:

```ts
getCurrentUser(req)  // → ATGUser | null
requireUser(req)     // → ATGUser or throws 401
requireAdmin(req)    // → ATGUser (admin only) or throws 403
```

Replit Auth works by injecting `X-Replit-User-*` HTTP headers on every request when deployed on Replit. To activate it:

1. Enable Replit Auth in your Repl's settings.
2. Set `ADMIN_REPLIT_ID` to Shea's Replit user ID in Secrets.
3. Call `getCurrentUser(req)` / `requireUser(req)` in route handlers that need auth.

**Local dev mock:** set `MOCK_USER=1` in `.env.local` to simulate a logged-in user without Replit.

**Future phases:** user accounts, client portal (saved intake results, PDFs, daily reports), admin view for Shea. These will use `requireUser()` / `requireAdmin()` in new route handlers and server components without touching the auth adapter.

---

## Database

Prisma schema lives at `prisma/schema.prisma`.

**Switch to Postgres:**
1. Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`.
2. Update `DATABASE_URL` to a Postgres connection string.
3. Run `npm run db:push` (or create a migration: `npx prisma migrate dev`).

**Inspect data:**

```bash
npm run db:studio   # opens Prisma Studio in the browser
```

---

## Brand assets

```
public/brand/
├── logos/
│   ├── ATG_logo_A_primary_transparent.png   # Full colour (light backgrounds)
│   ├── ATG_logo_A_notagline_transparent.png # No tagline (Nav)
│   ├── ATG_logo_A_reversed_for_dark_transparent.png
│   ├── ATG_icon_A_512_transparent.png
│   ├── ATG_icon_A_64_transparent.png
│   └── svg/
│       ├── optionA_icon.svg                 # Favicon
│       ├── optionA_lockup_notag.svg         # Nav logo
│       ├── optionA_lockup.svg
│       └── optionA_lockup_white.svg
└── ATG_Consulting_OnePager.pdf
```

**Brand colours:** navy `#14213D` · orange `#F2994A` — defined in `tailwind.config.ts`.
**Font:** Plus Jakarta Sans (Google Fonts, loaded via `next/font/google`).

---

## Adding real testimonials and results

Do **not** add invented testimonials, stats, or client names. When you have real results and permission, add a new component `components/sections/Testimonials.tsx` and import it in `app/page.tsx`.
