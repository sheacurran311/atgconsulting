# ATG Consulting — audit and next-agent handoff

Read this file before changing code. It is the source of truth.

## Product framing

Three tiers: Self-serve, Guided, Done-for-you (WHITE_GLOVE). Anyone not tech-savvy across 6 verticals. Follow-up draft is the first workflow, not the audience. Keep all copy broad. Client approval on by default; nothing auto-sent.

Full tier details: see previous NEXT_AGENT content. WorkflowTemplate.minTier enforces access:
- SELF_SERVE: Phase 1 workflows (follow-up, inbox triage, review request, social calendar, SEO audit)
- GUIDED: Phase 2 workflows (money snapshot, booking flow, quote proposal, prospect research)
- WHITE_GLOVE: Phase 3 workflows (FAQ support, agent pipeline)

## Stack

- Frontend: Vite + React + wouter in `artifacts/atg-consulting`
- API: Express + Prisma + PostgreSQL in `artifacts/api-server`. `provider = "postgresql"`.
- Auth: Clerk. Admin = `ADMIN_EMAILS`.
- Template engine: `WorkflowTemplate` model, seeded from `src/lib/templates.ts`, admin-editable.

## ═══ FINAL MERGE-ORDER CHECKLIST ═══

Merge in this exact order. Each PR may depend on the previous.

### ✅ Already merged (main)
- PR #1–9: initial site, intake, auth, workbench, tiers, sessions, Stripe, audit fixes
- PR #10: tier model (ToolPlan, DfyApplication, SupportTicket) — db:push ✓
- PR #11: playbook generator — db:push ✓
- PR #12: session recordings — db:push ✓
- PR #13: Stripe billing — db:push ✓
- PR #14: Clerk sign-in logo fix — no db:push
- Hero fix (3cc8958) — no db:push

### 🔲 Pending (merge in order)

| # | Branch | Title | db:push | pnpm install |
|---|---|---|---|---|
| **#15** | `cursor/skills-foundation-c8a4` | WorkflowTemplate model, prompt-template→llm.ts wiring, SKILL.md export | **YES** (WorkflowTemplate table) | No |
| **#16** | `cursor/skills-phase1-c8a4` | Phase 1: inbox triage, review, social calendar, SEO audit | No | No |
| **#17** | `cursor/skills-phase2-c8a4` | Phase 2: money snapshot, booking flow, quote proposal, prospect research + ClientWorkflowSettings + tier gating UI + run history | **YES** (ClientWorkflowSettings table) | No |
| **#18** | `cursor/skills-phase3-c8a4` | Phase 3: FAQ support, agent pipeline + AgentChain/AgentChainRun models | **YES** (AgentChain, AgentChainRun tables) | No |

After merging all four, run `pnpm db:push` once to apply all pending schema changes.

### Commands for Shea after all four PRs merge and republish:
```bash
pnpm db:push   # applies WorkflowTemplate, ClientWorkflowSettings, AgentChain, AgentChainRun
```
WorkflowTemplate rows are seeded automatically on first server start.

## What each PR adds

### PR #15 — Foundation
- `WorkflowTemplate` model: slug, systemPrompt, userPromptTemplate, inputSchema, outputFormat, minTier, verticalTags, enabled, version
- Seeds: follow-up, inbox-triage, review-request, social-calendar, seo-audit, money-snapshot, booking-flow, quote-proposal, prospect-research, faq-support, agent-pipeline
- `loadActivePrompt(key)` + `loadWorkflowTemplate(slug)` in llm.ts — DB-first, code-default fallback
- Admin template editor `/admin/workflow-templates` — edit, reset, enable/disable, SKILL.md export
- SKILL.md export: downloadable Markdown for Grok Bot / Claude / ChatGPT

### PR #16 — Phase 1 workflows (Self-serve)
- 4 new routes: inbox-triage, review-request, social-calendar, seo-audit
- 4 new LLM functions with template loading + fallback
- 4 skill forms in dashboard Today tab
- All: creates WorkflowRun + OutputItem, client approves

### PR #17 — Phase 2 workflows (Guided) + infrastructure
- 4 new routes: money-snapshot, booking-flow, quote-proposal, prospect-research
- `proposalToHtml()` for printable HTML export
- `ClientWorkflowSettings` model: admin per-client workflow enable/disable
- `SkillLauncher.tsx`: tier-gating with locked workflow CTA (no hardcoded prices)
- `RunHistory.tsx`: new Run history tab on dashboard

