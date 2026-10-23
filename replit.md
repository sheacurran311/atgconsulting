# ATG Consulting

The imported consulting website helps small businesses explore AI services and complete a three-step intake questionnaire for personalised workflow recommendations.

## Run & verify

- Start the managed workflows `artifacts/atg-consulting: web` and `artifacts/api-server: API Server`.
- `pnpm --filter @workspace/scripts run test:atg` runs the browser/API smoke test against those workflows through the shared proxy.
- `pnpm --filter @workspace/api-server test` tests a real submission against a fresh temporary SQLite file, verifies persistence and rejects rate-limit header spoofing.
- `pnpm run typecheck:libs && pnpm --filter @workspace/atg-consulting run typecheck && pnpm --filter @workspace/api-server run typecheck` checks the migrated app.
- `pnpm --filter @workspace/api-spec run codegen` regenerates the API contract helpers.
- The API automatically initializes missing SQLite tables before listening, including on fresh deployments. `db:push` remains available for deliberate development schema changes.

## Project layout

- `artifacts/atg-consulting`: React + Vite frontend, routes `/` and `/start`, original components, Tailwind 3 theme, Plus Jakarta Sans, brand assets and one-page PDF.
- `artifacts/api-server`: Express endpoint `POST /api/intake`, validation, rate limiting, sanitisation, recommendation generation and optional email.
- `artifacts/api-server/prisma/schema.prisma`: original Prisma/SQLite data model.
- `lib/api-spec/openapi.yaml`: API contract; generated helpers live in the scaffold's API client and Zod packages.
- `scripts/src/atg-smoke.mjs`: repeatable browser checks with the API response stubbed to avoid creating leads or calling external providers on each run; evidence is written to ignored `generated-artifacts/atg-tests/`. The real API/database has separate isolated tests.
- `.migration-backup`: original imported source, retained for reference, not deployed.

## Storage decision

The import used Prisma with SQLite. Preserve that database technology unless the user authorizes a migration; do not silently replace it with the scaffold's PostgreSQL database.

The default SQLite database is `artifacts/api-server/prisma/intake.db`. It is intentionally excluded from Git. An existing file-based `DATABASE_URL` is supported; a PostgreSQL `DATABASE_URL` is not passed to the SQLite client. The unused scaffold `lib/db` package remains untouched.

**Before publishing for real lead collection:** choose durable production storage and verify backup/persistence behavior. Local SQLite files must not be assumed to survive replacement of the application filesystem.

## Proxy safety

Express proxy trust is disabled because no verified proxy-address allowlist was provided. Rate limiting uses the socket peer, not caller-controlled forwarded headers. On a shared gateway this conservatively shares the five-per-15-minute budget; configure `TRUSTED_PROXY_CIDRS` with a comma-separated, verified deployment-specific proxy IP/CIDR allowlist before enabling per-visitor proxy trust. Do not use unconditional `trust proxy: true` or trust the leftmost forwarded header.

## Optional integrations

- Without an AI-provider key, the original rule-based recommendations remain active (`type: "fallback"`). No new key is required to run the app.
- Original provider options: `OPENAI_API_KEY`, `XAI_API_KEY`, or `LLM_API_KEY`, with optional `LLM_BASE_URL` and `LLM_MODEL`. Configure credentials via Replit integrations/secrets, never in source.
- Email stays off unless `EMAIL_ENABLED=true` and SMTP settings are configured. The original `SMTP_*`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, and `SHEA_EMAIL` options are preserved.
- Optional `IP_HASH_SALT` controls hashed-IP logging.
- No authentication flow or client portal existed in the shipped routes; the unused imported header-auth placeholder was not installed as real authentication.

## Migration boundaries

Keep original wording, layout, service placeholders, and fallback recommendations unless asked to change them. This port replaces Next.js routing/images/fonts/API handlers with Vite, ordinary browser links/images, Google Fonts, and Express; it is not a redesign.
