/**
 * Centralised tier-access check.
 *
 * Tier checks always apply. Billing does not unlock workflows.
 *
 * ADMIN_TEST_MODE=true is the only bypass. It unlocks every enabled workflow
 * and the portal labels that state "Admin test mode".
 *
 * The check enforces:
 *   1. The WorkflowTemplate must be globally enabled.
 *   2. The ClientWorkflowSettings override (if present) must not be disabled.
 *   3. The client's tier must meet the template's minTier.
 */

import { prisma } from "./db";

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

/** True when billing is active. This does not unlock workflows. */
export function billingActive(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

/** Explicit admin bypass. Off unless ADMIN_TEST_MODE=true. */
export function adminTestMode(): boolean {
  return process.env.ADMIN_TEST_MODE === "true";
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  /** True only when ADMIN_TEST_MODE bypassed the tier check. */
  testMode?: boolean;
}

export async function checkWorkflowAccess(clientId: string, slug: string): Promise<AccessResult> {
  if (adminTestMode()) {
    const t = await prisma.workflowTemplate.findUnique({ where: { slug }, select: { enabled: true } });
    if (!t?.enabled) return { allowed: false, reason: "This workflow has been disabled." };
    return { allowed: true, testMode: true };
  }

  const [client, template, override] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { tier: true } }),
    prisma.workflowTemplate.findUnique({ where: { slug }, select: { minTier: true, enabled: true } }),
    prisma.clientWorkflowSettings.findUnique({ where: { clientId_slug: { clientId, slug } } }),
  ]);

  if (!template?.enabled) return { allowed: false, reason: "This workflow is not available." };
  if (override && !override.enabled) return { allowed: false, reason: "This workflow has been disabled for your account." };

  const clientTierIdx = TIER_ORDER.indexOf(client?.tier ?? "NONE");
  const minTierIdx    = TIER_ORDER.indexOf(template.minTier);

  if (clientTierIdx < minTierIdx) {
    return {
      allowed: false,
      reason:  `This workflow requires the ${template.minTier.replace("_", " ").toLowerCase()} plan or above.`,
    };
  }
  return { allowed: true };
}
