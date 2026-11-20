# ATG Consulting | Current Product Master Plan

**Canonical status document:** November 19, 2026  
**Previous baseline:** [November 15 implementation plan](audits/2026-11-15/ATG-implementation-plan-2026-11-15.md) and [product audit](audits/2026-11-15/ATG-product-audit-2026-11-15.md). Both remain historical evidence, not the current backlog.

## Current service scope and implementation checkpoint (November 19, 2026)

**Owner-approved refined offer:** Website and logo design/redesign; AI-powered sales and marketing workflows (prospect research, outreach drafting, follow-up, content planning, qualified lead handling), business process automation, personal AI/productivity workflows, custom websites/web applications/integrations and appropriately scoped mobile work, training and optional fractional technical support. Combined **Complete Business Modernization** is the bespoke offer.

**Commercial experience is founder credibility, not a promise of traditional GTM agency services.** ATG has sales, enterprise business development, partnerships and go-to-market expertise that informs workflow design. It **does not** offer advertising buying/management, traditional local ad-agency services, guaranteed marketing results or standalone non-AI GTM campaign execution by default. Any strategy work is incidental to agreed technology and automation outcomes unless separately and explicitly scoped.

**Public service grouping for implementation:** (1) Websites & Branding; (2) AI Sales & Marketing Workflows; (3) Business Process Automation; (4) Personal AI & Productivity; (5) Custom Development; (6) Fractional Technical Partner. Present these as six capabilities, not six mandatory packages, and retain the full-service bespoke offer. This service grouping supersedes earlier broad "Business Growth & Strategy" as a standalone headline service. **No public fixed package pricing.**

**Implementation branch status:** The coordinated homepage/service-copy redesign and retirement of the legacy `POST /api/billing/checkout` package route are being prepared on the PR #73 branch. The fixed route is to answer `410 CONSULTATION_REQUIRED` without creating a Stripe session; Stripe webhooks/portal remain in place. **No quote-based Stripe invoice creation, client proposal acceptance, or payment activation is included in this first cutover.** Do not claim quote-to-cash is implemented. Replit compile/tests, UI review and live rollout must be recorded separately.

**Interim inquiry path:** The existing `/intake` workflow is still oriented around AI assessment/tier fields. A direct contact method for website/branding leads is required until the approved service-intent branching is completed. Avoid silently encoding `tier=guided` or `sessions=3` for new consultations.

## Approved web targets and bundled automation scoping (November 19, 2026)

**Owner-approved initial internal website bands:** 1–3-page fast-track $500–$900, standard five-page $900–$1,500, five-page with simple logo refresh $1,200–$1,900, complex redesign/migration/integrations $1,800–$3,500+. These are target quote ranges, not fixed public price cards; detailed scope and profitable delivery remain mandatory.

**AI implementation direction:** Package related workflows around a *customer business outcome* and share setup costs. Do not sell the illusion that each prompt is a product. Our 50-workflow difficulty catalog drives internal estimates and keeps individual projects, guided coaching, and DFY ownership distinct. Five proposed combined pricing archetypes and support fee hypotheses are in [the internal catalog](ATG_INTERNAL_WORKFLOW_CATALOG_AND_PRICING.md); **those automation and retainer bands remain pending explicit owner approval and real project calibration.**

**The five engagement options** are website/logo alone; website/logo plus Guided workflows; Guided workflows alone; DFY website/logo plus implemented workflows and separately contracted monthly service; and DFY workflows only with separately contracted service. Each quote must name actual workflow IDs, distinct workstreams, client-owned integrations, approval gates, revisions, training, acceptance tests, support limits and third-party costs. No monthly retainer is automatically created by completing an implementation. Price bundled services from verified shared work, not an across-the-board discount.

**First commercial pilot recommendation:** target a one-outcome system such as local inbound inquiry → qualification → CRM/task queue → approved follow-up for businesses with a website. This demonstrates cross-service synergy but requires explicit customer-owned accounts, data rights, consent and a verified workflow run before claiming ROI.

## Internal workflow catalog and revised competitive pricing assumptions (November 19, 2026)

