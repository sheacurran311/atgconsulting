# ATG Consulting implementation reconciliation

November 26, 2026 · Feature branch `feat/ai-transformation-phase-1` · PR #81

This document reconciles the [commercial launch roadmap](COMMERCIAL_LAUNCH_MASTER_PLAN_V4.md) from PR #80, the [transformation amendment](master-plan-v4-ai-transformation.md), the [historical decision register](MASTER_IMPLEMENTATION_PLAN.md), the November 17 master plan, and the November 26 owner approvals. The commercial roadmap retains the 24 workstreams. This reconciliation defines their current priority and resolves overlapping decisions.

## Commercial and release policy

- Free Tools retain existing access and personal workflows. Guided and Do-It-For-You use bespoke scopes supported by the existing quote and delivery process. Fractional AI leadership is an approved customizable engagement. Public prices and automatic subscription enrollment are outside this plan.
- Estimates use independent, editable ATG delivery costs and client ROI assumptions. Historical $35 examples and the older $90 reference create no binding rate. Additional hourly work has a USD $100 minimum on new scoped agreements, subject to prior written authorization and a separately agreed change order. The $125 example is not an approved default. Honor existing accepted agreements.
- Separate setup, recurring fees, expenses, and invoice installments. Stripe uses project-specific, one-time payments. Manual invoicing remains available. Production payment activation, OAuth beyond the read-only GSC and GA4 allowlist, external outreach, production deploys, and main merges require separate authorization.
- ATG Value Realization Framework uses period-specific baselines, projections, observed outcomes, and documented realized value. Each material KPI needs a source, method, owner, attribution assessment and dependencies. Comparisons need comparable data. Monthly reports require explicit review and publication.
- AI voice is an inbound pilot. Integrations and delivery capabilities are marketed as scoped services, with provider and risk gates checked before implementation.

## Execution order

| Priority | Workstreams | Acceptance |
|---|---|---|
| P0 baseline | W1–3 and W6 | Reproduce the repository build, test existing routes and data contracts, and isolate local validation from production providers. |
| P0 consulting and delivery | W8, W12–14, W16, W21–23 | Reuse the 12-service registry and existing quote flow. Verify revisioned client workspaces, proposal linkage and locks, scoped SLA and advisory review, and client-visible published evidence. |
| P0 acquisition | W4–5, W7, W9–10 | Verify intake and public service and industry entry points, internal prospect review, provenance, and safe attribution. Provider sourcing and first live outreach remain gated. |
| P1 ongoing delivery | W11, W15, W17–19, W22–24 | Review internal CRM/Docs, SEO monitoring and AEO evidence, recurring delivery and capacity. Prove separate data source boundaries and tenant isolation. |
| Release | W2–3, W6, W20 | Run repeatable security, migration, responsive and production-readiness checks. Require owner approval before production, live transactions, or notifications. |

Use the verification ledger at the end of this file for implementation status. A repository change alone does not establish acceptance.

## Verification ledger

“Verified locally” means the code passed the stated local tests. Stripe and Google provider fixtures verify request handling and data boundaries. Live provider acceptance requires separate staging evidence.

