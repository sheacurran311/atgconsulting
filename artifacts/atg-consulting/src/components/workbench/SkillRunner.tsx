/**
 * Opens the workflow form that matches a day block or a workflow button.
 * Follow-up is not a form here. That block explains itself on the day.
 */
import SkillForm from "@/components/workbench/SkillsForms";
import SkillForm2 from "@/components/workbench/SkillsForms2";
import SkillForm3 from "@/components/workbench/SkillsForms3";
import type { OutputItem } from "@/lib/api";

const PHASE1 = ["inbox-triage", "review-request", "social-calendar", "seo-audit"] as const;
const PHASE2 = ["money-snapshot", "booking-flow", "quote-proposal", "prospect-research"] as const;
const PHASE3 = ["faq-support", "agent-pipeline"] as const;

export default function SkillRunner({
  skill,
  onClose,
  onOutput,
}: {
  skill: string;
  onClose: () => void;
  onOutput: (item: OutputItem) => void;
}) {
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