**Authoritative internal estimating reference:** [ATG Internal Workflow Catalog and Pricing Model](ATG_INTERNAL_WORKFLOW_CATALOG_AND_PRICING.md). It contains **50 candidate workflows** graded S/M/L/XL with baseline implementation-hour estimates, support risk, integration/QA dependencies, pricing calculation guidance and the five approved common consulting engagement types.

**Refined owner preference:** compete aggressively on efficient design/development delivery, particularly straightforward websites, without racing to the bottom or artificially anchoring premium technical projects to large-agency fees. A five-page site may be generated in about two hours with low inference cost, but actual project pricing must include the specific requirements, revisions, testing, client communications, hosting transition and commercial margin. Do not treat generation time as whole-project labor. Initial **internal-only** website targets: simple 1–3 pages $500–$900, straightforward five pages $900–$1,500, five pages plus simple logo refresh $1,200–$1,900, and complex rebuild/migration $1,800–$3,500+. No universal per-page charge.

**Five common proposal templates:** (1) website/logo redesign only; (2) website/logo redesign plus guided workflows; (3) guided workflows only; (4) DFY website/branding plus fully implemented workflows and separately scoped monthly retainer; (5) DFY workflows only and separately scoped monthly retainer. All remain negotiable, scoped quotes. Retainers require explicit consent and defined monitoring, maintenance and response limits; they never start automatically.

**Implementation requirements:** build an internal, versioned workflow catalog with validated estimates and associated quote line items **after** code-based assessment and proposal workflow changes are reviewed. The future quote engine must not auto-approve prices from these hypotheses. Capture actual delivery hours and third-party expenses to calibrate early engagements. Avoid offering unlimited workflows, revisions or monthly support.

**Tech-stack proposition:** ATG prefers complete source-code control and client-owned deployments, with Replit and Railway among preferred implementation platforms when suitable. Present the tradeoffs of closed page builders accurately and fairly; not every existing WordPress/Squarespace site warrants migration. Verify client editability, search preservation, costs, security, DNS/domain ownership, integrations, hosting and rollback in each proposal.

## 0. Approved commercial direction | November 19, 2026

**This section supersedes every historical fixed-package pricing instruction elsewhere in this file or in the November 15 audit.** ATG Consulting is a **product-enabled technology consultancy**, not primarily a fixed-price SaaS subscription. The business-owner decision is approved for implementation planning, **not yet deployed as code**.

**Promise:** *Your Business. Modernized.* ATG helps small businesses and individuals improve business performance and their digital presence through go-to-market and sales strategy, website/application development, operational systems and practical AI implementation. Lead with meaningful outcomes and accountable execution, not cheap development or inexpensive AI tools. The differentiation is not getting AI answers, but designing, configuring, testing, teaching, and supporting repeatable **customer-controlled workflows**. Safe, approved low-risk processes may run automatically; consequential actions require consent and appropriate review. Client-owned platforms execute client email, calendar, CRM and recurring automations, never ATG servers acting on their behalf.

**Customer positioning:** Local-first in Castle Rock, Douglas County, Denver and neighboring communities, serving businesses and individuals throughout the U.S. Trades, ranch/equestrian businesses, service providers, contractors, retailers and professionals are examples of relevant audiences, not stereotypes about technical literacy. Keep a separate personal/household service path. Never limit site lead capture to Colorado or imply local-only delivery.

### 0.0 Strategic differentiation, founder-led credibility, and pricing posture

**ATG's principal advantage is business-to-technology execution.** The founder combines more than a decade in sales, partnerships, GTM and business development with end-to-end hands-on website, web/mobile application and AI-enabled product building. This enables ATG to diagnose the commercial problem, decide whether it calls for improved GTM, a modern website, a streamlined process, a software integration or custom development, then scope and execute it. Avoid overclaiming that one person is an expert in every specialty or that all projects can be delivered solo without collaborators.

**Approved capabilities, not package prices:** websites/logo/brand design; AI-assisted sales and marketing workflows; business process automations; personal productivity workflows; scoped custom web/mobile development; and optional fractional technical partnership. Sales/GTM experience supports sound automation decisions rather than authorizing traditional advertising services. The more specific six-capability grouping above governs public copy.

