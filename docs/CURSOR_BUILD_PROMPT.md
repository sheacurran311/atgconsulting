# Cursor Build Prompt: ATG Consulting App (atgconsulting.io)

You are building the ATG Consulting **web app** in `github.com/sheacurran311/atgconsulting`, starting from the seeded repo (marketing site plus `/start` intake form). It's an app, not a static site: logins, saved plans, consultations, documents, daily reports, tier-gated learning, and an admin console. Work in PR-sized phases (see §16). Don't invent testimonials, stats, client names, or prices. Use `[placeholder]` instead.

Wireframes are in `wireframes/png/` (copy the `wireframes/` folder into the repo at `/docs/wireframes/`). They're low-fidelity. Match the layout and content, and apply brand styling (navy `#14284B`, orange `#E8702A`, logo A from `/public/brand/`).

| Screen | PNG |
|---|---|
| Sitemap & flow | `00_sitemap_flow.png` |
| Marketing home | `01_marketing_home.png`, `m01_marketing_home.png` |
| Intake steps 1–3 | `02_intake_step1.png`, `m02_intake_step1.png`, `03_intake_step2.png`, `04_intake_step3.png` |
| Tailored plan result | `05_plan_result.png`, `m05_plan_result.png` |
| Sign up / login | `06_signup_login.png` |
| Client dashboard | `07_client_dashboard.png`, `m07_client_dashboard.png` |
| Consultations | `08_consultations.png` |
| Documents | `09_documents.png` |
| Daily reports | `10_daily_reports.png` |
| Learn | `11_learn.png` |
| Account & billing | `12_account_billing.png` |
| Admin clients | `13_admin_clients.png` |
| Admin client detail | `14_admin_client_detail.png` |
| Admin intake inbox | `15_admin_intake_inbox.png` |
| Admin content manager | `16_admin_content_manager.png` |

## 1. Product summary
ATG Consulting coaches small business owners, solo/independent salespeople, and AI beginners to adopt AI workflows across four areas: **Executive assistant, Marketing, Sales, and Customer support**. It offers three tiers: **Self-serve** (recorded seminar plus templates), **Guided** (live cohort or 1:1), and **White glove** (done for you plus 30 days of tuning). The funnel goes: 2-minute intake → instant LLM-tailored plan → create an account to save it → book a call / buy a tier → ongoing consultations, documents, daily digests, and modules.

## 2. Users and roles
- **Prospect** (no account): views the marketing site, completes the intake, and sees their plan. The plan is stored by intake id and claimed when they sign in (Replit Auth) with the same email or via `returnTo`.
- **Client** (`CLIENT`): sees only their own data under `/app/*`. What they can access depends on their tier (`NONE | SELF_SERVE | GUIDED | WHITE_GLOVE`).
- **Admin** (`ADMIN`): Shea. Has full access under `/admin/*` and can preview any client's `/app` view (read-only "view as").

## 3. Stack and architecture (match the existing PR)
- Next.js App Router, TypeScript (strict), Tailwind. Use server components by default and server actions for mutations, with route handlers for webhooks, cron, and file URLs.
- ORM: keep whichever of **Prisma or Drizzle** the seed PR chose. Use SQLite in dev, swappable to Postgres via `DATABASE_URL` (Replit Postgres/Neon in prod). Avoid SQLite-only features.
- Validate every input and env var with Zod (`src/env.ts` fails fast on boot).
- Folders: `src/app/(marketing)`, `src/app/start`, `src/app/(auth)`, `src/app/app`, `src/app/admin`, `src/server/{db,auth,llm,email,storage,pdf,reports,billing,audit}`, `src/components/ui`.
- Put every external service behind an interface with a local/dev implementation so the app runs with **zero secrets** (template plans, console email, local disk storage).

