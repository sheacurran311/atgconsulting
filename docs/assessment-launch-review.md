# Assessment fix and launch review

## Fixed

- Public assessment requests were intercepted by `client.ts`'s router-wide authentication middleware. Other sibling routers had the same problem. Their guards now apply only to their own URL families; private routes remain protected.
- The initial email is validated and saved before questions begin. The page explains that an account is optional and offers account creation after submission. Existing verified-email account linking remains in place.
- Resume requests sent an empty answer list which the server rejected. They now restore saved answers and the contact email, respect session expiry, and report failures instead of silently starting over.
- Question requests previously consumed the same rate-limit bucket as submission. Separate budgets allow a normal assessment to finish without blocking its submission.
- Failed answer requests no longer clear the typed answer or advance local progress. Server error messages are shown to the visitor.
- The `top_problems` response used CommonJS `require` inside an ESM server. It now uses the imported helper.
- Imported and invite-prefilled answers are persisted when starting, skipped when already answered, and not discarded. Answer corrections replace earlier values.
- PDF import now uses the installed pdf-parse v2 API and releases its parser. Unsupported DOCX uploads are no longer offered as supported files.
- Import without AI configuration now explains that the question-by-question form is available instead of claiming a successful empty extraction.
- The manifest link includes credentials, as required when the preview host protects the file. Replit Shield redirects can still require preview access; validate the published domain separately.

## Remaining launch issues

1. **Prospect email delivery is not implemented.** `src/lib/email.ts` in the API server intentionally sends only to Shea. Approving an assessment sets `report_sent` but does not email the prospect. Do not promise automatic emailed results until a reviewed-report delivery flow, provider configuration, delivery error handling, and retries are implemented. The current patch describes assessment follow-up rather than claiming an email was sent.
2. **Clerk is using development keys**, according to the supplied browser log. Configure the production Clerk instance and domain before launch. These keys are unrelated to xAI/OpenAI keys.
3. **Verify proxy configuration on Replit.** The server defaults to not trusting forwarded IP headers. Without correct `TRUSTED_PROXY_CIDRS`, visitors behind the Replit proxy may share a rate-limit bucket. Configure only known trusted proxy ranges; do not blindly trust all forwarded headers.
4. **Account linking deserves a separate security fix.** `resolveUser` in `src/lib/auth.ts` looks up an existing User by email and attaches a new Clerk identity before checking `emailVerified`. The verified-email check later in the function only gates provisioning. Existing-account linking and admin-role assignment should require a verified primary email.
5. **Read-only impersonation guard order is suspect.** The global mutation guard in `routes/index.ts` runs before route-level `withUser` populates `atgUser`. Verify and enforce the guard after resolving the actor, including on mutations outside the Workbench.

## AI configuration

The supplied Replit configuration uses `XAI_API_KEY`, `AI_MODEL_DEFAULT=grok-4.7`, `AI_MODEL_VISION=grok-4.7`, and `AI_ASSIST_ENABLED=true`. The existing shared client uses xAI. Adding `OPENAI_API_KEY` alone does not enable an OpenAI integration. No secrets were read, copied, or changed by this patch. Actual model access must be verified inside Replit.

## Validation

- Server suite: 127 tests passed, including the new combined-router regression.
- Library build/type check, server type check, and frontend type check passed.
- New tests cover anonymous start-to-submit, resume, saved email, expired sessions, more than five rapid question requests, submission rate isolation, answer edits, private-route protection, unavailable import, and simulated xAI success/failure.
- Database calls in the new route test use an in-memory stub. AI responses use a local fake provider. No real prospect emails or paid model calls were made.
- Live Replit database persistence, actual model access, PDF rendering runtime, browser layout, and the Replit Shield manifest redirect still need a deployment smoke test.

## Replit smoke test after merging

1. Pull the change and restart/redeploy both frontend and API.
2. In a signed-out browser, enter an email, answer several questions, reload and resume, then submit. Confirm answers and the email in the admin inbox.
3. Create an account using the same email and verify it. Confirm the assessment is linked without granting a paid tier.
4. Confirm anonymous portal/admin requests remain blocked.
5. Test AI-enabled questions and a small PDF/TXT import using the configured xAI model; temporarily disable AI only in a test environment to confirm fallback behavior.
6. Test the published domain, not only the protected `.replit.dev` preview. Confirm production Clerk setup and email delivery expectations before launch.