**Commercial delivery modes, not separate fixed-priced SKUs:** collaborative implementation/teaching, a fully scoped hands-on build, or an ongoing fractional technical partnership. **Complete Business Modernization** is the flagship bespoke engagement combining strategy, website/application work and AI-enabled operational improvements. Free resources and an assessment remain an acquisition/education channel.

**Premium value pricing principle:** do not position ATG as a cut-rate AI website shop or discount fees because AI reduces implementation hours. Price for professional judgment, scoping, project responsibility, delivery risk, quality, time saved and credible business value, subject to an internal profitable delivery floor and the client's ability to justify the investment. Publish no arbitrary fixed price floor or universal ROI promise. Sales and negotiation are differentiators, not reasons to hide commercial terms: each accepted engagement receives an explicit, comprehensible written quote.

**Founder credential guidance:** use *Founder & Principal Consultant | Business Strategy, Technology & AI* as the default public professional title. State documented expertise as roughly 12 years in sales/business development, nearly a decade building and improving websites/digital operations, and three years hands-on AI-powered development. Fandomly, TruDeF.AI and AgentSEO.guru are founder-built technology portfolio examples, **not client testimonials**. Verify that each product is accurately described before publication. Lead with the unusual combination of commercial judgment and technical execution, not a claim that any developer or competitor is less capable.

**Buyer proposition:** businesses pay to avoid uncertain diagnosis, learning curves, coordination across suppliers and implementation/maintenance risk, even where software and information are freely accessible. ATG sells a well-defined outcome and transfer of capability, not access to an AI chatbot. Client-controlled automations may run after configured, authorized triggers and review gates; ATG does not execute customer messages or scheduled workflows on its own servers.

### 0.1 Services offered and how they are sold

| Core service | Client outcome | Pricing and delivery |
| --- | --- | --- |
| **Website & Brand Design** | Website creation/redesign/migration, logo design/refresh, responsive UX, content structure, lead capture, technical SEO foundations, launch and handoff | Standalone custom proposal or combined project |
| **AI Sales & Marketing Workflows** | Prospect research, lead qualification, outreach drafts, follow-up workflows, AI content planning and reporting, inside customer-authorized tools | Custom workflow scope; not traditional advertising buying or campaign management |
| **Business Process Automation** | Diagnose repetitive tasks, implement AI routines and integrations, test permissioned triggers, document and teach client-owned workflows | Scoped consulting and implementation |
| **Personal AI & Productivity** | Personal organization, planning, digital routines, AI setup and training | Personal assessment and bespoke support |
| **Custom Development** | Web applications, internal tools, integrations and carefully scoped mobile software projects | Explicit requirements, milestones and custom price |
| **Fractional Technical Partner** | Agreed technical guidance, website maintenance and improvements, workflow adjustments, vendor coordination and support | Optional separate agreement with limits and response expectations |
| **Complete Business Modernization** | A tailored combination of website/branding, business workflows, custom technology and hands-on training | Flagship multi-workstream consulting proposal |
| **Free Assessment & Resources** | Preliminary diagnostic, education, demonstration and lead qualification | Free entry point, not a subscription |

**The old Self-serve / Guided / WHITE_GLOVE labels are currently technical tier/entitlement identifiers, not final public service categories or compulsory 3/5-session packages.** Preserve schema and historical entitlements while migrating. Existing $997/$1,497 Guided and from-$3,500 DFY prices are *historical implementation*, not the new public price policy. Do not create alternative fixed-price price cards.

**Founder positioning:** use the verified, integrated narrative in section 0.0. Demonstrate breadth in GTM, sales, partnerships, web/mobile products and AI through accurate project examples; never invent paid client success stories, ROI or certifications.

**Technology selection:** Don't default to migrating every WordPress/WYSIWYG site. Diagnose the actual editing workflow, CMS requirements, performance, SEO history, accessibility, cost, ownership and security. Provide redirects, URL/metadata preservation, staging QA, backup/rollback, analytics validation and client-controlled domains/hosting when migration is justified. Define third-party software/hosting/API charges separately. ATG's app remains a planning and tracking layer, not an unauthorized execution system for customer data.

