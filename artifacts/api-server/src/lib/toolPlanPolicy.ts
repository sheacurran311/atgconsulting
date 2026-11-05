/**
 * Tool plans stay drafts until Shea approves them.
 * Self-serve generation does not stamp "approved".
 */

export function shouldAutoApproveToolPlan(_tier: string | null | undefined): boolean {
  return false;
}

/** Clients may read a plan only after it is approved. Drafts stay on the admin side. */
export function toolPlanVisibleToClient(status: string | null | undefined): boolean {
  return status === "approved";
}
