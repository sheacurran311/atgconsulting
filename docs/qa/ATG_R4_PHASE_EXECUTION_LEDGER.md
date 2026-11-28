# R4 phase execution ledger

Starting R3 head: 058acf3fce082f4c1531e5f286ef61eeea7458f3. Main after PR80: 61daede2f654cf8347ae7202bc691d24aac3eb81. See [phase protocol](ATG_R4_PHASE_GATED_IMPLEMENTATION.md) and [R3 handoff](ATG_R3_FINAL_COMPLETION_HANDOFF.md). No product acceptance is asserted by this documentation update.

| Phase | Status | Evidence / next action |
|---|---|---|
| P0 | PRODUCT_GATE_PASSED | All three tasks verified locally and in CI at 51091b8. See [P0 checkpoint](checkpoints/P0.md). |
| P1 | IN_PROGRESS | Inventory 12 detailed specifications, expand and validate target 100 |
| P2 | OPEN | Complete R3-01/02 |
| P3 | OPEN | Complete R3-03/04/05 |
| P4 | OPEN | Complete R3-07/08 |
| P5 | OPEN | Complete R3-09 |
| P6 | OPEN | Complete R3-10/11/12 |
| P7 | OPEN | Complete R3-13/14 |
| P8 | OPEN | Complete R3-15/16 |

## Task-level record (populate before each phase)

| Task ID | R3 / W ID | Exact acceptance criterion | Status | Source / UI paths | Commit | Test evidence | External blocker / owner action |
|---|---|---|---|---|---|---|---|
| P0-01 | R3-15 / W2 | Establish exact refs, ancestry and conflict-free tree | LOCALLY_VERIFIED | Entire tracked tree, no route/schema change | `7a90f12` | Tree matched GitHub and marker scan returned no matches. Main is an ancestor. | None |
| P0-02 | R3-16 / W1 | Establish durable repository instructions and test entry points | CI_VERIFIED | `AGENTS.md`, canonical plans, this ledger | 51091b8 | Root instructions and all linked entry points present. | None |
| P0-03 | R3-15 / W2, W3, W6 | Reproduce applicable build, API, database and browser baseline | CI_VERIFIED | `.github/workflows/verify.yml`; admin/client/public UI suites | `7a90f12` | Baseline CI passed 285 tests, zero failures/skips, both browser suites and audit. Linux replay at 51091b8 passed the full suite, zero drift and audit. | See checkpoint. |
| P1-01 | R3-06 / W12 | 100 distinct, detailed, versioned procedures across 12 services with 50 sizing references mapped and tested | IN_PROGRESS | API workflow catalog | Pending | Count, content, service, sizing and KPI integrity | None |
| P1-02 | R3-06 / W12 | Search, filter and inspect procedures by service, industry, difficulty and readiness | OPEN | Admin engagement workspace | Pending | Browser interaction across three widths | None |
| P1-03 | R3-06 / W12 | Select correct specification revision for opportunity, estimate and delivery, limit client brief to approved scope | OPEN | Existing engagement and milestone routes | Pending | Validate reference, tenant, stale version and visibility | None |

## Checkpoint template

Phase; starting SHA; ending SHA; passed criteria; outstanding product tasks; test commands and totals; CI URL/status; UI evidence; security/schema impact; external blockers; explicit gate decision; next task. A phase remains OPEN until its product criteria pass. No placeholder counts or implied production approval.
