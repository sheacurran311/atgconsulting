# ATG Internal Workflow Catalogue and Scoping Model

**Internal use only. Not a published rate card or a promise of automation capability.** Updated November 19, 2026.  
**Owner direction:** Competitively priced website/design implementation supported by a measured 50-workflow difficulty catalogue.  
**Canonical strategy:** [ATG Master Implementation Plan](MASTER_IMPLEMENTATION_PLAN.md).

## What the estimates mean

- Estimates below are **internal initial ranges for an otherwise straightforward, available-integration implementation** by an experienced builder using AI development tools, including setup, configuration and a first test pass. They are **not proven ATG delivery-time benchmarks**, not AI inference time, and not a maximum commitment.
- The client is responsible for authorizing integrations, accounts, recipient outreach and third-party subscriptions. ATG's SaaS server must **not** run customer inbox/calendar/CRM automations; implement them only in customer-controlled providers, with appropriate human approvals.
- Start a stopwatch on the first actual client project. Record estimated vs actual discovery, build, tests, revisions, documentation, training, launch and support. Recalibrate after at least three live engagements.
- Rates are internal realization assumptions, **not billed hourly rates**: initial modeling value **$90/hour** for implementation plus explicit client-management, scope and risk allowances. Revisit after actual projects. Do not imply $90/hour is the market clearing price or the project's contract rate.
- **Difficulty:** S = straightforward single-source template/setup; M = standard multiple-step or provider integration; L = complex logic, writes, document/PII risk or multiple systems; XL = uncertain engineering, custom APIs or high-risk multi-system work. Complexity can increase after discovery. Escalate a scope to at least L where it changes customer records, requires sensitive data or consequential external actions.
- **Support:** Low = likely stable, monthly review generally optional; Medium = external service or rules can drift; High = requires separate release/change management, error monitoring or risk review. These are *potential* support burdens, not promises of ongoing monitoring.

## A. Fifty candidate workflows

