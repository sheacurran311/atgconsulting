/**
 * Centralised tier-access check.
 *
 * When BILLING_ENABLED is NOT "true" (the default), every client has access to
 * every workflow regardless of tier. This lets Shea test the full portal without
 * setting up Stripe. The bypass is explicit in this function and clearly documented.
 *
 * In production (BILLING_ENABLED=true) the check enforces:
 *   1. The WorkflowTemplate must be globally enabled.
 *   2. The ClientWorkflowSettings override (if present) must not be disabled.
 *   3. The client's tier must meet the template's minTier.
 */

import { prisma } from "./db";

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

/** True when billing is active. False = test mode, all workflows unlocked. */
export function billingActive(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  /** True when billing is off and the check was bypassed. */
  testMode?: boolean;
}

export async function checkWorkflowAccess(clientId: string, slug: string): Promise<AccessResult> {
  // Test-mode bypass: BILLING_ENABLED is not "true".
  // Every client can run every workflow while testing; state it clearly.
  if (!billingActive()) {
    // Still check that the template exists and is globally enabled.
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
