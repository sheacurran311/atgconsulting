# ATG Replit native Google connectors | Read-only proof of concept

**Scope:** Validate only the **Replit app runtime** connector access to the operator's internal Gmail, Google Sheets, Drive, Calendar, and Docs. This is not the customer-facing OAuth project for GSC/GA4. No client accounts, prospect data, sending, or file creation.

## Preconditions
1. In the ATG Repl (not just the account-wide integrations page), confirm the five Google connectors are connected **and assigned/bound to this Repl**.
2. Confirm the authorized Google identity for each connection belongs to ATG. If a connector is connected under another business identity, reconnect to the intended ATG account before any synchronization.
3. Run in **development** only. Set `NODE_ENV=development`; never run this smoke test as a production endpoint.
4. No prospect spreadsheet is required for the initial discovery check. When the other agent creates an ATG-owned test/prospect spreadsheet, set `ATG_GOOGLE_CONNECTOR_TEST_SHEET_ID` to the *document ID only*, not its full URL.
5. Optionally set `ATG_GOOGLE_CONNECTOR_TEST_DOC_ID` for a deliberately chosen test Doc. These are identifiers, not credentials.

## Execute in the Replit project shell

```bash
pnpm --filter @workspace/api-server exec tsx src/connectorProbe.ts
```

Or from root:

```bash
pnpm --filter @workspace/api-server run test:google-connectors
```

Unit tests (no external connection):

```bash
pnpm --filter @workspace/api-server exec tsx --test src/connectorProbe.test.ts
```

## What the script verifies
- Replit's installed `@replit/connectors-sdk` can discover connector bindings in the *app runtime*.
- Gmail: read-only `users/me/profile`. Does not list or read messages.
- Drive: read-only `about` identity endpoint. Does not list customer files.
- Calendar: read-only `users/me/calendarList` capped at one result.
- Sheets: if a Sheet ID is supplied, read-only spreadsheet *metadata*, not cell contents. Without ID, `NEEDS_TEST_DOCUMENT` is expected.
- Docs: if a Doc ID is supplied, read-only document metadata; otherwise `NEEDS_TEST_DOCUMENT` is expected.
- Sanitized output: service name, pass/not connected/missing test ID/failure category only. No OAuth token or provider response is printed.

## Interpreting results
- **PASS**: A connector-mediated request successfully returned from the provider in the Replit development runtime.
- **NOT_CONNECTED**: No matching binding was returned to this app. The connection may be authorized globally but not assigned to this Repl, or the SDK may use a different connector identifier.
- **NEEDS_TEST_DOCUMENT**: Connector binding discovered but cannot test a document without an explicitly selected file.
- **ERROR**: Provider or connector request failed. A 401 indicates session/binding problems; 403 indicates account authorization or permissions; 404 can indicate wrong SDK connector route, version or missing document.

## Review gates before production work
- Verify account ownership. The ChatGPT Gmail plugin in this conversation was connected to an ATG mailbox, but its Google Drive plugin was connected to a different business identity. ChatGPT and Replit authorizations are independent. **Do not assume Replit has the same identities.**
- Do not log credentials or paste session tokens. Share only the sanitized PASS/ERROR output with the reviewer.
- Test read-only metadata from the ATG Sheet once it exists.
- Repeat after deployment with an app-specific, read-only health check designed to avoid public exposure. **This CLI test deliberately refuses to run in production.**
- If deployed background jobs cannot access connector bindings, use a Replit-supported integration wiring method or fallback to a dedicated server-side service account for ATG-owned Sheets. Do not implement custom OAuth unless required.

## Boundary
This proof of concept does **not** deploy a CRM, ingest prospecting rows, scan email, send email, write to Google, or expose customer Google connections. It is a prerequisite validation before any of those features.
