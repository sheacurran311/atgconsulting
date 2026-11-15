/**
 * Pure subscription mapping helpers. No Stripe client, no database.
 */

/** Only the DFY monthly care subscription may change DFY entitlement. */
export function isDfySubscription(
  sub: { items?: { data?: Array<{ price?: { id?: string } | null }> } },
  monthlyPriceId: string | null,
): boolean {
  if (!monthlyPriceId) return false;
  return sub.items?.data?.some((item) => item.price?.id === monthlyPriceId) ?? false;
}

/** Active care keeps DFY active. Past-due/incomplete pauses it. Ended care churns. */
export function subscriptionClientStatus(status: string): "ACTIVE" | "PAUSED" | "CHURNED" {
  if (["active", "trialing"].includes(status)) return "ACTIVE";
  if (["past_due", "unpaid", "paused", "incomplete"].includes(status)) return "PAUSED";
  return "CHURNED";
}
