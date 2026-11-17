# ATG Business Skills Implementation | Approved Plan v2
Date: 2026-11-17  
Status: Coding in progress on draft PR #57; no merge, migration, test execution in project runtime, external OAuth activation, or release.

## Product decisions
1. **Free Tools** replaces paid `SELF_SERVE`. The owner confirmed there are no paying clients, so remove Self-Serve checkout, its Stripe price requirement, the $197 public offer, and paywall on former Self-Serve tools. Preserve existing schema enum values only to avoid unnecessary migrations. Guided and DIFY billing remain intact.
2. **Guided** means consultant-led sessions with private ATG admin playbooks, implementation steps, verification evidence, deliverables and monitoring summaries.
3. **DIFY** means Do-It-For-You consulting. Do not install the third-party Dify platform.
4. Third-party OAuth is prohibited **except Google Search Console and Google Analytics 4**, both read-only and limited to authorized Guided/DIFY SEO monitoring. No Gmail, Outlook, social media or CRM OAuth.
5. Skills must be mapped to business-owner outcomes; no developer-facing Skills in the client interface.

## Ordered delivery and scope
### 1. Internal prospecting (in progress)
- Admin-only pipeline `NEW → RESEARCHED → QUALIFIED → DRAFT_READY → APPROVED → CONTACTED → REPLIED → BOOKED → WON/LOST`.
- Unique normalized website domains; source-backed fit scoring, notes and outreach drafts.
- Human approval before an operator marks any outreach as completed. **No sending or scraping automation**.
- Suppression and audit event recording; no customer OAuth.
- New code: `src/lib/prospecting.ts`, `routes/prospecting.ts`, `prospecting.test.ts`, admin prospecting page, Prisma `AtgProspect`.
- Before release: review data flows and test negative transitions, race conditions, access controls, schema changes and UI. Exclude public access; do not activate any live campaigns.

### 2. Guided consultant playbooks
- Reuse existing `ClientPlaybook`, `SessionRecord`, `ToolPlan`, `MasterPlaybook`, and client deployment work.
- Add modular business discovery, customer research, positioning, marketing plan, offers/pricing, CRM process, SEO diagnostics, implementation instructions and acceptance evidence.
- Preserve private consultant instructions and distinguish client-published deliverables. Track completion, responsibility, prerequisites and outcomes.
- Do not duplicate existing session or implementation-list features. Do not introduce unauthorized platform connections.

### 3. Managed SEO monitoring
- GSC OAuth: `https://www.googleapis.com/auth/webmasters.readonly`.
- GA4 OAuth: `https://www.googleapis.com/auth/analytics.readonly`.
- Implement authorization-code flow with state, PKCE, Google consent verification, encrypted server-side refresh tokens, property selection, per-tenant authorization, disconnect/revocation, audit and scheduled incremental synchronization.
- Search Console data: query/page clicks, impressions, CTR and average position. GA4 data: acquisition, engagement and key events. Explain date windows, attribution, source limitations and data delay.
- Introduce baseline-aware anomaly alerts and evidence-linked AI recommendations. Never promise ranking increases or confuse GA4 with GSC measurements.
- Guided: consultant reviews and explains suggestions. DIFY: managed remediation in agreed scope with customer approval.
- No Google credentials or tokens should appear in logs, browser responses, source code or committed environment files.

## Release gates
- Validate and test authorization/permissions, especially admin impersonation and cross-client isolation.
- Database change must be reviewed and applied intentionally; `db:push` has **not** been executed by this PR.
- Run workspace typechecks, API unit/regression suite, production builds and UI smoke tests.
- Test a controlled Google account before releasing either connector. Do not deploy until credential management, consent and disclosures are complete.
- Review existing Self-Serve legal and billing commitments prior to changing public price pages or plan checks.

## Existing architecture
Vite/React/wouter frontend, Express API, Prisma/Postgres, Clerk, existing guided playbook and admin operations. Sources: `HANDOFF.md`, `docs/admin-operations.md` and project source. Master DOCX provided separately to the owner.

## Development note
All modifications are scoped to draft PR #57, and this document is guidance rather than a claim that the features are live or passing tests.


## Implementation progress on branch (2026-11-17)
- **Free Tools transition:** new checkout accepts Guided and Do-It-For-You only; Self-Serve Stripe price no longer required. Free access logic and public pricing/refund copy updated. Existing `SELF_SERVE` schema value retained only for compatibility.
- **Internal prospecting:** admin prospect schema, routes, review UI, evidence/score/approval state checks and unit tests committed. No automated outbound.
- **Guided:** six consultant-only modules added to the admin Delivery Playbook, with discovery questions, resources, implementation steps, acceptance criteria, monitoring and Skill mapping. Existing client-specific playbooks remain the system of record. Separate unit test added.
- **SEO:** pure, source-separated GSC/GA4 anomaly detection with baseline minimums and tests; strict Google-only read-only OAuth scope allowlist and tests. These are foundations, NOT live Google integrations or scheduled collection.
- **Remaining release gates:** execute Prisma migration in controlled development environment, typecheck, run regression tests and builds, verify UI/auth/permissions, finish consumer-facing Free Tools references, design/implement GSC/GA4 OAuth/token storage/property selection/scheduling, and validate SEO recommendations against real consented data.
- Reference Google API scope documentation: https://developers.google.com/webmaster-tools/v1/how-tos/authorizing and https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
