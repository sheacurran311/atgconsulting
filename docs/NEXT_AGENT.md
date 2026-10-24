# ATG Consulting — audit and next-agent handoff

Read this file before changing code.

## Product: three tiers, one product

1. **Self-serve** (`SELF_SERVE`): paid deliverable = a personalised tool plan (which tools to use given their intake, budget, current software, and volumes) + a step-by-step setup guide, plus email support (replies within 2 business days). NO 1:1 calls with Shea. Workbench access with ready-made workflows (follow-up draft today).
2. **Guided** (`GUIDED`): a package of 1:1 build sessions with Shea (e.g. 4 × 90 min over 6–8 weeks; copy says "a package of 1:1 build sessions"). Includes operator message thread and everything in Self-serve. Admin sets `guidedSessionsTotal` on Client.
3. **Done-for-you** (`WHITE_GLOVE` in schema): premium managed option. By application, limited spots (`DFY_MONTHLY_CAP` env, default 1, waitlist when full). Up to 3 workflows Shea builds, runs, monitors, tunes. Client approves output. Also offered as upgrade after Guided.

`NONE` = no plan yet. Gate like Self-serve for operator features.

ATG serves anyone across all six verticals: `trades`, `realestate`, `hospitality`, `professional`, `salesrep`, `solo`. Keep all copy broad — the follow-up draft is the first workflow, not the audience.

## Stack

- Frontend: Vite + React + wouter in `artifacts/atg-consulting`
- API: Express + Prisma + PostgreSQL in `artifacts/api-server`. `provider = "postgresql"`. Apply with `pnpm db:push`.
- Auth: Clerk. Admin = `ADMIN_EMAILS` (default `shea@atgconsulting.io`).
- New env vars: `DFY_MONTHLY_CAP` (int, default 1).

## Schema (current — all new fields added this pass)

### New fields on `Intake`
- `toolBudget String?` — budget range selected: `<$50/mo | $50-150/mo | $150-500/mo | $500+/mo | not_sure`
- `currentSoftware String?` — free text
- `weeklyVolumes String?` — volume range: `<10/wk | 10-50/wk | 50-200/wk | 200+/wk | varies`

### New fields on `Client`
- `guidedSessionsTotal Int?` — total sessions in Guided package
- `guidedSessionsUsed Int @default(0)` — sessions used so far

### New models
- `ToolPlan` — personalised tool plan (draft → approved by admin). Admin reviews, edits JSON, approves. Client sees only approved plans at `/app/plan`.
- `DfyApplication` — DFY application/waitlist. Status: `applied | waitlisted | accepted | declined`. Accepting auto-sets client tier to WHITE_GLOVE.
- `SupportTicket` — email support for Self-serve. Status: `open | replied | closed`.

**`pnpm db:push` IS required after merging this PR** (new columns and tables).

## Intake form (16 questions now)

Order: name, email, bizSize, industry (vertical), role, areas (multi), aiComfort, tools (multi), timeSinks (multi, filtered), automateFirst (optional), hoursLost (slider), **toolBudget (radio)**, **currentSoftware (optional text)**, **weeklyVolumes (radio)**, preferredHelp, freeText (optional).

Query param `?tier=done_for_you` preselects `preferredHelp` and changes the page header.

## Tier recommendation (fixed)

`recommendTier()` in `lib/llm.ts` — exported and unit-tested:
- Explicit `helpStyle` (not "not_sure") → always respected
- `not_sure` + `aiComfort <= 1` + `hoursLost >= 10` → `done_for_you`
- `not_sure` + `aiComfort >= 3` → `self_serve`
- Otherwise → `guided`

## New routes

### Client
- `GET /api/tool-plan` — approved ToolPlan or 404
- `POST /api/tool-plan/generate` — generate (or refresh draft), creates draft for admin approval
- `POST /api/support` — submit support ticket (Zod: subject, message)
- `POST /api/dfy/apply` — apply for DFY
- `GET /api/dfy/status` — current application status
- `GET /api/guided/sessions` — session package status

