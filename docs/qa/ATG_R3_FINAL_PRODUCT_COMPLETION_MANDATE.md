# ATG Consulting | Final Product Completion Mandate (Round 3)

**Owner direction, November 27, 2026:** Prioritize completing the entire product and service suite, admin and client dashboards, and public marketing experiences before next week's outreach. Do not substitute launch preparation, a smaller pilot, or another planning exercise for remaining engineering work. This mandate supplements, not replaces, the previous 66-section final implementation prompt and all approved master-plan requirements.

## 1. Starting point and change control

Repository: sheacurran311/atgconsulting
Branch: feat/ai-transformation-phase-1
PR: #81 (open draft)
Audited baseline: 3e66137a5d9399420c319ffa4c1a3041640ace96
Main at audit: bf18a28e24d9041c80b26c3b15e2b8cc2840e138
Previous QA baseline: 461a87459b5b77fb3eaf29adb12d19a3387af758
Historical CI: https://github.com/sheacurran311/atgconsulting/actions/runs/45948640823

Read docs/ATG_IMPLEMENTATION_RECONCILIATION.md, docs/COMMERCIAL_LAUNCH_MASTER_PLAN_V4.md, docs/master-plan-v4-ai-transformation.md, docs/MASTER_IMPLEMENTATION_PLAN.md, docs/ATG_INTERNAL_WORKFLOW_CATALOG_AND_PRICING.md, HANDOFF.md, docs/operations-launch.md, docs/templates/service-level-agreement.md, docs/atg-sales-launch-kit.md and existing collateral. Review the final agent's ATG_Consulting_Final_Implementation_QA_Handoff.md (Library share libfile_30cd90451b8c8191b75f78457470f1f7) if available. Compare live branch against the audited baseline; preserve concurrent changes. PR #80 is an older documentation PR: reconcile unique requirements into #81, do not merge or close it without owner approval.

At audit, #81 had 40 commits and 118 changed files, seven commits and 61 files since the prior QA baseline, was mergeable, and CI succeeded. Prior agent reported 281 API tests passing, zero failures/skips, 31 marketing routes at three widths, and authenticated browser fixtures. These are historical baselines, not current acceptance evidence. Existing implementations are substantial: reuse them. Inspect before editing.

Create a tracked execution ledger with IDs R3-01 through R3-16 below, mapping each to W1-W24 and previous mandate sections. Record starting status, exact acceptance tests, source paths, UI surfaces, commits, results and blockers. Update after each logical commit. Keep all earlier requirements visible; never silently downgrade or defer them. Execute all independent engineering work before requesting external credentials. Do not stop after a single batch or merely write a new plan.

## 2. Non-negotiable policies

Retain Free Tools (including personal), Guided, DIFY (Done-It-For-You), and bespoke fractional AI leadership. Preserve all 12 services and five divisions, the short adaptive public intake and deeper consultant discovery. ATG is an AI transformation partner, not a generic web agency. All project and recurring pricing is individually negotiated; $35/h was a client ROI example, not ATG labor or billable cost. Internal labor cost is editable; additional authorized out-of-scope work on new engagements is at least $100/h server-side; higher rates are negotiable, $125 is not a mandated default. Preserve accepted agreements, prior written change authorization, manual invoicing, ad-hoc Stripe installments only, no fixed subscriptions or automatic charges. Customer OAuth remains limited to read-only GSC/GA4; ATG-owned Google connectors are separate. Voice AI remains inbound-pilot gated. No unsupported integration or guaranteed outcome claims. Reuse React/Vite/Wouter, Express, Prisma/Postgres, Clerk, existing AI and Replit architecture. No unnecessary new systems, local SSH disruption or .replit edits.

## 3. Engineering batches and acceptance criteria

### Batch A: Core engagement and measurement completeness

