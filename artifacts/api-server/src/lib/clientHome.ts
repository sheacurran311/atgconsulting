/**
 * Pure pieces of the client home. Queries stay in the route.
 * Nothing here invents dates, prices, or progress percents.
 */

const TIER_ORDER = ["NONE", "SELF_SERVE", "GUIDED", "WHITE_GLOVE"];

export type WorkflowRowState = "locked" | "ready" | "installed" | "verified";

export function workflowRowState(input: {
  clientTier: string;
  minTier: string;
  templateEnabled: boolean;
  overrideEnabled?: boolean | null;
  installStatus?: string | null;
  installedAt?: Date | null;
  testMode: boolean;
}): WorkflowRowState {
  if (input.installStatus === "verified") return "verified";
  if (input.installedAt || input.installStatus === "marked") return "installed";
  const clientIdx = TIER_ORDER.indexOf(input.clientTier);
  const minIdx = TIER_ORDER.indexOf(input.minTier);
  const allowed = input.testMode
    || (input.templateEnabled && input.overrideEnabled !== false && clientIdx >= 0 && minIdx >= 0 && clientIdx >= minIdx);
  return allowed ? "ready" : "locked";
}

export interface HomeAction {
  id: string;
  label: string;
  href: string;
}

export function buildNextActions(input: {
  guidedRemaining: number | null;
  unreadMessages: number;
  pendingOutputs: number;
  openActionItems: number;
}): HomeAction[] {
  const actions: HomeAction[] = [];
  if (input.guidedRemaining != null && input.guidedRemaining > 0) {
    actions.push({ id: "book-session", label: "Book a guided session", href: "/app/sessions" });
  }
  if (input.unreadMessages > 0) {
    actions.push({ id: "unread-message", label: "Read Shea's reply", href: "/app#messages" });
  }
  if (input.pendingOutputs > 0) {
    actions.push({ id: "pending-output", label: "Review a draft", href: "/app?tab=today" });
  }
  if (input.openActionItems > 0) {
    actions.push({ id: "action-item", label: "Open action item", href: "/app/consultations" });
  }
  return actions;
}