## 4. Data model (minimum)
- `User` (id, email unique nullable, name, image, role `CLIENT|ADMIN`, createdAt, lastLoginAt) plus `AuthIdentity` (id, provider, providerUserId, userId; unique(provider, providerUserId)). No password or session tables; Replit Auth owns sessions.
- `Client` (id, userId unique, company, roleTitle, industry, size, tier, aiLevel 0–4, areas[], status `PROSPECT|ACTIVE|PAUSED|CHURNED`, digestEmailOptIn, stripeCustomerId?, notes).
- `Intake` (id, email, name, answers JSON (versioned schema), areas[], aiComfort, hoursLost, helpStyle, ip hash, userAgent, status `NEW|REVIEWED|CONVERTED|SPAM`, clientId?, createdAt).
- `Plan` (id, intakeId, clientId?, aiLevel, recommendedTier, workflows JSON [{area,title,steps,tools}] (up to 4, at least 1 per selected area), quickWin, source `LLM|TEMPLATE`, model, promptVersion, pdfDocumentId?).
- `WorkflowItem` (id, clientId, planId?, area, title, done bool, order): the dashboard checklist.
- `Consultation` (id, clientId, scheduledAt, durationMin, title, notes markdown, recordingUrl?, status). `ActionItem` (id, consultationId, owner `CLIENT|ADMIN`, text, done, dueAt?).
- `Document` (id, clientId? (null = shared library), title, type `PLAN|ONE_PAGER|WORKFLOW|SESSION|OTHER`, storageKey, mime, size, visibleToClient, minTier?, uploadedById).
- `Report` (id, clientId, date, kind `DAILY`, contentMarkdown, data JSON, status `DRAFT|PUBLISHED`, publishedAt, emailedAt?). Unique (clientId, date, kind).
- `Module` (id, slug, title, description, minTier, order, videoUrl?, body markdown, status `DRAFT|PUBLISHED`) and `ModuleAsset` → Document. `ModuleProgress` (userId, moduleId, completedAt).
- `PromptTemplate` (id, key `plan|digest`, version, body, active).
- `AuditLog` (id, actorUserId?, action, entity, entityId, meta JSON, ip hash, createdAt). Write an entry for every admin mutation, document view/download, role or tier change, and data export/delete.