| # | Area | Workflow deliverable | Difficulty | Baseline implementation hours | Potential support | Primary complexity / QA trigger |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Lead capture | Website form → lead ledger | **S** | 2–4 | Low | Form ownership, spam filtering, duplicate keys |
| 02 | Lead capture | Website form → CRM record | **M** | 4–8 | Medium | CRM auth, field mapping, duplicate matching |
| 03 | Lead capture | AI lead qualification and scoring | **M** | 5–10 | Medium | Criteria, test set, hallucination review |
| 04 | Lead capture | Local business prospect research queue | **M** | 5–10 | Medium | Source permissions, freshness, opt-outs |
| 05 | Lead capture | Website live chat intake assistant | **L** | 10–20 | High | Knowledge base, privacy, escalation |
| 06 | Lead capture | Missed-call follow-up preparation | **M** | 5–10 | High | Telephony platform, consent, business hours |
| 07 | Outreach | Personalized outbound email drafting | **S** | 3–5 | Medium | Contact provenance, human approval |
| 08 | Outreach | Approved email sequence in client-owned CRM | **M** | 5–10 | High | Suppression, unsubscribe, rate limits |
| 09 | Outreach | LinkedIn prospecting research and draft queue | **M** | 5–10 | High | Platform policies, manual sending |
| 10 | Outreach | Cold outreach list hygiene and deduplication | **M** | 4–8 | Medium | Identity matching, lawful acquisition |
| 11 | Outreach | Follow-up reminder and task scheduling | **S** | 2–4 | Low | Time zones, cadence, task ownership |
| 12 | Outreach | Inbound lead routing by geography/service | **M** | 4–8 | Medium | Routing logic, coverage, fallback |
| 13 | Marketing | AI social content calendar drafts | **S** | 3–5 | Medium | Brand voice, approval, source checks |
| 14 | Marketing | Repurpose long-form content into drafts | **S** | 3–6 | Medium | Rights, accuracy, channels |
| 15 | Marketing | Review request workflow setup | **M** | 4–8 | Medium | Consent, platform policies, suppression |
| 16 | Marketing | Google Business Profile content preparation | **S** | 2–4 | Medium | Access, platform requirements |
| 17 | Marketing | Monthly marketing summary from exports | **M** | 5–9 | Medium | Reliable source metrics, definitions |
| 18 | Marketing | SEO opportunity research and issue log | **M** | 5–9 | Medium | Access, crawl limits, no ranking guarantee |
| 19 | Operations | Inbox classification and draft replies | **M** | 5–12 | High | Sensitive email, customer-owned integration |
| 20 | Operations | Meeting notes → reviewed action items | **M** | 4–8 | Medium | Recording consent, source quality |
| 21 | Operations | Appointment reminders in booking platform | **M** | 5–10 | High | Booking auth, consent, timezone |
| 22 | Operations | Estimate/proposal draft from intake | **M** | 6–12 | High | Pricing rules, required human signoff |
| 23 | Operations | Document intake and structured extraction | **L** | 10–20 | High | PII, varying file quality, exceptions |
| 24 | Operations | Expense receipt categorization draft | **M** | 6–12 | High | Financial data, uncertainty, approvals |
| 25 | Operations | Customer support FAQ draft assistant | **M** | 5–11 | Medium | Approved knowledge, escalation |
| 26 | Operations | Multi-step customer onboarding workflow | **L** | 10–20 | High | Several systems, retries, permissions |
| 27 | Operations | Staff SOP and training content assistant | **M** | 4–9 | Medium | Approved sources, version control |
| 28 | Operations | Inventory restock alert from exports | **M** | 5–10 | Medium | Thresholds, feed reliability |
| 29 | Operations | Recurring KPI report from structured data | **M** | 5–10 | Medium | Definitions, data quality, drift |
| 30 | Operations | CRM update with review-and-approve | **L** | 9–18 | High | Write permission, reconciliation, races |
| 31 | Personal | Personal daily planning brief | **S** | 2–4 | Low | Chosen platform, data sources |
| 32 | Personal | Calendar conflict summary setup | **M** | 4–7 | Medium | Customer-controlled calendar access |
| 33 | Personal | Family activities/school coordination brief | **M** | 4–8 | Medium | School source rights, privacy |
| 34 | Personal | Travel itinerary and packing preparation | **S** | 2–4 | Low | Travel facts, no unauthorized booking |
| 35 | Personal | Personal bill reminder task setup | **S** | 2–4 | Medium | No payment initiation, date accuracy |
| 36 | Personal | Household shared task organizer | **M** | 4–8 | Medium | Multiple participants, permissions |
| 37 | Web integration | Website contact form → email draft queue | **M** | 4–8 | Medium | Email platform, spam and privacy |
| 38 | Web integration | Website contact form → CRM + approval | **L** | 8–16 | High | Data mapping, CRM permissions |
| 39 | Web integration | Quote request form with conditional logic | **M** | 5–10 | Medium | Form validation, service rules |
| 40 | Web integration | Booking embed/integration and reminders | **M** | 5–10 | Medium | Vendor features, ownership |
| 41 | Web integration | Review/testimonial display automation | **M** | 4–9 | Medium | Customer authorization, consent |
| 42 | Web integration | Website analytics and conversion events | **M** | 5–9 | Medium | Consent preferences, event QA |
| 43 | Web integration | Lead source attribution dashboard | **L** | 10–18 | Medium | UTMs, privacy, cross-system joins |
| 44 | Advanced | Cross-platform customer lifecycle automation | **XL** | 20–40+ | High | Multi-system reliability, escalation |
| 45 | Advanced | Knowledge-grounded AI assistant with citations | **L** | 12–24 | High | Document permissions, evaluation |
| 46 | Advanced | Multi-agent research + review pipeline | **XL** | 20–40+ | High | Tool access, source verification, cost caps |
| 47 | Advanced | Custom API/legacy software integration | **XL** | 20–50+ | High | Docs, access, versioning, failures |
| 48 | Advanced | Human-approved financial workflow reporting | **L** | 12–25 | High | Financial authorization, auditability |
| 49 | Advanced | Workflow health and exception dashboard | **L** | 12–24 | High | Telemetry in client systems, alerts |
| 50 | Advanced | Customer-owned automation release and rollback | **L** | 12–24 | High | Environment controls, versioning |

