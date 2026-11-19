# ATG Consulting | Current Product Master Plan

**Canonical status document:** November 19, 2026  
**Previous baseline:** [November 15 implementation plan](audits/2026-11-15/ATG-implementation-plan-2026-11-15.md) and [product audit](audits/2026-11-15/ATG-product-audit-2026-11-15.md). Both remain historical evidence, not the current backlog.

## 1. What we are building

ATG is an approval-first AI consulting platform serving individuals and small businesses across Self-serve, Guided, and Done-for-You delivery. Its customer value is the completed journey:

**Discovery/assessment → relevant first pilot → structured fit call → reviewed scope and commercial decision → payment/entitlement → customer-owned implementation → verified acceptance and handoff → sustainable support.**

The app should diagnose, prescribe, preview, document, and track. Customer-owned platforms execute customer email, CRM, calendar, and automations. The ATG administration team's own Google account can be used for its internal prospecting and approved proposal documents. **Do not confuse ATG operational connectors with authorization to access customers' accounts.**

Retain:
- Existing tier pricing and commercial decisions: Free tools / Self-serve as currently configured, Guided $997 for 3 sessions and $1,497 for 5 sessions, and DFY from $3,500 with separately accepted, optional $750/month care where offered. Do not implement the historical $29/$299 monthly membership hypotheses without an explicit commercial decision.
- Clerk authentication and admin authorization; React/Vite/TypeScript frontend; Express/Prisma/Postgres API; existing xAI/Grok integration and deterministic fallback.
- Human review before sharing customer-specific approved deliverables, native-account execution, no client OAuth tokens, and no unauthorized messages, calendar events, or background customer automations.
- A single source of commercial truth for each accepted proposal and separately evidenced payment, entitlement, session usage, and delivery acceptance.

## 2. Status vocabulary and evidence standard

Never label a phase "production complete" because a PR merged or unit tests passed. Track milestones using these distinct evidence flags:

- **Merged:** code is on GitHub `main`.
- **Build verified:** reported TypeScript, targeted automated tests, and production build passed in Replit.
- **Live verified:** authenticated runtime behavior was personally observed against the intended service, database or connector.
- **Schema reviewed:** reviewed Prisma SQL diff, **not** evidence of migration execution.
- **Migration applied:** confirmed schema change on the intended database with before/after evidence.
- **Deferred:** consciously omitted from the current release and not represented as broken or complete.

A phase can be merged and build verified while live acceptance remains pending.

## 3. Completed implementation milestones and remaining proof