### 0.2 Proposal-led sales architecture

**Free assessment/inquiry → short free qualification/discovery call → fit/no-fit decision → reviewed custom proposal (or paid scoped diagnostic when discovery is insufficient) → explicit customer acceptance → authorized deposit/invoice payment → implementation → tested acceptance and handoff → optional separately contracted support.**

- Do not automatically generate a binding proposal after every meeting. Qualify business needs, decision authority, scope feasibility, urgency, budget, dependencies and next actions.
- Build all quotes from *workstreams and deliverables*, not preset subscription or session counts. A website-only, automation-only, individual, or bundled project must all work.
- Each proposal must include exact quoted fee/currency, itemized scope, dependencies, exclusions, deliverables, acceptance criteria, payment schedule, anticipated third-party costs, change orders, timeline, ownership and support terms. All published quotes and legal terms require operator approval.
- Internal scoping should account for labor, costs, risk, margin and credible customer value. Do not invent ROI or customer outcomes. Deposits and milestone splits are negotiable proposal terms, never universal pre-authorized charges.
- The client must know how to review, modify, pause and manage the installed customer-owned automation; human review can be applied per risk/authorization rather than required on every harmless run.
- Record the first three paying engagements' lead source, quote, negotiations, scope changes, actual hours, costs, accepted outcomes and support demand. This is learning evidence, not statistically validated market pricing. **There are zero paying clients as of this decision.**

### 0.3 Website, marketing and checkout migration requirements

**Replace public pricing blocks, fixed-dollar CTAs, and "buy a 3/5-session package" positioning** with:
- Service-focused homepage: *Your Business. Modernized.* Website/logo design, practical AI workflows and hands-on technical consulting, locally rooted and nationally available. Show concrete owner-operated business examples and carefully distinguish self-built products from client work.
- Six clear service capabilities (website/branding, AI sales and marketing workflows, business automation, personal AI, custom development and fractional technical support) plus a combined modernization offer. Sales/GTM background informs implementation rather than advertising-agency claims.
- `How We Work` section: assessment → discovery → tailored proposal → implementation/handoff.
- A prominent **"How much does this cost?" FAQ**: no single price fits every client; the initial assessment and short consultation are free; a tailored quote follows discovery; more extensive diagnostics can be separately quoted; software/hosting charges and optional support are disclosed.
- Primary CTAs: **Start Free Assessment**, **Schedule a Consultation**, **Request a Proposal**. Reserve **Apply** for genuinely capacity-limited projects. Provide direct website project inquiry as an alternative to completing a long AI assessment.
- Accessible copy and local trust signals without geographic limitations; accurate founder portfolio rather than invented testimonials.

**Stripe does not disappear.** Retire new fixed-price checkout at the API boundary immediately, while keeping live billing inactive. Proposal-based custom invoices, deposits, milestone payments and separately authorized support require subsequent implementation and test-mode verification. Keep the old Stripe products and historical data available for reconciliation. Do not simply delete billing code or change existing entitlements. Search and update every stale fixed-dollar reference in `Tiers.tsx`, landing-page components, proposal-generation fallbacks, `stripe.ts`, billing routes, intake defaults, legal/refunds, portal purchase prompts, SEO metadata and emails. A customer-accepted versioned quote and valid payment evidence are prerequisites to granting any scoped entitlements.

### 0.3a Implementation sequencing: homepage first, billing safeguards alongside it

