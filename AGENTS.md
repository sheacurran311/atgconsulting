# Working in the ATG Consulting repository

Start with [the R4 protocol](docs/qa/ATG_R4_PHASE_GATED_IMPLEMENTATION.md), [the phase ledger](docs/qa/ATG_R4_PHASE_EXECUTION_LEDGER.md) and the [R3 acceptance criteria](docs/qa/ATG_R3_FINAL_PRODUCT_COMPLETION_MANDATE.md). Read the canonical [commercial plan](docs/COMMERCIAL_LAUNCH_MASTER_PLAN_V4.md), [reconciliation](docs/ATG_IMPLEMENTATION_RECONCILIATION.md) and earlier documents referenced in the protocol. Check the actual branch, PR, CI and scoped instructions before editing.

## Execution

Use the first open phase in the ledger. Verify each criterion against code, normal application entry points and reproducible tests. Record a stable task ID, its R3/W mapping, affected API and UI, schema and permission effects, commit, test commands and measured results, limitations and the exact next action. Update the ledger and both canonical plans after meaningful batches. Write the phase checkpoint under `docs/qa/checkpoints/`. Advance once the current gate passes. Preserve earlier decisions and identify any owner-approved exception explicitly.

## Product and commercial terms

Preserve the twelve services and five divisions, Free Tools, Guided, DIFY and fractional AI leadership. Price projects and recurring work individually. Keep client ROI assumptions separate from ATG labor, margin and pass-through costs. Newly agreed out-of-scope work requires prior written authorization and at least USD 100 per hour. Preserve accepted agreements and version subsequent amendments. Billing uses individually approved installments or manual invoicing.

## Verification and release

Use the workspace package manager declared in `package.json`. Follow [the verification workflow](.github/workflows/verify.yml) for a frozen install, disposable PostgreSQL, Prisma generation and drift checks, typechecks, builds, API tests, browser regression and dependency audit. Add criterion-specific tests and exercise the normal user workflow. Record local, CI, fixture and staging results separately. Use synthetic records and keep production credentials out of development.

Work on the existing feature branch for draft PR #81. Preserve concurrent work. Main merges, deployment, production data changes, live billing, outreach, customer notifications and new scheduled jobs require explicit release authorization. Keep customer Google access limited to read-only GSC and GA4. Use the distinct ATG Workspace integration for internal operations. Prospect sources are official public business sites. Voice AI is restricted to the authorized inbound pilot. Keep client data tenant scoped and expose only approved records.
