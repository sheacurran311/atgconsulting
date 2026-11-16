# ATG implementation plan for approval

> Historical audit baseline at `3dbff3e`, recorded before implementation. The approved first batch is tracked in [the implementation and verification record](../../private-drafts-sharing.md). Statements about unchanged files and proposed work describe that earlier audit, not this implementation branch.

November 15, 2026 • Based on GitHub main at 3dbff3ede885b23f65cd7d8c033a5208861d9b24

**Status: proposed, not implemented.** Read the product audit for evidence, limits, and the full roadmap.

## Recommended first batch: Private drafts and approved sharing

**Outcome:** customers receive only their permitted information and the material Shea has deliberately approved. Regenerating a draft does not silently change something already shared.

Estimated effort: **3–5 development days**, plus authenticated Replit verification. No new vendor is expected. This is a planning estimate, not a delivery quote.

### Scope

| Work item | Concrete change | Main files | Acceptance criteria |
| --- | --- | --- | --- |
| A1. Protect operator context | Replace raw customer response objects with explicit allowed-field projections. Check dashboard, plan, resource, session, and document metadata responses. | API routes/client.ts, related response types, api.ts | A customer's dashboard response contains no Client.notes, private report content, private transcript, or private summary. Two customer fixtures cannot access each other's records. Admin editor still sees private notes. |
| A2. Make proposal exports safe | Escape all plain-text fields before HTML interpolation. Render intended multiline/list content through constrained helpers. Add restrictive export response headers. | API routes/discovery.ts; a small export helper if justified | Harmless adversarial names/scopes render as text. No injected element, event handler, or script reaches the export. Existing branding, printable layout, prices, and internal-note exclusion remain intact. |
| A3. Enforce review before recommendation delivery | Use approved ToolPlan versions in Resources and AI coach context. Change report refresh to create a draft and a truthful pending-review response. Keep the previous approved plan visible. | API routes/knowledge.ts, routes/ai-assist.ts, lib/ai-assist.ts; frontend plan/feedback text | A draft-only customer gets a clear pending state; a new draft never replaces an approved recommendation. Only operator approval changes customer recommendations. A refresh cannot self-approve. |
| A4. Enforce content eligibility in responses | Return only metadata for locked legacy modules. Apply one declared eligibility policy to knowledge list/detail. Treat untiered public/general articles as available and preserve public tools/catalog access. | API routes/client.ts, routes/knowledge.ts; focused access helper | Free accounts cannot read a paid module body through list/detail. A restricted knowledge article obeys the same rule in list/detail. No-match relevance filtering cannot broaden access. Existing explicit customer grants are preserved. |
| A5. Separate session drafts from shared recaps | Keep summaryJson as the private generated draft. Treat recapText as the published text when shareRecap is true. Add a draft editor and explicit “Publish reviewed recap.” Use updatedAt or an equivalent existing version token to reject stale publication. Preserve a shared recap when regeneration runs. | API routes/sessions.ts; frontend components/admin/SessionsTab.tsx and session API types | Summarize → edit → publish works. Regenerate leaves the last published recap intact. Failed save retains transcript/form/editor content. Errors are visible and retryable. Another admin save causes 409 rather than silently overwriting. Customer response excludes transcript/adminNotes/summaryJson. |
| A6. Honor the AI switch in these flows | Put the common enable check at the provider boundary or consistently in callers, then verify fallback behavior. Avoid contradictory “AI off” behavior in sessions, playbooks, proposals, and assessment analysis. | API lib/grokClient.ts, lib/llm.ts, proposal generation and callers | AI_ASSIST_ENABLED=false produces zero outbound provider requests from the covered entry points. Missing-key/provider failures are visible as template/unavailable states. Existing xAI provider remains selected. |

### Session authorization and migration approach

For transcript/recording processing, require the recorded authorization represented by consentGiven. The UI should make the source and permission explicit. Operator-authored notes should be clearly identified; recording consent and permission to process notes should not be conflated. If that distinction requires a data-model change, keep it out of this first batch and return a clear blocked action for unconsented transcript processing.

Use existing recapText, shareRecap, summaryJson, and updatedAt fields where possible. Existing shared recaps should remain published snapshots. Do not regenerate them or modify session balances during rollout.

The initial content policy should preserve current tier order and explicit grants. The audit's expanded free/paid access matrix is a separate product decision, not permission to remove historical customer access.

### Deliberate exclusions

This batch does not activate billing, change prices, change purchased session counts, introduce memberships, change the AI provider, replace homepage sections, connect customer accounts, transcribe audio, or run database schema changes. Those require the subsequent reviewed batches below.

### Validation and review