### R3-01 | P0 | Structured opportunity-to-delivery linkage (W8, W13, W14; prior 7-10, 27)
- Finish readiness/opportunity review-source history, evidence and reassessments (30/90/180 days as appropriate). Preserve six readiness dimensions, unknown != zero, approved 30/25/20/15/10 opportunity weights and governance override.
- Link stable opportunity/revision, workflow catalog ID/version, estimate workstream, accepted proposal milestone, implementation and measurement plan entries. Avoid free-text labels as identity. Support multiple opportunities and scope changes, and explicit consultant adjustments with reasons.
- Complete service-specific secondary discovery for all 12 services, including actual volumes, costs, process owners, access, data handling, success criteria and dependencies. Preserve 8-11 relevant public intake questions and existing personal paths.
- Admin UI: evidence history, linked source selectors, recommendation review, estimate and delivery handoff. Client UI: approved readiness summary, agreed scope and progress only.
- Acceptance: website, automation, combined and fractional synthetic journeys; stale references rejected, accepted versions immutable, no cross-tenant access, no restricted implementation based solely on a score.

### R3-02 | P0 | Pricing and contractual completeness (W13, W21, W22; prior 10-12)
- Complete field-level pricing provenance: original raw source value, units, source/revision/timestamp, imported vs manual vs AI suggestion, explicit conflict comparison and refresh. Do not overwrite manual choices. Preserve reviewed quote transfer and balanced installments.
- Support bespoke project, recurring and combined terms beyond 12 months where appropriate; distinguish contracted term from 12-month forecast; separate optional pass-throughs, shared expenses, actual costs and labor.
- Complete separately versioned SOW lifecycle (draft, review, approval, external execution reference, amendment), exact links to proposal, estimate, SLA, measurement plan, change orders and milestone snapshot. Retain immutable original acceptance; later execution is a new binding event.
- Add printable/exportable customized SOW and SLA documents and protected signed-document custody/reference retrieval with ownership, exact version and digest, access checks and retention. External signatures acceptable; do not invent signatures or require a new paid provider.
- Validate matching commercial terms, rates, coverage and included hours across related agreements; new changes require documented consent. Keep internal pricing private.
- Acceptance: complete admin and client agreement UI, stale/locked revisions tested, $100/h floor enforced on applicable paths, legacy accepted records remain valid; no billing activation.

### R3-03 | P0 | Complete Value Realization Framework (W23; prior 14-23)
- Preserve the 26-KPI registry across all 12 services; expand useful definitions where necessary (e.g., cost per task, conversion, error, adoption, spend and uptime). Stable version, formula, denominator, evidence source and limitations.
- Link each observation to exact accepted measurement-plan revision, KPI ID and stable workstream/implementation ID; track original baseline, subsequent baseline amendments, target and conservative/expected/optimistic forecasts without rewriting accepted history.
- Capture period boundaries, sample size, comparable workload, denominator, normalization, owner, evidence class, capture/review dates, attribution methodology/confidence, changes in scope and limitations. Support unknown and zero distinctly; allow valid negative operational change and missing-data states.
- Produce implementation-level, engagement-level and monthly variance, including target vs measured, baseline vs current, forecast vs actual, and readiness history. Do not force comparability where evidence is inadequate.
- Preserve deterministic scenario math, capacity separate from actual cash savings, ramp-up and client-specific costs. Validate bounds, monetary arithmetic, zero/negative returns and scenario ordering or explicitly label nonordered assumptions. Do not use revenue as profit or estimates as proof.
- Admin UI: measurement plans, evidence review, observations, forecast inputs and comparisons. Client UI: interactive approved outcome dashboard, workstream drilldowns, period filters, trend charts, clear evidence status and incomplete coverage; no private notes or fabricated results.
- Acceptance: original accepted forecasts remain reproducible after revisions; monthly report references exact approved sources; normalized comparisons and incomplete evidence cases tested; screenshots and browser flows.

### R3-04 | P0 | Financial ledger and actual accounting coverage (W23, W24, W16; prior 19-21, 50-52)
- Extend existing financialBenefitLedger.ts and revision architecture. Add stable source-system/account/record identity, financial event/period, attribution evidence, reviewed inclusion history, explicit corrections and reversals; prevent duplicate benefits and costs across reports, periods and linked workstreams/engagements where the same economic event applies.
- Reconcile paid ATG fees, manual receipts, Stripe receipts, refunds, invoice balances, accrued/contracted fees, incremental expenses and attributable net financial benefits. Avoid overlap between legacy records and new ledger. Do not add payment-provider scopes or assume a financial connector.
- Use reviewed manual accounting records/imports if necessary; show unmatched/duplicate/conflicting records and coverage gaps. Keep cash and accrual views distinct. ROI denominator includes all applicable investment costs on the stated basis, without double counting. Unknown/incomplete coverage must not look like complete verified ROI.
- Client UI: cumulative/monthly financial ROI, investment, benefit, cost and coverage; operational capacity separate; no internal ATG profitability. Admin UI: source reconciliation, corrections, actual delivery cost, margins, report inclusion history.
- Acceptance: tests for cross-period and cross-workstream duplicates, source namespace collisions, partial coverage, negative adjustments, zero investment, refunds, reconciliation and tenant isolation.