| Milestone | GitHub status | Verified evidence | Still open |
| --- | --- | --- | --- |
| November 15 batch A: private drafts and approved sharing | Earlier implementation recorded in [private-drafts-sharing.md](private-drafts-sharing.md) | Historical implementation and verification record; do not treat the original audit as current | Maintain regression coverage for privacy, stale edits, tiers, recap publication and AI disable switch |
| Phase 1: Google Sheets prospect dashboard | PR [#66](https://github.com/sheacurran311/atgconsulting/pull/66) merged | Sheet is visibly connected in Admin Prospecting; original 5 tests and TypeScript checks passed | No real prospect rows populated yet; do not claim outreach results |
| Phase 2: Gmail metadata reconciliation | PRs [#68](https://github.com/sheacurran311/atgconsulting/pull/68) and [#69](https://github.com/sheacurran311/atgconsulting/pull/69) merged | Gmail account visible, read-only matching tests passed | No actual prospect conversations yet; provider behavior with meaningful records untested |
| Phase 3: paginated Gmail review | PR [#70](https://github.com/sheacurran311/atgconsulting/pull/70) merged | API and frontend typecheck, 7 Gmail tests, and API build passed | Real batch changes cannot be validated until eligible prospects exist |
| Phase 4: reviewed Sheet updates and Calendar matching | PR [#71](https://github.com/sheacurran311/atgconsulting/pull/71) merged | 22 focused tests, API/frontend typecheck, API build passed | Sheet write-back disabled by default; provider POST and controlled row update not live verified. Calendar runtime check deferred |
| Phase 5: structured fit call → reviewed proposal → delivery snapshot → private Docs export | PR [#72](https://github.com/sheacurran311/atgconsulting/pull/72) merged | Prisma Client generated, API/frontend typechecks passed, 29 focused tests passed, API build passed | Authenticated end-to-end fit-call/proposal/entitlement workflow not yet verified; Google Docs export disabled and live write permission unverified; migration execution **not confirmed** |

**Phase 5 schema evidence:** user reviewed an additive SQL diff creating `FitCallOutcome` with a unique `discoveryIntakeId` FK and adding `DiscoveryProposal.deliveryPlanJson`, `fitCallRevision`, `googleDocExportState`, `googleDocExportedAt`, and `googleDocId`. No destructive SQL was present in the diff. **Do not infer the SQL was applied merely from reviewing it.**

## 4. Immediate acceptance gate: finish Phase 5 proof without expanding scope

This is an acceptance gate, not a new connector development phase. When a controlled Replit testing window is available:

1. Verify deployment `main` and the correct target Postgres database. Confirm a backup. Apply the reviewed additive migration through the established process only if not already applied; record schema post-state.
2. Use a synthetic consented assessment: create/open intake, save fit-call draft, reload and complete, verify required fields and version conflict errors.
3. Generate a proposal grounded in the completed fit call. Edit scope, milestones, explicit price, exclusions, dependencies and acceptance clause. Verify stale-source approval fails, then approve the current version.
4. Confirm an approved proposal cannot be overwritten by generation or edit; inspect the delivery snapshot. Confirm approval is **not** the same thing as client acceptance or payment.
5. In a controlled paid-test-client scenario, verify that accepted scope appears in a new private Guided/DFY playbook only after the existing acceptance, payment and entitlement gates. Verify unentitled users cannot bypass them.
6. Keep `ATG_ENABLE_PROPOSAL_DOCS_EXPORT` and `ATG_ENABLE_SHEET_WRITEBACK` off until separate controlled tests. Do not test with actual prospects or real customer financial records.

Record failures as discrete blockers without declaring the entire phase unimplemented.

## 5. Prioritized product roadmap (restructured)

### P0 | Trust, integrity and cash-relevant delivery

**P0-A: Commercial integrity and proposal lifecycle (historical batch B).**

The Phase 5 proposal has approval and a delivery snapshot, **but not a complete immutable purchase-and-fulfillment ledger**. Before enabling wider paid checkout, implement:
- Accepted proposal identity and immutable version/hash shown to the accepting user, tied to approved scope and exact quoted price.
- Explicit separation of prospect conversion, acceptance, order/payment receipt, entitlement, Guided package size and optional DFY care.
- Idempotent fulfillment for concurrent, duplicated, delayed and failed Stripe events; never reset used session counts.
- Exact 3-vs-5 Guided package price validation against actual Stripe products in test mode; no unresolved placeholder price can become a charge.
- Separate, explicitly accepted recurring care; cancellation/refund terms and existing granted-rights behavior.
- Durable pending/running/failed/completed generation jobs and recovery, with source revision validation.

**Exit criteria:** repeated and out-of-order events do not duplicate entitlement grants or overwrite payment state, and every entitlement maps to a specific accepted scope and purchase.

**P0-B: Full session → decisions → actions → acceptance journey (historical batch E).**

Build on existing `Consultation`, `SessionRecord`, `ActionItem`, `ClientPlaybook`, and client task infrastructure. Do not duplicate data models without a demonstrated gap.
- Use a stable identity connecting scheduled/completed consultations to the actual SessionRecord; reconcile same-day calls and recording/consent status.
- Distinguish completion of a real Guided session from package consumption with an idempotent ledger; don't double-count or consume on mere scheduling.
- Preserve authorized transcript/source segments, clearly report partial processing and references; do not process unconsented recordings/transcripts.
- Draft structured decisions and action items; consultant reviews owner, due date, evidence, client visibility, and milestone relationship before publishing.
- Project approved action items to the customer task view exactly once; support status and evidence changes without duplicating tasks.
- Flag delivery guides/playbooks stale on material approved changes; prepare new private drafts, preserving final/customer-published versions.
- Surface processing failures, stale approvals, retries and next responsible operator actions in one admin work queue.

**Exit criteria:** schedule → prepare → consented source → private summary → reviewed recap → approved tasks → verified acceptance → updated private/client guidance forms a traceable, retryable, correctly entitled journey.

**Sequencing:** P0-A and P0-B can be designed together; deploy financial/entitlement mutations only after the purchase ledger is tested. Session data linking and draft action workflows can proceed independently behind safe gates.

### P1 | Durable documents and reliable releases (historical batch C)

- Implement one durable object-storage backend for client-owned artifacts, with scoped upload/download URLs, expiry, access checks and deployment persistence.
- Review object retention and deletion rules, including client permissions, revocation, refunds and storage costs.
- Reconcile Replit environment guides, `.env.example`, migrations and release handoff.
- Investigate the historical `Plan` constraint issue using database metadata; preserve production records.
- Add release identity/version verification plus authenticated smoke tests covering privacy, intake, scope, paid entitlements, session action items and documents.
- Only after a controlled verified Docs test, consider making ATG-owned proposal export and private Drive organization available. **ATG document export is not a substitute for durable client artifact storage.**

**Exit criteria:** private paid artifacts survive redeployments, other customers cannot read them, and a released version can be traced to tested commit/schema/configuration.

### P1 | Finish assessment-to-pilot polish (remaining historical batch D)

Phase 5 covers persistent fit-call outcomes and proposal creation, but several historical batch D items remain:
- Canonical assessment profile across current selection IDs, legacy inputs and household/business splits.
- New linked assessment revisions rather than reopening immutable submitted intake sessions.
- Separate free fit-call booking and paid Guided session booking copy/links.
- Rank one commercially valuable first pilot using documented workflow signals, while retaining later opportunities in a backlog.
- Ensure reviewed assessment results propagate to approved customer guidance and private operator playbooks; verify correct client next action at every state.

**Exit criteria:** realistic business and personal fixtures produce correct one-pilot recommendations, accurate commercial next steps, and a coherent path through consultation and delivery.

### P2 | Productized delivery and recurring-care readiness (historical batch F)

After actual paid pilot delivery, measure consulting effort and retention demand before considering new subscriptions.
- Workflow-specific operator playbooks with real acceptance evidence, owner handoff, rollback, support boundaries and reusable native-agent skill packages.
- A measurable customer delivery dashboard: verified installations, blocked items, milestones, action ownership, and promised outcomes.
- Optional DFY care ledger with **explicit accepted scope**, agreed cadence, costs, escalation and renewal decisions.
- Select only one customer-owned execution integration pilot based on real client demand and consent, rather than promising general automated inbox/calendar access.
- Continue improving AI-assisted proposal and setup content based on real fit-call outcomes, not invented ROI or unsupported automation claims.

**Exit criteria:** ATG can repeatedly deliver and support a narrow high-value pilot at a known labor and software cost.

### P3 | Internal growth operations (supporting track, not product critical path)

- Continue the existing Google Sheet research queue; only process eligible unique contacts and maintain suppression safety.
- Use Gmail evidence to support human review, not automatic sending or unilateral funnel advancement.
- Verify limited Sheets write-back on a controlled fake prospect before turning on the feature.
- Defer the ATG Google Calendar live check and expansion of Gmail scan history until actual booked calls/prospect data warrant it.
- Keep prospective outbound automation, enrichment and lead-volume tools subordinate to data accuracy, opt-outs, list provenance and ATG service delivery.

**Exit criteria:** internal operations reduce manual work without creating unreviewed external communication or diluting the consulting product roadmap.

## 6. Non-goals and decisions not yet approved

Do not implement without a separate business/technical decision:
- $29/month Self-serve or $299/month Guided memberships from the original audit.
- Automatic customer email/calendar/CRM operations on ATG's infrastructure.
- Unreviewed client proposal publication, automated Docs sharing, automatic outreach or automatic CRM stage changes.
- Unvalidated payment activation, recurring care opt-in, or changing purchased Guided session balances.
- Broad transcriptions or third-party recording import without documented source rights and consent.
- Replacing xAI/Grok or changing the approved brand/pricing system merely because a historical audit suggested alternatives.

## 7. Engineering and delivery contract for every subsequent phase

1. Inspect `main`, this document and the appropriate historical audit findings before changes. Reuse existing models and routes.
2. Scope one coherent business outcome with concrete server/API, frontend, data model, privacy, backward-compatibility, failure/retry and acceptance criteria.
3. Default to no new vendors or recurring cost. Test with synthetic records and mock external services before touching customer or financial data.
4. Keep separate flags for source merged, typecheck/build, automated tests, actual migration, authenticated UI, provider write and production deployment.
5. Require narrow approvals for sharing, payments, tasks, customer-visible reports and external actions. Favor revision tokens and immutable accepted snapshots over silent replacement.
6. Replit follows GitHub `main`: merge a reviewed PR, pull `main`, then run Prisma generation, typechecks, relevant/full tests and build. Never equate a successful `prisma generate` with applied SQL.
7. Validate destructive/durable changes with backup and rollback. Record the precise failure and fix instead of repeatedly expanding scope.
8. Mark a capability live only with observed authenticated evidence; report empty source data as empty, not a successful provider end-to-end check.

## 8. Work queue to begin next

1. **Acceptance checkpoint:** Phase 5 migration status + one synthetic consultation-to-proposal-to-paid-playbook path.
2. **Next major build:** P0-B session/task/milestone loop, prioritizing data integrity and publish approvals; coordinate its ledger with P0-A commercial integrity.
3. **Next safety/commerce gate:** P0-A purchased-package identity and idempotent fulfillment before enabling or scaling paid checkout.
4. **Next operational foundation:** P1 durable document storage and release validation.
5. **Then:** assessment revision/pilot polish, repeatable guided/DFY delivery, and only afterward recurring care and selectively chosen integrations.

The owner can reorder P0-A/P0-B based on launch timing; **do not treat additional Google connectors as blockers for the core customer delivery loop.**
