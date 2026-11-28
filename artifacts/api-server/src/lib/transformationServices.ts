/** Approved launch service taxonomy. Metadata, not a claim of deployed integrations. */
export const serviceDivisions = { strategy: "AI Strategy & Advisory", automation: "AI Automation & Agents", digital: "Digital Transformation & Growth", knowledge: "Knowledge, Training & Governance", managed: "Managed AI & Optimization" } as const;
export const transformationStages = ["Discovery & Assessment", "Strategy & Prioritization", "Architecture & Implementation", "Enablement & Governance", "Measurement & Optimization"] as const;
export interface TransformationService { id: string; division: keyof typeof serviceDivisions; name: string; goal: string; prompt: string; proposal: string; kickoff: string; delivery: readonly ("guided" | "dfy")[]; readiness: "scope-required" | "pilot-required"; }
export const transformationServices: readonly TransformationService[] = [
  {
    "id": "ai-readiness",
    "division": "strategy",
    "name": "AI readiness assessment",
    "goal": "Assess my business and create an AI roadmap",
    "prompt": "Which business outcomes matter most, what systems and processes exist, and who can approve changes?",
    "proposal": "Document baseline, readiness evidence, constraints and prioritized roadmap.",
    "kickoff": "Confirm decision owner, approved sources and missing evidence.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "workflow-engineering",
    "division": "automation",
    "name": "Workflow engineering",
    "goal": "Automate repetitive business processes",
    "prompt": "What starts the task, how often does it happen, and what counts as finished?",
    "proposal": "Agree triggers, outputs, exception handling and test cases.",
    "kickoff": "Collect a redacted example, baseline and system owner.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "context-engineering",
    "division": "automation",
    "name": "Context engineering",
    "goal": "Give AI the right business information and rules",
    "prompt": "What approved information and rules would an assistant need to do its job correctly?",
    "proposal": "Agree authorized sources, permissions, retrieval and evaluation criteria.",
    "kickoff": "Confirm document owners and exclude restricted data.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "agentic-automation",
    "division": "automation",
    "name": "Agentic automation",
    "goal": "Build an AI agent for business tasks",
    "prompt": "Which decisions can an agent make and which need human review?",
    "proposal": "Agree bounded tools, execution limits, review gates and failure tests.",
    "kickoff": "Confirm sandbox, operator and escalation procedure.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "custom-tools",
    "division": "digital",
    "name": "Custom internal tools",
    "goal": "Build an internal dashboard or business tool",
    "prompt": "Who will use the tool, and what should the first release let them do?",
    "proposal": "Compare build versus buy; agree interfaces, ownership and acceptance tests.",
    "kickoff": "Confirm system owners and redacted test data.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "digital-transformation",
    "division": "digital",
    "name": "Digital transformation",
    "goal": "Modernize my digital customer experience",
    "prompt": "How do customers find you, make inquiries and receive follow-up today?",
    "proposal": "Agree conversion goals, channel scope, integrations and baseline.",
    "kickoff": "Confirm site owner, approved assets and launch criteria.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "knowledge-management",
    "division": "knowledge",
    "name": "AI knowledge management",
    "goal": "Organize company knowledge and build an internal AI assistant",
    "prompt": "Where do employees find procedures and what information is restricted?",
    "proposal": "Agree approved source inventory, permissions, citations and freshness tests.",
    "kickoff": "Confirm document owners and access boundaries.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "ai-governance",
    "division": "knowledge",
    "name": "AI governance",
    "goal": "Create AI policies and safeguards",
    "prompt": "Which data and actions require approval, and who is accountable?",
    "proposal": "Agree usage rules, escalation, retention and applicable compliance review.",
    "kickoff": "Confirm policy owner and access restrictions.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "ai-training",
    "division": "knowledge",
    "name": "AI adoption training",
    "goal": "Train my team to use AI effectively",
    "prompt": "Which roles need training and what tasks should they perform safely?",
    "proposal": "Agree role-specific learning objectives and completion evidence.",
    "kickoff": "Confirm approved tools and training participants.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "voice-ai",
    "division": "automation",
    "name": "Voice AI",
    "goal": "Improve inbound phone calls and appointment handling",
    "prompt": "How are inbound calls handled today, and when should a person take over?",
    "proposal": "Scope vendor evaluation and inbound pilot; no production availability claim before testing.",
    "kickoff": "Confirm call routing, disclosure, consent and privacy requirements.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "pilot-required"
  },
  {
    "id": "performance-monitoring",
    "division": "managed",
    "name": "AI performance monitoring",
    "goal": "Monitor and improve existing AI workflows",
    "prompt": "How do you know workflows are working, and who handles failures?",
    "proposal": "Agree health metrics, costs, review cadence and alert ownership.",
    "kickoff": "Confirm authorized metrics, baseline and recovery owner.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  },
  {
    "id": "fractional-ai-leadership",
    "division": "strategy",
    "name": "Fractional AI leadership",
    "goal": "Get ongoing AI strategy and fractional AI leadership",
    "prompt": "What strategic responsibilities, decision cadence and implementation oversight would you like ATG to provide?",
    "proposal": "Agree advisory hours, roadmap, reporting, response boundaries and separately scoped implementation.",
    "kickoff": "Confirm executive sponsor, priorities, vendor inventory and review cadence.",
    "delivery": [
      "guided",
      "dfy"
    ],
    "readiness": "scope-required"
  }
];
export function transformationServiceFor(goal: string): TransformationService | undefined { return transformationServices.find(service => service.goal === goal.trim()); }
