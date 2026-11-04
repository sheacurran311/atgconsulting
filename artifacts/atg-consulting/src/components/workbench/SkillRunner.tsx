/**
 * Opens the workflow form that matches a day block or a workflow button.
 * Lead follow-up drafts a message for the client to review. Nothing is sent.
 */
import { useState } from "react";
import SkillForm from "@/components/workbench/SkillsForms";
import SkillForm2 from "@/components/workbench/SkillsForms2";
import SkillForm3 from "@/components/workbench/SkillsForms3";
import { api, type OutputItem } from "@/lib/api";

const PHASE1 = ["inbox-triage", "review-request", "social-calendar", "seo-audit"] as const;
const PHASE2 = ["money-snapshot", "booking-flow", "quote-proposal", "prospect-research"] as const;
const PHASE3 = ["faq-support", "agent-pipeline"] as const;

function FollowUpForm({
  onClose,
  onOutput,
}: {
  onClose: () => void;
  onOutput: (item: OutputItem) => void;
}) {
  const [who, setWho] = useState("");
  const [lastTouch, setLastTouch] = useState("");
  const [wantToSay, setWantToSay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!who.trim() || !lastTouch.trim() || !wantToSay.trim()) {
      setError("Who, last touch, and what you want to say are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const output = await api.workbench.draftFollowUp({
        who: who.trim(),
        lastTouch: lastTouch.trim(),
        wantToSay: wantToSay.trim(),
      });
      onOutput(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft that follow-up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>LEAD FOLLOW-UP</p>
        <h3 className="font-extrabold text-lg" style={{ color: "var(--canvas-text)", letterSpacing: "-0.02em" }}>Draft a follow-up</h3>
        <p className="text-sm mt-1" style={{ color: "var(--canvas-text-2)" }}>
          This writes a draft for you to review and copy. It is not sent for you.
        </p>
      </div>
      <label className="block text-sm font-medium" style={{ color: "var(--canvas-text)" }}>
        Who
        <input value={who} onChange={(e) => setWho(e.target.value)} maxLength={200} className="field-input text-sm mt-1" placeholder="Name of the person" />
      </label>
      <label className="block text-sm font-medium" style={{ color: "var(--canvas-text)" }}>
        Last touch
        <input value={lastTouch} onChange={(e) => setLastTouch(e.target.value)} maxLength={500} className="field-input text-sm mt-1" placeholder="What happened last" />
      </label>
      <label className="block text-sm font-medium" style={{ color: "var(--canvas-text)" }}>
        What you want to say
        <textarea value={wantToSay} onChange={(e) => setWantToSay(e.target.value)} rows={4} maxLength={1000} className="field-input resize-none text-sm mt-1" placeholder="The point of this follow-up" />
      </label>
      {error && <p className="text-sm" style={{ color: "#B91C1C" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { void submit(); }} disabled={loading} className="btn-primary text-sm" style={{ padding: "8px 14px" }}>
          {loading ? "Drafting…" : "Draft follow-up"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm" style={{ padding: "8px 14px" }}>Close</button>
      </div>
    </div>
  );
}

export default function SkillRunner({
  skill,
  onClose,
  onOutput,
}: {
  skill: string;
  onClose: () => void;
  onOutput: (item: OutputItem) => void;
}) {
  if (skill === "follow-up") {
    return <FollowUpForm onClose={onClose} onOutput={onOutput} />;
  }
  if ((PHASE1 as readonly string[]).includes(skill)) {
    return (
      <SkillForm
        skillKey={skill as (typeof PHASE1)[number]}
        onOutput={onOutput}
        onClose={onClose}
      />
    );
  }
  if ((PHASE2 as readonly string[]).includes(skill)) {
    return (
      <SkillForm2
        skillKey={skill as (typeof PHASE2)[number]}
        onOutput={onOutput}
        onClose={onClose}
      />
    );
  }
  if ((PHASE3 as readonly string[]).includes(skill)) {
    return (
      <SkillForm3
        skillKey={skill as (typeof PHASE3)[number]}
        onOutput={onOutput}
        onClose={onClose}
      />
    );
  }
  return null;
}
