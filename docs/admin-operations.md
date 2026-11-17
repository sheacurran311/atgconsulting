# Admin work and delivery guide

For the follow-up on report/proposal progress and missing assessment links, see [Generation feedback and saved assessment linking](generation-and-account-linking.md).

This extends the account-routing changes in draft PR #55. Deploy API and frontend together after review. **This batch adds no schema changes or database migrations.** Existing records and accepted proposals are preserved.

## Which screen to use

- **Today** opens the exact intake, post, candidate, message, request or session. Confirmed changes remove pending work on focus, across tabs and on the 30-second refresh. Completed steps from the last 48 hours come from source records, with links. Their dates reflect the last saved update; a read message or published recap does not imply the entire engagement is finished. Dismiss only hides a reminder.
- **Delivery Playbook**, in the admin sidebar, explains the full Self-serve, Guided and Done-for-you engagement, screen by screen, with completion criteria. The shared fit-call outline remains available.
- **Clients → select client → Playbook → Exact implementation list** is the private deployment plan for that client. Search wider provider marketplaces, choose a provider or “Shea decides,” and save exact plugin, skill, bot and workflow choices. See [native automation details](native-automation-library.md).
- **Templates** are reusable instructions and configuration. A template alone is not a running schedule. Configure and test the trigger and source connections in the customer's native platform.
- **Catalogue** is a review queue of possible tools for all delivery tiers. Verification makes a candidate available; it does not install it or determine suitability for every client. Use the client implementation list to make and explain the actual selection.
- **Automation bots** contains 30 original recurring starter recipes. Admin and DIY use the same instructions. They are not preinstalled marketplace packages and do not limit the wider client implementation list.
- **Operations** holds workflow contracts, activation evidence and the separately published customer operating guide. The private client playbook and its implementation list remain admin-only.

## Changed behavior

Client View waits for its authenticated status before deciding whether to open the client dashboard. Failed view changes and exits show errors. Returning to Admin console confirms cookie removal before navigating. Status must belong to the current admin.

Content offers **Approve & publish now** for a completed draft and a separate queue approval. A future publication schedule cannot be bypassed accidentally. Repeating a completed publish is safe. Generating a queued topic updates that same record; it does not create a second post. These actions publish to ATG's blog, not to customer social accounts.

Catalogue verify/reject uses a single confirmed request, locks the action while saving, updates the card and shows errors. Failure leaves the candidate visible for retry.

## Done-for-you scope

The current offer is **up to 20 agreed workflows and automations**, delivered as white-glove discovery, prioritized phases, configuration, acceptance testing, training and an operating guide. Public tier/FAQ copy, new proposal drafts, generation guidance and the Delivery Playbook agree. Base price remains from $3,500; optional care remains separately scoped. Name the deliverables, complexity and dates in writing. Plugins/connectors supporting a workflow are components, not separate billable workflow counts. This replaces the old three-workflow policy; the dated audit is a historical record.

Existing contracts, finalized playbooks and already-generated proposals are not silently rewritten. Review them explicitly before issuing revised terms. Regenerate a playbook draft to adopt the new sections; saved implementation selections carry forward. Regenerate/review new proposal drafts for the revised scope.

## Verification on 2026-11-16

- Full API regression suite: **153 passed, zero failed/skipped**. Includes native library permissions, intake isolation, wider catalog parsing/ranking, source failures, provider preference, 20-workflow counting, cross-client protection, final versions, concurrent-save protection and existing approval/task regressions.
- Workspace type checks and API/frontend production builds passed. Existing Vite bundle-size notice remains.
- `pnpm --filter @workspace/scripts run test:admin-operations` passed with actual UI components and every request intercepted. Covers the delayed Client View race and exit, one-request publishing, Catalogue errors/retry, Today task links/completion refresh, intake link, all plan guides, 30 recipes, download, mobile width, provider search and outside-library selection/save retry. Fixture tests do not prove live Clerk cookies or provider execution.
- The public marketplace parser was also checked against read-only official pages: 532 Claude listings (294 with positive published install counts) and 91 Grok Bot listings (no usable counts in this snapshot). No provider account, paid model, customer data or workflow was activated.

Fixture screenshots: [Delivery Playbook](verification/admin-operations/delivery-playbook-desktop.png), [Today](verification/admin-operations/today-linked-tasks.png), [native guide](verification/admin-operations/native-bot-guide-desktop.png), [mobile guide](verification/admin-operations/native-bot-guide-mobile.png), [client implementation list](verification/admin-operations/client-implementation-list.png).

Before release, use controlled accounts at the user-supplied sign-in domain to verify real admin sign-in, Account/sign-out, client impersonation/exit and tier restrictions. Exercise a real reviewed post and candidate only when publishing/verification is intended. In customer-owned provider accounts, check exact app/surface support, run redacted acceptance tests, inspect the first real schedule and verify pause/recovery before recording activation. This PR does not merge or deploy itself.
