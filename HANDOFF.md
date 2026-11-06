# ATG Consulting handoff

This file is the starting point for the next person or agent. The product owner is Shea. Refer to him as he.

## Product

ATG Consulting helps a small business pick an AI assistant, install a few workflows, and keep a human in the loop. The public site explains the offer. A signed-in client gets a home, a plan, a workbench, learning, and resources. Shea reviews drafts before a client sees them.

The app does not connect to a client's Grok, Claude, ChatGPT, Gemini, or any self-hosted agent. It does not store client model keys. It does not send email, chat, or social posts on a client's behalf. Email from this app notifies Shea only. Login email stays with Clerk.

Exercises in the AI Workshop run in the learner's own assistant. Completing a lesson is not a certificate.

## Tiers and prices (as the code shows them)

| Tier | Code value | Price in the product |
| --- | --- | --- |
| Self-serve | `SELF_SERVE` | **$197**. This is the price in `Tiers.tsx` and in proposal labels in `discovery.ts`. A second "founding / $297" price is not in the code. Do not add one unless he asks. |
| Guided | `GUIDED` | **$997** for 3 × 90-minute sessions, or **$1,497** for 5 sessions. |
| Done-for-you | `WHITE_GLOVE` | **From $3,500**, by application. Optional **$750/mo** care plan. |

Refund copy (`artifacts/atg-consulting/src/content/legal/refund-policy.md`):

- Self-serve and unused Guided sessions: 30-day refund rules on that page.
- Done-for-you: full refund before work starts. After work starts, the **30% deposit** is non-refundable. The rest is refunded minus milestones completed or in progress, as listed in the statement of work.
- Out-of-scope work that he approves is **$150 per hour**.

Billing is off. Those prices are copy. Nothing charges a card until `BILLING_ENABLED` is turned on later.

## Architecture

- Web: Vite, React, wouter, Tailwind. Package `@workspace/atg-consulting` in `artifacts/atg-consulting`.
- API: Express 5, Prisma 5.22, PostgreSQL. Package `@workspace/api-server` in `artifacts/api-server`.
- Auth: Clerk. The API reads the session. Admins are emails in `ADMIN_EMAILS`.
- Model calls: the xAI Grok client in `artifacts/api-server/src/lib/grokClient.ts`. Drafts stay drafts until he approves them.
- Data: `artifacts/api-server/prisma/schema.prisma`. Apply schema changes with `pnpm --filter @workspace/api-server db:push`. Do not edit `.replit`.

## Catalog kinds

`CatalogItem.kind` is `template` (default), `model`, or `claw`.

- **model** — a general assistant with no workflow in the catalog. Fields used: name, maker, official URL (`sourceUrl`), a short "good for" line (`description`), `tierFit`, `verified`.
- **claw** — a self-hosted agent that needs a model plugged in. Extra fields: `requiresModels` (JSON array), `setupDifficulty`, `hostingRequirement`, and a mandatory `safetyNote`.
- Clients only receive rows that are `verified` and `enabled`. Seeds are unverified. Batch verify defaults to `kind = template`. Pass `{ "kind": "model" }` or `{ "kind": "claw" }` to include those rows. Clients still only see verified, enabled rows.