**Workstream W1 | Homepage and messaging (first):**
- Audit current `Hero.tsx`, `Services.tsx`, `Tiers.tsx`, `FAQ.tsx`, `HowItWorks.tsx`, `SheaOperator.tsx`, `CTA.tsx`, `home.tsx` and global navigation, metadata and legal links.
- Lead with business outcomes, credible founder-built proof, three service pillars, a bespoke full-service option, local and nationwide availability, individual support, and a consultative CTA.
- Replace public tier/price cards rather than simply hiding numeric amounts. Keep the free assessment and a reachable consultation/inquiry route. Do not promise an available booking system unless the link is confirmed live.
- Explain the comparison accurately: ChatGPT can answer questions and connect apps, while ATG diagnoses and helps configure maintained systems in the client's environment. Do not imply ATG operates customers' email/calendar/CRM or that every workflow needs constant manual approval.
- Update `How much does this cost?` FAQ, old “buy/upgrade/tier” copy, founder profile, and SEO/social metadata. Do not add invented customer logos, third-party endorsements, measurable results or testimonials.
- **W1 acceptance:** desktop/mobile screen review, working inquiry links, one clear buyer journey for local and remote prospects, no public paid package prices or contradictory existing pricing statements.

**Workstream W2 | Safe fixed-price checkout retirement (parallel safety cutover, before homepage release):**
- Inventory frontend checkout triggers, deep links, backend `POST /api/billing/checkout`, Stripe webhook fulfillment, DFY optional subscription behavior, pricing environment variables, client billing pages and refund/legal references.
- Add a fail-closed **new-client checkout mode** or equivalent server-side guard that prevents initiating generic GUIDED/WHITE_GLOVE fixed-price checkout even if a visitor uses an old deep link. Return a clear consultation/proposal next step. Do **not** indiscriminately set `BILLING_ENABLED=false`, as that may also disable existing customer portal and webhook handling.
- Maintain verified webhook signature/idempotency and the ability to reconcile historic paid sessions, refunds and existing subscriptions; do not delete historical Stripe products or silently cancel an agreement.
- Avoid automatically creating new $750/month care, defaulting proposal prices from session counts, or auto-granting tiers on an unaccepted quote.
- **W2 acceptance:** direct API calls to old checkout fail safely; customer portal and existing webhook handling remain intact; no unexpected charge; no client balance/grant regression.

**Workstream W3 | Custom quoted commerce (next, after W1/W2):**
- Exact accepted proposal version and negotiable workstreams, USD fee, deposit and payment milestones; client-visible consent and approval record.
- Stripe invoice/deposit/milestone payment links from the accepted quote, correct amounts and webhook metadata, with idempotent invoice/payment processing and contract-aware entitlements.
- Test payment mismatch, partial payment, refunds, duplicate/delayed/out-of-order events and post-acceptance scope changes before enabling real billing.
- **W3 acceptance:** a test client accepts one custom quote, pays the intended staged amount, and receives only the specified service entitlements; no silent recurring contract.

**Delivery dependency:** do not remove public prices and leave the visitor with a broken purchase or consultation experience. Publish W1 and W2 as one coherent safe sales-flow release. W3 may ship later because quoting and invoice collection can be handled deliberately while automated billing is under construction; never imply in-app payment is available until tested.

### 0.4 Engineering boundaries and phased acceptance

- Keep existing Clerk authentication, Prisma/Postgres, React/Vite, Express and xAI/Grok fallback unless separately approved.
- Build a coherent service-intent taxonomy (`website`, `automation`, `combined`, `fractional_support`, `personal`, `unsure`) into intake and fit call, with conditional website fields (URL/CMS, content/editing needs, pages, conversions, integrations, SEO migration risks, timeline, estimated budget) and shared questions asked only once.
- Version accepted proposals with quoted USD amount, workstreams, invoices/deposit/milestones, customer authorization and change orders. Distinguish quote approval, customer acceptance, payment receipt, start of service, milestone signoff and delivery completion.
- Extend the project/task/workstream model for website work as well as AI implementations; avoid duplicate task stores. Document client content dependencies, DNS/hosting change approvals, backups, regression checks and handoff.
- Run a migration inventory, tests and authenticated staging journey before removing legacy checkout. No new fixed price charges or automatic recurring care enrollments.
- The November 19 Phase 5 migration SQL has been reviewed as additive, not yet confirmed as applied. Do not label the live fit-call/proposal journey verified before the user tests it.

## 1. What we are building

ATG is a proposal-led website, AI automation and technology consultancy serving individuals and small businesses. Guided and Done-for-You describe possible delivery methods, not public fixed-fee shopping-cart packages. Its customer value is the completed journey:

