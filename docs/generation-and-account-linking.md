# Generation feedback and saved assessment linking

Follow-up to merged PR #55, based on main `633956e`. This change requires no schema migration, new dependency, model configuration or deployment setting.

## Diagnosis

Report and proposal generation were synchronous requests whose buttons changed text but offered no persistent progress panel. Failed HTTP/network requests could be ignored or leave the control busy. A delayed proposal lookup could also overwrite the current detail panel.

The live administrator session was inspected read-only for the operator-designated test account. Its client row currently showed Guided / Active. Two completed submissions remained in the intake inbox, while its client preparation screen showed an earlier saved plan rather than linked Discovery intake answers. The open client portal was using the operator's admin identity. No production intake, client, role, tier, report or proposal was changed during inspection; no live customer sign-in was performed.

Customer sign-in links matching email submissions, but admin Client View previously skipped that linking step. The portal gate only recognized the new Discovery records, not client-owned results from the earlier intake system. Client View could also prefill the operator's email rather than the selected customer's email. Separately, the generic admin tier dropdown changed tier without changing a Prospect status, and its frontend ignored other fields in the saved response.

## Resulting behavior

- Report/proposal generation shows an animated indicator, an indeterminate bar, elapsed time, a long-wait message, checked errors and a confirmed saved-draft message. Concurrent generation clicks are blocked. A browser refresh/close warns while work is pending. This remains a request: keep the page open until it confirms saving; using another browser tab is fine. No resumable background job or fabricated percentage is claimed. After an uncertain response, reopen the assessment and check its saved draft before retrying.
- Selecting a real client in Admin Client View attaches only unclaimed, submitted assessments matching that client's normalized email before opening the portal. Verified customer sign-in uses the same rule. Existing owners, answers, review status and paid tier remain intact. The Client View audit records the number linked.
- The client Overview lists linked assessments with exact admin links, recognizes an earlier assessment result, and shows a guarded, audit-logged **Link matching submitted assessments** action for matching unclaimed records. The client detail API now actually returns the intake list expected by its Playbook tab.
- The gate and dashboard recognize client-owned legacy assessment results. Only a plan linked to that client with an earlier intake reference qualifies; a recommended tier is never used to grant access. The dashboard labels it an earlier assessment rather than inventing current intake answers.
- Failed account checks show a retryable error instead of suggesting the assessment is lost. The gate reloads when the signed-in identity changes and offers a saved-assessment recheck before starting again. Client View prefill uses the selected client's identity. Account/status responses are private and non-cacheable.
- An admin assigning a paid tier to a Prospect also sets Active unless an explicit status was supplied. Paused/Churned records and explicit lifecycle choices are preserved. The UI uses the complete saved response and shows failures. Existing paid Prospect records are not silently swept into a new status.

## Verification

164 API tests passed, zero failed/skipped. New coverage includes submitted-only matching, normalized emails, no reassignment of another client's intake, no duplicate prospect creation, authenticated Client View linking, real role guards, client-owned legacy access, caller ID isolation, correct impersonated email prefill, explicit repair/history, and paid-tier lifecycle choices. Workspace type checks and both production builds passed; the existing Vite bundle-size notice remains.

`pnpm --filter @workspace/scripts run test:generation-linking` passed with actual components and every HTTP request intercepted. It covers report/proposal errors and retry, progress without a fake percentage, long waits, unload-warning cleanup, confirmed saves, the server-returned Active status, history repair, earlier-assessment dashboard access and account-check failure/recovery. The existing `test:admin-operations` browser journeys also passed. Fixtures make no production writes. [Progress screenshot](verification/generation-linking/report-progress.png) contains fixture data only.

## Release check

Deploy API and frontend together through the normal reviewed process. No database push is needed. Using the existing test account, check the live Clients row, enter its actual Client View, confirm matching submitted records appear in Saved assessments and the dashboard opens, then exit back to admin. Test the customer's own verified sign-in separately. Existing paid Prospects can be reviewed/resaved through the tier control, or given an explicit lifecycle status.

Generate a controlled draft and verify progress, success and failure feedback without approving or emailing it. Generation is not delivery. Reopening an assessment after an interrupted request must show what actually saved before another generation is requested. The code changes have not been deployed by this PR.