### PR #18 — Phase 3 workflows (Done-for-you) + NEXT_AGENT
- 2 new routes: faq-support, agent-pipeline
- `AgentChain` model: admin-configurable multi-step pipeline per client
- `AgentChainRun` model: records step outputs
- Admin routes: create/list/edit agent chains
- 3 skill forms (faq-support, agent-pipeline, chain admin)
- Full NEXT_AGENT.md with this checklist

## WorkflowTemplate slug reference

| Slug | Phase | minTier | Description |
|---|---|---|---|
| `follow-up` | 1 | SELF_SERVE | Single follow-up email draft |
| `inbox-triage` | 1 | SELF_SERVE | Classify and draft replies for pasted messages |
| `review-request` | 1 | SELF_SERVE | Review request messages + reply drafts |
| `social-calendar` | 1 | SELF_SERVE | 2-4 week content calendar + post drafts |
| `seo-audit` | 1 | SELF_SERVE | Server-side page fetch + prioritised fix list |
| `money-snapshot` | 2 | GUIDED | Weekly financial summary from CSV/P&L |
| `booking-flow` | 2 | GUIDED | Booking page copy + message sequences |
| `quote-proposal` | 2 | GUIDED | Proposal draft + printable HTML |
| `prospect-research` | 2 | GUIDED | Prospect research + outreach drafts (CAN-SPAM note) |
| `faq-support` | 3 | WHITE_GLOVE | FAQ build + reply drafts |
| `agent-pipeline` | 3 | WHITE_GLOVE | Multi-step configurable pipeline |

## P2 — not done yet

- Learn modules seeded for self-serve workflows
- Plan PDF generator
- Report digest email + Denver timezone cron
- Security headers, IDOR tests
- Document upload UI
- Stripe production checklist

## Leave for Shea

- Tier prices (all [$ placeholder])
- Booking URL, LinkedIn, founder photo, bio line
- Final privacy/terms wording
- DFY_MONTHLY_CAP (default 1)
- VITE_BOOKING_URL

## Do not

- Invent prices, testimonials, stats, client names
- Send email, post to social, write to a CRM automatically
- Start a dev server or bind 127.0.0.1
- Switch Prisma provider to sqlite
- Narrow copy to sales reps

## PR #19 — Portal UX, intake gate, personalization, contrast fixes

Stack: skills-phase3 → this PR.

### db:push NOT required (no new schema changes in this PR)
### pnpm install NOT required

### What changed

**1. Billing bypass for test mode**
`src/lib/access.ts` — centralised `checkWorkflowAccess()` shared by all skills routes.
When `BILLING_ENABLED !== "true"` (the default), every signed-in client with a profile
has access to every enabled workflow, regardless of tier. A test-mode banner appears
in the skill launcher. All three skills routes updated to use the shared helper.

**2. Intake-first onboarding (IntakeGate)**
`src/components/app/IntakeGate.tsx` wraps the entire AppShell.
On load, calls `GET /api/portal/status` which:
  - Checks if the user has a linked intake
  - Auto-links any anonymous intake submitted with the same email (within 7 days)
  - Creates the Client row and runs personalization if auto-linked
If no intake is found, shows a pre-filled prompt to complete /start.
Portal context (testMode, personalizedSlugs, tier) is available via `usePortal()`.

**3. Workspace personalization**
`src/lib/personalization.ts` — `personalizeClientWorkspace(clientId)`:
  - Scores all 11 workflow slugs by intake data (areas, time sinks, AI comfort)
  - follow-up always gets +5 as the starting workflow
  - Upserts ClientWorkflowSettings with enabled=true for all (ordering = relevance)
  - Stores ranked slug list in Client.notes as `__RANK__{...json}`
Called automatically after intake claim (plan.ts) and on demand via:
  - `POST /api/portal/personalize` (client)
  - `POST /api/admin/clients/:id/personalize` (admin)
Admin UI: "Re-run personalization" button on client detail page.

**4. Contrast fixes (WCAG AA)**
- Locked skill buttons: `canvas-text-3` (#9E9EA1, 2.8:1 ❌) → `canvas-text-2` (#6B6B6E, 5.7:1 ✅)
- `.skill-btn-locked` CSS class with compliant colors
- Featured/unlocked skills: `canvas-text` (#0A0A0B, 21:1) on white ✅
- Primary actions use explicit `var(--blue-btn)` (#2557E8) with white text (4.9:1 ✅)
- Test-mode banner uses blue accent text on very-light-blue background (sufficient contrast)

**5. Personalized skill launcher**
`SkillLauncher.tsx` accepts `personalizedSlugs` and `testMode` from portal status.
Featured slugs (top-3 from personalization) appear first with a ★ marker and blue border.
Test mode shows a notice and unlocks all workflows.