**Discovery/assessment → relevant first pilot → structured fit call → reviewed scope and commercial decision → payment/entitlement → customer-owned implementation → verified acceptance and handoff → sustainable support.**

The app should diagnose, prescribe, preview, document, and track. Customer-owned platforms execute customer email, CRM, calendar, and automations. The ATG administration team's own Google account can be used for its internal prospecting and approved proposal documents. **Do not confuse ATG operational connectors with authorization to access customers' accounts.**

Retain:
- **Approved current commercial model:** the proposal-led consulting architecture in section 0 replaces those historic fixed package fees as the sales model. No new preset memberships, universal session prices or automatic care subscription has been approved.
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

### P0 | Consulting conversion, commercial integrity and cash-relevant delivery

**P0-0: Consulting sales-model and website conversion cutover (new prerequisite).**

- Implement section 0.3's service pillars, direct website inquiry, free assessment/discovery, cost FAQ and custom proposal CTAs, replacing public package prices.
- Add service-intent branches and website-specific fit-call data; preserve the personal pathway and existing customer-side functionality.
- Identify all fixed-price entry points and retire new-client generic Stripe checkout safely, without deleting historical products or billing records.
- Make proposal workstreams, custom quote, milestone/deposit terms and deliverable acceptance the inputs to any new purchase and fulfillment code.
- Verify end-to-end synthetic website-only, AI-only, combined and personal paths, including a declined/no-fit path.
- **Exit:** visitors can inquire about real services and receive tailored quotes without entering a fixed-price purchase funnel.

**P0-A: Custom consulting commercial integrity and proposal lifecycle (supersedes historical batch B).**

The Phase 5 proposal has approval and a delivery snapshot, **but not a complete immutable purchase-and-fulfillment ledger**. Before enabling wider paid checkout, implement:
- Accepted proposal identity and immutable version/hash shown to the accepting user, tied to approved scope and exact quoted price.
- Explicit separation of prospect conversion, acceptance, order/payment receipt, entitlement, Guided package size and optional DFY care.
- Idempotent fulfillment for concurrent, duplicated, delayed and failed Stripe events; never reset used session counts.
- Replace fixed Guided 3/5 and DFY checkout with accepted custom quote amounts, deposits and milestone invoices verified against Stripe test-mode records; no placeholder amount or deprecated package price may become a new charge.
- Separately accepted fractional technical support/recurring care with agreed capacity, fees, cancellation/refund terms and retention of already granted rights.
- Durable pending/running/failed/completed generation jobs and recovery, with source revision validation. Do not silently regenerate a commercially accepted proposal.

**Exit criteria:** repeated and out-of-order events do not duplicate payment fulfillment or overwrite project rights, and every invoice, entitlement and delivery commitment maps to a specific accepted, custom-priced scope.

**P0-B: Consultation / website build / AI implementation → decisions → client tasks → accepted delivery (historical batch E).**

Build on existing `Consultation`, `SessionRecord`, `ActionItem`, `ClientPlaybook`, and client task infrastructure. Add website migration/launch milestones and customer content dependencies without duplicating data models.
- Use a stable identity connecting scheduled/completed consultations to the actual SessionRecord; reconcile same-day calls and recording/consent status.
- Distinguish completion of a real Guided session from package consumption with an idempotent ledger; don't double-count or consume on mere scheduling.
- Preserve authorized transcript/source segments, clearly report partial processing and references; do not process unconsented recordings/transcripts.
- Draft structured decisions and action items; consultant reviews owner, due date, evidence, client visibility, and milestone relationship before publishing.
- Project approved action items to the customer task view exactly once; support status and evidence changes without duplicating tasks.
- Flag delivery guides/playbooks stale on material approved changes, including website migration/launch revisions; prepare private drafts without overwriting customer-published versions.
- Surface processing failures, stale approvals, missing client website assets, hosting/DNS launch blockers, retries and responsible operator actions in one admin work queue.

**Exit criteria:** schedule → prepare → consented source → private summary → reviewed recap → approved tasks → verified acceptance → updated private/client guidance forms a traceable, retryable, correctly entitled journey.

