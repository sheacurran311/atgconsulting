/**
 * Client home. Every line comes from GET /api/client/dashboard.
 * Empty states stay empty. No hours-saved promise and no prices.
 */
import type { ReactNode } from "react";
import { Link } from "wouter";
import DfyApplyCard from "@/components/app/DfyApplyCard";
import type { ClientHomePayload } from "@/lib/api";

const TIER_LABEL: Record<string, string> = {
  NONE: "No plan selected",
  SELF_SERVE: "Self-serve",
  GUIDED: "Guided",
  WHITE_GLOVE: "Done-for-you",
};

const STATE_LABEL: Record<string, string> = {
  locked: "Locked",
  ready: "Ready",
  installed: "Installed",
  verified: "Verified",
};

function Card({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <section className="rounded-xl p-5" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>{kicker}</p>
      {children}
    </section>
  );
}

function whereCopy(home: ClientHomePayload): string {
  if (!home.where.hasIntake) return "Intake not received yet.";
  if (home.where.planReady) return "Your plan is ready.";
  if (home.where.proposalState === "ready") return "Proposal is ready. Shea has not released the tool plan yet.";
  return "Intake received. Shea is reviewing it.";
}

export default function ClientHome({ home }: { home: ClientHomePayload }) {
  const bookingUrl = typeof window !== "undefined" ? (import.meta.env.VITE_BOOKING_URL as string ?? "") : "";
  const externalBooking = bookingUrl.startsWith("http");

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card kicker="WHERE YOU ARE">
        <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{whereCopy(home)}</p>
        {home.where.intakeAt && (
          <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>Intake received {new Date(home.where.intakeAt).toLocaleDateString()}</p>
        )}
        {home.where.proposalApprovedAt && (
          <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>Proposal approved {new Date(home.where.proposalApprovedAt).toLocaleDateString()}</p>
        )}
      </Card>

      <Card kicker="YOUR PLAN">
        <p className="font-semibold text-sm" style={{ color: "var(--canvas-text)" }}>{TIER_LABEL[home.plan.tier] ?? home.plan.tier}</p>
        {home.plan.status && <p className="text-xs mt-1" style={{ color: "var(--canvas-text-3)" }}>Account status: {home.plan.status}</p>}
        {home.plan.testMode && <p className="text-xs mt-2 font-mono" style={{ color: "var(--blue)" }}>ADMIN TEST MODE</p>}
      </Card>

      <Card kicker="PROPOSAL">
        {home.where.proposalState === "ready" ? (
          <Link href="/app/proposal" className="text-sm font-semibold" style={{ color: "var(--blue)" }}>Open your proposal</Link>
        ) : home.where.proposalState === "pending" ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>Shea is still reviewing the proposal. It is not ready to read.</p>
        ) : (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No proposal yet.</p>
        )}
      </Card>

      <Card kicker="TOOL PLAN">
        {home.toolPlan.ready ? (
          <>
            <Link href="/app/plan" className="text-sm font-semibold" style={{ color: "var(--blue)" }}>Open your tool plan</Link>
            {home.toolPlan.approvedAt && (
              <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>Approved {new Date(home.toolPlan.approvedAt).toLocaleDateString()}</p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>Not ready. Shea reviews this before you see it.</p>
        )}
      </Card>

      <Card kicker="NEXT ACTIONS">
        {home.nextActions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>Nothing is waiting on you.</p>
        ) : (
          <ul className="space-y-2">
            {home.nextActions.map((action) => (
              <li key={action.id}>
                <Link href={action.href} className="text-sm font-semibold" style={{ color: "var(--blue)" }}>{action.label}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card kicker="RECOMMENDED WORKFLOWS">
        {home.workflows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No workflows recommended yet.</p>
        ) : (
          <ul className="space-y-2">
            {home.workflows.map((row) => (
              <li key={row.slug} className="flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: "var(--canvas-text)" }}>{row.name}</span>
                <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{STATE_LABEL[row.state] ?? row.state}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {home.guided && (
        <Card kicker="GUIDED SESSIONS">
          <p className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>
            {home.guided.remaining} / {home.guided.total}
          </p>
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>sessions remaining</p>
          {home.guided.remaining > 0 && externalBooking && (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm inline-block mt-3" style={{ padding: "8px 14px" }}>
              Book on the external calendar
            </a>
          )}
          {home.guided.remaining > 0 && !externalBooking && (
            <p className="text-xs mt-2" style={{ color: "var(--canvas-text-3)" }}>Booking is external. A booking link is not configured yet.</p>
          )}
        </Card>
      )}

      {home.dfy.show && (
        <div id="dfy">
          <DfyApplyCard visible />
          <Card kicker="DONE-FOR-YOU MILESTONES">
            {home.dfy.applicationStatus === "accepted" && home.dfy.milestones.length > 0 ? (
              <ul className="space-y-2">
                {home.dfy.milestones.map((item) => (
                  <li key={item.label}>
                    <p className="text-sm font-semibold" style={{ color: "var(--canvas-text)" }}>{item.label}</p>
                    {item.description && <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>{item.description}</p>}
                  </li>
                ))}
              </ul>
            ) : home.dfy.applicationStatus == null ? (
              <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No application yet.</p>
            ) : (
              <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No milestones on an approved proposal yet.</p>
            )}
            <p className="text-xs mt-3" style={{ color: "var(--canvas-text-3)" }}>
              {home.dfy.accessCount === 0 ? "No access recorded." : `${home.dfy.accessCount} access record${home.dfy.accessCount === 1 ? "" : "s"}.`}
            </p>
          </Card>
        </div>
      )}

      <Card kicker="MESSAGES AND SUPPORT">
        <div id="messages">
          {home.message ? (
            <>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)" }}>{home.message.fromAdmin ? "SHEA" : "YOU"} · {new Date(home.message.createdAt).toLocaleString()}</p>
              <p className="text-sm" style={{ color: "var(--canvas-text)" }}>{home.message.body}</p>
              {home.unreadMessages > 0 && <p className="text-xs mt-2" style={{ color: "var(--blue)" }}>{home.unreadMessages} unread</p>}
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No messages yet. The thread is in the sidebar.</p>
          )}
        </div>
        <div className="mt-4">
          {home.tickets.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No support tickets.</p>
          ) : (
            <ul className="space-y-1">
              {home.tickets.map((ticket) => (
                <li key={ticket.id} className="text-sm" style={{ color: "var(--canvas-text)" }}>
                  {ticket.subject} <span className="font-mono text-2xs" style={{ color: "var(--canvas-text-3)" }}>{ticket.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card kicker="REPORTS">
        {home.report ? (
          <Link href="/app/reports" className="text-sm font-semibold" style={{ color: "var(--blue)" }}>
            Latest report {home.report.date}
          </Link>
        ) : (
          <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>No report yet.</p>
        )}
      </Card>
    </div>
  );
}
