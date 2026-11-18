# ATG AI-first prospecting: Implementation contract
Updated 2026-11-17. Product-owner direction: AI discovery and enrichment are primary. Manual prospect entry is an optional fallback, not the default workflow.

## Outcome
The admin homepage should present an **AI prospecting run summary**: new qualified businesses, source-backed observations, drafts generated, messages dispatched, replies, suppression/opt-outs, next follow-ups, and exceptions. The operator primarily handles exceptional situations. A private **ATG-owned Google Sheet** provides the working pipeline and can be edited as a management interface.

## First operating segment
- Geography: Greater Denver / Castle Rock, Colorado, USA. Geography and industries must be adjustable in admin settings.
- Initial industry: home services and trades. Other service categories added by policy/configuration, not hardcoded as the only audience.
- Default daily cap: 20 new candidates evaluated, maximum 5 outbound messages, both initially set to zero until credentials, content, and compliance tests pass.
- No customer CRM, Gmail, social, or Google OAuth connections. A server-side service account **only** accesses a separately shared ATG-owned Sheet; this does not introduce customer Google authorization.

## Agent pipeline
1. **Discover:** a source adapter imports candidates using a provider/data license that permits prospecting and retained business information. Preserve source, retrieval date, and reuse obligations. Do not scrape Google Places or store results contrary to Google Maps Terms. Brave Search API standard terms also restrict persistent results and unsolicited mass email use.
2. **Resolve:** identify canonical public official website, normalize domain, reject duplicates and suppressed or previously contacted identities. Reject mismatched or uncertain businesses.
3. **Inspect:** obtain public, permitted official-site evidence with bounded HTTP requests and blocked private IP/localhost destinations, and respect robots/site conditions. Do not treat model inference as a factual source.
4. **Qualify:** use the existing prospecting Skill and ATG Grok client to evaluate documented indicators (business category, service market, observable workflow, contact confidence, urgency); attach URLs and date. Do not infer private traits, technology stack or financial performance.
5. **Contact:** extract only publicly designated business contact paths. Validate address syntax and domain alignment; never invent emails. Prefer generic business inboxes, not individuals' personal addresses.
6. **Draft:** use the existing AI drafting function and cold-email Skill instructions. Every factual claim must be attributable to a retained official-site source.
7. **Dispatch:** once ATG sender compliance/configuration is complete, enqueue approved-template messages for a low-volume sending provider (e.g. ATG-owned Resend). Human preapproval can be required for the first pilot, with later policy-approved auto-sends for confident candidates. Never email suppressed domains or addresses; never send a duplicate initial email.
8. **Reconcile:** record provider id, send state, bounce/suppression, opt-out, reply (where supported), last touch and next eligible follow-up. Replies pause automatic sequences. Delivery must be idempotent across cron retries.
9. **Google Sheets:** export canonical records, score, sources, drafted copy, contact method, status, review exceptions and timestamps. Treat Postgres as canonical for audit/idempotency. Permit a constrained set of Sheet edits (notes, override, suppress, next action), reconcile by stable `prospect_id`, reject stale writes and audit every import.
10. **Operator exceptions:** only show entries with missing verification, policy conflicts, no contact, uncertain facts or failed sends in the review queue. Manual add stays behind a secondary button.

## Proposed Sheet tabs and fields
- `Pipeline`: prospect_id, company, domain, market, segment, source_name, source_url, observed_at, verified_fact, fit_score, confidence, company_contact, email_check, stage, draft_subject, draft_body, outbound_status, last_touch, next_action, suppression, override_notes, updated_at
- `Agent Runs`: run_id, started_at, completed_at, query/source, discovered_count, accepted_count, qualified_count, drafted_count, sent_count, skipped_count, error_count, estimated_cost
- `Suppression`: email/domain, reason, observed_at, provider_event, status
- `Settings`: editable approved target segments and market regions; app validates and stages changes before they take effect

## ATG-owned Sheet access and secrets
- `ATG_PROSPECT_SHEET_ID` set in server secrets.
- A dedicated Google service-account identity shared as editor on that *one* Sheet, using the Sheets API. No client OAuth or broad Google Drive permissions.
- Never commit service-account private keys or contact data; use Replit Secrets / a provider-backed secret store.
- API integration must use spreadsheet scope and explicit spreadsheet ID, with no arbitrary user-controlled Sheet IDs. Keep append/update idempotent and escape dangerous formula-leading values.

## Outbound release gates
- Sender domain authenticated (SPF/DKIM/DMARC as supported), verified ATG sending identity and contactable return address.
- Valid physical postal contact address, truthful subject/sender, conspicuous opt-out, suppression verification, and prompt opt-out processing. Do not insert an address until the operator provides a real approved one.
- Enforce per-day and per-domain limits, account-level kill switch and event reconciliation; no follow-up after reply, unsubscribe, complaint, bounce or invalid address.
- Review applicable laws and provider terms for targeted jurisdictions; U.S. CAN-SPAM is a baseline, not the only constraint.
- Tests for duplicate run, race, 429s, partial writes, provider timeouts, opt-out/reply between selection and send, and stale Sheet edits.
- No automated sending activated in development by default.

## Existing code to extend
- `src/lib/prospecting.ts`: normalization/score/transitions
- `src/lib/prospectDraft.ts`: source-backed AI drafts
- `src/routes/prospecting.ts`: admin review endpoints
- Prisma `AtgProspect`: canonical prospect stage, evidence and audit
- `src/routes/cron.ts`: protected background job pattern; scheduler remains separately configured
- `src/lib/grokClient.ts`: AI kill switch, provider client and cost controls
- `src/lib/audit.ts`: operator changes
- Admin `pages/admin/prospecting.tsx`: agent run view and exceptions before manual add
- `src/lib/email.ts`: existing operator notifications only; add a separately scoped outbound transport rather than silently broadening this module

## Implementation batches
A. Source adapter and verified candidate ingestion, AI enrichment, one run record and idempotent de-duplication.
B. ATG-owned Google Sheet service-account synchronization and conflict rules.
C. Contact discovery, verified sender and compliant automated outbound workflow (disabled unless explicitly configured).
D. Scheduled cadence, replies/opt-outs, exception-only operator UX, dashboard metrics.

**Done means:** a configured, licensed daily agent can independently find relevant businesses, qualify and prepare source-backed outreach, write a durable Sheet pipeline, and safely send compliant low-volume messages with no routine manual entry. Manual addition remains optional. Do not present a draft-only pipeline as fulfilling this end state.

## Reference documentation
- Google Workspace service-account access: https://developers.google.com/workspace/guides/create-credentials
- Google Sheets append API: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- Google Maps Places data policies: https://developers.google.com/maps/documentation/places/web-service/policies
- Brave Search API standard Terms: https://api-dashboard.search.brave.com/app/documentation/general/terms-of-service
- FTC CAN-SPAM guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