### R3-05 | P0 | Monthly reporting and SLA performance (W22, W23; prior 13, 23)
- Extend existing SLA clock to calculate active incident elapsed covered time, deadlines and breaches as of an explicit timestamp, including no-response/no-restoration cases. Support long-running incidents beyond 90 days without unbounded computation. Respect exact executed version, timezone/DST, holidays, overnight intervals, authorized pauses, severity changes, exceptions, dependency delays and distinct acknowledgment/response/restoration/resolution.
- Add incident review/exception workflow and dashboard: open/overdue incidents, historical compliance, denominators and missing data; no automatic service credits or penalties.
- Complete nine-section monthly Value Realization Report: executive summary, economics, KPI scorecard, implementation activity, operational health, SLA, roadmap, next recommendations, evidence/methodology. Freeze exact reviewed source revisions and reporting coverage; corrections append versions. Print/export approved reports with consistent branding and client-safe content.
- Acceptance: deterministic SLA tests including open incidents and long intervals, report revisions and cross-tenant print access; admin/client UI with filters and useful empty/error states.

### Batch B: Service delivery and complete operational dashboards

### R3-06 | P0 | Workflow implementation catalog (W12; prior 26)
- Current baseline is 50 sizing references and only 12 detailed specifications. Target approximately 100 unique detailed specifications, not 100 sizing-only rows or deployed integrations. Aim for 100 distinct reviewed specifications in this batch, with justified gaps only.
- Inventory existing recipes, templates, Guided modules and sizing IDs; reuse stable IDs or explicit mappings, avoid duplicates. Cover all 12 services, personal resources where applicable, common SMB industries, and website, sales, automation, knowledge, governance, training, monitoring and advisory work.
- Each spec: stable ID/version, service/industry, objective, trigger, inputs/outputs, steps, integration dependencies, permissions, human approvals, effort/support, third-party costs, exceptions/retries/idempotency, acceptance criteria, test cases, rollback, documentation/training, monitoring and KPI links.
- Admin catalog searchable/filterable by service, industry, difficulty and readiness; inspect spec, select into opportunity/estimate/delivery without duplicate systems. Distinguish sizing, specification, validated template, installed and production-tested states. Applicable client-approved implementation briefs only.
- Acceptance: automated uniqueness, completeness, referential integrity, service coverage and representative workflow selection tests; record exact detailed count and any unvalidated integrations. Do not pad with trivial variants.

### R3-07 | P0 | Guided, DIFY, governance and managed implementation (W14, W22; prior 24-29)
- Complete service-specific playbooks with kickoff, dependencies, ownership, approved access, testing, acceptance, training, documentation, handoff and support. Reuse existing action items and milestones.
- Audit all activation/publication/mutation endpoints, not just operating plan save/publish. Prevent identity removal/rename bypass, stale context, unauthorized alternative pathways, and cross-tenant/impersonation access. Use trusted server-side service identity and current authorization, locking/revision checks. Revocation must block subsequent activation and flag already-active records for safe remediation; do not claim external systems were disabled unless verified.
- Implement managed monitoring with source-linked workflow health, last success, failure/exception events, operating cost, incidents, remediation proposal/approval, audit history and offboarding. Manual reviewed telemetry supported; real provider integrations only when authorized.
- Voice AI remains inbound pilot only. Do not mark production integration as validated without evidence.
- Acceptance: admin workflow health/remediation UI, client approved status and action dependencies, full governance bypass/revocation tests, representative synthetic implementation lifecycle.

