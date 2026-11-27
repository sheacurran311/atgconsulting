# ATG Consulting | R3 product implementation and QA handoff

November 27, 2026 · America/Denver

## Executive status

**The full R3 product mandate remains open.** The implementation adds open-incident SLA timing, financial source deduplication across client engagements, private source value and unit capture in estimates, month selection for approved client reports, searchable specifications, paged Gmail review, versioned AEO samples, and a public interactive inquiry demo. Each change uses the existing app and service policies.

The largest unfinished product work is stable opportunity, SOW and implementation linkage, granular KPI observations and forecasts versus actuals, accounting and CRM reconciliation, managed workflow delivery, advisory time and founder capacity accounting, and expansion from 12 detailed workflow specifications. The product gaps in the matrix are engineering work. None was deferred by the owner. Staging, vendor acceptance, and release approvals are separate dependencies.

## Repository and traceability

- Repository `sheacurran311/atgconsulting`, branch `feat/ai-transformation-phase-1`, [draft PR #81](https://github.com/sheacurran311/atgconsulting/pull/81).
- Starting head `430725b426b5fceef9c2e739a5ea7ea542ddd60f`. The coordination commit added only the mandate relative to the prior audited implementation.
- Main baseline `bf18a28e24d9041c80b26c3b15e2b8cc2840e138`. Prior audited feature head `3e66137a5d9399420c319ffa4c1a3041640ace96`.
- Application/test evidence head `d271142a9f09dd25645f57e23c95bbfd029cd5b3`. The final documentation commit atop this SHA adds this file and ledger references. Its own Git SHA is resolved from the file history. Seven engineering commits changed 19 files before the handoff commit.
- [GitHub Actions on the application/test head](https://github.com/sheacurran311/atgconsulting/actions/runs/46069537017). The handoff commit adds documentation only.

| Commit | Implementation |
|---|---|
| `e65d27f3db20617ec14d0afd634aff9df8b7dcd5` | SLA covered time and reviewed incident state. |
| `eb8ac9a7793c18210cae90f476b10853abf9b7f3` | Client-wide financial evidence source deduplication and source account input. |
| `280bdb020352b972471a89e9d3020dcae095973f` | Catalog search and service filters. |
| `5cbd68c94ffa8aa90e2c4012c9360e6127182406` | Gmail metadata pagination and incomplete coverage hold. |
| `26e4f573a39d124c45c4a34a7736789406e32256` | Repeat AEO sampling and interactive public demo/portfolio. |
| `31f7ccbfa94cc2c04cd18375649c58d3fc6eb25f` | API regressions and responsive browser interaction. |
| `d271142a9f09dd25645f57e23c95bbfd029cd5b3` | Estimate source value/unit capture and report month filter. |

## Acceptance, UI and prior-plan crosswalk

In the table, API files live under `artifacts/api-server/src` and React components under `artifacts/atg-consulting/src`. The [mandate](ATG_R3_FINAL_PRODUCT_COMPLETION_MANDATE.md) specifies acceptance detail and earlier sections. The [canonical reconciliation](../ATG_IMPLEMENTATION_RECONCILIATION.md) retains individual W1–W24 history.

| R3 | Earlier scope | Status and engineering evidence | Exact open acceptance |
|---|---|---|---|
| 01 | W8, W13–14; 7–10, 27 | Existing platform carried forward. `routes/engagementWorkspace.ts`, admin client workspace and client Reports retain existing versioned readiness and opportunity behavior. | Link stable opportunity/catalog/estimate/milestone/measurement IDs, build complete source history and reassessment scheduling, and exercise all four representative journeys. |
| 02 | W13, W21–22; 10–12 | Locally verified in part. `lib/engagementWorkspace.ts` and `EngagementEstimateEditor.tsx` store optional operator-entered original value and units and render them beside the current value. Existing estimate source locks and rate policy remain. | Authoritative source import/comparison beyond annotations, refreshed conflicts, standalone SOW lifecycle, exact signed file custody, and comprehensive agreement document validation. |
| 03 | W23; 14–23 | Locally verified in part. `EngagementReports.tsx` filters monthly approved records. Existing 26 KPIs and deterministic scenario math preserved. | Stable observations tied to exact accepted plan, KPI and implementation IDs, full evidence normalization, baseline and scenario variance charts and workstream drill-down. |
| 04 | W16, W23–24; 19–21, 50–52 | Locally verified in part. `lib/financialBenefitLedger.ts`, workspace publish route, financial editor, client finance summary. Client-wide duplicate check and account namespace tests. | Reconcile invoices, receipts, refunds, actual time and expense sources, coverage, reversals and cash/accrual reconciliation. Full cross-engagement publication regression and inclusion-history UI remain open. |
| 05 | W22–23; 13, 23 | Locally verified in part. `lib/slaClock.ts`, reviewed incident publication and client Reports. Existing DST, paused time and holiday tests plus >90-day open elapsed/deadline regression. | Future deadline forecasting, severity changes, exception workflow, open incident dashboard and full reporting coverage. Existing nine-section print remains available. |
| 06 | W12; 26 | Implemented in part. `WorkflowSpecifications.tsx` shows ID/version/status and supports text/industry/sizing search and service filter. Existing catalog integrity test passes. | Add distinct reviewed specifications toward approximately 100 and link selection to downstream work. Catalog remains at 12 detailed specifications and 50 sizing references. |
| 07 | W14, W22; 24–29 | Existing delivery, guide authorization and publication checks carried forward. | Complete service playbooks, alternative activation audit, revocation flags and source-linked health, remediation and offboarding. |
| 08 | W22; 28 | Existing fractional advisory workspace carried forward. | Link roadmap, decisions, spend and oversight to objectives; collect time by approval state; expose renewals, offboarding and executive scorecards. |
| 09 | W10, W24; 50–52 | Existing `ownerMetrics.ts` and Admin Today snapshot carried forward. | Reconciled financial stages and actual delivery costs, historical period filters and drilldowns, time/capacity calendar, renewal and authorized benchmark data. Multi-consultant staffing remains conditional on staffing. |
| 10 | W4–5, W11, W20; 33–38 | Locally verified in part. `lib/prospectGmail.ts` and `pages/admin/prospecting.tsx` paginate up to three pages and hold follow-up when truncated or failed. New regression checks a reply in the fourth thread. | Complete Sheet pagination, canonical cross-system IDs and bidirectional sync with recovery and audit events, per-campaign message identity, positive reply review and live provider acceptance. |
| 11 | W7, W10, W20; 38–39 | Existing current-stage snapshot and private intake attribution carried forward. Five existing reviewed candidates remain unsent. | Event-based funnel through positive replies, consults, wins, cash, and renewals with cohort denominators and drilldowns. Candidate volume remained secondary to engineering. |
| 12 | W9, W17–19; 30–32 | Locally verified in part. `lib/seoEvidence.ts`, client-scoped SEO publication, admin SEO editor, and published client repeat-query history. Different model or scope requires a new query version. | A separately selectable query set, measurement plan linkage, and staged acceptance of actual consent, snapshots, disconnect, connector permissions, rate limits and diagnostic UX. |
| 13 | W3, W7, W9; 40–49 | Locally verified in part. Homepage `WorkflowDemonstration.tsx` and text-only founder portfolio. Browser interaction backs the demo. Existing collateral and the 31 prerendered service/industry routes remain. | More detailed SEO/AEO simulation, complete standalone educational guides, fuller marketing accessibility/screenshots and remaining initial bundle warning. |
| 14 | All; 40, 54 | Locally verified in part. Browser regressions at 390/768/1440 exercise existing authenticated fixtures and public demo flows. | Remaining workstream UI acceptance in this table, screen-by-screen privacy coverage and real authenticated tests. |
| 15 | W2–3, W6; 53–62 | Locally verified in part; see recorded test evidence below and linked workflow. | Real four-journey staging, provider acceptance, exact production db verification and restored backup drill. |
| 16 | W1–24; 65–66 | Handoff and execution ledger committed to draft PR. | Independent audit of the open items. |

## Backend changes, rules and compatibility

- SLA timing version 2 adds explicit `asOf`, elapsed covered minutes, review completeness, target crossing and separate response/restoration status. It groups adjacent working intervals and scans by hour, checking for local discontinuities before falling back to minute processing. It clips to the cutoff and excludes holidays and approved pauses. Histories beyond ten years are reported as incomplete. Deadlines are calculated when the review interval reaches a target. Existing version-1 publications retain their saved JSON. An unreviewed future deadline is not inferred.
- The financial publication guard looks for posted financial and legacy report evidence across workspaces scoped to one client. The existing client lock orders publication. Named accounts match by source system, account and normalized record; legacy records without account IDs reserve their raw references conservatively. Corrections in the same workspace and record key remain possible. Client financial summaries display the cash-basis result on posted records and warn that complete coverage has not been established.
- Estimate raw values and units are optional private annotations. They do not change chosen prices, quote installments, client wage assumptions, or accepted releases. The $100/hour authorized-change floor, ad-hoc Stripe and manual invoicing policies were preserved.
- AEO samples accept optional query reference and version with limitations. Publishing an existing identifier/version with a changed question, platform, model or location is a conflict. Historic samples retain compatibility. The client view groups only reviewed observations in its own workspace and leaves Search Console and GA4 source views separate.
- Gmail provider reads stay metadata only. Reconciliation requires a SENT label and excludes DRAFT; direct evidence checks filter at the nominated timestamp. A Gmail send is evidence of sending. Actual delivery confirmation and campaign identity matching remain open. A bounded search error or unfinished final page yields a hold state.
- No R3 Prisma model or column changes. New fields use existing JSON revisions. The additive branch replay from main used a fresh disposable schema and reported zero Prisma drift. The generated SQL contained additions and foreign keys, with no DROP or TRUNCATE. Preserve historical rows and follow [operations rollback guidance](../operations-launch.md) before any separately approved schema operation.

## Verification

- Runtime Node 24.22.3, pnpm 10.33.0, Prisma 5.22.0, PostgreSQL 17.12 disposable only. Local Chromium 158.0.8127.0.
- `corepack pnpm install --frozen-lockfile` and `corepack pnpm --filter @workspace/api-server exec prisma generate` succeeded.
- `PORT=4511 BASE_PATH=/ corepack pnpm run build` runs workspace typecheck and build. The initial frontend JS remains about 608 kB, 187 kB gzip, with Vite's size warning.
- `ATG_INTEGRATION_DATABASE_URL=<disposable DB> corepack pnpm --filter @workspace/api-server test`: **285 passed, zero failures, zero skips** on the R3 engineering run.
- `corepack pnpm --filter @workspace/scripts run test:engagement-ui` passed with fixture auth/API and actual UI interactions at 390px, 768px and 1440px. Browser results include choosing After, approving follow-up and routing an urgent sample. Set `ATG_QA_SCREENSHOTS` to an existing output directory for `workflow-demo-390.png`, `workflow-demo-768.png`, and `workflow-demo-1440.png`.
- `corepack pnpm --filter @workspace/scripts run test:marketing-ui` passed 23 transformation and eight website-design routes at the same three widths with JavaScript disabled. Checked metadata, sitemap, CTA path, structured data, route-family 404s, keyboard focus and overflow.
- `corepack pnpm audit --prod` reported no known vulnerabilities.
- PostgreSQL replay used `prisma db push --skip-generate --schema <main-schema>`, `prisma migrate diff --from-schema-datamodel <main-schema> --to-schema-datamodel prisma/schema.prisma --script`, `prisma db execute`, then `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code`. This run did not prove a production backup or migration.

## Release, owner and environment gates

- Continue feature development against the exact open items above. Ordinary unfinished engineering is recorded in the table. No keys or owner decisions are required to implement those items.
- For staging acceptance, use a dedicated staging URL, disposable Clerk operator/client accounts and data, test recipient, and approved booking callback. Validate actual admin, client and public paths.
- Stripe needs an authorized test account and webhook secret plus receipt, duplicate event, refund and retry evidence. Manual invoice remains the fallback. Google needs a staging OAuth client and approved GSC/GA4 properties plus independent Workspace connector access for the named ATG account. Manual reviewed exports remain available.
- Real signed agreements require counsel-reviewed terms, authorized signers, and protected signed file storage before validating receipt and retention. The existing reviewed references and printed draft support manual handling.
- Keep draft PR #81 open. No main merge, PR #80 change, production deploy or production data changes, live billing, expanded customer OAuth, live customer notifications or outreach occurred. Provider and outreach release require separate owner approval.