## 5. Auth: Replit Auth behind a thin adapter
**Provider: Replit Auth** ([docs](https://docs.replit.com/features/auth-and-identity/authentication), [md](https://docs.replit.com/references/auth-and-identity/authentication.md)). What the docs say as of Oct 2026:
- Users sign in with a **Replit account** on a Replit-branded login page. The methods shown can be configured in *Tools → Users & Auth → Configure*: Google, GitHub, X, Apple, Email. App name and icon can be set; Replit branding stays.
- **"The only way to implement Replit Auth is by using Agent… Manual implementation is not supported."** The wiring must be generated by **Replit Agent** inside the Replit workspace. Neither you (Cursor) nor anyone else should hand-write the Replit OIDC/session code.
- It works in dev (`*.replit.dev`) and published apps (`*.replit.app` plus custom domains; republish after adding a domain so `REPLIT_DOMAINS` refreshes). It only runs when the app is hosted on Replit.
- Replit "automatically creates user entries in your database". Users are managed (view, ban) in *Users & Auth → Users*. Replit handles password resets, so the app needs no email provider for login.
- The docs **do not document** the server-side API or the exact user fields. Agent-generated Replit Auth code has historically used OpenID Connect with claims like `sub` (stable Replit user id), `email`, `first_name`, `last_name`, `profile_image_url`, an Express/session layer, and env vars like `REPL_ID`, `ISSUER_URL`, `SESSION_SECRET`. **Treat these as unverified** and confirm them against what Agent actually generates.

**What you build (Cursor):** a provider-agnostic adapter so Replit Auth plugs in later, and could be replaced with Clerk/Auth.js:
```ts
// src/server/auth/index.ts
export type AuthIdentity = { provider: "replit" | "dev"; providerUserId: string; email: string | null; name?: string; imageUrl?: string };
export interface AuthProvider { getIdentity(): Promise<AuthIdentity | null>; loginUrl(returnTo: string): string; logoutUrl(): string }
export async function getCurrentUser(): Promise<AppUser | null>  // identity → upsert/lookup in users table
export async function requireUser(): Promise<AppUser>            // redirect to /login if null
export async function requireAdmin(): Promise<AppUser>           // 403 unless role ADMIN
export async function requireClientAccess(clientId: string): Promise<AppUser>
```
- Choose the provider with `AUTH_PROVIDER=replit|dev`. Ship a **`dev` provider** (a cookie set by a dev-only `/login/dev` form, disabled when `NODE_ENV=production`) so the app and tests run locally and in CI. Ship a **`replit` provider stub** that reads the identity from the session Replit Agent creates. Leave a clear `TODO(replit-agent)` and a `docs/REPLIT_AUTH_SETUP.md` with the exact prompt for Shea to paste into Replit Agent:
  > "Add Replit Auth to this Next.js app. Do not create new user tables. Implement `ReplitAuthProvider.getIdentity()`, `loginUrl()` and `logoutUrl()` in `src/server/auth/providers/replit.ts` using the Replit session, returning the Replit user id, email, name and profile image. Map Replit's auto-created user records into our existing `User`/`AuthIdentity` tables. Keep all role logic in `src/server/auth/index.ts`."
- **Identity mapping:** add an `AuthIdentity` table (provider, providerUserId unique per provider, userId → `User`). On first login, upsert `User` by email (lowercased) if present, then link the identity. If Replit's auto-created user table exists, keep it as Replit's and reference it only through `AuthIdentity.providerUserId`. The rest of the app uses only `User.id`.
- **Roles:** `ADMIN_EMAILS=shea@[domain]` (comma list). Identities whose email matches get `ADMIN` on every login, so removing an email demotes that user. Everyone else gets `CLIENT`. If Replit returns no email, the user is a client with no plan to claim; show "add your email" in Account.
- **Claim on login:** link any `Intake`/`Plan` whose email matches the verified login email to the user's `Client`. As a fallback, `/start/result/[intakeId]` → "Save my plan" puts `intakeId` in `returnTo`, and the plan is claimed after login if the intake is under 7 days old and unclaimed.
- **RBAC:** middleware does optimistic gating of `/app/*` and `/admin/*`. Every server action/query still calls the adapter guards. Never trust the client.
- Login page (`06_signup_login.png`): a single **"Continue with Replit login"** button → `provider.loginUrl(returnTo)`, plus a note that Replit's page offers Google/email/etc. Remove the magic-link and Google buttons.

## 6. File storage
- `StorageProvider` interface: `put`, `getSignedUrl(key, ttl)`, `delete`. Implementations: `local` (dev, `/var/uploads`, served through an authenticated route handler), `s3` (any S3-compatible: AWS, R2, B2), and `replit` (Replit Object Storage). Select with `STORAGE_DRIVER`.
- Clients never get public URLs. `/api/documents/[id]/download` checks access, writes an audit entry, and redirects to a signed URL with a TTL of 5 minutes or less.
- Uploads are admin-only: PDF/PNG/JPG/DOCX allowlist, 25 MB max, MIME sniffing, random keys `clients/{clientId}/{uuid}`.

## 7. PDF generation (tailored plan)
- Generate a branded "Your AI Plan" PDF (logo, AI level, workflows by area, quick win, recommended tier, CTA). Use `@react-pdf/renderer`, which avoids headless Chrome and works on Replit.
- Generate it when the plan is claimed into an account (and on demand from admin). Store it via StorageProvider as a `Document` of type `PLAN`.

## 8. Daily reports
- `POST /api/cron/daily-reports` is protected by the `CRON_SECRET` header. Run it with Replit Scheduled Deployments (or an external cron) at 6:00 America/Denver.
- For each ACTIVE client, it compiles the last 24h (workflow checklist changes, action items due/overdue, new documents, upcoming consultation) and asks the LLM for a short digest (template fallback). It upserts a `Report` that's `DRAFT` by default, or auto-`PUBLISHED` if `REPORTS_AUTOPUBLISH=true`.
- Admin reviews and publishes it in `/admin/reports` or on the client detail page. On publish, it emails the client if `digestEmailOptIn` is on and email is configured. The job must be idempotent.

## 9. LLM layer
- `LLMProvider` interface `generateJSON<T>(prompt, schema)` with adapters for OpenAI, Anthropic, xAI, and OpenRouter, chosen by `LLM_PROVIDER` + `LLM_MODEL` + the provider key env. If no key is set, or on error or timeout (20s), use the deterministic template generator.
- Store prompt templates in `PromptTemplate` (versioned, editable in the content manager) with code defaults in `src/server/llm/prompts/`.
- **Injection safety:** wrap user free text in delimiters and label it as untrusted data, truncate it (500 chars), validate output with Zod (reject or repair, then fall back), never run tools or fetch URLs from model output, render output as escaped markdown (no raw HTML), and don't put secrets or other clients' data in prompts. Log model, promptVersion, and latency without logging the PII text.

## 10. Email
- `EmailProvider` interface with adapters for `console` (dev), Resend, Postmark, and SMTP (`EMAIL_PROVIDER`). Uses: plan email (intake), digest, and an admin alert on new intake. Login emails are handled by Replit Auth. Plan and alert emails stay **off by default** behind `EMAIL_SEND_PLANS=false`.

## 11. Billing (placeholder)
- `BillingProvider` with a Stripe adapter, behind `BILLING_ENABLED=false`. Create Price IDs per tier through env (`STRIPE_PRICE_SELF_SERVE`, …). Checkout session, customer portal link, and the webhook `/api/stripe/webhook` (signature verified) set `Client.tier`. While disabled, the account page shows `[$ price]` and a "Book a call" CTA, and admin sets the tier manually.

## 12. Pages and routes
Public: `/` (01), `/start` steps 1–3 (02–04), `/start/result/[intakeId]` (05; unguessable id, expires for anonymous viewers after 7 days), `/login` (06; single Replit login button) + `/login/dev` (dev only), `/book` (external booking link `[BOOKING_URL]`), `/privacy`, `/terms`.
Client: `/app` dashboard (07), `/app/consultations` + `/app/consultations/[id]` (08), `/app/documents` (09), `/app/reports` + `/app/reports/[date]` (10), `/app/learn` + `/app/learn/[slug]` (11, locked cards show an upgrade CTA), `/app/account` (12: profile, digest opt-in, plan/billing, export data, delete account).
Admin: `/admin` → `/admin/clients` (13: search, filter by tier/AI level/area), `/admin/clients/[id]` (14: tabs Overview, Intake answers, Plan, Sessions, Documents, Reports; upload PDF, write session notes plus action items, publish reports, change tier, view as client), `/admin/intakes` (15: New/Reviewed/Converted/Spam, view generated plan, invite as client, email plan), `/admin/content` (16: modules CRUD with min tier, shared document library, prompt templates), `/admin/reports` (queue of drafts), `/admin/audit`.
API: auth routes generated by Replit Agent (keep them behind the adapter), `/api/intake` (POST), `/api/documents/[id]/download`, `/api/cron/daily-reports`, `/api/stripe/webhook`, `/api/health`.

## 13. Security and privacy checklist
- [ ] Server-side authz on every query/action, with tests proving client A can't read client B's data (IDOR).
- [ ] Intake: honeypot plus a per-IP and per-email rate limit (DB- or memory-backed, e.g. 5/hour), Zod validation, size caps.
- [ ] Dev auth provider is hard-disabled in production (boot fails if `AUTH_PROVIDER=dev` with `NODE_ENV=production`).
- [ ] CSRF covered by server actions; session cookies (from Replit Auth) `Secure`, `HttpOnly`, `SameSite=Lax`. Verify after Agent setup.
- [ ] Security headers: CSP (no inline scripts except Next nonce), HSTS, X-Frame-Options DENY, Referrer-Policy.
- [ ] Signed, short-lived file URLs; no public bucket; upload allowlist.
- [ ] Hash IPs with a salt; minimal PII; no PII in logs or LLM telemetry.
- [ ] Data export (JSON plus files) and account deletion (soft-delete then purge in 30 days), both audited.
- [ ] Secrets only in Replit Secrets; `.env.example` lists every key with placeholder values.
- [ ] Privacy page states which AI providers process intake text. Get Shea's approval before anything client-facing goes out.
- [ ] Dependency audit in CI (`pnpm audit`), Stripe/cron signature checks.

## 14. Replit deployment
- `.replit`: `run = "pnpm dev"`; deployment build `pnpm install && pnpm db:migrate && pnpm build`, run `pnpm start` (bind `0.0.0.0:$PORT`). Add `replit.nix` only if needed (Node 20+).
- DB: SQLite file for quick start. For production, use Replit PostgreSQL and set `DATABASE_URL`. Migrations committed.
- Secrets: `DATABASE_URL, AUTH_PROVIDER=replit, ADMIN_EMAILS, (Replit-managed: REPL_ID, REPLIT_DOMAINS, plus whatever Agent adds, e.g. SESSION_SECRET), EMAIL_PROVIDER, EMAIL_FROM, RESEND_API_KEY|POSTMARK_TOKEN|SMTP_*, LLM_PROVIDER, LLM_MODEL, OPENAI_API_KEY|ANTHROPIC_API_KEY|XAI_API_KEY|OPENROUTER_API_KEY, STORAGE_DRIVER, S3_*|REPLIT_BUCKET, CRON_SECRET, REPORTS_AUTOPUBLISH, EMAIL_SEND_PLANS, BILLING_ENABLED, STRIPE_*, BOOKING_URL, IP_HASH_SALT`.
- Scheduled Deployment (or cron) calls the daily-report endpoint with `CRON_SECRET`. Custom domain atgconsulting.io goes on the Replit deployment. **Republish after linking it** so Replit Auth recognizes the domain (`REPLIT_DOMAINS`). Set login methods, app name and icon (logo A) in Tools → Users & Auth → Configure.
- Write a `README.md` with "Import to Replit" steps and local dev steps.

## 15. Testing and acceptance criteria
- Tooling: Vitest (unit: plan generator, template fallback, tier gating, Zod schemas, prompt builder) and Playwright (e2e). CI via GitHub Actions: lint, typecheck, test, build.
- Acceptance:
  1. Intake finishes in 3 steps; time sinks are filtered by the selected areas; submit shows a plan with at least 1 workflow per selected area (4 max), a quick win, and a tier, **with no secrets set** (template).
  2. Honeypot submissions are discarded silently; the 6th submission per hour from the same IP gets a 429.
  3. "Save my plan" → login (dev provider locally, Replit Auth on Replit) → dashboard shows that plan, checklist, and plan PDF in Documents.
  4. Adapter unit tests: new identity creates User plus AuthIdentity; a returning identity maps to the same User; an ADMIN_EMAILS match gives ADMIN, and removing it demotes; no email gives CLIENT. On Replit: "Continue with Replit login" round-trips back to `returnTo`.
  5. The ADMIN_EMAILS user reaches `/admin`; a client gets a 403/redirect; client A gets a 404 on client B's consultation and document ids.
  6. Admin uploads a PDF → client sees and downloads it via a signed URL; the audit log records both.
  7. Admin writes session notes plus action items → client sees them; client can tick their own items.
  8. The cron endpoint without a secret gets a 401; with the secret it creates one draft per active client, and rerunning creates no duplicates; publish shows it in the client feed.
  9. Learn locks modules above the client's tier.
  10. Mobile (390px) layouts match the `m*.png` wireframes; Lighthouse a11y ≥ 90 on `/`, `/start`, `/app`.

## 16. Milestones (PR-sized)
1. **Foundation:** confirm the seed PR, env schema, ORM schema plus migrations for §4, seed script, UI kit (buttons/cards/sidebar shell), CI.
2. **Auth adapter (small):** adapter plus dev provider, `AuthIdentity` mapping, ADMIN_EMAILS roles, guards plus middleware, login screen (06), app/admin shells, `docs/REPLIT_AUTH_SETUP.md`. *Replit Auth wiring itself is done by Shea running Replit Agent in the Replit workspace after this PR is merged and imported. Then a small follow-up PR fills in the `replit` provider.*
3. **Intake → plan v2:** persist Intake/Plan, LLM layer plus template fallback, result page (05) with the save CTA, claim-on-login, rate limiting.
4. **Client dashboard:** dashboard (07), workflow checklist, account page (12) without billing.
5. **Storage and documents:** StorageProvider, admin upload, documents library (09), plan PDF generation.
6. **Consultations:** admin session notes/action items, client views (08).
7. **Daily reports:** cron job, digest generation, admin queue/publish, client view (10), optional email.
8. **Learn and content manager:** modules with tier gating (11, 16), prompt template editor.
9. **Admin console polish:** clients list/detail (13, 14), intake inbox (15), view-as, audit log viewer.
10. **Billing placeholder:** Stripe adapter behind a flag, webhook → tier.
11. **Hardening and launch:** security checklist, e2e suite, Replit deploy, domain, privacy/terms copy for Shea to review.

Keep every PR small and green, update the README per phase, and list any placeholders that need Shea's input (prices, booking URL, admin email, provider choices) in each PR description.
