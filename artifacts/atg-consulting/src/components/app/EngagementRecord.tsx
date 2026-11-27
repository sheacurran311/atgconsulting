import type { ReactNode } from "react";
import { usd, type WorkspaceRecord, type ValueReportInput } from "@/lib/engagementWorkspace";

function Fact({label, children}: {label: string; children: ReactNode}) {
  return <div className="min-w-0"><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-line break-words">{children}</dd></div>;
}

const valueText = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString("en-US", {maximumFractionDigits: 2});
type Evidence = ValueReportInput["kpis"][number]["observationEvidence"];
function EvidenceNote({value}: {value: Evidence}) {
  return value ? <>{value.classification} · {value.reference} · {value.capturedOn}<br />{value.method}</> : <>Unavailable</>;
}

export function EngagementRecord({record}: {record: Exclude<WorkspaceRecord, {kind: "estimate"}>}) {
  if (record.kind === "value") {
    const {content, calculation} = record;
    return <article className="space-y-4 break-words">
      <h3 className="font-bold">Value realization · {content.period}</h3>
      <p className="whitespace-pre-line text-sm">{content.summary}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Projected capacity recovered">{valueText(content.projectedCapacityHours)}{content.projectedCapacityHours === null ? "" : " hours"}</Fact>
        <Fact label="Projected cash benefit">{usd(content.projectedCashCents)}</Fact>
        <Fact label="Documented realized cash benefit">{usd(calculation.realizedCashCents)}</Fact>
        <Fact label="Documented actual cost">{usd(content.actualCostCents)}</Fact>
        <Fact label="Documented net cash benefit">{usd(calculation.netCashCents)}</Fact>
        <Fact label="Realized ROI">{calculation.actualRoiPercent === null ? "Unavailable" : valueText(calculation.actualRoiPercent) + "%"}</Fact>
      </dl>
      {content.kpis.map((metric, index) => <section key={index} className="space-y-2 rounded-lg border border-canvas-border p-3 text-sm">
        <h4 className="font-bold">{metric.name} · {metric.unit}</h4>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Fact label="Owner and desired direction">{metric.owner} · {metric.direction}</Fact>
          <Fact label="Baseline">{valueText(metric.baseline)} · {metric.baselineStart} to {metric.baselineEnd}</Fact>
          <Fact label="Projected and observed">{valueText(metric.projected)} projected · {valueText(metric.observed)} observed</Fact>
          <Fact label="Observation period">{metric.observationStart} to {metric.observationEnd}</Fact>
          <Fact label="Observed change">{valueText(calculation.observedChanges[index])}</Fact>
          <Fact label="Attribution confidence">{metric.attribution}</Fact>
          <Fact label="Baseline evidence"><EvidenceNote value={metric.baselineEvidence} /></Fact>
          <Fact label="Observation evidence"><EvidenceNote value={metric.observationEvidence} /></Fact>
          <Fact label="Dependencies and attribution rationale">{metric.dependencies}</Fact>
        </dl>
      </section>)}
      <dl className="space-y-3 text-sm">
        {content.realized.map(item => <Fact key={item.evidence.reference} label={item.label}>{usd(item.amountCents)} · <EvidenceNote value={item.evidence} /></Fact>)}
        {content.actualCostEvidence && <Fact label="Actual cost evidence"><EvidenceNote value={content.actualCostEvidence} /></Fact>}
        <Fact label="Limitations and assumptions">{content.limitations}</Fact>
        <Fact label="Next actions">{content.nextSteps}</Fact>
      </dl>
    </article>;
  }
  if (record.kind === "change") {
    const {content} = record;
    return <article className="space-y-4 break-words">
      <h3 className="font-bold">{content.reference} · {content.title}</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Additional scope">{content.scope}</Fact>
        <Fact label="Reason">{content.reason}</Fact>
        <Fact label="Schedule impact">{content.timeline}</Fact>
        <Fact label="Acceptance criteria">{content.acceptance}</Fact>
        <Fact label="Included hours and rate">{content.includedHours} hours · {usd(content.additionalHourlyCents)} per hour</Fact>
        <Fact label="Additional fee and terms">{usd(content.additionalFeeCents)} · {content.commercialTerms}</Fact>
      </dl>
    </article>;
  }
  if (record.kind === "seo") {
    const {content, findings} = record;
    return <article className="space-y-4 break-words">
      <h3 className="font-bold">Search visibility · {content.period}</h3>
      <p className="whitespace-pre-line text-sm">{content.notes}</p>
      {([["Baseline", content.previous], ["Current", content.current]] as const).map(([label, snapshot]) =>
        <section key={label} className="rounded-lg border border-canvas-border p-3 text-sm">
          <h4 className="font-bold">{label} data</h4>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact label={"Google Search Console · " + content.gsc.property}>
              {snapshot.searchConsole.start} to {snapshot.searchConsole.end}<br />
              {snapshot.searchConsole.clicks} clicks · {snapshot.searchConsole.impressions} impressions · {(100 * snapshot.searchConsole.ctr).toFixed(2)}% CTR · position {snapshot.searchConsole.averagePosition}
              <br />Source: {label === "Baseline" ? content.gsc.baselineReference : content.gsc.currentReference}
            </Fact>
            {snapshot.analytics && content.ga4 && <Fact label={"GA4 · " + content.ga4.property}>
              {snapshot.analytics.start} to {snapshot.analytics.end}<br />
              {snapshot.analytics.organicSessions} organic sessions · {snapshot.analytics.keyEvents} key events
              <br />Source: {label === "Baseline" ? content.ga4.baselineReference : content.ga4.currentReference}
            </Fact>}
          </dl>
        </section>)}
      <section className="text-sm"><h4 className="font-bold">Review signals</h4>
        {findings.length ? <ul className="space-y-2">{findings.map(item => <li key={item.id}>{item.source} · {item.explanation} {item.nextStep}</li>)}</ul>
          : <p>No configured alert threshold was met for these windows.</p>}
      </section>
      {!!content.actions.length && <section className="text-sm"><h4 className="font-bold">Remediation</h4>
        <ul className="space-y-2">{content.actions.map((item, index) =>
          <li key={index}>{item.action} · {item.owner} · Due {item.due} · {item.status}{item.evidence && " · " + item.evidence}</li>)}</ul>
      </section>}
      {!!content.aeo.length && <section className="text-sm"><h4 className="font-bold">Answer engine samples</h4>
        <ul className="space-y-2">{content.aeo.map((item, index) => <li key={index}>
          <p><strong>{item.question}</strong> · {item.platform} · {item.sampledOn} · {item.locationContext}</p>
          <p>{item.observedMention ? "Mention observed" : "No mention observed"}</p>
          <ul>{item.citations.map((url, citation) => <li key={citation}><a className="break-all underline" href={url} rel="noreferrer">{url}</a></li>)}</ul>
        </li>)}</ul>
      </section>}
    </article>;
  }
  if (record.kind === "sla") {
    const {content} = record;
    return <article className="space-y-4 break-words">
      <h3 className="font-bold">{content.title} · {record.status === "executed" ? "Executed" : "Review copy"}</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Fact label="Parties">{content.atgParty} and {content.clientParty}</Fact>
        <Fact label="Agreement">{content.contractReference}</Fact>
        <Fact label="Effective date and term">{content.effectiveDate} · {content.term}</Fact>
        <Fact label="Covered services">{content.scope}</Fact>
        <Fact label="Deliverables and acceptance">{content.deliverables}</Fact>
        <Fact label="Exclusions">{content.exclusions}</Fact>
        <Fact label="Dependencies">{content.dependencies}</Fact>
        <Fact label="Support hours and contact">{content.coverage} · {content.timezone}<br />{content.channels}</Fact>
        <Fact label="Measurement clock">{content.measurementClock}</Fact>
        <Fact label="Availability and maintenance">{content.availabilityAndMaintenance}</Fact>
        <Fact label="Security and governance">{content.governance}</Fact>
        <Fact label="Responsibilities">{content.responsibilities}</Fact>
        <Fact label="Reporting">{content.reporting}</Fact>
        <Fact label="Commercial terms">{content.commercialTerms}</Fact>
        <Fact label="Included hours">{content.includedHours}</Fact>
        <Fact label="Additional authorized work">{usd(content.additionalHourlyCents)} per hour · {content.changeAuthorization}</Fact>
        <Fact label="Escalation">{content.escalation}</Fact>
        <Fact label="Termination and handoff">{content.terminationAndHandoff}</Fact>
      </dl>
      <div className="grid gap-2 sm:grid-cols-2">{Object.entries(content.severity).map(([level, item]) =>
        <dl className="space-y-2 rounded-lg border border-canvas-border p-3 text-sm" key={level}>
          <Fact label={level}>{item.definition}</Fact>
          <Fact label="Initial response">{item.response}</Fact>
          <Fact label="Update cadence">{item.updates}</Fact>
          <Fact label="Restoration objective">{item.restoration}</Fact>
        </dl>)}</div>
    </article>;
  }
  const {content} = record;
  return <article className="space-y-4 break-words">
    <h3 className="font-bold">{content.title} · {content.period}</h3>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <Fact label="Objectives">{content.objectives}</Fact>
      <Fact label="Decision owner">{content.decisionOwner}</Fact>
      <Fact label="Meeting cadence and next review">{content.meetingCadence} · {content.nextReview}</Fact>
      <Fact label="Advisory hours">{content.hoursUsed} used · {content.includedHours} included</Fact>
      <Fact label="Scope">{content.scope}</Fact>
      <Fact label="Exclusions">{content.exclusions}</Fact>
    </dl>
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <section><h4 className="font-bold">Roadmap</h4><ul className="space-y-1">{content.roadmap.map((item, index) =>
        <li key={index}>{item.item} · {item.owner} · {item.due} · {item.status}</li>)}</ul></section>
      <section><h4 className="font-bold">Decision log</h4><ul className="space-y-1">{content.decisions.map((item, index) =>
        <li key={index}>{item.date} · {item.owner} · {item.decision}</li>)}</ul></section>
      <section><h4 className="font-bold">Vendor inventory</h4><ul className="space-y-1">{content.vendors.map((item, index) =>
        <li key={index}>{item.name} · {item.purpose} · {item.owner} · Review {item.reviewDate}</li>)}</ul></section>
    </div>
  </article>;
}