Seeded models (unverified): Grok (xAI), Claude (Anthropic), ChatGPT (OpenAI), Gemini (Google), Microsoft Copilot (Microsoft), Perplexity, Meta AI (Meta), Le Chat (Mistral), Muse (Meta, https://muse.ai/, fallback page https://ai.meta.com/muse/). Muse is a short unverified model row. It is not a feature list and it has no price.

Seeded claws (unverified), each with the safety note that they run with the client's own keys on the client's own machine, that permissions should be reviewed, and that this app never connects to them or stores keys:

- OpenClaw — https://github.com/openclaw/openclaw
- NanoClaw — https://github.com/nanocoai/nanoclaw (project documents Anthropic as the model path)
- ZeroClaw — https://github.com/zeroclaw-labs/zeroclaw

Other projects that share the name IronClaw were not seeded. Do not invent a catalog row.

## Environment variables

No new variables were added for models or claws.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection for Prisma | Required. No default. |
| `ADMIN_TEST_MODE` | Unlocks paid surfaces for admin testing only when the value is exactly `true` | off |
| `ADMIN_EMAILS` | Comma-separated admin emails | `shea@atgconsulting.io` |
| `AI_ASSIST_ENABLED` | Grok assist. Anything other than `false` leaves it on | on |
| `XAI_API_KEY` | xAI key for drafts and embeddings | empty (calls fail closed) |
| `XAI_EMBEDDING_MODEL` | Embedding model name | `v1` |
| `AI_MODEL_DEFAULT` / `AI_MODEL_VISION` | Chat model names | `grok-4.7` |
| `LLM_BASE_URL` | Dev-only base URL override. Ignored when `NODE_ENV` is production | unset |
| `CONTENT_DRAFTS_PER_WEEK` | How many queued posts become drafts | `2` |
| `APP_URL` | Public site origin for links in email and Stripe return URLs | `https://atgconsulting.io` |
| `API_SERVER_URL` | API origin used by the web SEO plugin | unset |
| `VITE_PROXY_TARGET` | Vite dev proxy target for `/api` | unset |
| `EMAIL_PROVIDER` | `console` (log only), `resend`, `postmark`, or `smtp` | `console` |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | From header on mail to Shea | `shea@atgconsulting.io` / `Shea at ATG Consulting` |
| `SHEA_EMAIL` | The only inbox this app writes to | `shea@atgconsulting.io` |
| `RESEND_API_KEY` | Resend SMTP password when provider is `resend` | unset |
| `POSTMARK_TOKEN` | Postmark SMTP user and password when provider is `postmark` | unset |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Generic SMTP. Port defaults to 587. Secure when `SMTP_SECURE=true` | unset |
| `BILLING_ENABLED` | Server Stripe routes. Must be `true` | off (`false` or unset) |
| `VITE_BILLING_ENABLED` | Shows billing controls in the account page when `true` | off |
| `STRIPE_SECRET_KEY` | Stripe secret. Required only if billing is on | unset |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature secret | unset |
| `STRIPE_PRICE_SELF_SERVE` | Price id, one-time Self-serve | unset |
| `STRIPE_PRICE_GUIDED` | Price id, one-time Guided package. Checkout still charges this price. | unset |
| `STRIPE_PRICE_GUIDED_5` | Optional. If the purchased price id matches this, the webhook sets 5 Guided sessions. Otherwise the count comes from the intake request (5, else 3). | unset |
| `STRIPE_PRICE_DFY_SETUP` | Price id, Done-for-you setup (`WHITE_GLOVE`) | unset |
| `STRIPE_PRICE_DFY_MONTHLY` | Optional monthly care price id | unset |
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk | Replit sets the publishable key from the host |
| `VITE_CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PROXY_URL` | Clerk in the browser | host-derived |
| `COOKIE_SECRET` | Signed cookies, including view-as-client | a dev placeholder. Set a real secret in production |
| `CRON_SECRET` | Protects cron routes | unset (routes refuse) |
| `REPORTS_AUTOPUBLISH` | Cron may publish reports when `true` | off |
| `DFY_MONTHLY_CAP` | How many Done-for-you engagements can be accepted | `1` |
| `INTAKE_ENABLED` | Public intake. Set `false` to close it | on |
| `IP_HASH_SALT` | Salt for hashed IP addresses | a code fallback. Set a real salt in production |
| `TRUSTED_PROXY_CIDRS` | Proxy ranges for the real client IP | empty |
| `ALLOWED_ORIGINS` | Extra CORS origins | empty |
| `AI_CAP_INTAKE` | Token cap for intake drafting | `60000` |
| `AI_CAP_SELF_SERVE` / `AI_CAP_GUIDED` / `AI_CAP_DFY` | Monthly assist caps in `grokClient.ts` | `250000` / `750000` / `2000000` |
| `AI_RATE_LIMIT_PER_MIN` | Assist requests per minute | `5` |
| `AI_CHAT_LOG_RETENTION_DAYS` | How long assist logs are kept | `30` |
| `AI_TOKEN_PRICE_INPUT` / `AI_TOKEN_PRICE_OUTPUT` | Internal cost estimate, not a customer price | `0.002` / `0.006` |
| `VITE_BOOKING_URL` | Guided booking link | `#book` |
| `VITE_LINKEDIN_URL` | Footer link, only if it is an http(s) URL | unset |
| `VITE_LEGAL_PUBLISHED` | Legal pages leave draft state when `true` | off |
| `PORT` / `BASE_PATH` | Set by Replit. Do not override | Replit |
| `LOG_LEVEL` | API log level | `info` |
| `LOCAL_STORAGE_DIR` / `STORAGE_DRIVER` / `STORAGE_SIGN_SECRET` | File storage. Driver default `local` | local disk |

`artifacts/api-server/src/routes/ai-assist.ts` also reads the three `AI_CAP_*` tier vars with lower fallbacks (`50000` / `150000` / `500000`) than `grokClient.ts`. Do not treat those two files as the same cap until someone unifies them.

## Deploy

1. Merge the pull request into `main`.
2. Pull `main` into the Replit project.
3. Run `pnpm --filter @workspace/api-server db:push`.
4. Republish.

Do not edit `.replit`. Do not start a second dev server. After merging the catalog pull request and this one, run:

```
pnpm --filter @workspace/api-server db:push
```

This adds `SessionRecord.packageCounted`, `Consultation.packageCounted`, `DiscoveryProposal.acceptedAt` / `acceptedByName`, and `DfyApplication.acceptedAt`. The catalog columns from the earlier pull request (`slug`, `kind`, `maker`, `requiresModels`, `setupDifficulty`, `hostingRequirement`, `safetyNote`) are included if they are not already on the database.

Optional new env var: `STRIPE_PRICE_GUIDED_5`. `CRON_SECRET` already exists. Leave it unset until he hosts the job.

`ADMIN_TEST_MODE=true` unlocks paid workflows and the workshop only while the signed-in role is ADMIN. A client session stays locked. View-as-client uses the client's tier. Proposal acceptance is refused during view-as-client.

The daily cron date is America/Denver. Approved blog posts publish when `publishAt` is empty or already due. A future `publishAt` waits. Catalog link checks do not disable a verified row. An unverified row is disabled only on HTTP 404 or 410.

Done-for-you spots use `DfyApplication.acceptedAt`. Editing notes later does not consume another spot.

## Daily report cron

This app does not run the job. He hosts it. The route accepts `Authorization: Bearer` or `x-cron-secret`. Both must equal `CRON_SECRET`.

```
curl -X POST "$APP_URL/api/cron/daily-reports" -H "Authorization: Bearer $CRON_SECRET"
```

## Signup and Guided count

Verified signup stores `requestedTier` and `requestedSessions` on the intake and leaves `Client.tier` at `NONE`. Workflows stay locked. `ADMIN_TEST_MODE=true` still unlocks surfaces for him. He assigns the tier after review.

A Guided checkout records 3 or 5 sessions. It never records 4. Marking a Guided session record (`sessionType` guided) or completing a consultation increments `guidedSessionsUsed` once, capped at the package total. The same calendar day is not counted twice across those two records.

## Pull requests #37–#46

- **#37** Admin automation: content engine, Admin Today, blog, intake editing, view-as-client.
- **#38** Review-first copy, client record on verified signup, proposal page.
- **#39** Weekly content queue, one AI switch, production blog HTML.
- **#40** Persist the chosen tier, gate workflows, public copy.
- **#41** Notify Shea, and keep drafts for him to approve.
- **#42** Audit fixes for tool-plan approval, follow-up draft, message thread, install tier checks, and related P0–P2 bugs. No billing changes.
- **#43** Client home at `/app`.
- **#44** Admin Today board.
- **#45** Self-guided AI Workshop in Learn.
- **#46** Model and claw catalog kinds, "Which AI fits you", hide the empty Learning modules list, and this handoff.

## Stripe, later

Do not turn billing on as part of a catalog or content change. The routes already exist and stay behind `BILLING_ENABLED`.

When he is ready:

- Checkout: `POST /api/billing/checkout` with `tier` of `SELF_SERVE`, `GUIDED`, or `WHITE_GLOVE`. Done-for-you requires an accepted application. One-time mode unless `STRIPE_PRICE_DFY_MONTHLY` is set, in which case checkout is a subscription and includes that price.
- Portal: `GET /api/billing/portal`.
- Webhook: `POST /api/stripe/webhook`, raw body, signature from `STRIPE_WEBHOOK_SECRET`. Processed ids are stored on `StripeEvent` (`id`, `type`, `processedAt` only).
- Price env vars: `STRIPE_PRICE_SELF_SERVE`, `STRIPE_PRICE_GUIDED`, `STRIPE_PRICE_DFY_SETUP`, `STRIPE_PRICE_DFY_MONTHLY`.
- Done-for-you money should follow the written offer: 30% deposit, then milestones on the statement of work, optional $750/mo care, $150/hr for approved out-of-scope work. The webhook sets `guidedSessionsTotal` to 3 or 5. It does not set 4. It still does not model the deposit or milestones. Do not turn billing on until he is ready.

## Known gaps and backlog

1. Apply this schema with `db:push`, then verify the seeded models and claws in Admin → Catalog before expecting them on Learn.
2. Billing stays off. Deposits and milestones are not in Stripe yet. The Guided count is 3 or 5.
3. Assist token caps disagree between `grokClient.ts` and `routes/ai-assist.ts`.
4. Blog posts stay unpublished until he approves a draft. Do not seed fake posts.
5. Legal pages are drafts until counsel review and `VITE_LEGAL_PUBLISHED=true`.
6. `EMAIL_PROVIDER=console` only logs. Set Resend, Postmark, or SMTP when he wants inbox mail.
7. The public site has no $297 price. Leave it that way until he asks.
8. Self-hosted agents beyond the three seeded claws need a real public URL before they are added. Muse is already seeded, unverified.

## Click-through

- Admin → Catalog. Filter **Models** and **Claws**. The seeds are pending, not verified.
- Verify one model. On `/app/learn` and on Resources, that model appears under "Which AI fits you". The others stay hidden.
- Verify one claw. Its card shows the safety note. Unverified claws stay hidden.
- `/app/learn` with no published Module rows shows the workshop card and does not show "No modules published yet".
- Confirm this file has no street address, phone number, or EIN.
