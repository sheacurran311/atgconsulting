# ATG Consulting — audit and next-agent handoff

Read this file before changing code. It is the source of truth for the next pass.

ATG is one product with three levels of customization and human involvement:

1. **Self-serve** (`SELF_SERVE`): the client runs ready-made workflows in the workbench and approves output themselves. Templates, learn modules, light customization. Shea is an upgrade path, not the operator. Self-serve and `NONE` clients see "Want Shea to set this up for you?" linking to `/app/consultations` instead of a live operator thread.
2. **Guided** (`GUIDED`): the same workbench, plus Shea tunes their workflows, reviews outputs, and they get scheduled 1:1 consults and the operator message thread.
3. **Done-for-you** (`WHITE_GLOVE` in the schema; "White glove" on [Tiers.tsx](../artifacts/atg-consulting/src/components/sections/Tiers.tsx)): Shea designs, builds, runs, and tunes custom workflows. The client mostly approves finished output.

`NONE` means no plan yet. Gate it like self-serve for operator features. Keep all three prices as `[$ placeholder]`.

ATG serves anyone across all six verticals in [verticals.ts](../artifacts/atg-consulting/src/content/verticals.ts): `trades`, `realestate`, `hospitality`, `professional`, `salesrep`, `solo`. The follow-up draft is the **first workflow**, not the audience. Do not narrow copy to sales reps.

The public intake snapshot stays high-level ("where you are today, how we can help"). Full detail stays in the admin prep view.

## Stack

- Frontend: Vite + React + wouter in [artifacts/atg-consulting](../artifacts/atg-consulting)
- API: Express + Prisma + PostgreSQL in [artifacts/api-server](../artifacts/api-server). Schema uses `provider = "postgresql"`. Applied with `pnpm db:push`.
- Auth: Clerk. Admin = verified email in `ADMIN_EMAILS` (default `shea@atgconsulting.io`).
- `lib/db` is an unused Drizzle stub. Do not build on it.
- [artifacts/mockup-sandbox](../artifacts/mockup-sandbox) is empty. Do not use.
- Design tokens: Geist + Geist Mono, `#0A0A0B`/`#FAFAF9`, electric blue `#3B6BFF`, button `#2557E8`.
- No Replit agent, no managed-workflow restart. Deliver as a PR.

Stale docs to ignore: `replit.md` (SQLite, old intake shape), `CURSOR_BUILD_PROMPT.md` (Next.js, Replit Auth, `/login`).

## What is working (as of this audit pass)

### Public site (`/`)

All sections mounted: Hero, WhoWeHelp, **Services** (with `id="services"` so `/#services` lands correctly; invented durations removed), OutputGallery, Calculator, ChatVsATG, HowItWorks, SheaOperator, Tiers, FAQ, CTA, Footer.

Signed-in users with no URL hash redirect to `/app`.

| Route | State |
|---|---|
| `/` | Real. `#services`, `#how-it-works`, `#about` anchors all resolve. |
| `/start` | Real. Industry (vertical id) is saved and required. POST /api/intake returns `{ ok, intakeId, planId, snapshot }`. |
| `/start/result/:intakeId` | Real. Public for 7 days, then 410. |
| `/sign-in`, `/sign-up` | Clerk widgets. |
| `/privacy` | Draft legal page, marked for Shea's review. |
| `/terms` | Draft legal page, marked for Shea's review. |
| `/app/*` | Client portal, gated by Clerk. |
| `/admin/*` | Admin console, gated by `isAdmin`. |
| Anything else | Clean 404 page with links home and to `/start`. |

Still placeholders (leave until Shea supplies values):
- Tier prices (`[$ placeholder]` in Tiers.tsx)
- FAQ cost, timeframe, and upgrade credit answers
- Founder photo (`/brand/shea.jpg` — shows monogram fallback)
- Founder personal line in `src/content/shea.ts`
- Footer LinkedIn (`VITE_LINKEDIN_URL` or `[LinkedIn]`)
- Booking URL (`VITE_BOOKING_URL` or `#book`)
- Self-serve seminar / template library (no page yet; "Join the seminar" and "Save my spot" go to `/start`)

### Intake

`handleOption` saves all radio fields including `industry`. `currentRadioValue` shows the selected industry. `validate()` requires industry. The API also requires it (`z.string().min(1)`). Happy path returns `{ ok, intakeId, planId, snapshot }`. Honeypot submissions return `{ ok: true }` with no `intakeId`; the form guard prevents navigation to `/start/result/undefined`.

### Auth and portal

- Claim (`POST /api/plan/:intakeId/claim`) requires matching verified email or `role === "ADMIN"`. No email on account → 403.
- `useAccount` calls `api.client.me()` which returns `tier`, `status`, `digestEmailOptIn`.
- Account page shows "No plan yet" for `NONE`, correct labels for other tiers.
- OperatorPanel in AppShell sidebar is gated: `hasOperator(tier)` (Guided + White glove only). Self-serve and NONE see an upgrade prompt.
- Dashboard operator thread and workflow-request form also gated by `hasOperator(tier)`.
- Empty states (Today, My Workflows, Hours Saved) use `EmptyWorkbench` which is tier-aware.

### First workflow: "Draft a follow-up"

