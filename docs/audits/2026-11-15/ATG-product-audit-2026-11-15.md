# ATG Consulting: product and delivery audit

> Historical audit baseline at `3dbff3e`, recorded before implementation. The approved first batch is tracked in [the implementation and verification record](../../private-drafts-sharing.md). Statements about unchanged files and proposed work describe that earlier audit, not this implementation branch.

Prepared for Shea • November 15, 2026 • Audit and proposal only

**Source of truth:** [GitHub main at 3dbff3e](https://github.com/sheacurran311/atgconsulting/tree/3dbff3ede885b23f65cd7d8c033a5208861d9b24). The separate audit checkout is on main at that exact commit. Its tracked files remain unchanged. No product changes, database changes, billing changes, provider changes, commits, pushes, or deployment were performed.

## Executive assessment

ATG has a substantial consulting portal, a working deterministic assessment implementation, an operator workspace, and a useful customer operating-guide foundation. It is ready for focused hardening and controlled delivery trials. The evidence does **not** establish a fully verified production service.

The principal risk is inconsistent treatment of private drafts and customer publication. The dashboard serializes private operator notes. Resources and AI context can use unapproved tool recommendations; report refresh explicitly approves its new tool plan. Re-summarizing a shared session overwrites its customer recap without a fresh approval. Proposal HTML also interpolates unescaped prospect input.

The recurring-service ambition is ahead of the commercial model. Self-serve and Guided are implemented as one-time packages. DFY has a setup purchase and an environment-dependent recurring care line; the customer cannot choose that care option separately in the current checkout. Tier assignment controls most paid capabilities, while a payment-confirmation audit entry separately controls personalized playbook generation. These are different concepts today.

The portal mostly stores plans, drafts, reported progress, and evidence. It does not operate customer inboxes, calendars, CRM systems, phone calls, school transportation, or grocery orders. Those outcomes require customer-owned execution platforms, configuration, testing, and explicit handoff.

**Recommendation:** approve the small “Private drafts and approved sharing” batch in the companion implementation plan. Address payment reliability and the assessment-to-session delivery loop next. Preserve existing prices, entitlements, branding, and homepage sections.

## 1. Scope, provenance, and evidence limits

Repository instructions read: HANDOFF.md, .cursor/rules, docs/operations-launch.md, docs/DESIGN_SYSTEM.md, relevant prior launch notes, package/workspace configuration, and the checked-in memory file. No AGENTS.md was found in the audited repository. The memory file was empty.

The two older local folders were left intact:

| Folder | Local state | Reconciliation |
| --- | --- | --- |
| atgconsulting | main at bff29ea, with local modifications | All 12 changed/new project files match versions in merged PR #49 history. Six route files also exactly match current main. Remaining differences are older revisions. |
| atg-enhancements | main at 465f7e2, with local modifications | All 56 changed/new project files match current main, allowing for line endings. |
| audit-current | clean main at 3dbff3e | Fresh isolated checkout used for this audit. |

No stranded application work was found. Local test dependencies, logs, and screenshots are separate from product source. GitHub confirms [PR #49](https://github.com/sheacurran311/atgconsulting/pull/49), [#50](https://github.com/sheacurran311/atgconsulting/pull/50), [#51](https://github.com/sheacurran311/atgconsulting/pull/51), [#52](https://github.com/sheacurran311/atgconsulting/pull/52), and [#53](https://github.com/sheacurran311/atgconsulting/pull/53) were merged. A commit message saying “Published your App” is not proof of the code or configuration currently served.

Evidence labels used below:

- **Reproduced:** controlled handler-level probes using simulated records and services.
- **Suite:** existing automated tests run in this audit.
- **Source:** implementation traced; not exercised against production.
- **Visual:** downloaded repository PDF rendered and inspected.
- **Unverified live:** requires authenticated Replit access or configured provider/database access.

The only repository-approved application URL redirected to Replit’s “Log in to access a private app” page. No app login was available. No alternative application host or local development server was used. No real customer data, live payments, real emails, or paid model calls were used.

## 2. Current product map

| Person | Reachable implementation in source | Important limits |
| --- | --- | --- |
| Anonymous visitor | Branded homepage, audience selector, services, sample outputs, calculator, comparison, process, Shea introduction, pricing, FAQ, one-pager, public blog/tools/catalog APIs, email-first assessment | No account required for assessment. Approved assessment delivery is an operator email action. Live content and email delivery unverified. |
| Prospect after assessment | Saved submitted assessment, private analysis attempt, 20-minute fit-call CTA, optional signup, operator qualification/proposal workflow | Booking is an external link or email request. No booking synchronization. Approval does not by itself email the report. |
| Verified free account, tier NONE | Prospect Client record, matching-email assessment linking, portal status, approved proposal, general resources, account/profile | Most portal pages require a linked intake. Some APIs allow more than their UI suggests: tool-plan generation, coach, support, messages. There is no coherent small free allowance. |
| Self-serve | Approved tool plan, workflow templates and draft generators subject to template minimum tier, workshop, resources, documents, published operating guide if supplied | Full delivery playbook requires assigned tier, confirmed payment, and consented assessment. Session recaps excluded. Some promised platform-specific guidance is still generic or template based. |
| Guided | Self-serve foundation, 3/5 session balances, operator messaging UI, consultation/action records, shared session recaps, guided install material | Scheduling, consultation tasks, transcript records, and AI summaries are separate stores. No automatic shared action-item synchronization. |
| DFY / WHITE_GLOVE | Guided-like portal capabilities, DFY application/cap, account-access log, delivery guides, custom-workflow records, optional Stripe subscription path | No customer-account execution or telemetry. Care scope is text, not an enforced service ledger. Deposit and milestone billing are absent. |
| Admin / Shea | Today board; client directory/detail; Brief, Prep, Playbook, Operations, Sessions, Access; discovery, proposals, reports, messages, tiers, catalogs, tools, workshop, content, AI health/usage, audit history, view-as-client | Some tasks require manual coordination across screens. No durable unified work queue for model generation/delivery. Some failures are swallowed. |

The full feature inventory with UI entry points, APIs, models, access rules, behavior, and validation status is in **feature-inventory.md** alongside this report.

## 3. Critical findings

Severity: **P1** should be addressed before a wider customer launch or the affected capability is enabled. **P2** materially weakens delivery or maintainability and belongs in the next phase. No P0 production incident or exploitation was established.

### F01 — P1: private client notes reach the customer’s browser

**Reproduce:** place a recognizable private note on a client, then request GET /api/client/dashboard as that client. The response includes client.notes because the route returns the complete Client object. A controlled probe returned an admin-only sentinel.

**Impact:** an operator’s private comments are accessible through the response even though the React page only uses data.home. The schema and admin editor explicitly describe these notes as private.

**Correction:** return an explicit customer data projection; audit other customer response shapes for private fields. Keep raw database objects out of public/customer response contracts. [Dashboard serialization][E01]

### F02 — P1: proposal export renders unescaped prospect HTML

**Reproduce:** a prospect supplies markup as their name/company or another interpolated field. Generate a proposal and open its HTML export. The template inserts that markup directly into the document. The probe confirmed an image element with an event-handler attribute survives into the HTML; no script was executed.

**Impact:** stored HTML/script injection in an admin-opened, same-origin document. This is a code-confirmed vulnerability, not evidence of an actual attack.

**Correction:** escape every plain-text interpolation and use a safe, constrained renderer for intended rich text. Add adversarial export tests and a restrictive export content-security policy as an additional defense. [Proposal HTML][E02], [sanitizer][E03]

### F03 — P1: the “Shea reviews it first” rule is bypassed in several paths

**Reproduce:** leave only a draft ToolPlan, then request /api/resources/tools. The draft’s recommendations are returned. AI coach context also selects draft or approved plans. POST /api/ai-assist/report-refresh creates a ToolPlan with approved status and an approval timestamp without an operator approval action.

**Impact:** customers can receive unreviewed advice despite the homepage, My Plan screen, and original generation route promising operator review.

**Correction:** use only the current approved version for customer resources and coach context; route refresh output to draft; keep the previous approved version visible until Shea publishes a replacement. Resources behavior reproduced; coach/refresh traced. [Resources][E04], [coach context][E05], [automatic refresh approval][E06]

### F04 — P1: resource and lesson access rules are inconsistently enforced

**Reproduce:** as tier NONE, GET /api/modules returns a paid module’s full body and marks it locked. The detail endpoint does enforce a tier check. A knowledge article tagged for GUIDED is returned by direct slug lookup without a tier check. The knowledge list falls back to all articles if its relevance filter matches none.

**Impact:** a hidden/locked interface is not an access boundary. Tier tags currently act inconsistently as relevance hints and access rules.

**Correction:** return metadata only for locked module rows. Define whether knowledge tier tags mean eligibility or relevance, then enforce that decision in both list and detail routes. Keep public catalog content public. Controlled probes confirmed both response defects. [Legacy module list][E07], [knowledge detail/filter][E08]

### F05 — P1: shared session recaps can change without fresh approval

**Reproduce:** share a recap, change the transcript, and summarize again. The summary endpoint writes recapText immediately and leaves shareRecap true. The customer now receives the regenerated recap. This also succeeds with consentGiven false. The admin UI has a share toggle but no recap editing control.

**Impact:** unreviewed regenerated text can replace an approved deliverable. The stored consent field is informational rather than an enforced processing boundary.

**Correction:** separate generated draft text from the published recap snapshot; provide editing, explicit publication, and stale-version checks. Honor recorded authorization for transcript processing and distinguish operator notes from captured transcripts. Reproduced with a fixture. [Summary write][E09], [admin session UI][E10]

### F06 — P1 before billing enablement: a payment retry can reset consumed sessions

**Reproduce:** process a paid Guided checkout; let the later playbook lookup/generation fail before StripeEvent is saved. Use one Guided session. Retry that same webhook. The handler writes guidedSessionsUsed = 0 again. The probe reproduced this sequence with mocked Stripe and database operations.

**Impact:** entitlement corruption and repeated downstream work. Event deduplication is checked before processing and recorded after all effects, without one transactional claim. Model work also extends webhook response time.

**Correction:** atomically persist the payment and grant a package once per purchase. Queue playbook drafting separately. Handle duplicate and out-of-order events, retries, and partial failures without rewriting consumption. Preserve historical grants and balances. [Checkout fulfillment][E11], [event handling][E12]

### F07 — P1 before billing enablement: checkout does not represent the advertised choices

Guided checkout always obtains STRIPE_PRICE_GUIDED. A requested five-session package changes metadata/entitlements but does not select STRIPE_PRICE_GUIDED_5 as the charged price. DFY automatically includes recurring care whenever a monthly price variable is configured; there is no customer care opt-in in the request. Proposal acceptance is not required by checkout. DFY deposits and milestone payments have no model. Actual Stripe product amounts are external and were not inspected.

Subscription cancellation pauses status but retains the tier, while workflow/workshop checks primarily evaluate tier. This requires an explicit retained-deliverables versus active-care policy; automatically removing all purchased access would also be wrong.

**Reproduce:** trace a Guided checkout with requestedSessions = 5 and both price IDs set; inspect the line item and metadata. For DFY, set the monthly price and inspect the request schema/line items. Source-confirmed; no live checkout performed. [Checkout selection][E13], [price mapping][E14], [tier access][E15]

### F08 — P1: converting a prospect can grant paid capabilities without a purchase

**Reproduce:** a new prospect’s report recommends GUIDED. Use Convert to client. The created Client receives tier GUIDED and status PROSPECT without a payment check. Paid workflow checks look at tier, not prospect status or a payment receipt. A fixture reproduced the assigned tier.

**Impact:** conversion and entitlement assignment are conflated. Verified signup correctly leaves tier NONE, so normal entry points disagree.

**Correction:** conversion creates/links a prospect only; record a separate explicit entitlement grant after payment or an operator-authorized exception. Do not silently revoke existing historical entitlements. [Conversion][E16], [verified provisioning][E17]

### F09 — P1 for reliable agreements: accepted proposals remain mutable

**Reproduce:** accept an approved proposal, then edit its scope through the admin PATCH endpoint. Its approved status and acceptedAt remain. Generation also upserts into the same proposal row without a new version.

**Impact:** the record can appear to show that a customer accepted terms different from those they saw. The acceptance endpoint itself chooses the latest proposal instead of requiring the exact displayed version.

**Correction:** immutable published/accepted proposal versions, explicit reapproval, acceptance against an expected version/hash, and a purchase tied to the accepted scope. Reproduced mutation; acceptance selection traced. [Proposal edit][E18], [portal acceptance][E19]

### F10 — P2: submitted-assessment editing leads back to a locked session

**Reproduce:** finish an assessment, then choose Review your assessment or the account edit link. /client/intake/prefill returns the submitted session ID; edit mode calls the resume endpoint for that ID. /discovery/next rejects submitted assessments with 409.

**Impact:** pre-submission Back/edit works, but later updates do not follow a usable path. A later assessment cannot reliably refresh delivery context through the promised UI.

**Correction:** create a new linked revision prefilled from the prior assessment; preserve the original submission and downstream source references. Source-confirmed; locked-session behavior also exercised in probes. [Edit entry][E20], [prefill][E21], [submitted-session guard][E22]

### F11 — P2: selection answers are stored but personalization loses important meaning

The newer assessment stores top_problems, ai_tools_today, support_preference, frequency, effort bands, boundaries, and owner selections. Legacy personalization expects areas, timeSinks, aiPlatforms, and numeric ai_comfort. A fixture containing ChatGPT and a household priority produced empty aiPlatforms, timeSinks, and areas. Tool names do survive in the general tools string.

Operating-guide defaults depend on audience, so a personal-email-only priority still receives school/sports and travel candidates. These are explicitly candidates, but they are not genuinely selected recommendations. The model playbook receives audience/priorities/boundaries and embeds an operating guide, so it is not wholly disconnected; frequency, effort, approval preference, and support preference are not consistently included in the model context. Proposal prompts use only the first 20 answers, which can omit the later fields in a combined journey.

**Correction:** one canonical assessment profile consumed by review, proposals, guide builders, recommendations, and playbooks; choose one first pilot after qualification; preserve all raw answers and identify missing data. [Normalizer][E23], [ranking][E24], [default guide][E25], [playbook prompt][E26]

### F12 — P2: playbook creation has useful guards but incomplete recovery/update semantics

The automatic helper checks for any existing playbook, checks paid tier/payment/consented linked assessment, generates outside a transaction, then locks the Client row and rechecks before inserting the first draft. This prevents duplicate first rows under the intended PostgreSQL lock, but concurrent requests can still perform duplicate model work. Manual regeneration reads the next version and creates outside a lock, and ClientPlaybook has no unique client/version constraint. “Latest” sorts status alphabetically ascending, which puts draft before final despite the comment.

Manual link and Convert do not call the helper. Session updates do not automatically mark a playbook stale. Any existing draft prevents automatic replacement, even a template fallback that needs another attempt. There is no durable pending/running/failed job record.

**Correction:** centralized eligibility and trigger handling, retryable jobs keyed by customer and context revision, serialized version allocation, visible stale/failure status, and preservation of existing operator edits. Reproduced missing manual-link trigger and readiness logic; transaction/concurrency verification used a simulated lock, not a live PostgreSQL race. [Playbook lifecycle][E27]

### F13 — P2: session errors can discard the source and Guided counting has ambiguous semantics

Session creation catches errors as null and clears the form even when saving fails. Summarization failures are hidden. Creating a guided SessionRecord immediately consumes a package use, including a future-dated record; there is no completed status on that model. Same-UTC-day deduplication avoids double counting a Consultation and SessionRecord, but also combines two legitimate same-day sessions. Changing a counted record’s type/date does not reconcile the old allocation.

Transcripts accept 120,000 characters, while the summary prompt uses only the first 20,000. The shared sanitizer collapses newlines, weakening the bullet-based fallback and speaker/timing structure. The source remains stored, but there is no visible partial-summary warning.

**Correction:** preserve unsaved input, show retryable errors, use one session identity across scheduling/notes/tasks, consume on an explicit completion, and disclose/process long transcripts in controlled chunks. Source-confirmed. [Session form][E10], [session create/count][E28], [count helper][E29], [summary implementation][E30]

### F14 — P1 before paid document delivery: production storage is unfinished

STORAGE_DRIVER=s3 or replit logs a warning and falls back to local disk; neither driver is implemented. Downloads issue a local signed URL, but the local serving route returns 403 in production.

**Reproduce:** trace an uploaded document download with NODE_ENV=production under any currently implemented storage configuration. The signed local download cannot be served. This excludes static public PDFs and the Markdown operating-guide endpoint, which use different paths.

**Impact:** a core paid deliverable can be listed but undownloadable; autoscale local disk also does not provide a durable shared document store.

**Correction:** implement one durable storage provider with tested private downloads and fail startup for unsupported production drivers. Source-confirmed; no live upload/download attempted. [Storage factory][E31], [production download guard][E32]

### F15 — P2: AI controls, limits, and operational instructions disagree

getGrokClient returns a client when a key exists regardless of AI_ASSIST_ENABLED. Assessment and coach routes add guards, but session summaries, personalized playbooks, and proposal generation call the factory without consistently checking the switch. A no-network probe confirmed the factory behavior; the ungated call sites were traced.

Usage enforcement uses the central 250k/750k/2m monthly fallback caps, while the customer usage endpoint reports 50k/150k/500k. Accounting reserves estimates before success and is not a transactional quota reservation under concurrency. Some operator generation paths have no comparable cap.

HANDOFF says email is only to Shea and tells operators to push the schema, while the newer implementation supports explicit prospect report delivery and the newer launch guide requires reviewed, environment-specific deployment. .env.example still contains unused LLM_MODEL and 30-minute booking examples. Checked-in .env files contain SQLite file URLs; no populated provider keys or network database credentials were observed in those inspected files.

**Correction:** one provider gate, one entitlement/quota policy, actual-versus-estimated usage reporting, production configuration validation, and updated handoff instructions. Retain xAI as the configured provider. [Factory][E33], [usage display][E34], [deployment guide][E35]

## 4. Assessment and conversion journey

### Verified improvements

The merged implementation includes email submission before questions; optional later account creation; business/personal/combined choices; grouped business and household priorities; unlimited selection; visible native radio/checkbox state; an explicit Continue button; Back and review editing; saved server answers and local resume metadata; answer-preserving failure handling; and deterministic branching. /discovery/next saves answers and computes the next question without an AI call.

The old null engagement-member token now passes validation and the form omits it for ordinary visitors. Email is trimmed and normalized. Duplicate submissions are claimed by an atomic consent update. Completed assessments become immutable and receive one final analysis attempt. An admin can retry analysis.

Three controlled journeys exercised realistic choices: business, personal, and combined. They saved 19, 17, and 21 answers respectively for the chosen branches, including more than three priorities. The combined run selected priorities across both headings. Failed save/retry, changing a saved answer, resume at review, padded email, null token, duplicate submit, and locked post-submission behavior were checked. These counts are examples, not fixed questionnaire lengths.

### Information quality

| Delivery question | Collected now | Remaining work |
| --- | --- | --- |
| Tasks and audience | Broad priorities, audience, optional Other | Explicitly choose one first pilot after assessment; avoid treating every selected task as purchased scope. |
| Frequency and effort | Frequency and per-round time bands | Record a measured baseline in paid discovery; preserve ranges rather than inventing hours saved. |
| Real example | Trigger categories | A walkthrough with steps and output is no longer directly collected unless typed as Other. Capture a redacted example during the fit call, detailed mapping during paid work. |
| Tools | Broad categories and AI tool choices | Named CRM/calendar/account ownership, plan/license availability, source permissions, and connector support require follow-up. |
| Desired result | Selectable outcomes | Translate into one acceptance test and evidence requirement. |
| Approvals and boundaries | Approval preference, data boundaries, owner role | Identify specific write actions, exceptions, and approver roles. Business decision authority exists; approver detail branches are not in the current assessment order. |
| Budget/support | Broad budget and support selections | Separate ATG setup, software usage, care, timeline, and purchasing authority. |

The current assessment is sufficient for preliminary qualification when read by Shea. It is not a delivery specification. Keep it quick; make the profile useful downstream before adding many more questions.

### Journey handoffs

1. **Homepage → assessment:** implemented and worth preserving.
2. **Assessment → reviewed findings:** stored and operator-reviewable; email is explicit and guarded. No customer portal endpoint/view was found that presents the approved DiscoveryIntake report itself. The claim that approval makes it visible in the portal is ahead of implementation.
3. **Assessment → fit call:** the completion CTA says free 20 minutes, but one shared VITE_BOOKING_URL is reused for different calls, .env.example uses a 30-minute URL, and fallback report copy says 30-minute discovery. Actual event length is unverified. Use distinct fit-call and paid-session links.
4. **Call → qualification:** master guidance and a client brief exist. Fit-call outcome, pilot, decision, and follow-up date are not a dedicated structured workflow.
5. **Qualification → proposal:** draft/edit/approve/HTML export and customer acceptance exist. Fix F02/F09; keep detailed build design in paid delivery.
6. **Proposal → payment:** disconnected. Checkout takes a tier, not an accepted proposal or immutable scope.
7. **Payment → onboarding:** tier changes and playbook triggers exist, but there is no unified checklist/job status showing what is missing.
8. **Delivery → care:** operating-guide stages, evidence, acceptance, incidents, and care text exist. Renewal, included changes, remaining support allowance, and periodic review are not implemented as a subscription workflow.

Keep the free 20-minute call. Suggested operator record: priority, recent example, intended result, current tools, access constraints, decision maker, setup/software budget, timing, fit/no-fit, candidate pilot, owner, and next date. For qualified Guided/DFY prospects, the next action is a reviewed written proposal.

## 5. Dashboard, sessions, and education

### What the dashboard already does well

Client Home shows assessment/proposal/plan state, purchased tier/status, Guided balance, recommended workflow states, messages, support tickets, report availability, workshop progress, DFY milestones, and access-log counts. Operating Guide supports a private draft, explicit publication, optimistic version checks, customer acceptance of a specific published version, setup-brief downloads, dated evidence, and feedback/incident reporting. Private operating notes are explicitly excluded from its customer response.

These are useful foundations. Keep the interface and refine its priority.

### Recommended customer experience

| Change | Customer benefit | Existing foundation |
| --- | --- | --- |
| One primary next action | “Review your proposal,” “Provide access,” “Prepare for Tuesday,” or “Approve your recap,” instead of exploring nine tabs | Client Home nextActions and delivery milestones |
| Purchased scope card | Understand exactly which package, workflows, sessions, support, software costs, and care were purchased | Tier/balance/proposal data; needs immutable purchased-scope record |
| Unified Sessions area | Booking/preparation, history, recap, and action items in one place | Consultation + SessionRecord + ActionItem, currently disconnected |
| Approved findings panel | Free users receive a useful result; paid customers see the rationale behind their pilot | DiscoveryIntake report exists; customer publication view missing |
| “Your pilot” first | One agreed workflow, owner, approvals, tests, and recovery; additional ideas remain backlog | OperatingGuide workflow contracts |
| Action list with owner/date/state | Know what to do between sessions | ActionItem model exists for Consultation only |
| Evidence labels and check dates | Distinguish reported progress from a tested connection | OperatingPlan evidence fields |
| Resources linked to the pilot | Learn the next skill needed to install/run the actual workflow | Workshop exercises, guides, templates, recommendations |

Navigation should converge to Home, My plan & guide, Sessions, Resources & Learn, and Account, with messages/support easy to reach. Preserve existing routes with links/redirects. Home currently links booking to /app/sessions even though that page only shows recaps; a new customer can land at “No recaps yet.” “Hours saved” currently reports runs and approved outputs, not measured time savings. Rename it until baseline/current effort is actually recorded.

### Session flow: implemented versus missing

| Step | Current implementation | Required connection |
| --- | --- | --- |
| Schedule and prepare | External booking link; manually entered Consultation dates; admin Brief/Prep | Distinct 20-minute fit call and 90-minute Guided event types; booking import; customer preparation checklist |
| Attach source | Admin creates SessionRecord and pastes notes/transcript; text upload API; recording URL | One session/customer identity, visible save errors, source format preserved, recorded authorization |
| Draft | Structured decisions, actions, changed workflows, questions, risks, next agenda, short recap; xAI or template fallback | Job status, robust long-transcript handling, traceable source/version |
| Edit/approve | API can edit recapText; UI currently displays it and toggles share | Actual editor and publication snapshot; see F05 |
| Customer sees recap | Guided/DFY endpoint returns only shared short recap/recording | Customer-visible action items and next-session preparation |
| Update plan | Manual regeneration can use five recent SessionRecord summaries | Approved decision/task projection, explicit operator-approved plan updates, stale playbook detection |
| Recover | Source stored; summarization can be rerun | Retry without overwriting published content or duplicating tasks |

This is **manual transcript input and AI summarization**, not audio transcription, live recording, a meeting bot, or a working Zoom/Meet/Teams integration. Recording links are external references. Transcript and private summary fields are excluded from the dedicated customer session endpoint.

### Resources and education

The workshop has published lessons/modules, practical exercises run in the customer’s own assistant, progress, resume, self-scored quizzes, admin publishing/reordering, and per-client progress. Its paid detail/progress routes have backend checks. Completion is a practice record, not a certificate.

Separate legacy Module/ModuleProgress, KnowledgeArticle, Tool, CatalogItem, WorkflowTemplate, and Workshop stores overlap. Knowledge filtering is personalized but is not a dependable tier boundary. Recommendations are impaired by the profile mismatch in F11. Resource browsing is not a single searchable library. Admin tools support editing, enabling/disabling, verification, link checks, and publication, but there is no consistent owner/review-date/superseded-version policy.

Recommend one resource index with audience, task, platform, minimum access, published version, reviewed date, owner, and replacement link. Each pilot should link to its setup brief, two or three relevant lessons, and a test exercise. AI coach should use only approved customer context and the published guide; it currently uses a compressed tool plan and knowledge snippets, not the full approved delivery context.

## 6. Playbooks and automation lifecycle

The **master playbook** is implemented as a code-defined guide accessible from the client directory and Playbook tabs and included in the personalized model prompt. It covers intake, fit call, proposal, paid kickoff, delivery/handoff, and follow-up. It is a concise guide, not yet a complete reusable checklist/session-agenda library. Expand it into stage templates with entry criteria, inputs, agenda, checklist, exit evidence, owner, and next action.

The **client-specific playbook** is admin-only and versioned; a tier by itself is insufficient. Eligibility requires a non-NONE tier, a PAYMENT_CONFIRMED AuditLog, and a consented assessment linked to that client. Stripe records the payment marker; an admin can attest an offline/historical payment. Existing drafts remain readable.

The **customer operating guide** is a separate OperatingPlan record, built deterministically, edited manually, and explicitly published. It is not automatically created from the finalized ClientPlaybook. Its API can create/publish a guide for a prospect with a Client record; it does not enforce payment. That is an operator publishing capability, but it means “all delivery playbooks are paid-only” is not a universal server rule across both concepts.

| Event order or condition | Current coverage | Finding / next verification |
| --- | --- | --- |
| Assessment then payment | Paid Stripe fulfillment calls helper | Readiness simulated; real Stripe/DB unverified; isolate model work from webhook |
| Payment then assessment | Submission calls helper for a linked client | Source traced; readiness permutations simulated |
| Assessment then account | Verified primary-email provisioning links matching rows and calls helper after a new link | Source and existing verified-identity tests; real Clerk journey unverified |
| Offline/historical payment | Admin confirms after assigning purchased tier | UI/API present; store invoice/reference/date and explicit operator grant reason next |
| Manual link/Convert | Does not call helper | Missing normal-entry trigger, reproduced |
| Failed model generation | Usually persists a TEMPLATE fallback as a draft | A draft is not proof of successful AI analysis; explicit retry/upgrade needed |
| Concurrent first generation | Client row lock and recheck before create | Simulated serialized transaction produced one draft; real PostgreSQL race unverified; duplicate AI work still possible |
| Duplicate events | Existing playbook prevents another automatic first draft; sequential Stripe event dedupe exists | Payment replay before event completion is unsafe, F06 |
| Manual regeneration | New version, no serialized version allocation | Fix race/version uniqueness after reviewing existing rows |
| Later assessment/session | Manual generation reads latest intake/recent summaries | Existing automatic helper exits early; no stale indicator or approved update pipeline |

Target lifecycle: source event → eligibility check → durable job → draft with source references and master version → operator edit/review → deliberate customer publication of a separate safe artifact → version-specific acceptance → later changes create another draft. Record retries and failure reasons; never overwrite an accepted deliverable or private operator edits.

## 7. Commercial structure and proposed access

### What is currently sold and enforced

| Offer | Published copy | Current billing/access implementation |
| --- | --- | --- |
| Self-serve | $197 | One-time Stripe mode; manually assigned or webhook-assigned tier; no subscription term |
| Guided | $997 for 3 × 90 minutes; $1,497 for 5 | One-time checkout; session counter 3/5; price selection mismatch described in F07 |
| DFY | From $3,500, up to 3 agreed workflows | Accepted application required; setup line; no enforceable per-order workflow allowance, deposit, or milestone ledger |
| Care | Optional scoped $750/month | Environment-dependent monthly line added automatically to DFY checkout; no distinct opted-in care entitlement/scope ledger |

Repository defaults and handoff leave billing disabled. Production flags and actual Stripe amounts remain unverified. No billing setting was changed.

A package sale and a recurring membership are different promises. Do not relabel the one-time packages as subscriptions without explicit terms and customer consent.

### Recommended structure for decision

Preserve the three implementation levels and their current prices. Deliver the purchased package first; offer an optional recurring continuation with a defined job.

| Level | Initial purchase retained | Proposed recurring continuation, not approved pricing | Sustainable service boundary for new agreements |
| --- | --- | --- | --- |
| Self-serve | $197 reviewed assessment/plan and setup resources | Self-serve membership: maintained resource library, bounded coach allowance, one quarterly plan review request | Asynchronous support only; suggest 1 consolidated question/month, 2-business-day first response; no installations, calls, or unlimited custom revisions. A suggested price experiment is $29/month after costs are measured. |
| Guided | $997/3 or $1,497/5 sessions | Guided continuation: one 60-minute working session/month, shared action review, one plan/guide revision and recap | Suggest at most 30 minutes asynchronous operator work/month, 2-business-day first response, new projects quoted separately. Suggested price experiment: $299/month. |
| DFY | From $3,500 for up to 3 scoped workflows | Keep optional $750/month care, activated only by explicit acceptance | Suggest up to 3 named workflows, one monthly health review, recovery/tuning within 2 operator hours/month, no new workflow builds or 24/7 monitoring; 1-business-day first response during stated business hours. |

These are proposals for **new agreements**, not retrospective reductions to existing rights or promises. Existing customers retain their purchased sessions, published deliverables, and agreed support. Cancellation should stop future recurring service at the agreed date while retaining access to already purchased artifacts. Do not invent a current expiry/rollover rule: choose it before selling the new memberships.

Suggested upgrade policy: existing purchase credit is defined in the proposal, sessions are never silently replaced, remaining work is reconciled, and recurring care starts separately from the project deposit. No automatic conversion or automatic monthly charge. Customer software subscriptions remain in customer-owned accounts.

Operator workload model: count actual time, including recap/review/admin. At an illustrative internal $100/hour labor cost, $29 with 10 minutes of support leaves $12.33 before AI/hosting/overhead; $299 with 1.75 hours of work leaves $124; $750 with 2.5 total hours including review/admin leaves $500. These are planning assumptions, not current measured margins. Ten Guided memberships would consume roughly 17.5 operator hours/month under that assumption; DFY capacity must include concurrent setup projects.

### Proposed access matrix

“Assigned” below means deliberately granted to that customer; admin test mode is not a customer entitlement.

| Capability | Anonymous | Free verified account | Self-serve | Guided | DFY |
| --- | --- | --- | --- | --- | --- |
| Homepage, sample outputs, one-pager, public tools/catalog/blog | Yes | Yes | Yes | Yes | Yes |
| Assessment and free fit-call request | Yes | Yes | Yes | Yes | Yes |
| Reviewed assessment findings | Approved email | Own approved results | Own | Own | Own |
| Personalized paid delivery playbook | No | No | Private operator draft after payment + assessment | Same | Same |
| Customer plan/operating guide | No | Approved findings/sample only by default | Assigned published deliverables | Assigned published deliverables | Assigned published deliverables |
| General resource starter pack | Public subset | Yes | Full eligible library | Full eligible library | Full eligible library |
| Workshop | Preview | Starter lesson proposal | Full | Full | Full |
| Workflow downloads/generation | Samples | Samples/trial only if explicitly offered | Template minimum-tier rules | Eligible templates + guided work | Eligible templates + scoped custom work |
| AI coaching | No | Small fixed trial proposed | Bounded allowance | Bounded allowance | Bounded allowance |
| Session balance/shared recaps/actions | No | Fit-call next steps only | No included calls | Purchased sessions + approved recaps/actions | Scoped sessions + approved recaps/actions |
| Messaging/support | Contact CTA | Qualification/support channel | Defined async support | Defined async support + sessions | Defined care scope |
| Billing and acceptance | No | Own proposals only | Own | Own | Own |
| Private operator notes/transcripts/admin tools | No | No | No | No | No |

Current backend enforcement does not fully match this proposal. Workflow and workshop gates are real; module-list and knowledge gaps exist; messages/support/tool-plan generation/coach have broader authenticated access than the paid UI implies; operating-guide publication is not payment-gated. Decide policy explicitly before tightening access, with an inventory of historical entitlements.

## 8. Integrations, costs, and platform boundaries

These are opportunities, not installed connections. Service links and packages in the dependency tree do not establish working integrations.

| Opportunity | Technical requirement | Operational requirement | Priority / ongoing cost |
| --- | --- | --- | --- |
| Booking → ATG session | Two event types, signed webhook processing, external event IDs, reschedule/cancel reconciliation, verified customer matching, idempotent upsert | Shea owns availability, capacity, no-shows and fit-call qualification | High. Provider subscription as selected; current account entitlement unverified. Calendly’s current FAQ says webhooks are available on all plans, but verify the exact account/endpoint. |
| Manual authorized transcript import | Stable session ID, text validation, preservation of line breaks, source/version metadata, durable summary job, publication controls | Obtain authorization; review names/actions and retain/delete sources deliberately | First choice. No separate transcription charge; model summary usage plus review time |
| Meet transcript import | User-authorized Meet/Drive access, conference/artifact IDs, event subscription or polling, retrieval retry, session matching | Eligible meeting configuration, organizer/participant permissions, approved retention and recording policy | Next. Workspace licensing and storage; not a working integration today |
| Audio-file transcription | Secure durable upload, size/duration validation, source hash, chunking, retry/idempotency, language/speaker review, deletion policy | Explicit authorization; human review; no meeting bot needed for initial version | After recap workflow is reliable. Variable audio/model/storage charges |
| Customer calendar coordination | Customer-owned connector or delegated OAuth, least scopes, event IDs, timezone handling, dedupe and watch renewal | Named household/work owner; review before writes; recovery plan and source verification | Later pilot. Customer platform/subscription costs; ongoing connection support |
| CRM/research/outreach | Customer CRM/API access, approved sources, dedupe, human approval, delivery/reply/opt-out handling, record verification | Customer owns account and communications decisions; agree exact outreach limits | Later scoped DFY pilot; CRM/automation/usage costs separately quoted |
| Grocery/travel preparation | Supported customer platform/API or approved manual handoff; draft list/itinerary and approval links | Customer reviews and authorizes any purchase; verify school/sports information at its source | Later; do not promise universal retailer/school integration |
| Artifact storage | One actual object-storage adapter, private URLs/streaming, tenancy checks, expiry, backups, lifecycle rules | Retention, deletion, restore drills | Launch requirement for paid document delivery; storage/egress priced after provider selection |

Current official pricing checked for planning, excluding storage, taxes, retries, meeting software, and operator review:

- **xAI text:** the Grok 4.7 page lists $2/million input and $6/million output tokens at the displayed standard rates. An illustrative 8,000-input/1,000-output summary is $0.022 before other charges/context pricing. This is a cost example, not a measured app bill. [xAI model pricing](https://docs.x.ai/developers/models/grok-4.7)
- **xAI file transcription:** the current Speech to Text page lists grok-voice-transcribe-2.0 at $0.10/hour REST, approximately $0.15 for 90 minutes. This is an additive option within the existing provider relationship; access and accuracy have not been tested. [xAI speech pricing](https://docs.x.ai/developers/models/speech-to-text)
- **OpenAI alternative:** official documentation lists gpt-transcribe at $0.0045/minute, approximately $0.405 for 90 minutes. It would require a separate, deliberately configured transcription adapter; merely adding OPENAI_API_KEY changes nothing in this app. The current transcription guide marks several older transcription models deprecated, so do not start a new implementation from an old Whisper tutorial. [Model/pricing](https://developers.openai.com/api/docs/models/gpt-transcribe), [transcription guide](https://developers.openai.com/api/docs/guides/transcription)

Google documents that Meet transcripts are artifacts generated by the meeting and retrieved with authorized access; API transcript entries are available for 30 days. This is different from ATG recording or transcribing a call itself. [Meet artifacts](https://developers.google.com/workspace/meet/api/guides/artifacts)

Calendar change notifications require channel management and renewal; a connection is an ongoing responsibility, not just an OAuth button. [Calendar push notifications](https://developers.google.com/workspace/calendar/api/guides/push)

Booking requirements should be verified against the chosen account. [Calendly API FAQ](https://developer.calendly.com/docs/getting-started/frequently-asked-questions)

Keep execution in customer platforms. Prefer storing external run IDs, redacted evidence, status, dates, and ownership in ATG to copying raw inbox/calendar/CRM contents into the portal.

## 9. Marketing, brand, technical foundation, and deployment

### Brand and promise

The current homepage retains the audience selector, services, examples, calculator, comparison, process, Shea introduction, pricing, FAQ, and PDF. Preserve these. The established logo and graphite/electric-blue design system are intact.

The one-pager was rendered and visually inspected: one readable page, current logo, five business examples, five household examples, existing prices, optional $750/month care, 20-minute fit-call copy, and one assessment link annotation. It describes desired service outcomes. Calling prospects, CRM updates, calendar coordination, and grocery preparation are not native, connected portal features.

Consistency gaps: the PDF states $3,500 while the site says “From $3,500”; proposal fallback speaks about “your company” and a team for household prospects, says workflows are “built and run by Shea,” and simultaneously says ATG never accesses accounts directly despite DFY delegated implementation. Fallback report copy says 30-minute discovery; some portal copy still promises a two-minute assessment, personalized specifically for a business. A daily-digest fallback says workflows are running in the background without execution evidence. Fix targeted copy; retain useful sections and examples.

### Actual technical implementation

- pnpm workspace; React/TypeScript/Vite/Tailwind/wouter frontend; Express 5/TypeScript API.
- **Prisma/PostgreSQL is the active schema and query path.** lib/db’s Drizzle schema exports no tables. It is not an alternate schema source to push.
- Prisma client generation is part of the API build. There is no checked-in migration history under the active Prisma directory.
- Clerk uses a verified primary email before role assignment or email-based linking. Admin emails are configured separately. Customer identity is scoped through clientId.
- Stripe routes exist behind BILLING_ENABLED. The raw webhook route is mounted before JSON parsing, and signatures are checked.
- **xAI is the provider actually selected in code**, through the OpenAI-compatible SDK. Production base URL is xAI; AI_MODEL_DEFAULT defaults to grok-4.7. OPENAI_API_KEY is not read as the provider key. OpenCode/Gemini choices have no bearing on this application’s configuration.
- Configuration is validated piecemeal. PORT and trusted proxy addresses receive checks; unsupported storage and missing production signing secrets do not comprehensively fail startup.
- Generated OpenAPI/client/Zod libraries retain older intake/account/health contracts rather than covering the current discovery/session/operations API. The main frontend uses a separate handwritten api.ts client. Unify contracts incrementally as affected routes change.
- Rate limits/cache/fallback-health history are partly process-local. They are not durable or shared across autoscale instances.
- Daily-report generation requires an external cron caller with a secret. Startup starts a catalog-harvest schedule, but does not establish a durable general-purpose worker. Several tasks run as unawaited promises, vulnerable to process shutdown.
- Frontend and API builds pass. Frontend’s main JavaScript bundle is 824.61 kB minified / 210.16 kB gzip; code splitting is a later performance improvement.

### Plan_intakeId_fkey and deployment

The current Plan model has a nullable intakeId scalar and no intake relation. That source fact does not prove the constraints currently present in development or production.

The corrected post-merge hook installs dependencies and generates Prisma; it does not push the empty Drizzle schema or mutate database structure. Do not reintroduce schema changes into builds, startup, or post-merge.

HANDOFF’s older generic db:push advice conflicts with docs/operations-launch.md. Use the newer environment-aware launch procedure: confirm database ownership/environment, review development changes and production comparison, validate migrations, retain data, and deploy frontend/API together.

The earlier missing-constraint failure is **not verified repaired**. Git history and a publication commit cannot establish that. Before another schema release, inspect the exact generated SQL and read-only constraint metadata for both environments, compare schema/name/definition, and check for repeated/stale DROP statements. Preserve Plan rows and intakeId values. Do not reset, overwrite production with development, invent a temporary foreign key, or mark unverified migrations applied.

Replit’s current documentation describes comparing live development/production schemas, validating SQL against a production copy, and applying the reviewed SQL during publish. External databases require their provider’s process. [Replit migration workflow](https://docs.replit.com/features/data-and-storage/publish-database-changes)

## 10. Prioritized roadmap and verification record

Effort estimates assume one experienced engineer with context, excluding access delays and owner decisions. They are relative planning estimates, not quotes.

| Phase / batch | Scope and dependency | Effort | Ongoing cost | Success criteria |
| --- | --- | --- | --- | --- |
| Launch A: private drafts and approved sharing | F01–F05 plus consistent AI switch; explicit safe serializers, safe proposal export, reviewed-only resources/refresh, recap edit/publish/error handling | M, about 3–5 development days | No new vendor expected | Private fields absent; draft changes cannot affect published material; locked content absent; failed session save retains source |
| Launch B: commercial state and reliability | F06–F09; decide package/care terms; independent payment grant and generation job; immutable accepted proposal; prevent recommendation→paid conversion | L, 5–8 days after terms decision | Existing Stripe/hosting + job persistence | Duplicate/reordered/failed events grant exactly once; balances unchanged on replay; paid amount/option matches signed scope |
| Launch C: dependable artifacts/deployment | F14/F15, durable storage, environment validation, updated release instructions; live schema investigation in Replit | M, 2–4 days plus platform investigation | Storage/egress and operational checks | Private uploaded file survives deploy and downloads in production; backup/restore and migration validation recorded |
| Next phase: assessment-to-pilot | F10/F11, canonical profile, later-assessment revisions, approved results view, structured fit-call decision, prioritized pilot, separate booking links | M, 4–6 days | Model usage, operator review | Every selected answer maps to the review/profile; one accepted pilot; updated assessment creates a revision |
| Next phase: session delivery loop | Unified session identity, preparation, approved structured recap/actions, idempotent task projection, playbook stale/retry status; F12/F13 | L, 6–10 days | Model usage + review time; worker | Transcript→editable draft→approval→customer actions; retry creates no duplicate tasks; counts reconcile |
| Next phase: maintained resources/memberships | Canonical resource index, paid/free matrix, publication/review dates, pilot-linked lessons; launch recurring continuation only after measurement | M/L, 4–7 days plus content work | Content maintenance, support capacity, AI | Customers find next relevant lesson; access matches contract; workload stays inside allowances |
| Later: booking/meeting import | Pick one provider; webhook/artifact IDs, authorization, retention, retry | M/L, 4–8 days/provider | Provider license, storage, processing | Booking updates one session; authorized transcript attaches correctly; reconnect/retry tested |
| Later: customer workflow integrations | One scoped calendar or CRM pilot at a time; customer-owned execution, evidence callbacks | L, 1–3 weeks/pilot depending on access | Customer platform, connector/API usage, maintenance | Agreed normal/failure/duplicate/recovery tests pass in real accounts; evidence-backed benefit |

### Verification completed in this audit

| Check | Result and limits |
| --- | --- |
| GitHub/source reconciliation | main pinned at 3dbff3e; recent merged PRs verified through GitHub; both original folders preserved |
| Existing API suite | **135 passed, 0 failed, 0 skipped**, with Node 24 and a matching Windows esbuild binary. Simulated services/database paths; some tests accept generic auth failures, so passing is not a security certification |
| Workspace type checks | Libraries, API, frontend, scripts, and mockup package completed successfully |
| API production build | Passed; Prisma client generated; no database schema operation |
| Frontend production build | Passed with a large-chunk warning. Local build-only PORT/BASE_PATH values supplied to satisfy configuration; no server started and no Replit settings changed |
| Additional audit probes | **17 observations/journeys confirmed**, including three complete assessment branches, failed save/retry, edit/resume, null-token regression, duplicate submit, private notes, resource/lesson exposure, recap overwrite, proposal markup, payment replay, unpaid conversion, mutable acceptance, and playbook readiness/concurrency simulation |
| One-pager | One page rendered and visually inspected; text and link annotation checked |
| Application browser check | Approved Replit preview redirects to private-app login; app itself not reached |
| Unchanged source | git diff empty and git status clean after validation in audit-current |

Windows tooling limitations were resolved for validation without editing the product: system Node 18 could not run --import; the bundled Node 24 was used. The lockfile excludes Windows esbuild/rollup packages, so existing matching local test binaries were supplied through process-only configuration. Temporary automated test connections required a permission boundary change; no application server was started. A preliminary AI-switch probe used an ineffective fetch mock and hit a DNS failure with a fake key; it was replaced with a no-network factory/source check. No actual provider authentication or paid call occurred.

### Still unverified and required before launch sign-off

- Actual deployed commit, environment variables, model access, production Clerk settings, trusted proxy behavior, and actual billing state.
- Real PostgreSQL persistence, schema parity, foreign-key/migration recovery, concurrent transactions, and recovery after deployment/process shutdown.
- Signed-out browser assessment journeys on desktop/mobile and a real verified-email signup/linking flow.
- Controlled real email delivery, duplicate-send/reconciliation, sender configuration, and receipt.
- Exact booking destination, duration, paid-session booking, cancellation/reschedule, and customer preparation.
- Stripe test-mode full checkout/webhook/replay/cancel/refund journeys; actual product/price mapping; no live money required for this verification.
- Cross-customer privacy and allowed/denied access through authenticated end-to-end sessions.
- Private document upload/download after a production deployment.
- Authorized real transcript summarization, long-source handling, editable recap approval, and customer visibility.

The recommended implementation plan is a proposal. It has not changed prices, access, customer data, schema, or published behavior.

## Pinned repository evidence

The source links in the findings point to the exact audited GitHub commit, so later changes to main do not change the evidence.

[E01]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/client.ts#L158
[E02]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/discovery.ts#L1186
[E03]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/sanitize.ts#L11
[E04]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/knowledge.ts#L97
[E05]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/ai-assist.ts#L176
[E06]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/ai-assist.ts#L367
[E07]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/client.ts#L334
[E08]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/knowledge.ts#L74
[E09]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/sessions.ts#L197
[E10]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/atg-consulting/src/components/admin/SessionsTab.tsx#L42
[E11]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/billing.ts#L151
[E12]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/billing.ts#L198
[E13]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/billing.ts#L55
[E14]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/stripe.ts#L43
[E15]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/access.ts#L44
[E16]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/discovery.ts#L698
[E17]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/clientProvision.ts#L29
[E18]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/discovery.ts#L867
[E19]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/portal.ts#L139
[E20]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/atg-consulting/src/pages/intake.tsx#L260
[E21]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/client.ts#L477
[E22]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/discovery.ts#L202
[E23]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/intakeAnswers.ts#L92
[E24]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/personalization.ts#L46
[E25]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/operatingPlan.ts#L45
[E26]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/llm.ts#L925
[E27]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/playbook.ts#L101
[E28]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/sessions.ts#L64
[E29]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/guidedCount.ts#L17
[E30]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/llm.ts#L1526
[E31]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/storage.ts#L48
[E32]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/documents.ts#L56
[E33]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/lib/grokClient.ts#L56
[E34]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/artifacts/api-server/src/routes/ai-assist.ts#L398
[E35]: https://github.com/sheacurran311/atgconsulting/blob/3dbff3ede885b23f65cd7d8c033a5208861d9b24/docs/operations-launch.md
