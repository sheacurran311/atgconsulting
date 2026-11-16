# Sign-in landing and admin account controls

Based on GitHub main `a9d42d43479f77c11ffd8de01019a9d25130b235` (merged privacy batch). No database schema change or migration is required.

## Diagnosis and change

The server already recognizes the verified admin email through ADMIN_EMAILS. Customer status PROSPECT is a separate field from the user's ADMIN role; the prospect label did not indicate loss of admin permission.

Three source behaviors made the journey confusing:

- Clerk's fallback was `/app`; remembered return URLs could still send a returning user to intake, and the public intake route had no returning-account redirect.
- The admin shell had no Account page or sign-out control. Admin role resolution also depended on the customer-profile endpoint.
- Auth provisioned a NONE/PROSPECT Client for every verified account, including admins. Directories and Today counts included that automatic admin profile.

After this change:

- Fresh sign-in/sign-up goes through `/auth/continue`, resolving the server identity. Admins land at `/admin/today`; customers land at `/app`, where the existing intake gate handles new customers. A fresh admin sign-in clears stale Client View state before opening the console. Normal Client View during a session remains available.
- A signed-in customer with a linked intake opening plain `/intake` goes to `/app`. A new customer still sees intake. Explicit `edit=true`, resume URLs, invitation URLs and engagement member URLs preserve the intentional intake flow. This does not implement revisions of already submitted assessments.
- `/admin/account` shows the signed-in identity and Administrator access, with sign-out controls. Account appears in the desktop sidebar and mobile More menu; desktop also offers sign-out directly. Admin identity uses `/api/account`, independently of customer profile/intake availability. Identity lookup failures show retry instead of assuming customer onboarding.
- New admin sign-ins do not create automatic prospect profiles. Existing records are not deleted or reassigned. The directory and Today customer-status counts exclude only ADMIN + NONE + PROSPECT shells; paid admin customer records and all ordinary customer prospects remain available. Existing admin client records are retained for explicit Client View and their linked history.

Sign-in now consistently goes to the dashboard rather than resuming a previously saved authentication return URL. An intentional intake edit is opened after sign-in through its explicit edit URL.

## Verification

- API suite: 145 passed, 0 failed, 0 skipped (all prior 143 tests plus admin provisioning/directory regressions). Tests retain real role guards with fixture identities and mocked persistence.
- Workspace type checks passed for shared libraries, API, web, mockup sandbox and scripts.
- API/frontend production builds passed; existing FAQ sourcemap notices and Vite bundle-size warning remain.
- Isolated browser checks passed: admin and customer landing; linked versus missing intake; explicit edit/resume; stale Client View reset; desktop/mobile Account and sign-out; sign-out failure recovery; identity/exit failure retries; no dependency on `/api/client/me`; menu stays within the mobile viewport; no browser exceptions. Every request is intercepted and Clerk is a fixture adapter. This is not a live authentication test.
- Screenshots contain fixture data: [desktop Account](verification/account-routing/admin-account-desktop.png), [mobile Account](verification/account-routing/admin-account-mobile.png).

Reproduce after installing dependencies and a supported Node version:

```sh
pnpm --filter @workspace/api-server test
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/atg-consulting run build
node scripts/src/account-routing-ui-smoke.mjs
```

Windows verification used bundled Node 24.22.1 and existing matching Windows esbuild/rollup binaries through process-only configuration. Build-only PORT and BASE_PATH values do not change Replit configuration or start a server.

## Release checks

Deploy the frontend and API together through the normal reviewed process. Do not run a schema push or reset records. Check `https://atgconsulting.io/sign-in` with the real verified admin account and a controlled customer account after deployment:

1. Admin signs in → Today; Account shows the admin email and Administrator access. Sign out works on desktop and mobile. An old admin prospect shell is absent from normal customer prospect lists/counts.
2. Customer with a linked intake signs in → customer dashboard. Opening plain intake also returns to that dashboard. Explicit edit, resume and invitation links remain intentional.
3. New customer reaches onboarding; ordinary prospect records still appear in the customer directory.
4. Client View remains functional; signing out and back in returns to the operator's own admin dashboard.

Live authenticated verification was not completed in this workspace. The user's report confirms that the admin role and dashboard are reachable. The public page fetch was unavailable and the desktop inspection approval timed out; neither provided a live runtime capture. No production customer data or runtime settings were changed during this fix.
