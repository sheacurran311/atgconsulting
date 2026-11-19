# ATG Phase 5: Assessment to fit call to reviewed proposal to client delivery

## Source of truth and product boundary

This implements the central dependency described in `docs/audits/2026-11-15/ATG-implementation-plan-2026-11-15.md` (roadmap D and E) and preserves `docs/NEXT_AGENT.md` boundaries. The client's own AI platform executes their workflows. ATG does **not** connect to or operate customer Google accounts, send on their behalf or store their OAuth tokens. The Replit Google Docs/Drive integration in this phase is strictly for ATG's own approved proposal files.

No Google Calendar changes, billing activation, purchased entitlement grants, email automation, or production customer-account integration is included.

## Product flow

1. A prospect submits a consented initial assessment.
2. Admin Discovery now contains the client-specific 20-minute agenda and an editable **Fit Call** worksheet with 14 fields. Staff can save a draft or mark it complete when the required evidence is recorded (priority, real workflow example, decision-maker, pilot, acceptance criterion and next action).
3. Fit-call records are versioned in `FitCallOutcome`; concurrent revisions are rejected. A completed call can be reopened before proposal approval, creating a new revision. Once a proposal is approved, its source is locked. No fit-call notes are exposed to clients automatically.
4. A proposal must be based on a **completed** fit call and consented intake. The existing Grok-based generation receives the structured call context and the fallback produces a marked draft with confirmed pilot, acceptance, dependencies and exclusions. Every proposal is still manually reviewed. The existing ATG proposal remains the only source of client-visible approved commercial scope.
5. Admin can edit the proposal fields, including scope, pricing and milestone JSON. Optimistic `updatedAt` checks prevent silent overwrites from stale pages. Generating, editing or approving a non-draft proposal is blocked. Approval requires the latest completed fit-call revision, nonempty scope, valid milestones, a tier, an explicit price, and authorization/acceptance terms.
6. Approval creates the **immutable delivery scope snapshot** in `DiscoveryProposal.deliveryPlanJson`. It lists the exact reviewed milestones, first pilot, acceptance criteria, client dependencies and exclusions. It does not create a client purchase or mark any milestone complete.
7. After existing client acceptance, confirmed payment, and tier entitlement, newly generated private Guided/DFY playbooks include the accepted delivery snapshot. Existing playbook generation gates remain in place.
8. Optional: admin may explicitly export the approved proposal into **ATG-owned Google Docs** using the Replit native connector, with no sharing or email. This export remains disabled by default. A configured ATG-owned Drive folder can receive the resulting doc.

## Schema / migration

Additive changes:
- New `FitCallOutcome` table, one record per `DiscoveryIntake`, with revision and completion timestamp.
- `DiscoveryProposal.fitCallRevision`, `deliveryPlanJson`, `googleDocId`, `googleDocExportState`, `googleDocExportedAt`.

No changes to purchased tiers, Stripe, session balances, or legacy proposal content. Existing approved proposals should remain approved, unchanged and accessible.

**Do not apply Prisma schema changes to production blindly.** Confirm the Replit database target and a backup/rollback path. Review the additive diff before running the existing `pnpm db:push` workflow. `prisma generate` only regenerates client types; it does not apply the database schema.

## Google Docs exports

Settings:
- `ATG_ENABLE_PROPOSAL_DOCS_EXPORT`: default disabled. Set to `true` only after a controlled test of the Replit SDK POST/PATCH proxy and account permissions.
- `ATG_DOCS_OWNER_EMAIL`: expected Google account, default `shea@atgconsulting.io`. The helper checks the connected Drive account and the created document's actual owner before inserting proposal text.
- `ATG_PROPOSALS_DRIVE_FOLDER_ID`: optional ATG-owned Drive folder ID. When set, the export attempts to move the document there after populating it.

Export is manually initiated by an authenticated ATG admin after proposal approval. It writes the client-facing approved scope, not private internal review notes. It never creates sharing permissions, emails the document, updates customer files or modifies the client proposal.

Only one export is allowed per proposal. A failed export is marked `error`, and retries are blocked until the operator inspects whether a private document already exists. The document ID is recorded immediately after creation to reduce duplicate-creation risk. If the Drive folder move fails, the document may remain in the root Drive and requires manual reconciliation.

## Replit validation, one consolidated cycle

After merging this PR to the `main` branch and pulling into Replit:

```bash
# Generates the Prisma client for the newly declared models but does not modify DB tables.
pnpm --filter @workspace/api-server exec prisma generate
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/atg-consulting typecheck
pnpm --filter @workspace/api-server exec tsx --test src/fitCall.test.ts src/proposalDocs.test.ts src/clientProposal.test.ts src/clientConsultationBrief.test.ts src/playbook.test.ts
pnpm --filter @workspace/api-server build
```

After verifying the correct Replit database and backup, apply the additive Prisma schema with the established migration workflow. Verify an admin-only test intake end to end:

1. Confirm the intake's consent; open the Fit Call panel and verify its agenda is tailored.
2. Save a private draft and reopen the same intake to verify persistence and revision changes.
3. Complete the required fit-call fields using **fabricated demonstration records**. Confirm incomplete or stale revisions are rejected.
4. Generate the proposal. Review scope, price, exclusions, acceptance criteria and milestones. Edit and save. Confirm approved proposals are read-only.
5. Reopen the fit-call draft before approval, confirm the old proposal cannot be approved until regenerated, then complete the revised call.
6. Approve the current proposal and verify its delivery snapshot. Do not claim the customer accepted it until the preexisting client acceptance workflow records acceptance.
7. With test acceptance and existing payment/tier prerequisites, generate the private client playbook and confirm that the accepted proposal scope is present. Verify nonpaid accounts cannot bypass the existing gate.
8. Leave `ATG_ENABLE_PROPOSAL_DOCS_EXPORT` unset initially. Confirm the UI reports that exports are disabled. Later, with a controlled approved test proposal and authorized ATG Google account, enable Docs export, verify the created Doc is private and excludes internal notes, and verify repeated clicks cannot create additional Docs.

Do not treat unit-test success as live Google Docs API write verification. Verify the actual export only against a dedicated, authorized ATG test record.

## Known limitations

- The existing proposal model permits one approved proposal per intake. New commercial terms after approval require a new intake/proposal revision; historical accepted proposals are not overwritten.
- Milestone status in the approved snapshot starts as `not_started`. This does not change or consume session entitlements or duplicate existing client action item tracking.
- Google Docs export can fail after creating an empty or partially populated private Doc; its error state requires manual operator reconciliation.
- The feature is not a full document version archive. The accepted proposal itself is the contract of record.