| Workstream | Verified in the branch | Remaining release work |
|---|---|---|
| W1 Plan and policy | PR #80 roadmap preserved. Latest transformation, commercial, pricing and evidence decisions reconcile here. | Reconcile any later owner-approved policy change before enabling its feature. |
| W2 Build and database | Workspace typechecks and production builds passed. The additive Prisma diff applied from main to a disposable PostgreSQL database, with zero remaining schema drift. | Confirm the deployed SHA and exact production schema. Review backup, provider-generated SQL and rollback before applying to production. |
| W3 Public and authenticated journeys | Public pages checked in Chromium at 390px and 1440px. Admin and client UI fixture journeys and PostgreSQL route tests exercise protected flows. | Verify staging Clerk sessions, actual booking and callback flow, notifications to the ATG inbox, approved legal copy and final live page performance. |
| W4 Site research | Explicit admin review, approved HTTPS source, robots restrictions, address validation and DNS pinning, bounded response, saved observations and a Denver-day limit of 20. Local test responses contain synthetic HTML. | Approve licensed candidate sourcing, terms, budget and target market inputs. Run a real research pilot only after approval. |
| W5 Prospect CRM and suppression | Existing Sheet/Gmail/Calendar review and internal draft paths retain their tests. New prospect invitation attribution binds the submitted intake. | Complete shared suppression and canonical Sheet/Postgres synchronization. Prepare the authorized lead cohort and verify duplicates across sources. |
| W6 Provider configuration | Production build and isolated verification used no production credentials. New provider flags default off. | Verify ATG connector identities, sender authentication, no-send controls, daily operational limits and a staging schedule. |
| W7 Sales collateral | Public service examples, existing growth workflow demonstration, value calculator and intake routes. [Sales launch kit drafts](atg-sales-launch-kit.md) cover one-page copy, the demonstration, discovery and proposal framing. | Review and produce the branded one-pager, interactive before/after example, sample proposal and approved founder portfolio presentation. |
| W8 Quote-to-delivery | Client-scoped estimate, append-only source and price review, stale source handling, copy into a balanced draft only, existing approval/acceptance behavior, and milestone assignment. | Complete a signed-in staging journey for website, automation and combined scopes. A dedicated workspace editor and history for readiness and opportunity scoring remain open. |
| W9 SEO/AEO diagnostic | Search service and industry pages, manual evidence-based SEO/AEO review, review signals, remediation evidence and the public value scenario. | Run a real ATG-owned diagnostic and decide if any public sample report needs publication. |
| W10 Attribution | Known public entry labels are stored on consented submissions. Private prospect invitations bind to a particular intake and reject replay against unrelated data. | Dashboard funnel conversion aggregates and cross-system campaign attribution. |
| W11 CRM | Existing reviewed connectors and bounded Sheet writeback preserved. | Stable cross-system prospect IDs, canonical synchronization, pagination and bulk retry evidence. |
| W12 Workflow catalog | 50 approved workflow sizing entries are versioned and linked to the internal estimate UI. Existing native recipe, template and Guided mappings remain. | Continue expanding unique, reviewed workflow specifications toward 100 and validate implementations per client. |
| W13 Engagement estimator | Setup and recurring workstreams, labor and direct costs, shared costs, reserves, fee overrides, contribution margin, terms and 12-month scenario. The $100 additional-work minimum is enforced server-side. | Recalibrate inputs with actual delivery hours and costs for the first engagements. |
| W14 Delivery milestones | Existing consultation actions are mapped to immutable accepted milestones, with deduplication, visibility, due dates, verification and private evidence. | Confirm a signed-in staging handoff for each delivery model and the specific client entitlements being sold. |
| W15 Docs export | Existing operator-only export gate and proposal document tests remain. | Verify actual ATG Workspace ownership, private folder and receipt of a synthetic export. |
| W16 One-time billing | Live and sandbox mode segregation, per-installment operator authorization, signed webhook verification, matching currency/amount/client, duplicate and refund reconciliation. Local tests used synthetic Stripe responses. | Run a separate Stripe sandbox end-to-end test and reconcile hosted receipts, refunds and accounting. Use manual invoicing until release approval. |
| W17 GSC/GA4 OAuth | Only approved scopes, PKCE/state and authenticated actor binding, token encryption, selected properties, disconnect and no token exposure. Provider-mocked PostgreSQL route tests. | Verify Google consent configuration, scope approval, consent screen, key custody, grants and revocation with opted-in test properties. |
| W18 Search monitoring | Selected-property snapshots, idempotent capture, source-separated evidence, freshness status, review signals and a protected, opt-in cron handler. | Verify the real provider schedule, quotas, denial handling, vendor key rotation, and first successful real data pull. Manual authorized exports are available. |
| W19 AEO | Manual sampling captures prompts, engines, dates, location context and citations. Reviewed snapshots can be published to clients. | Establish the actual monthly query sets and validate them against opted-in client properties. |
| W20 Controlled outbound | Existing draft and review controls preserved. No production send workflow was enabled or exercised. | Licensed sourcing, coordinated suppression, approved sender, legal/provider review, opt-out proof and owner release decision. |
| W21 Change orders | Versioned addenda, original scope preserved, additional-work rate floor, stale version rejection, authenticated client acceptance and immutable accepted copies. | Verify invoicing and contract administration with counsel-approved terms under a staging agreement. |
| W22 Ongoing service | Customized SLA with coverage, separate response and restoration targets, signed-document reference, reporting and fractional advisory roadmap, decisions and utilization. | Agree and verify actual incident timing and service availability commitments per customer. Incident timing is recorded through reviewed evidence rather than an automated SLA clock. Electronic signatures and automated service credits are outside this release. |
| W23 Value realization | Monthly projections, comparable period evidence, attribution confidence, recorded financial benefits and costs, calculated realized ROI and separately published customer reports. | Collect actual client baselines and use scoped data to validate outcomes. ATG-wide capacity, retention and win/cash dashboards remain open. |
| W24 Capacity and assignments | Engagement decision owners and milestones use existing operator/client roles. | Multi-consultant scheduling, capacity and permission review remain deferred until additional staffing is warranted. |