**Sequencing:** P0-0's conversion changes precede any new payment experience. P0-A and P0-B can be designed together around one project/workstream identity, but deploy financial/entitlement mutations only after custom quote and invoice-ledger tests. Session data linking and draft action workflows can proceed independently behind safe gates.

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
- Canonical assessment profile across current selection IDs, legacy inputs, website/AI/combined service intents and household/business splits.
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

## 6. Commercial decisions and remaining approvals

**Approved:** a full-service, local-first and nationally available consultancy that delivers website modernization, AI implementation, fractional technical guidance and complete business modernization; custom proposal-led pricing replaces fixed public package checkout. This changes the implementation roadmap, not the live website or payment configuration.

**Not decided:** enforceable standard terms for deposits/refunds, exact support hours/response times, tax treatment, hosting ownership/transfer conditions, insurance or warranties, optional care rates, and whether/when to offer any future standardized service. Do not insert invented legal or financial obligations into product code.

## 6.1 Non-goals and decisions not yet approved

Do not implement without a separate business/technical decision:
- $29/month Self-serve or $299/month Guided memberships from the original audit.
- Automatic customer email/calendar/CRM operations on ATG's infrastructure.
- Unreviewed client proposal publication, automated Docs sharing, automatic outreach or automatic CRM stage changes.
- Unvalidated payment activation, recurring care opt-in, or changing purchased Guided session balances.
- Broad transcriptions or third-party recording import without documented source rights and consent.
- Replacing xAI/Grok or reintroducing fixed subscription/package checkout without a separate owner decision.

## 7. Engineering and delivery contract for every subsequent phase

1. Inspect `main`, this document and the appropriate historical audit findings before changes. Reuse existing models and routes.
2. Scope one coherent business outcome with concrete server/API, frontend, data model, privacy, backward-compatibility, failure/retry and acceptance criteria.
3. Default to no new vendors or recurring cost. Test with synthetic records and mock external services before touching customer or financial data.
4. Keep separate flags for source merged, typecheck/build, automated tests, actual migration, authenticated UI, provider write and production deployment.
5. Require narrow approvals for sharing, payments, tasks, customer-visible reports and external actions. Favor revision tokens and immutable accepted snapshots over silent replacement.
6. Replit follows GitHub `main`: merge a reviewed PR, pull `main`, then run Prisma generation, typechecks, relevant/full tests and build. Never equate a successful `prisma generate` with applied SQL.
7. Validate destructive/durable changes with backup and rollback. Record the precise failure and fix instead of repeatedly expanding scope.
8. Mark a capability live only with observed authenticated evidence; report empty source data as empty, not a successful provider end-to-end check.

## 8. Updated implementation order

1. **Phase 5 acceptance:** verify the intended database schema was actually applied and run a synthetic assessment → fit call → approved proposal → accepted entitlement/playbook scenario. Keep Docs and Sheet writes gated.
2. **W1 + W2 highest-priority coordinated release: homepage and safe fixed-price checkout retirement.** Lead with websites/branding, AI sales and marketing workflows, business automation, personal AI, custom development and fractional support; replace price cards with services, How We Work and FAQs while server-side old checkout is blocked. Preserve historical Stripe events, client balances and customer portal access.
3. **W3 / P0-A: Custom proposal commerce.** Scoped workstreams, precise USD quotes, approved revisions and acceptance, deposits/invoices/milestones, Stripe test-mode reconciliation and explicit optional support. Do not misrepresent W1/W2 as a finished quote-to-cash system.
4. **P0-B: Service delivery.** Unify consultation, web projects and automation implementation with reviewed tasks, milestone evidence and handoff, preserving consent and purchased entitlements.
5. **P1/P2:** secure document storage, website launch/handoff playbooks, assessment optimization and separately contracted fractional support.
6. **P3:** only after active leads/customers justify it, revisit Calendar, prospecting enrichment or additional connectors.

**Operating rule:** ATG's client-owned workflow execution boundaries remain unchanged. The refreshed consulting business model is approved for planning, but no customer-facing commercial change is live until implementation, testing and deployment are separately verified.
