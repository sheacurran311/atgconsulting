# ATG Consulting: Website Repositioning and Legacy Checkout Retirement

**Status:** Proposed code on PR #73. Not merged, deployed or Replit-validated at authoring time.  
**Business model authority:** [Current Product Master Plan](MASTER_IMPLEMENTATION_PLAN.md).

## Scope completed on the PR branch

- Public homepage now leads with **Your Business. Modernized.**
- Services reflect approved positioning: websites and logos, AI sales and marketing workflows, business automation, personal AI, custom development and fractional technical partnership. Complete Business Modernization is a bespoke multi-service offer.
- Removed fixed $997 / $1,497 / from-$3,500 package cards from the public homepage. Replaced these with ways of working, a cost FAQ and a proposal-oriented funnel.
- Updated founder narrative, consultancy framing, hero, customer process, comparison, footer and navigation.
- Direct website or custom-project inquiries use `mailto:shea@atgconsulting.io` while the existing intake remains predominantly AI/tier-oriented. **This is an interim contact path, not a completed adaptive web-services intake or CRM submission.**
- `POST /api/billing/checkout` now returns HTTP **410** with `CONSULTATION_REQUIRED` and `next: /intake` regardless of `BILLING_ENABLED` or supplied tier. It must never create a Stripe Checkout Session.
- The existing customer Stripe portal, event signature verification, legacy webhook reconciliation and historical records remain unchanged for safety. **No new custom billing capability or Stripe account configuration is claimed.**
- A targeted regression test verifies that legacy checkout refuses Guided, White Glove and missing-tier POSTs without a payment URL.

## Explicitly not done

- No Stripe test-mode payment/invoice infrastructure, custom proposal acceptance, milestone billing or production charges.
- No service-specific adaptive intake, client account conversion redesign or website-hosting/SEO implementation.
- No backend data migration, deletion of historic Stripe products, changes to authenticated customer entitlement records, or activation of billing.
- Existing site-wide legal/refunds pages and older downloaded PDF collateral still require a review for legacy package terms before soliciting a paid custom engagement. Removed the stale one-pager download from the homepage footer but have **not** deleted the file.
- No live visual review or production publishing.

## One consolidated Replit verification pass

After reviewing/merging PR #73 and pulling GitHub main into Replit, execute from the repository root:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/atg-consulting typecheck
pnpm --filter @workspace/api-server exec tsx --test src/billingCheckoutRetired.test.ts
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/atg-consulting build
```

If a script name differs in the target checkout, inspect `package.json` rather than assuming success.

### Interactive checks

1. Open the marketing homepage on narrow phone and desktop widths. Verify legible hero, six services, founder, How It Works, How To Work With ATG, and FAQ. No legacy public price cards, mandatory session counts or spurious unlimited support.
2. Click both **Start a free assessment** and **Discuss your project**. Ensure the former opens the actual intake and the latter opens a draft email to the intended ATG address. Validate inquiry conversion on mobile. No unsupported booked-calendar claim.
3. Verify footer/navigation anchors and the FAQ, service cards, accessibility focus and any legacy one-pager links.
4. With billing on/off in a controlled local/test setup, POST `/api/billing/checkout` (Guided/White Glove/other) and confirm HTTP 410 with no Stripe request or payment session.
5. If a preexisting test Stripe customer and portal exist, confirm existing customer billing and signed webhook flow continue separately. Do not create a live transaction.
6. Verify signed-in client portal, old pricing links, account labels and proposal documents for contradictory copy. Treat older fixed-package legal/refund text as a follow-up blocker before enabling bespoke billing.
7. Confirm approved production release SHA and the actual served homepage. Keep `BILLING_ENABLED` off until a quote-specific invoice flow and tests exist.

## Next implementation milestones

1. Update intake for service intention and website/branding discovery, plus consultant scheduling and CRM capture for web inquiries.
2. Versioned custom USD quotes with workstreams, scope, owner approval and customer acceptance.
3. Stripe test-mode invoices, deposits and milestones tied to accepted quotes with idempotent payment reconciliation.
4. Delivery/project task and evidence tracking covering both website/design and AI/automation work.

**Customer-owned execution boundary:** ATG supplies consulting, configurations, templates and tracked client deliverables. Customer inbox/calendar/CRM workflows must run through the customer's own authorized systems, not as unattended tasks on ATG servers.
