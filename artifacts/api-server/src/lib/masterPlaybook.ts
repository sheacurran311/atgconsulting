export const masterPlaybook = [
  { stage: "Before the call", action: "Read the submitted assessment. Note one recurring task, its trigger, current effort, desired result, decision maker and main unknown. Invite the person who owns the workflow." },
  { stage: "Fit call, minutes 0–3", action: "Confirm the prospect’s priority and what decision they want to make today. Check that the assessment still describes their situation." },
  { stage: "Minutes 3–10", action: "Walk through one recent example. Identify the trigger, tools, handoffs, frequency and consequence of an error. Ask what a successful first pilot would change." },
  { stage: "Minutes 10–15", action: "Confirm ownership, access constraints, budget range, timeline and who approves spending. Discuss whether the customer wants to build alongside Shea or delegate setup." },
  { stage: "Minutes 15–20", action: "Summarize the proposed outcome, unresolved questions and acceptance test. Agree on Guided, Done-for-you, Self-serve or no engagement. Record the decision, owner and next date." },
  { stage: "Proposal", action: "For qualified Guided or Done-for-you work, send a written scope with one pilot, deliverables, exclusions, customer responsibilities, price, recurring costs and acceptance criteria. Reserve configuration, detailed designs and implementation for paid delivery." },
  { stage: "Paid kickoff", action: "Verify payment and completed assessment. Review the client-specific draft, confirm the baseline and agree permissions, approvals and a pause procedure." },
  { stage: "Delivery and handoff", action: "For Self-serve, deliver the reviewed setup guide. For Guided, build together. For Done-for-you, install in customer accounts. Test the agreed scenarios, record evidence, train the owner and confirm acceptance." },
  { stage: "Follow-up", action: "At the agreed review, compare actual effort and errors with the baseline. Decide whether to tune, expand or retire the workflow and document any ongoing care scope." },
] as const;