### R3-08 | P0 | Fractional AI leadership and recurring engagements (W22; prior 28)
- Connect roadmap, executive advisory meetings, decisions, vendor inventory/spend, opportunity backlog, governance, training and implementation oversight to specific objectives, KPI/measurement plan entries and outcome evidence.
- Track included, used, pending and approved additional advisory/support hours, time records, review dates, recurring obligations, renewals and offboarding. No automatic overage or billing.
- Admin portfolio view and client strategic roadmap/executive scorecard; monthly report incorporates accepted decisions, outcomes, risks and next actions, not just hours.
- Acceptance: actual vs allocated hours, linked roadmap outcomes, versioned reviews, owner-approved changes and tenant privacy.

### R3-09 | P0 | Founder operating dashboard and capacity (W10, W24; prior 50-52)
- Complete source-reconciled pipeline, forecast/contracted/invoiced/collected revenue, outstanding invoices, refunds, recurring commitments, actual time and costs, estimated vs actual effort, project/monthly contribution margin, support/advisory allocation, upcoming milestones/SLA, renewals and retention.
- Build practical founder capacity calendar/scenario by period: implementation, meetings, sales, admin, advisory, monitoring, support and incident reserve; detect overcommitment. Use actual records where available; clearly label estimates and coverage.
- Support internal benchmarking foundations with authorized de-identified aggregates and sample-size disclosure, not invented averages. Multi-consultant staffing remains conditional on actual staffing; document this as existing conditional scope.
- Acceptance: working admin dashboard with period filters, drilldowns, source and missing-data labels; financial totals reconcile without overlapping legacy/provider records.

### Batch C: Acquisition infrastructure (build now; no outreach)

### R3-10 | P0 | CRM and suppression reconciliation (W4, W5, W11, W20; prior 33-38)
- Approved source: public official business websites, public business contact info, verifiable observations. No paid database prerequisite. Preserve HTTPS/SSRF/DNS/robots/terms/bounded fetch safeguards and human review.
- Finish stable cross-system prospect identity, shared durable suppression by email/domain, full bounded pagination of Sheet and Gmail, idempotent bidirectional synchronization between Sheet and Postgres, conflict detection, partial-write recovery, retry checkpoints and audit event history. Postgres canonical target; Sheet temporary pilot ledger where required.
- Gmail currently limits to three threads per contact: implement complete paginated reconciliation or explicitly mark incomplete search and fail closed for follow-up. Distinguish SENT from draft and sent from delivered; no claim of delivery merely from Gmail SENT. Verify actual approved mailbox, recipient, campaign/message identity and timestamps. Positive replies require reviewed classification, no unapproved body storage.
- Suppression survives reruns/imports, replies pause follow-up, opt-outs always block. Sheet has no atomic CAS: document and test concurrent/partial-write strategy with single-operator fallback. Do not send real messages or alter live Sheet during QA.
- Admin UI: source evidence, qualification rubric, sync health, conflicts, suppression, reply status, review queue and next actions. Preserve no-send gates.
- Acceptance: synthetic tests for >500 rows, >3 threads, paging errors, duplicate IDs, cross-source opt-out, partial failures, reruns, old message mismatch and unauthorized actions. Real connector acceptance remains separately gated.

### R3-11 | P0 | Acquisition funnel and cohort reporting (W7, W10, W20; prior 38-39)
- Implement actual event-based funnel from research/qualification/suppression through reviewed drafts, confirmed sent, replies, positive replies, booked/held consults, completed assessments, proposals, wins/losses, cash and recurring engagements.
- Stable prospect-to-intake attribution, cohort/period filters, denominators, deduplicated events, unknown stage handling and reconciliation. Do not count draft approval as send.
- Admin dashboard with drilldowns, trends, exceptions and conversion rates; private identifiers never leak into public analytics.
- Prepare research/draft workflow and optionally expand the existing five reviewed candidates toward 50 qualified and 25 reviewed, respecting existing quotas and source rules; do not prioritize cohort volume over building. No live sending, no autonomous outreach, no fabricated contacts. Record unsent status and exact review needs.
- Acceptance: end-to-end synthetic event pipeline, attribution isolation, suppression and funnel arithmetic.

### Batch D: Public experience and SEO