`POST /api/workbench/follow-up` (Zod: `who`, `lastTouch`, `wantToSay`) creates:
- one `Workflow` (`area: "sales"`, `status: "live"`) if it doesn't exist
- one `WorkflowRun` (`status: "completed"`, `summary: "Follow-up draft ready"`)
- one `OutputItem` (`type: "email_draft"`, `status: "pending"`)

LLM: `generateFollowUpDraft` in `llm.ts` — same OpenAI-compat client (20s timeout, Zod-validated response). Template fallback quotes the user's own words without inventing facts. No tool calls. No tracking pixels. No email sent.

`TodayInbox` keeps the card visible after approve or edit; shows the draft text with a copy control. Dismiss removes it. Approving does not send email.

### Admin

- Client detail tabs: overview, prep, plan, consultations, documents, reports, **outputs**.
- Outputs tab lets Shea post an `OutputItem` to a client's Today inbox via `POST /api/admin/clients/:id/outputs`. Validates workflow ownership (workflow must belong to that client).
- `PATCH /api/admin/workflows/:id` uses `WorkflowPatchSchema` (only allows `name`, `description`, `area`, `status`, `schedule`, `setupNote`).

### Validation (all routes now use Zod)

All `req.body` reads in admin.ts, workbench.ts, and client.ts use Zod schemas. Fixed routes:
- `POST /admin/clients/:id/workflows` → `WorkflowCreateSchema`
- `PATCH /admin/intakes/:id/status` → `IntakeStatusSchema` (enum)
- `PATCH /admin/reports/:id` → `ReportPatchSchema`
- `POST /admin/content/prompts` → `PromptCreateSchema` (key enum: plan|digest)
- `POST /admin/messages/:clientId/reply` → inline `z.object({ body })`
- `PATCH /admin/workflow-requests/:id` → `WorkflowRequestPatchSchema` (status enum)
- `POST /workbench/messages` → `MessageBodySchema`
- `POST /workbench/requests` → `WorkflowRequestSchema`
- `PATCH /client/account` → `AccountPatchSchema`

### Tests

- `follow-up.test.ts` — tests template fallback without DB. Passes.
- `intake.test.ts` — skips when `TEST_DATABASE_URL` is not set to a `file:` path (schema is postgresql, SQLite isolation test requires schema switch). Follow-up test still runs.

## What is incomplete (P2 — not this pass)

- Learn modules: no seed content. Modules CRUD exists in admin content manager. No module links from the self-serve follow-up flow.
- Plan PDF: fields exist in schema, nothing generates one.
- Report email: `sendDigestEmail` exists but is never called. Daily cron timezone is not Denver.
- Prompt-template editor in admin UI does not call `llm.ts` reader. Templates are code defaults only.
- Security: no IDOR tests, no multi-process rate-limiter, no CSP headers.
- Document upload: no UI. Local file serving is 403 in production.
- Booking URL `#book` has no target element. Use a real `VITE_BOOKING_URL` before launch.
- Stripe behind `BILLING_ENABLED=false` — not needed until Shea sets prices.
- Further workflows (prospect list, morning briefing, marketing post) — later pass.

## Leave for Shea

- Three tier prices (and whether self-serve includes a seminar or just the in-app workflow)
- Booking URL, LinkedIn URL, founder photo, personal bio line
- Final privacy and terms wording (currently marked as drafts)
- Whether or a later pass allows email or CRM writes (currently: approve = copy, nothing is sent)

## Do not

- Invent prices, testimonials, client names, stats, or hours-saved figures.
- Send email, post to social, or write to a CRM. Approve means the draft is ready to copy.
- Add Stripe, S3, a new auth provider, or extra agents in the next pass.
- Narrow homepage, intake, or tier copy to sales reps.
- Put implementation steps or tool names on the public intake snapshot.
- Switch the Prisma schema provider back to sqlite.
- Start a replacement vite/pnpm dev process or bind 127.0.0.1.

## Verify before you stop

Run `pnpm --filter @workspace/api-server run typecheck`, `pnpm --filter @workspace/atg-consulting run typecheck`, and `pnpm --filter @workspace/api-server test`. The intake test skips (expected); the follow-up test passes. Open a PR against `main`.

Manual QA checklist for Shea after merge + republish (no `db:push` needed if schema didn't change):

1. Complete `/start` with a business type, reach `/start/result/:id` (not an error, not `undefined`).
2. Open `/#services` from nav → scroll to the four work lanes. No hour counts like "2h → 5 min".
3. Open `/privacy` and `/terms` from footer. Open a bad URL → clean 404 with links home.
4. On narrow viewport, open mobile menu → Sign in (signed out) or Dashboard (signed in).
5. Sign in with the same email used on intake → claim plan → open Account → see tier label ("No plan yet" is correct for new accounts).
6. Sign in with a different email → attempt claim → see 403 error.
7. On dashboard (any tier): draft a follow-up, approve it, copy the text. Hours Saved shows at least one run. Nothing is emailed.
8. Self-serve / no plan: the message box shows "Want Shea to set this up for you?" not a live thread.
9. Set client tier to Guided in admin → reload their dashboard → operator thread appears.
10. As admin: add an output for a client → verify it appears in their Today list.