## Recorded local checks

- Frozen dependency install with pnpm 10.33.0, workspace typecheck, and full production builds passed.
- The API suite ran with `ATG_INTEGRATION_DATABASE_URL` limited to a disposable PostgreSQL instance. **273 passed, zero failed, zero skipped.** Stripe and Google responses were simulated.
- The SQL diff from main `bf18a28` added six tables, columns on four existing tables, and supporting indexes and foreign keys. It contained no drops. Prisma reported no schema difference after applying it to the isolated database.
- Playwright verified the public homepage, fractional leadership page, industry SEO and website pages, calculator, assessment CTA, and unauthenticated intake fallback at 390px and 1440px. Crawlers received complete initial HTML for the verified landing pages. The signed-in browser fixture exercised the admin and client shells with intercepted responses.
- The production dependency audit found zero advisories after patching Zod, Express's body-parser and qs dependencies and updating the SDK used for the existing Grok client. The full build remains above Vite's initial bundle size warning threshold.

## Release requirements

1. Prepare a staging database and capture a verified backup. Compare the deployed release SHA and schema with the migration source. Review additive SQL for the workspace history, Search Console and GA4 connections, prospect records, installment fields, prospect attribution and delivery action updates. The repository uses the established Replit development and publish schema flow and has no historical Prisma migration chain. Follow [database recovery and release guidance](operations-launch.md).
2. Install with the declared pnpm version. On staging, generate Prisma and run the full suite against an isolated PostgreSQL schema. Use disposable accounts to verify Clerk login, admin and client roles, publication, acceptance and the assessment-to-delivery handoff.
3. Verify site identity, tracking consent, intake responses and the ATG booking/callback path from the staged artifact. Use reviewed fixtures and avoid production data. Verify canonical tags, sitemap and 404 handling on the actual hosting layer.
4. Keep standard billing disabled. Verify the sandbox project-specific Checkout and signed webhooks in a separate database, including a receipt, duplicate event, refund and restart/retry. Only after authorization, configure the live signing secret and test operational readiness before individually enabling an agreed installment. The manual invoice path is the default.
5. Enable only read-only Search Console and GA4 using a dedicated Google OAuth configuration and consent. Review redirect and account ownership, scope approval and token encryption key storage. Confirm opt-in property access and disconnect with an ATG-owned test property before enabling the separately gated scheduled job.
6. Leave sourcing automation, research quotas, live communications and production changes gated until authorized. Require a reviewed cohort, verified sender, opt-out and duplicate/reply controls, and a working conversion funnel before contacting prospects.
7. Obtain explicit approval to merge and separately approve the production deployment and any provider activation. Stage changes to permissions, environment and billing independently when possible.