These are *candidate offerings* subject to provider terms and customer permission. Names like inbox triage, booking, CRM writes and multi-agent execution refer to **implementations in the client's systems**, not unattended execution by ATG's own app.

## B. Complexity and quote worksheets

**Internal initial direct implementation estimate** = midpoint of relevant baseline hours × $90. This is a cost-and-effort signal, **not the final fee**.

Quote worksheet:
1. Select each workflow ID, explicitly describe the inputs, platforms, expected outputs and boundary of ATG's work. Identify shared setup across workflows once.
2. Calculate baseline implementation hours for unique tasks; avoid charging twice for a shared CRM connection, domain setup or knowledge-base import.
3. Add **discovery and specification** (typically 1–3 hours for a small project), **integration authorization/setup** (0–4), **independent QA/edge cases** (at least 20–35% of implementation time, or higher for high-risk writes), **client training/handoff** (1–2), and **project management/revisions** (1–3). Document why an allowance is zero.
4. Add a **complexity/uncertainty allowance**: S 0–10%, M 10–20%, L 20–35%, XL quote after paid discovery or proof-of-concept. Do not blindly multiply every task if the risk is already represented by extra test hours.
5. Add any material third-party service costs, platform fees, retained licenses, design/content charges, applicable taxes, and a profitability check. Quote the **complete client outcome**, not raw tokens or keyboard time.
6. Document **automation operating location** (client-owned service and integrations), trigger, access permissions, approval gates, recovery after failure, monitoring responsibility, revision boundaries and handoff.
7. For support, quote independently as a **capacity/cadence/SLA agreement**, not a hidden per-workflow subscription. High-support workflows should have an agreed monitoring owner, incident response expectations and monthly change allowance before activation. Do not charge a retainer solely because the project is classified M/L.

**Initial nonbinding scoping bands, before the detailed worksheet:** S ~$250–$500, M ~$500–$1,200, L ~$1,200–$3,000, XL after technical discovery. These ranges are *ATG hypotheses* for common implementations, not researched competitor equivalences and not a public menu. Complex compliance or high-volume workflows may exceed them. More economical bundled pricing is appropriate where shared setup reduces actual work.

### Worked examples (internal, illustrative)

**Guided lead follow-up (one M workflow):** 6 implementation hours + 1 discovery + 2 QA + 1 training + 1 management = 11 × $90 = $990 before third-party costs and commercial adjustment. An approved $750–$1,100 quote could be competitive if the existing CRM is usable and change/risk scope is tight.

**Done-for-You website + two workflows:** Estimate website independently using section C; one S workflow 3 hours, one M workflow 6 hours, shared setup 1, integration and QA 4, training 2, management 2 = 18 workflow hours × $90 = $1,620 in internal service value before risk/expenses. Do not automatically add two retail workflow list prices to a site package if you reused shared lead forms and CRM setup.

**Complex CRM write-back:** Baseline 12 hours may be insufficient if API access, multiple contact identities, stale updates, retries and audit trails must all work. Quote a paid discovery or an explicitly limited pilot rather than a misleading fixed fee.

## C. Website and brand scoping

**Build generation can be very fast:** the founder's working hypothesis is around two hours and roughly $10 inference for a straightforward five-page site. Treat that as a *technical prototyping target*, not proof of total customer project cost, customer satisfaction, or all-in COGS.

