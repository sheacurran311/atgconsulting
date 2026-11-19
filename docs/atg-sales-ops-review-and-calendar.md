# ATG Sales Operations: Reviewed CRM Updates and Calendar Visibility

## Scope

The existing Google Sheet remains ATG's authoritative prospecting ledger. The external research agent can continue populating its **Prospects**, **Research Queue**, and **Start Here** tabs. No imported duplicate prospects or secondary CRM tables are created.

The Admin **Prospecting** page now includes:

1. Google Sheets prospect pipeline (existing read-only view).
2. Gmail metadata reconciliation (existing paginated read-only view).
3. **Reviewed Sheet Updates**: staff explicitly approves a single prospect's stage and contact/follow-up dates.
4. **Upcoming Prospect Calendar Events**: read-only list of calendar events matched to unique prospect contact emails over the next 60 days.

## Replit runtime setup

Replit project connectors must include active **google-sheet**, **google-mail**, and **google-calendar** grants.

- `ATG_PROSPECT_SHEET_ID`: optional override for the ATG-owned source workbook.
- `ATG_GMAIL_ACCOUNT`: optionally override the expected Gmail account, otherwise `shea@atgconsulting.io`.
- `ATG_CALENDAR_ACCOUNT`: expected ID of the primary ATG Google Calendar, otherwise `shea@atgconsulting.io`.
- `ATG_ENABLE_SHEET_WRITEBACK`: **default off**. Set to exactly `true` in the Replit application configuration only after validating the integration with a controlled, authorized test prospect. Do not test writes against a real prospect before reviewing the target cells.

## Human-approved CRM update

A prospect must already be recorded in the Sheet with a unique domain and, if provided, unique email address. The admin uses **Review update**, chooses the new stage and dates, explicitly checks the acknowledgement, then clicks **Approve & update Google Sheet**.

Permitted stage changes:
- `Ready` to `Contacted`
- `Contacted` to `Contacted` or `Replied`
- `Replied` to `Replied`

The backend verifies:
- Signed-in ATG admin permission.
- Write feature flag enabled.
- Real-time 26-column header schema.
- Correct Sheet row number, business, domain, contact address, previous stage and previous dates.
- No do-not-contact flag, duplicate domain/contact email or truncated Sheet coverage.
- Valid date formats.

The only write is a **single Google Sheets values.batchUpdate** affecting:
- Column T: Outreach stage
- Column V: Last contacted
- Column W: Next follow-up

All other columns remain untouched. ATG writes an audit record containing the actor, changed row and stage transition. No Gmail message sends, CRM stage automation, research data modifications or Calendar mutations.

### Concurrency limitation

Google Sheets values APIs do not provide an atomic conditional cell update. The server checks the live row and ledger immediately before writing; an external edit made between the last read and the write could still race. For strict concurrent editing at scale, introduce a transactional database or an appropriate revision/lock protocol instead of assuming these validations provide atomic compare-and-swap.

## Calendar

A manual **Check Calendar** action first verifies the connected primary calendar's ID matches the configured ATG account. It then reads at most 100 events in the next 60 days, filters locally for matching unique, non-suppressed prospect attendees, and returns only prospect-facing fields. Event titles, notes, descriptions and unrelated attendees are never shown in the dashboard. Calendar results are *potential prospect-associated events*, not proof a consultation was booked or held.

If there are more than 100 events or the Sheet view is truncated, a limited-coverage warning appears.

## Verification after merge to main

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/atg-consulting typecheck
pnpm --filter @workspace/api-server exec tsx --test src/prospectWriteback.test.ts src/prospectCalendar.test.ts src/prospectGmail.test.ts src/prospectSheet.test.ts
pnpm --filter @workspace/api-server build
```

Then in the Replit development application:
1. Verify the existing Sheet and Gmail sections still render without errors.
2. Click **Check Calendar**. Confirm the correct ATG account and empty-state behavior if no meetings exist.
3. Verify the Reviewed Sheet Update form has no prospect selected when the source Sheet is empty.
4. With `ATG_ENABLE_SHEET_WRITEBACK` unset, a write request must be refused.
5. Once an intentionally created test prospect exists, enable writeback only for the controlled test, approve a single stage change, inspect **T**, **V**, and **W**, and verify other columns and the opt-out flag remain unchanged.
6. Confirm stale or suppressed test records are rejected. Avoid simulating actual prospect outreach.

No real mail or prospect data is required for automated unit tests.
