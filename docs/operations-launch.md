# AI services and operations launch

## What this release provides

The homepage and email-first assessment now serve small businesses, personal/family logistics, and people needing both. Signing in remains optional for completing an assessment. A verified account is required for the private customer dashboard. The questions collect workflow frequency, one redacted example, approval boundaries, ownership, success criteria, budget, and support preferences.

The operator can create an operating guide from a consented assessment, refine candidate workflows, prioritize one pilot, record delivery milestones and integration evidence, and publish a customer version. Drafts and internal notes remain private. Customers can download the guide or individual setup briefs, accept a published version, and report results or problems. Reported progress is manual evidence, not live monitoring.

Workflow briefs are installation specifications, not runnable bots. Actual workflows must be configured, tested, and activated in customer-owned tools. The portal does not store customer passwords or operate their inboxes. Marking a workflow live requires platform details, test evidence, a check date, and a successful-run date; it is still an operator attestation.

Reviewed assessment reports can now be emailed explicitly by an administrator. Approval alone does not mean delivery. Missing email configuration fails visibly. An uncertain delivery is locked against duplicate sends until the operator checks the mail provider and reconciles it. This is ATG delivering its own assessment, not sending outreach on a customer's behalf.

## Customer delivery playbook

1. Review the consented intake. Identify the audience and one frequent, costly or frustrating process. Request redacted examples only.
2. Consultation: observe the current process, record a baseline, identify source systems and the responsible owner. Separate work and family accounts.
3. Agree one pilot in writing: trigger, inputs, actions, approvals, exceptions, measurable success, software costs, access scope, and exclusions. Review travel purchases and external messages before execution.
4. Install in customer accounts with delegated, least-privilege access. Never collect credentials in the portal. Confirm connector and scheduling capabilities directly in the chosen platform.
5. Test normal cases, missing/incorrect input, duplicates, expired connections, missed schedules, and the pause/recovery path. Record redacted evidence and actual dates before changing status.
6. Publish the operating guide, walk through running and stopping the workflow, obtain acceptance of that version, and remove temporary access. Deliver training and agreed setup artifacts.
7. Review after 30 days: compare measured effort and errors with the baseline, review actual costs, and decide whether to expand, adjust, or retire. Record care hours, response expectations, and escalation owners in the agreement; do not imply an uncontracted SLA.

## Replit release steps

1. Back up the database and review the additive Prisma schema changes: OperatingPlan, OperatingEvent, and three DiscoveryIntake delivery fields. For a Replit-managed database, confirm the Shell targets development, then use `pnpm --filter @workspace/api-server db:push` there. Review any proposed changes and stop if destructive changes are proposed; do not use accept-data-loss. Replit Publish separately compares development with production, generates SQL, validates it against a production copy, and applies approved changes. Do not run schema pushes in production, deployment build commands, startup code, or the post-merge hook. This repository has no checked-in Prisma migration history for these tables. For an external database, use that provider's reviewed migration process instead.
2. Install dependencies, generate the Prisma client, and run the normal production build. Deploy both frontend and API together. This PR does not deploy or change secrets.
3. Configure production Clerk keys and the published domain. Email linking and admin assignment require a verified primary email. Development Clerk keys are unsuitable for public launch.
4. Configure the existing email provider and sender settings in Replit. Send a reviewed test report to an address you control and verify provider delivery. Do not manually clear an uncertain send until checking the provider.
5. Keep the existing xAI configuration if intended. OPENAI_API_KEY alone does not enable OpenAI here. Verify the configured model is accessible with the account; deterministic question/report fallbacks remain available. No model availability is claimed by these local tests.
6. Confirm trusted proxy configuration and test the published domain. Protected Replit preview manifest redirects can still be blocked by Replit Shield; application CORS changes cannot grant access to that external shield.

## Deployment smoke test

- Signed out: start with email, choose each audience, answer, reload/resume, and submit. Confirm stored answers in the admin inbox. Create and verify an optional account with the same email and confirm linking.
- Generate and approve a report, then explicitly email it. Verify success, failure, and already-sent behavior with a controlled test address.
- Create a guide, save a private draft, publish it, and confirm another customer cannot access it. Confirm unsaved edits and internal notes never appear in the customer view.
- Download the guide, accept its version, and submit a test result. Publish an updated version and confirm renewed acceptance is requested. Confirm read-only impersonation cannot mutate records.
- Exercise the real database, configured model, and email transport. Local automated tests mock these integrations; they do not prove production credentials or delivery.

Rollback: restore the previous application release if needed and retain the additive tables/columns and their data. Do not drop them as part of an application rollback.

## Publish fails on Plan_intakeId_fkey

The reported statement `ALTER TABLE "Plan" DROP CONSTRAINT "Plan_intakeId_fkey"` fails when that constraint does not exist in the database being validated or migrated. The current Prisma Plan model has a nullable intakeId scalar, not an intake relation. This release does not change that model. The error alone does not establish whether Replit generated stale SQL, a prior change was partly applied, or another schema discrepancy exists.

Use the Publish failure action **Ask Agent to investigate and fix the development schema**. Have Replit Agent inspect the full generated SQL, the development schema, and the read-only production schema. Compare Plan constraints by schema, name, definition, and referenced table; look for duplicate DROP statements. Preserve Plan rows and intakeId values. Do not invent a replacement foreign key merely to satisfy the DROP, reset the database, copy development over production, or mark an unverified migration applied. If regenerated SQL still drops an absent constraint despite matching live metadata, send the deployment ID and generated SQL to Replit Support.

The old post-merge hook targeted the unused empty Drizzle schema. It now only installs dependencies and generates the Prisma client, without altering database structure. This prevents a competing schema push; it does not by itself repair Replit's pending generated migration.

References: [Replit database separation](https://docs.replit.com/features/data-and-storage/development-and-production), [Replit Publish migration validation and recovery](https://docs.replit.com/features/data-and-storage/publish-database-changes).