### R3-12 | P0 | SEO/AEO product completion (W9, W17-W19; prior 30-32)
- Extend manual AEO evidence to versioned query sets, repeat comparisons, platform/model/date/location/citation context and limitations. Separate GSC clicks/impressions from GA4 sessions/key events. Integrate authorized snapshots and manual evidence with Value Measurement Plans and client reporting.
- Admin and client interfaces for property selection, freshness, diagnostics, comparison, review and disconnect. Validate token privacy, scope allowlist, scheduled handler protection, failures/retries, quotas and isolation. Existing provider flags default off.
- Real Google consent/property/revocation and ATG Gmail/Sheets/Calendar/Drive/Docs identity/export require authorized staging; implement all independent product work and mocked tests now, list precise credentials needed later.
- Acceptance: repeat-query history, comparable periods, source-specific reporting and provider boundary tests. No ranking/citation guarantees.

### R3-13 | P0 | Marketing, portfolio and interactive education (W3, W7, W9; prior 40-49)
- Review homepage, all 12 service pages, eight industry SEO/AEO pages, eight website-design pages and three overview routes; include other existing applicable routes, FAQ, pricing and intake. Preserve all services, personal resources, free assessment and custom commercial messaging.
- Build actual interactive before/after demonstration showing a business process (e.g., inquiry -> qualification -> approved follow-up -> measurement) and SEO/AEO inbound acquisition; clearly label illustrative results. Enhance purposeful scroll-based animation, responsive layout, reduced motion and accessibility.
- Build founder portfolio with Fandomly, TruDeF.AI and AgentBets.gg accurately described as founder projects; use actual authorized screenshots/assets only, otherwise use factual text or clearly labeled illustrations. No fabricated customers, testimonials, results or logos.
- Complete educational funnel with practical readiness, automation, ROI, SEO/AEO and SMB implementation guides linked to service-specific assessment. Add appropriate public value framework content on scenario forecasts, evidence and capacity vs cash.
- Finish branded usable sales collateral: one-pager, service/value/fractional overviews, sample assessment, SEO/AEO report, monthly value report, proposal/SOW/SLA, workflow and before/after examples, discovery/outreach resources. Reuse six-page HTML packet, provide print-ready versions and PDF where environment supports it. Label all hypothetical data.
- Verify unique metadata, canonical/OG URLs, sitemap, structured data, 404, internal links, CTA routing, crawlability without JS, accessibility and mobile/tablet/desktop. Review visual design with screenshots, not only DOM assertions. Investigate remaining 603 kB initial JS warning without breaking SEO.
- Acceptance: functioning public features and content, no orphaned routes, all 31 marketing routes plus relevant extras checked, clickable assets and accurate claims.

### Batch E: Integration, QA and traceability

### R3-14 | P0 | Complete UI and data privacy matrix (all workstreams; prior 40, 54)
- For every capability above map backend endpoint -> admin route/component -> client approved view where applicable -> public marketing explanation where appropriate. No backend-only deliverables requiring operator interaction; no isolated demo masquerading as a working interface.
- Reuse design system and navigation; accessible forms, keyboard/focus, validation, loading/empty/error/conflict states, mobile overflow, confirmation, permission checks. Internal estimates, margins, raw source IDs, secrets and unpublished notes never leak.
- Audit existing legacy routes and preserve Free Tools, personal and previously accepted client workflows. Verify no regressions in entitlement, pricing or auth.
- Acceptance: matrix of all feature paths, real browser screenshots and interaction results at 390/768/1440px; label fixtures distinctly.

### R3-15 | P0 | Regression, database and CI verification (W2, W3, W6; prior 53-62)
- Reproduce baseline, add focused tests for every new requirement, including financial/contract integrity, SLA open timing, governance revocation, CRM pagination/conflicts, workflow catalog completeness, reporting, UI and tenant isolation. Do not remove failing tests to obtain green CI.
- Use declared pnpm, disposable PostgreSQL, no production secrets/data. Run frozen install, Prisma generate, typecheck, build, full API suite, engagement UI, marketing UI and production audit. Existing .github/workflows/verify.yml should continue passing for final HEAD. Verify main-to-feature additive schema replay and existing data compatibility, not merely fresh db push.
- Review migration SQL, indexes/constraints, backups and rollback, preserve historical records. Report actual test counts, skips/failures and CI links. Run representative website/automation/combined/fractional journeys and regression against prior baseline. Verify actual frontend interactions, not only intercepted API response shapes.
- Real staging Clerk, booking/callback/notifications, Stripe sandbox checkout/receipt/refund/retry, GSC/GA4 real test properties, ATG-owned connectors and signed-document custody require separate authorized environment acceptance. Do not let unavailable credentials block unrelated engineering; document exact prerequisites and safe fallbacks.
- Acceptance: green reproducible CI at final SHA, test inventory and logs, no unaddressed critical regressions; clearly distinguish local, fixture, mocked and real-provider evidence.