1. Branch from freshly verified GitHub main using a codex/ branch. Recheck whether main has moved since 3dbff3e.
2. Port the audit probes into meaningful regression tests with authenticated route coverage. Assert forbidden fields/content are absent, not merely hidden by the UI.
3. Run the existing API suite, targeted privacy/publication tests, workspace type checks, and frontend/API production builds.
4. Test a controlled customer and operator journey in the approved Replit environment: draft plan, approve, refresh; create session, add authorized source, summarize, edit, publish, regenerate, retry after failure.
5. Capture screenshots of the recap editor, customer published view, and pending recommendation state. Confirm unrelated customers cannot read them.
6. Review a small PR with exact scope, test results, remaining live checks, and rollback instructions.
7. Merge/publish only through the agreed review process. Confirm the served version after publication.

**Done means:** the privacy/publication tests pass, the old 135-test suite remains green, customers keep their existing published material, and the authenticated deployment checks are recorded. A successful local build alone is not launch sign-off.

Rollback: restore the previous application release if needed. This batch is intended to require no schema migration. Preserve stored content and existing customer records.

## Next implementation batches

### B. Purchase integrity and proposal versioning

Estimated 5–8 days after commercial decisions.

- Separate prospect conversion, entitlement assignment, payment receipt, service scope, and recurring care.
- Make accepted proposal versions immutable; acceptance references the exact displayed version.
- Introduce purchase/package identity and an idempotent fulfillment transaction. Do not reset used sessions on replay.
- Persist generation jobs independently from payment confirmation, with pending/running/failed/done status and source revisions.
- Correct Guided 3/5 price selection against actual configured Stripe products, using Stripe test mode first.
- Make care an explicit accepted choice; leave it off for customers who did not purchase it.
- Define cancellation/refund/retained-artifact behavior without revoking existing package rights.

Success: repeated, concurrent, out-of-order, and failed events cannot duplicate grants or reset balances; amounts/options match accepted scope. No billing enablement until those cases pass.

### C. Durable customer documents and release validation

Estimated 2–4 days plus Replit investigation.

- Implement one actual object-storage provider and test upload/download/expiry across deployment.
- Fail closed for unsupported production storage and required signing configuration.
- Reconcile HANDOFF, .env.example, and the newer deployment guide.
- Inspect the missing Plan constraint failure in Replit using actual generated SQL and read-only production metadata; preserve data.
- Add a repeatable deployed-version/configuration smoke record.

Success: private paid artifacts remain accessible after a deployment, unauthorized requests fail, and the reviewed schema process validates successfully.

### D. Assessment → fit call → one pilot

Estimated 4–6 days.

- Canonical assessment profile maps all current selection IDs and legacy inputs without losing raw answers.
- An updated assessment creates a linked revision rather than resuming an immutable submitted session.
- Present approved assessment findings to the verified customer.
- Add a structured 20-minute fit-call outcome with priority/example/tools/constraints/budget/timing/decision/pilot/next step.
- Separate fit-call and paid-session booking links.
- Rank candidate workflows from selected needs; preserve other ideas as a backlog.

Success: useful answers reach the operator review, proposal, published guide, and private playbook; household-only users get household-relevant results; the customer knows the next action.

### E. Sessions → decisions → tasks → refreshed delivery plan

Estimated 6–10 days.

- Relate Consultation and SessionRecord through one stable session identity.
- Model completion and package consumption explicitly; reconcile same-day calls and changes.
- Approve structured action items with owners/dates and project them once into customer tasks.
- Preserve transcript structure, disclose partial processing, add safe long-source handling and source references.
- Mark playbooks/guides stale after relevant approved changes; queue a new draft without overwriting edits.
- Add a small retry queue and operator attention state.

Success: scheduling, prep, private source, draft, approved recap, customer tasks, plan update, and recovery form one traceable journey.

### F. Membership and integration pilots

Decide terms after measuring package delivery time and support demand.

Retain the existing $197 / $997 / $1,497 / from-$3,500 packages. The audit's $29/month Self-serve and $299/month Guided ideas are experiments for your decision. Retain optional $750/month DFY care with an explicit scope. None of these proposals authorizes a billing or customer-entitlement change.

Start integrations with booking metadata and authorized manual transcript import. After the delivery loop is reliable, choose one meeting provider or audio-upload transcription, then one customer-owned calendar/CRM workflow. Quote software/API/storage costs separately from ATG labor.

## Decision requested

**Approve only batch A, “Private drafts and approved sharing,” as the first implementation batch.**

The recurring prices, support allowances, later billing changes, and integration choices remain proposals for separate decisions. The most useful next business input is your intended membership/support commitment; it does not need to block the privacy fixes.
