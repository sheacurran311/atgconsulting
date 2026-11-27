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