### R3-16 | P0 | Canonical ledger and final handoff (W1-W24; prior 65-66)
- Update docs/ATG_IMPLEMENTATION_RECONCILIATION.md and applicable master plan, HANDOFF and release guidance. Preserve historical decisions, supersede stale conflicts. Include this mandate and map all R3 IDs to previous 66-section mandate and 24 workstreams.
- Use explicit statuses: not started, implemented, locally verified, CI verified, staging verified, production verified, blocked, owner-approved deferred. Partial is not complete; do not invent percentage completion. Record actual counts (specifications, KPIs, routes, tests, prospects) and coverage.
- Commit logical batches to existing feature branch, update draft PR #81 summary; do not merge. Record each agent's starting/final SHA, commits and exact delta. Include paths and reproducible evidence for every acceptance criterion.

## 4. Execution order and stop conditions

Execute A, B, C, D, E; parallelize independent work only where safe. Prioritize product/UI completion over sender setup or preparing live outreach. No outreach until next week and only after explicit release approval. Do not convert the target date into permission to defer product work. If a specific external dependency is unavailable, finish mock/manual fallback and every independent task, then document the actual blocker. Do not halt for generic planning, redundant confirmation or a successful intermediate batch.

No merge into main, closure of PR #80, production deployment, production database changes, live Stripe charges/subscriptions, actual customer notifications, live outreach, unapproved cron jobs, external document sharing or expanded OAuth permissions. Do not collect restricted information or claim customer integrations are live. Do not change accepted agreements. No new paid services without approval.

## 5. Required deliverables for independent coordination QA

Commit a new Markdown report at docs/qa/ATG_R3_FINAL_COMPLETION_HANDOFF.md and provide an identical shareable Markdown copy. Include:

1. Executive summary with explicit full-suite status and every residual product gap, distinct from staging/provider/release gates.
2. Repository, branch, PR, starting SHA, final SHA, main SHA, commit list, changed files and CI link; verify remote head matches report.
3. R3-01..R3-16 acceptance matrix, W1-W24 crosswalk and prior mandate coverage: requirement, status, exact files/routes, commit, actual test evidence, remaining dependency and owner action.
4. Actual backend schema/API and formula changes; migration diff, rollback and data compatibility.
5. Admin/client/public UI matrix, screenshots or paths to review evidence, mobile/tablet/desktop results, loading/error/empty states, privacy.
6. Catalog count and stable ID inventory, service coverage, validated vs specification-only distinction.
7. Value realization examples with synthetic fixtures, forecast/actual/attribution and deduplication evidence, SLA timing, commercial version binding, accounting reconciliation and internal cost isolation.
8. CRM sync, suppression, funnel and unsent cohort evidence; no live outreach confirmation.
9. Marketing/SEO routes and collateral inventory, educational guides and portfolio evidence.
10. Exact test commands, dependency versions, results, skips, CI, build sizes, security and regression findings; differentiate fixtures from real provider acceptance.
11. Every remaining blocker: exact unmet criterion, category (product/environment/legal/owner), what was attempted, what remains, safe fallback and required next action. Never label ordinary unfinished coding as an external blocker.
12. Separate recommendations for product completion, staging acceptance, merge, production release, provider activation and outreach. List authorization boundaries honored.

**Final directive:** Build the remaining suite, not another partial launch checklist. The coordination agent will independently compare this mandate, the previous handoffs, canonical plan, repository and CI against the final SHA. Do not call the entire plan complete until all applicable product/UI criteria are verified or genuinely blocked/explicitly owner-deferred. Continue until all feasible independent work is implemented and tested.