Website quote sheet (no single per-page universal price):
- **Fast-track 1–3 pages:** internal target $500–$900 when usable client-owned copy/assets, one design direction, standard responsive components, no legacy migration, one contact form, simple DNS, one consolidated revision round. The lower end may be commercially viable only if full delivery fits into a very tight time box.
- **Standard five-page brochure site:** initial target $900–$1,500, **two consolidated visual revision rounds** and one functional QA cycle, simple form and SEO metadata, mobile/responsive checks, source handoff, and basic deployment training. Client supplies all copy/images and approves the domain/hosting account.
- **Five-page site + simple logo refresh:** initial target $1,200–$1,900; two initial logo directions, **two consolidated logo revision rounds**, vector/raster export and simple brand colors/type treatment. A full visual identity system, copywriting and custom illustration require separate scope.
- **Redesign/migration/integrations:** initial $1,800–$3,500+ when existing content cleanup, redirects, domain/DNS coordination, booking/CRM integration, accessibility testing or bespoke page components are required.
- **New features and pages:** page count is a scope input, not the billing unit. A reused service-page template may be inexpensive; a custom quote form, login, e-commerce or API integration is separately scoped. Prefer a component/page template count, content migration inventory and functional acceptance criteria to a flat `$/page` scheme.
- **Warranty:** 14 days after acceptance for defects in the agreed deliverables, not free feature additions, platform-provider outages or unlimited design changes.
- **Ownership:** agree in writing on domain/DNS, hosting provider, repository transfer, source code and rights to supplied content. The client should control their own environment; ATG may be granted scoped access during build.
- **Platform policy:** favor client-owned source-code environments on Replit or Railway where the specific site warrants them. Don't claim WordPress/Squarespace/GoDaddy can never export data or that their platforms are universally unfit; explain ATG's full-code-control focus, migrations, editability and the client's desired tradeoffs. Replit/Railway usage costs vary by deployment. Estimate hosting separately.

## D. Proposal structure and supported packages

- **1 Website + Logo Only:** website scope, brand assets, launch, revisions, training, no mandatory AI workflows.
- **2 Website + Guided Workflows:** website scope plus reviewed workflow IDs, coaching sessions and assisted installation in customer-controlled tools; client completes agreed portions.
- **3 Guided Workflows Only:** workflow IDs, co-build sessions, testing and handoff; no website.
- **4 Done-for-You Website + Workflows:** full website/branding and agreed workflow IDs, implementation and QA plus optional **separate signed monthly support** (support scope, cadence and response times defined).
- **5 Done-for-You Workflows Only:** workflow IDs and full implementation, no website; optional separate signed monthly care with named responsibilities. Monthly fees never begin automatically merely because a proposal is accepted.

All five are **quoted custom proposals**. Define which workflows are guided vs fully implemented, whether revisions are included, responsibility for copy/assets/accounts, and how project completion is accepted. Neither a retainer nor any automation has indefinite unlimited execution or support.

## E. Required internal data fields for eventual quote engine

`workflow_id`, `name`, `category`, `difficulty`, `baseline_low_hours`, `baseline_high_hours`, `integration_count`, `data_sensitivity`, `external_write_risk`, `access_ready`, `source_quality`, `shared_setup_group`, `testing_hours`, `training_hours`, `revision_rounds`, `estimated_support_hours_monthly`, `approval_policy`, `client_owned_execution_provider`, `evidence_of_acceptance`, `quote_revision`, `actual_hours`, `actual_costs`, `postlaunch_incidents`.

The catalog should be implemented as a **versioned internal source** that the existing admin proposal workflow may reference **after** schema/design review, rather than immediately seeding prices into client-visible database fields. Preserve the approved proposal as the authority for the fee actually charged.

## F. Source context and provenance

Published market context used for **pricing direction**, not for individual workflow-hour estimates:
- Colorado Web Impressions, April 30 2026: four-page starter web build advertised from $1,850: https://coloradowebimpressions.com/answers/how-much-does-a-business-website-cost-in-colorado
- Denver Web Crew: lower-entry website builds with recurring hosting/care: https://www.denverwebcrew.com/pricing
- Alpenglow AI and other published automation firms, summarized as external market context at https://www.advai.cloud/blog/ai-automation-pricing-small-business (November 2026). Check direct vendor pages before quoting.
- Automation pricing data illustrates wide variation in scope: https://www.orchestriai.com/blog/ai-automation-agency-pricing-2026 (October 2026).

**Source vs internal judgment:** competitor advertised prices are external market facts as of checking; the workflow list, hours, risk weights, ATG quote bands and package targets are internal draft assumptions, requiring controlled validation with real delivery work.
