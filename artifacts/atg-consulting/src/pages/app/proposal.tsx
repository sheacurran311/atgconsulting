/**
 * /app/proposal — the proposal Shea has approved.
 * Reachable before an intake is linked. Drafts are not shown.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import AppShell from "@/components/app/AppShell";
import { portalApi, type ClientProposal, type PortalProposal } from "@/lib/api";

function Paragraphs({ text }: { text: string }) {
  const parts = text.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="space-y-3">
      {parts.map((part, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{part}</p>
      ))}
    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section>
      <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>{label}</p>
      <h2 className="font-bold text-lg mb-3" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{title}</h2>
      {children}
    </section>
  );
}

function ReadyView({ proposal }: { proposal: ClientProposal }) {
  const scope = proposal.scope.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  const investment = proposal.investment;
  const hasInvestment = !!(investment.tier || investment.price || investment.care || investment.notes);
  const approved = proposal.approvedAt
    ? new Date(proposal.approvedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="space-y-10">
      <div className="rounded-xl p-5" style={{ background: "var(--canvas-2)", border: "1px solid var(--canvas-border)" }}>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>
          REVIEWED BY SHEA{approved ? ` · ${approved}` : ""}
        </p>
        <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>
          {proposal.contactName ? `Prepared for ${proposal.contactName}. ` : ""}
          This is the proposal Shea approved. It is not sent anywhere from this page.
        </p>
      </div>

      {proposal.execSummary.trim() && (
        <Section label="01 — EXECUTIVE SUMMARY" title="The short version">
          <Paragraphs text={proposal.execSummary} />
        </Section>
      )}

      {proposal.understanding.trim() && (
        <Section label="02 — OUR UNDERSTANDING" title="Where you are today">
          <Paragraphs text={proposal.understanding} />
        </Section>
      )}

      {scope.length > 0 && (
        <Section label="03 — SCOPE" title="What we'll build">
          <ul className="space-y-2">
            {scope.map((item) => (
              <li key={item} className="text-sm flex gap-2" style={{ color: "var(--canvas-text-2)" }}>
                <span style={{ color: "var(--blue)" }}>›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {proposal.howWeConnect.trim() && (
        <Section label="04 — HOW IT CONNECTS" title="Working inside your existing tools">
          <Paragraphs text={proposal.howWeConnect} />
        </Section>
      )}

      {proposal.milestones.length > 0 && (
        <Section label="05 — MILESTONES" title="Key milestones">
          <div className="space-y-3">
            {proposal.milestones.map((milestone) => (
              <div key={`${milestone.label}-${milestone.description}`} className="rounded-xl p-4" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
                {milestone.label && (
                  <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>{milestone.label}</p>
                )}
                {milestone.description && (
                  <p className="text-sm" style={{ color: "var(--canvas-text-2)" }}>{milestone.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasInvestment && (
        <Section label="06 — INVESTMENT" title="What it costs">
          <div className="rounded-xl p-5" style={{ border: "2px solid var(--blue)", background: "var(--canvas-1)" }}>
            {investment.tier && (
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>{investment.tier}</p>
            )}
            {investment.price && (
              <p className="font-extrabold text-3xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>{investment.price}</p>
            )}
            {investment.care && (
              <p className="text-sm mt-2" style={{ color: "var(--canvas-text-2)" }}>{investment.care}</p>
            )}
            {investment.notes && (
              <p className="font-mono text-2xs mt-3" style={{ color: "var(--canvas-text-3)" }}>{investment.notes}</p>
            )}
          </div>
        </Section>
      )}

      {proposal.acceptanceClause.trim() && (
        <Section label="07 — ACCEPTANCE" title="Ready to move forward">
          <Paragraphs text={proposal.acceptanceClause} />
          <p className="text-xs mt-4" style={{ color: "var(--canvas-text-3)" }}>
            Accepting this proposal happens with Shea. This page does not record a signature.
          </p>
        </Section>
      )}
    </div>
  );
}

function StatusCard({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ border: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
      <h2 className="font-bold text-lg mb-2" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>{title}</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>{body}</p>
      {action && (
        <Link to={action.href}>
          <span className="btn-primary inline-flex mt-5">{action.label}</span>
        </Link>
      )}
    </div>
  );
}

export default function ProposalPage() {
  const [data, setData] = useState<PortalProposal | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    portalApi.proposal()
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <AppShell allowWithoutIntake>
      <div className="mb-8">
        <p className="font-mono text-2xs mb-2" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>PROPOSAL</p>
        <h1 className="font-extrabold text-2xl" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>
          Your proposal
        </h1>
      </div>

      {error && (
        <StatusCard
          title="Couldn't load your proposal"
          body="Refresh the page. If it still fails, email shea@atgconsulting.io."
        />
      )}

      {!error && !data && (
        <p className="font-mono text-xs" style={{ color: "var(--canvas-text-3)", letterSpacing: "0.08em" }}>LOADING…</p>
      )}

      {data?.state === "empty" && (
        <StatusCard
          title="No proposal yet"
          body="Complete the intake with the email on this account. Grok drafts a diagnosis, and Shea reviews it before a proposal appears here."
          action={{ href: "/intake", label: "Start the intake" }}
        />
      )}

      {data?.state === "pending" && (
        <StatusCard
          title="Shea is reviewing your intake"
          body="Your proposal will show here after she approves it. Nothing is sent to you until then."
        />
      )}

      {data?.state === "ready" && data.proposal && <ReadyView proposal={data.proposal} />}
    </AppShell>
  );
}
