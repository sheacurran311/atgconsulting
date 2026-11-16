# Private drafts and approved sharing

Implementation of approved audit batch A, based on GitHub main `3dbff3ede885b23f65cd7d8c033a5208861d9b24`.

The [original audit](audits/2026-11-15/ATG-product-audit-2026-11-15.md), [approved scope](audits/2026-11-15/ATG-implementation-plan-2026-11-15.md), and [feature inventory](audits/2026-11-15/feature-inventory.md) are historical baseline records. Findings outside batch A remain open; this change is not production launch sign-off.

## Resulting behavior

- Customer dashboard, report, document, consultation and tool-plan responses enumerate shared fields. Operator notes, billing identifiers and storage keys stay private. Consultation notes remain intentionally shared; SessionRecord admin notes remain private.
- Resources and the coach read approved tool plans. Generating or refreshing recommendations creates a private draft and returns review status. The previous approved plan stays available. Refresh does not create a legacy Plan snapshot, because that model has no publication state.
- Locked learning modules expose metadata without the body or video URL. Module detail and completion use the same access rule. Knowledge list, detail, platform guides and coach apply one eligibility rule before relevance filtering. Untiered articles remain general content; tier tags grant the named tier and higher tiers. Existing explicit grants and tier order remain available. Malformed tags fail closed. Public tools/catalog routes are unchanged.
- Proposal print HTML escapes all interpolated plain text. Export responses disable scripts, frames and forms, prevent MIME sniffing and disable caching; the existing print layout and prices are preserved.
- The shared xAI factory obeys `AI_ASSIST_ENABLED=false`, including operator generation and health checks. Existing template fallbacks remain available; the provider is unchanged.

## Recap workflow and compatibility

`summaryJson.shortRecap` holds the private editable draft; `recapText` holds the published snapshot. Existing shared recaps require no conversion and stay unchanged. No migration or data rewrite runs.

1. Add a private session record. Failed creation retains source/form text.
2. Confirm the customer's authorization before processing transcript/source text. Operator notes can remain private without AI processing. This batch reuses the existing consent flag; it does not introduce audio transcription or a new permission model.
3. Generate a private summary, review/edit the recap and save the private draft.
4. Explicitly choose **Publish reviewed recap**. Generation and editing never publish.
5. Regeneration leaves the published recap intact. Unshare remains an explicit action.

Draft save, generation, source updates, authorization changes and publication require the `expectedUpdatedAt` token (raw transcript upload uses the `x-session-version` header). Writes use an atomic conditional update with a monotonically advancing timestamp. A stale or concurrent write returns 409; the editor keeps unsaved text and requires an explicit reload/comparison before retry. Legacy PATCH requests cannot publish or replace recap text.

Template and partial-source warnings are visible to the operator. The full stored source retains paragraphs and speaker lines. AI input uses the existing 20,000-character cap; a warning is saved with longer-source drafts. Recap-only actions do not invoke the Guided session counter.

## Verification

Verification uses fixture identities with the real authorization/impersonation guards, mocked persistence and providers, and isolated browser components. It does not prove real Clerk authentication, PostgreSQL concurrency or deployment configuration.

- API suite: **143 passed, 0 failed, 0 skipped** (135 original tests plus 8 new grouped regression tests).
- Workspace type checks: passed across shared libraries, API, web, mockup sandbox and scripts.
- API and frontend production builds: passed. Existing FAQ sourcemap notices remain. Web JS bundle remains above Vite's 500 kB warning threshold (825.71 kB minified, 210.98 kB gzip).
- Isolated browser journey: passed retained text after create/save failures, stale-version reload/comparison, save versus publish, regeneration preserving the published snapshot, manual draft rendering, and mobile overflow checks; no browser errors. Every request is intercepted at the approved page host. No application server or live customer session is used.
- Repository schema, lockfile, billing activation, prices and purchased entitlements are unchanged. No production data, email, payment or paid AI call is used.

Run from the repository root with a supported Node version and installed dependencies:

```sh
pnpm --filter @workspace/api-server test
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/atg-consulting run build
node scripts/src/private-sharing-ui-smoke.mjs
```

The browser test uses installed Microsoft Edge on Windows or Playwright Chromium elsewhere. Its screenshots are written to ignored `.test-output/private-sharing/`. The checked-in [desktop](verification/private-sharing/recap-editor-desktop.png) and [mobile](verification/private-sharing/recap-editor-mobile.png) images contain only fixture data.

On this Windows audit machine, bundled Node 24.22.1 and matching pre-existing Windows esbuild/rollup binaries were supplied through process-only configuration because the repository lockfile excludes Windows native packages. Frontend build-only PORT=5173 and BASE_PATH=/ satisfy configuration; they start no listener and change no Replit workflow settings.

## Remaining release checks

Keep the PR in draft until reviewed and tested in the approved Replit environment. The approved live URL redirected to Replit's private-app login during the audit; authenticated application behavior remains unverified. A fixture browser run is not a substitute.

Before publication, use controlled operator and customer accounts to verify: approved plan → refresh → operator approval; private recap → edit → publish → regenerate; stale/failed save recovery; second-customer isolation; free/paid content access; escaped printable proposal; and AI-off behavior with a configured key. Capture the customer published view and pending recommendation state there. Record the deployed commit and runtime check results in the PR.

Deploy frontend and API together because session mutation contracts changed. Do not run a schema push. Existing published text and package balances must remain intact. Payment/package reliability and immutable accepted proposals remain later audit batches.

Rollback the application release through the normal reviewed deployment process if needed; no database rollback is required. Preserve stored sources, drafts and published snapshots. The previous application code contains the audited sharing defects, so a rollback requires controlled access until corrected. Do not merge, publish or restart managed workflows automatically.