### Admin
- `GET /api/admin/tool-plans` — draft plans awaiting review
- `GET /api/admin/clients/:id/tool-plan` — get client's plan
- `PATCH /api/admin/clients/:id/tool-plan` — edit toolsJson/stepsJson/adminNotes (Zod)
- `POST /api/admin/clients/:id/tool-plan/approve` — approve and release to client
- `GET /api/admin/dfy-applications` — list with cap and spotsLeft
- `PATCH /api/admin/dfy-applications/:id` — update status (Zod enum); accepting sets tier to WHITE_GLOVE
- `PATCH /api/admin/clients/:id/guided-sessions` — set session package (Zod), also sets tier to GUIDED
- `GET /api/admin/support` — support ticket inbox
- `PATCH /api/admin/support/:id` — update status (Zod enum)

## New frontend pages and components

| File | Purpose |
|---|---|
| `src/pages/app/plan.tsx` | `/app/plan` — shows approved ToolPlan; upgrade gate for NONE; request button if no plan |
| `src/components/workbench/SupportForm.tsx` | Email support form for SELF_SERVE (replaces OperatorPanel for non-Guided) |
| `src/pages/admin/tiers.tsx` | `/admin/tiers` — tool plan review, DFY applications, support tickets |

Dashboard now includes `GuidedSessionsPanel` for GUIDED clients (sessions remaining + booking link).

AppShell nav includes "My plan" → `/app/plan`.

AdminShell nav includes "Plans & DFY" → `/admin/tiers`.

## Tests (7 total)

- `follow-up.test.ts` — follow-up template fallback ✅
- `intake.test.ts` — skips on postgresql provider ✅ (skip is expected)
- `tier.test.ts` — **4 new tests**:
  - explicit preference always wins ✅
  - not_sure + low comfort + high hours → done_for_you ✅
  - not_sure + high comfort → self_serve ✅
  - not_sure + mid comfort → guided ✅
  - tool plan template returns tools and steps without invented prices ✅

## What remains (P2)

- Learn modules: no seed content. Admin can create modules; no module linked from self-serve plan.
- Plan PDF: fields on Plan model, no generator.
- Report digest email and cron timezone fix.
- Security headers, IDOR tests.
- Document upload UI, local file serving 403 in production.
- Booking URL needs a real `VITE_BOOKING_URL` before launch.
- Prompt-template editor does not feed into `llm.ts`.

## Leave for Shea

- Tier prices (all `[$ placeholder]`)
- Founder photo (`/brand/shea.jpg`), LinkedIn URL, booking URL
- Final privacy and terms wording (marked drafts)
- Whether self-serve is a seminar + templates or just the in-app workflow (currently in-app only — no seminar referenced)
- DFY monthly capacity (`DFY_MONTHLY_CAP`, default 1)

## Do not

- Invent prices, testimonials, stats, or hours-saved figures
- Send email, post to social, write to a CRM
- Add Stripe, S3, new auth providers, or extra agents
- Narrow copy to sales reps; keep all verticals
- Start a dev server or bind 127.0.0.1
- Switch Prisma provider back to sqlite

## Manual QA checklist for Shea after merge, `pnpm db:push`, and republish

1. Complete `/start` — pick a business type, complete all 16 questions including budget, software, and volumes. Land on `/start/result/:id`, not an error.
2. Sign in and claim the plan. Open `/app/plan` — see "no plan yet" or a pending message.
3. As admin: go to `/admin/tiers` → Tool plans tab → approve the generated plan. Reload `/app/plan` as the client → see the tool recommendations and setup steps.
4. As self-serve client: open the Dashboard → see the support form (not a live message thread). Submit a ticket. Check `/admin/tiers` → Support tickets to see it.
5. As admin: go to `/admin/tiers` → DFY applications. Apply as a client via `/start?tier=done_for_you`. Confirm it appears. Accept it → confirm client tier becomes White Glove.
6. As admin: set a client to Guided (`/admin/clients/:id` → tier dropdown) and set a session package (total/used). As the client → dashboard → Today tab → see "X / Y sessions remaining" with booking link.
7. `/#services` anchor resolves. `/privacy`, `/terms`, and custom 404 all work. Mobile nav shows Sign in.
8. Draft a follow-up in the workbench. Approve it. Copy text. Nothing is sent.
