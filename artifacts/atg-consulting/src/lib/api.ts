/**
 * Typed API client — thin wrapper over fetch that targets the same origin.
 * Uses the Clerk session cookie for auth (same-origin, credentials: "include").
 */

const BASE = typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error((err as { error?: string }).error ?? res.statusText), { status: res.status });
  }
  return res.json() as Promise<T>;
}

/** True when the API refused because this account has no client profile yet. */
export function missingProfile(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as Error & { status?: number }).status;
  return status === 404 && /client profile|intake/i.test(err.message);
}

const get = <T>(path: string) => req<T>("GET", path);
const post = <T>(path: string, body?: unknown) => req<T>("POST", path, body);
const put = <T>(path: string, body?: unknown) => req<T>("PUT", path, body);
const patch = <T>(path: string, body?: unknown) => req<T>("PATCH", path, body);
const del = <T>(path: string) => req<T>("DELETE", path);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const api = {
  account: { get: () => get<{ id: string; email: string | null; name: string | null; role: string; isAdmin: boolean; clientId: string | null }>("/account") },

  // ── Intake + plan ──────────────────────────────────────────────────────────
  intake: { submit: (body: unknown) => post<{ ok: boolean; intakeId: string; planId: string; snapshot: unknown }>("/intake", body) },
  plan: {
    get: (intakeId: string) => get<PlanResult>(`/plan/${intakeId}`),
    claim: (intakeId: string) => post<{ ok: boolean; clientId: string }>(`/plan/${intakeId}/claim`),
  },

  // ── Client portal ──────────────────────────────────────────────────────────
  client: {
    me: () => get<ClientProfile>("/client/me"),
    dashboard: () => get<Dashboard>("/client/dashboard"),
    toggleWorkflow: (id: string) => patch<WorkflowItem>(`/client/workflow/${id}`),
    toggleActionItem: (id: string) => patch<ActionItem>(`/client/action-items/${id}`),
    consultations: () => get<Consultation[]>("/client/consultations"),
    consultation: (id: string) => get<Consultation>(`/client/consultations/${id}`),
    documents: () => get<Document[]>("/client/documents"),
    reports: () => get<Report[]>("/client/reports"),
    report: (date: string) => get<Report>(`/client/reports/${date}`),
    updateAccount: (body: { digestEmailOptIn?: boolean }) => patch<{ ok: boolean }>("/client/account", body),
    messages: () => get<ClientMsg[]>("/workbench/messages"),
    sendMessage: (body: string) => post<ClientMsg>("/workbench/messages", { body }),
    sessions:    () => get<SessionRecord[]>("/client/sessions"),
  },

  // ── Workbench ─────────────────────────────────────────────────────────────
  workbench: {
    today:           () => get<OutputItem[]>("/workbench/today"),
    reviewOutput:    (id: string, action: "approve"|"edit"|"dismiss", editedContent?: string) =>
                       patch<OutputItem>(`/workbench/output/${id}`, { action, editedContent }),
    workflows:       () => get<WorkflowListItem[]>("/workbench/workflows"),
    hoursSaved:      () => get<HoursSavedData>("/workbench/hours-saved"),
    requestWorkflow: (description: string) => post<{ id: string }>("/workbench/requests", { description }),
    draftFollowUp:   (body: { who: string; lastTouch: string; wantToSay: string }) => post<OutputItem>("/workbench/follow-up", body),
  },

  aiAssist: {
    coach:         (message: string) => post<{ reply: string; tokens: number; fromCache: boolean }>("/ai-assist/coach", { message }),
    customizeSkill:(slug: string, platform: "grok_bot"|"claude"|"chatgpt", context?: string) =>
                     post<{ skillMd: string; routinePrompt: string; tokens: number; fromCache: boolean }>("/ai-assist/customize-skill", { slug, platform, context }),
    troubleshoot:  (errorText: string, imageBase64?: string, imageMime?: string) =>
                     post<{ reply: string; tokens: number; fromCache: boolean }>("/ai-assist/troubleshoot", { errorText, imageBase64, imageMime }),
    reportRefresh: () => post<{ ok: boolean; planId: string; recommendedTier: string; refreshDiff: string | null; message: string }>("/ai-assist/report-refresh", {}),
    usage:         () => get<{ used: number; cap: number; month: string; byFeature: { feature: string; tokenCount: number; messageCount: number }[]; enabled: boolean }>("/ai-assist/usage"),
  },

  knowledge: {
    list:           () => get<KnowledgeArticle[]>("/knowledge"),
    bySlug:         (slug: string) => get<KnowledgeArticle>(`/knowledge/${slug}`),
    platformGuides: () => get<{ id: string; slug: string; title: string; body: string }[]>("/resources/platform-guides"),
    resources:      () => get<ResourcesPayload>("/resources/tools"),
  },

  tools: {
    list:   () => get<ATGTool[]>("/tools"),
    bySlug: (slug: string) => get<ATGTool>(`/tools/${slug}`),
    /** Admin: list all tools with click counts */
    adminList: () => get<(ATGTool & { clickCount: number; referralUrl: string; referralNotes: string; pricingNote: string })[]>("/admin/tools"),
    adminPatch: (id: string, data: Partial<ATGTool & { referralUrl: string; hasReferral: boolean; pricingNote: string; enabled: boolean }>) =>
      patch<ATGTool>(`/admin/tools/${id}`, data),
    /** Clicks analytics */
    clicks: () => get<{ tool: { id: string; name: string; slug: string } | undefined; clicks: number }[]>("/admin/tools/clicks"),
  },

  install: {
    status: () => get<{ slug: string; installedPlatform: string | null; installedAt: string | null; selfReportedHoursSaved: number | null; installStatus: string }[]>("/workbench/install/status"),
    mark: (slug: string, platform: "grok_bot" | "claude" | "chatgpt" | "other") => post<{ ok: boolean; installedPlatform: string | null; installedAt: string | null; installStatus: string }>("/workbench/install/mark", { slug, platform }),
    reportHours: (slug: string, hoursSaved: number) => post<{ ok: boolean; selfReportedHoursSaved: number | null }>("/workbench/install/hours", { slug, hoursSaved }),
    downloadSkill: (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/workbench/skill/${slug}/download`,
    getCode: (slug: string) => get<{ slug: string; alreadyVerified: boolean; code: string | null; note?: string }>(`/workbench/install-code/${slug}`),
    verify: (slug: string, code: string) => post<{ verified: boolean; installStatus?: string; message?: string; error?: string; remaining?: number }>("/workbench/install-verify", { slug, code }),
    regenerateCode: (slug: string) => post<{ slug: string; code: string; note: string }>(`/workbench/install-code/${slug}/regenerate`, {}),
  },

  day: {
    get: () => get<DayPayload>("/day"),
    /** Reconcile today's suggestions (writes DayBlock rows); call once on mount. GET is read-only. */
    refresh: () => post<DayPayload>("/day/refresh", {}),
    saveProfile: (body: DayAnswersPayload) => put<DayProfile>("/day/profile", body),
    addAccount: (body: { realm: "professional" | "personal"; kind: "email" | "calendar" | "other"; provider: "gmail" | "outlook" | "apple" | "other"; label: string }) =>
      post<DeclaredAccount>("/day/accounts", body),
    removeAccount: (id: string) => del<{ ok: boolean }>(`/day/accounts/${id}`),
    updateBlock: (id: string, action: "schedule" | "done" | "dismiss") =>
      patch<DayBlock>(`/day/blocks/${id}`, { action }),
  },

  // ── Tier services ──────────────────────────────────────────────────────────
  toolPlan: {
    get:      () => get<ToolPlan>("/tool-plan"),
    generate: (intakeId?: string) => post<ToolPlan & { _pending?: boolean }>("/tool-plan/generate", intakeId ? { intakeId } : {}),
  },
  support: {
    submit: (body: { subject: string; message: string }) => post<SupportTicket>("/support", body),
  },
  dfy: {
    apply:  () => post<DfyApplication>("/dfy/apply", {}),
    status: () => get<DfyApplication | null>("/dfy/status"),
  },
  guidedSessions: {
    get: () => get<{ guidedSessionsTotal: number | null; guidedSessionsUsed: number }>("/guided/sessions"),
  },

  // ── Learn ──────────────────────────────────────────────────────────────────
  modules: {
    list: () => get<(Module & { locked: boolean; completed: boolean })[]>("/modules"),
    get: (slug: string) => get<Module>(`/modules/${slug}`),
    complete: (slug: string) => post<{ ok: boolean }>(`/modules/${slug}/complete`),
  },

  // ── Admin ──────────────────────────────────────────────────────────────────
  admin: {
    clients: (params?: string) => get<ClientAdmin[]>(`/admin/clients${params ? `?${params}` : ""}`),
    client: (id: string) => get<ClientDetail>(`/admin/clients/${id}`),
    clientPrep: (id: string) => get<PrepView>(`/admin/clients/${id}/prep`),
    updateClient: (id: string, body: unknown) => patch<ClientAdmin>(`/admin/clients/${id}`, body),
    createConsultation: (clientId: string, body: unknown) => post<Consultation>(`/admin/clients/${clientId}/consultations`, body),
    updateConsultation: (id: string, body: unknown) => patch<Consultation>(`/admin/consultations/${id}`, body),
    reports: (status?: string) => get<Report[]>(`/admin/reports${status ? `?status=${status}` : ""}`),
    publishReport: (id: string) => post<Report>(`/admin/reports/${id}/publish`),
    updateReport: (id: string, body: { contentMarkdown: string }) => patch<Report>(`/admin/reports/${id}`, body),
    modules: {
      list: () => get<Module[]>("/admin/content/modules"),
      create: (body: unknown) => post<Module>("/admin/content/modules", body),
      update: (id: string, body: unknown) => req<Module>("PUT", `/admin/content/modules/${id}`, body),
    },
    audit: (params?: string) => get<AuditEntry[]>(`/admin/audit${params ? `?${params}` : ""}`),
    // Workbench admin
    messages: () => get<AdminThread[]>("/admin/messages"),
    getThread: (clientId: string) => get<ClientMsg[]>(`/admin/messages/${clientId}`),
    replyMessage: (clientId: string, body: string) => post<ClientMsg>(`/admin/messages/${clientId}/reply`, { body }),
    workflowRequests: () => get<WorkflowReqAdmin[]>("/admin/workflow-requests"),
    updateWorkflowRequest: (id: string, status: string) => patch<WorkflowReqAdmin>(`/admin/workflow-requests/${id}`, { status }),
    createWorkflow: (clientId: string, body: unknown) => post<WorkflowListItem>(`/admin/clients/${clientId}/workflows`, body),
    postOutput: (clientId: string, body: unknown) => post<OutputItem>(`/admin/clients/${clientId}/outputs`, body),
    // Tier model
    toolPlans:         () => get<(ToolPlan & { client: { user: { name: string | null; email: string | null } } })[]>("/admin/tool-plans"),
    clientToolPlan:    (clientId: string) => get<ToolPlan | null>(`/admin/clients/${clientId}/tool-plan`),
    patchToolPlan:     (clientId: string, body: Partial<ToolPlan>) => patch<ToolPlan>(`/admin/clients/${clientId}/tool-plan`, body),
    approveToolPlan:   (clientId: string) => post<ToolPlan>(`/admin/clients/${clientId}/tool-plan/approve`, {}),
    dfyApplications:   () => get<{ applications: (DfyApplication & { client: { user: { name: string | null; email: string | null } } })[]; cap: number; acceptedThisMonth: number; spotsLeft: number }>("/admin/dfy-applications"),
    updateDfyApp:      (id: string, body: { status: string; notes?: string }) => patch<DfyApplication>(`/admin/dfy-applications/${id}`, body),
    setGuidedSessions: (clientId: string, body: { guidedSessionsTotal: number; guidedSessionsUsed?: number }) => patch<unknown>(`/admin/clients/${clientId}/guided-sessions`, body),
    supportTickets:    (status?: string) => get<SupportTicket[]>(`/admin/support${status ? `?status=${status}` : ""}`),
    updateSupportTicket: (id: string, status: string) => patch<SupportTicket>(`/admin/support/${id}`, { status }),
    // Playbook
    generatePlaybook:          (clientId: string, intakeId?: string) => post<ClientPlaybook>(`/admin/clients/${clientId}/playbook`, intakeId ? { intakeId } : {}),
    generatePlaybookFromIntake: (intakeId: string) => post<ClientPlaybook>(`/admin/intakes/${intakeId}/playbook`, {}),
    getPlaybook:               (clientId: string) => get<ClientPlaybook>(`/admin/clients/${clientId}/playbook`),
    listPlaybooks:             (clientId: string) => get<ClientPlaybook[]>(`/admin/clients/${clientId}/playbook/all`),
    patchPlaybook:             (clientId: string, pbId: string, body: { content?: string; adminNotes?: string }) =>
                                 patch<ClientPlaybook>(`/admin/clients/${clientId}/playbook/${pbId}`, body),
    finalisePlaybook:          (clientId: string, pbId: string) =>
                                 post<ClientPlaybook>(`/admin/clients/${clientId}/playbook/${pbId}/final`, {}),
    // Sessions
    sessions:         (clientId: string) => get<SessionRecord[]>(`/admin/clients/${clientId}/sessions`),
    session:          (clientId: string, sid: string) => get<SessionRecordWithTranscript>(`/admin/clients/${clientId}/sessions/${sid}`),
    createSession:    (clientId: string, body: unknown) => post<SessionRecord>(`/admin/clients/${clientId}/sessions`, body),
    patchSession:     (clientId: string, sid: string, body: unknown) => patch<SessionRecord>(`/admin/clients/${clientId}/sessions/${sid}`, body),
    deleteSession:    (clientId: string, sid: string) => req<{ ok: boolean }>("DELETE", `/admin/clients/${clientId}/sessions/${sid}`),
    summarizeSession: (clientId: string, sid: string) => post<{ session: SessionRecord; summary: SessionSummary }>(`/admin/clients/${clientId}/sessions/${sid}/summarize`, {}),
    // Workflow templates
    workflowTemplates:     () => get<WorkflowTemplate[]>("/admin/workflow-templates"),
    workflowTemplate:      (slug: string) => get<WorkflowTemplate>(`/admin/workflow-templates/${slug}`),
    patchWorkflowTemplate: (slug: string, body: Partial<WorkflowTemplate>) =>
                             patch<WorkflowTemplate>(`/admin/workflow-templates/${slug}`, body),
    resetWorkflowTemplate: (slug: string) => post<WorkflowTemplate>(`/admin/workflow-templates/${slug}/reset`, {}),
    skillMdUrl:            (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/admin/workflow-templates/${slug}/skill`,
    // Per-client workflow settings
    workflowSettings:     (clientId: string) =>
                            get<{ slug: string; name: string; minTier: string; enabled: boolean; clientEnabled: boolean | null }[]>(`/admin/clients/${clientId}/workflow-settings`),
    patchWorkflowSetting: (clientId: string, slug: string, enabled: boolean) =>
                            patch<{ clientId: string; slug: string; enabled: boolean }>(`/admin/clients/${clientId}/workflow-settings/${slug}`, { enabled }),
    // Agent chains (Phase 3)
    agentChains:      (clientId: string) => get<{ id: string; name: string; slugs: string; enabled: boolean }[]>(`/admin/clients/${clientId}/agent-chains`),
    createAgentChain: (clientId: string, body: { name: string; slugs: string[]; description?: string }) =>
                        post<{ id: string }>(`/admin/clients/${clientId}/agent-chains`, body),
    patchAgentChain:  (id: string, body: { name?: string; slugs?: string[]; enabled?: boolean }) =>
                        patch<{ id: string }>(`/admin/agent-chains/${id}`, body),
    personalizeClient: (clientId: string) => post<{ ok: boolean; message: string }>(`/admin/clients/${clientId}/personalize`, {}),
  },
};

// ── Shared types ─────────────────────────────────────────────────────────────
export interface FocusArea { area: string; name: string; whyItMatters: string }
export interface PlanResult {
  intakeId: string; name: string; email: string; claimed: boolean;
  plan: { id: string; aiReadinessLabel: string; aiReadinessSummary: string; focusAreas: FocusArea[]; recommendedTier: string; tierRationale: string; ctaText: string; source: string } | null;
}
export interface ClientProfile { id: string; email: string | null; name: string | null; role: string; isAdmin: boolean; clientId: string | null; tier: string; status: string | null; digestEmailOptIn: boolean }
export interface WorkflowItem { id: string; area: string; title: string; done: boolean; order: number }
export interface ActionItem { id: string; owner: string; text: string; done: boolean; dueAt: string | null }
export interface Consultation { id: string; title: string; scheduledAt: string | null; durationMin: number; notes: string | null; status: string; recordingUrl: string | null; actionItems: ActionItem[] }
export interface Document { id: string; title: string; type: string; mime: string; size: number; visibleToClient: boolean; createdAt: string }
export interface Report { id: string; date: string; kind: string; contentMarkdown: string; status: string; publishedAt: string | null }
export interface Module { id: string; slug: string; title: string; description: string; minTier: string; order: number; videoUrl: string | null; body: string; status: string }
export interface Dashboard { client: ClientAdmin | null; workflowItems: WorkflowItem[]; recentConsultation: Consultation | null; recentReport: Report | null; activeDocCount: number }
export interface ClientAdmin { id: string; userId: string; company: string | null; tier: string; status: string; industry: string | null; aiLevel: number; createdAt: string; notes: string | null; user: { name: string | null; email: string | null }; _count?: { consultations: number; documents: number } }
export interface ClientWorkflowOption { id: string; name: string; area: string; description: string }
export interface ClientDetail extends ClientAdmin { intakes: IntakeRecord[]; plans: PlanAdmin[]; workflowItems: WorkflowItem[]; consultations: Consultation[]; documents: Document[]; reports: Report[]; workflows?: ClientWorkflowOption[] }
export interface IntakeRecord { id: string; email: string; name: string; areas: string; aiComfort: number; hoursLost: number; status: string; createdAt: string; plans: PlanAdmin[]; client: ClientAdmin | null }
export interface PlanAdmin { id: string; aiReadinessLabel: string; aiReadinessSummary: string; focusAreas: string; recommendedTier: string; tierRationale: string; adminReport: string | null; source: string; createdAt: string; refreshDiff?: string | null }
export interface PrepView { client: ClientDetail; intake: IntakeRecord | null; answers: Record<string, unknown> | null; plan: PlanAdmin | null; talkingPoints: string[] }
export interface AuditEntry { id: string; action: string; entity: string; entityId: string | null; meta: string; createdAt: string; actor: { name: string | null; email: string | null } | null }

// (workbench API is declared inline in the api object above)

// ── Workbench types ───────────────────────────────────────────────────────────
export interface OutputItem {
  id: string; workflowId: string; workflowName?: string; type: string;
  subject: string; content: string; status: string;
  editedContent?: string | null;
  sheaBadge: string | null; createdAt: string;
}
export interface WorkflowListItem {
  id: string; name: string; description: string; area: string;
  status: string; schedule: string | null; lastRun?: string | null;
  setupNote: string | null;
  runs: { runAt: string; summary: string | null }[];
  _count: { outputs: number };
}
export interface HoursSavedData {
  runs: { runAt: string; summary: string | null; outputCount: number }[];
  approved: number; totalRuns: number;
}
export interface DayAnswersPayload {
  timezone: string;
  workDays: number[];
  startMin: number;
  endMin: number;
  typicalDay: string[];
  typicalNote?: string;
  dayScope?: "individual" | "team";
  teamNote?: string;
}
export interface DayProfile {
  timezone: string;
  workDays: number[];
  startMin: number;
  endMin: number;
  typicalDay: string[];
  typicalNote: string | null;
  scope: "individual" | "team";
  teamNote: string | null;
}
export interface DeclaredAccount {
  id: string;
  realm: string;
  kind: string;
  provider: string;
  label: string;
}
export interface DayBlock {
  id: string;
  suggestionKey: string;
  realm: string;
  title: string;
  detail: string;
  efficiency: string;
  skillSlug: string | null;
  startMin: number;
  endMin: number;
  status: string;
  source: string;
}
export interface DayPayload {
  profile: DayProfile | null;
  bizSize: string | null;
  accounts: DeclaredAccount[];
  date: string;
  weekday: number;
  isWorkDay: boolean;
  blocks: DayBlock[];
  reminders: {
    consultations: { id: string; title: string; scheduledAt: string | null; durationMin: number }[];
    actionItems: { id: string; text: string; dueAt: string | null }[];
    drafts: { id: string; type: string; subject: string; content: string; status: string; workflowName: string }[];
  };
}
export interface ClientMsg {
  id: string; clientId: string; body: string;
  fromAdmin: boolean; readAt: string | null; createdAt: string;
}

export interface AdminThread {
  clientId: string;
  client: { user: { name: string | null; email: string | null } } | null;
  messageCount: number;
  latestAt: string | null;
  latest: ClientMsg | null;
}
export interface WorkflowReqAdmin {
  id: string; clientId: string; description: string; status: string;
  adminNote: string | null; createdAt: string;
  client: { user: { name: string | null; email: string | null } } | null;
}

// ── Tier model types ──────────────────────────────────────────────────────────
export interface ToolPlan {
  id: string; clientId: string; intakeId: string | null;
  status: "draft" | "approved";
  toolsJson: string; stepsJson: string;
  source: string; adminNotes: string | null;
  approvedAt: string | null; createdAt: string;
}
export interface DfyApplication {
  id: string; clientId: string; intakeId: string | null;
  status: "applied" | "waitlisted" | "accepted" | "declined";
  notes: string | null; createdAt: string;
  alreadyApplied?: boolean;
}
export interface SupportTicket {
  id: string; clientId: string; subject: string; message: string;
  status: "open" | "replied" | "closed"; createdAt: string;
}


// ── Client Playbook types ─────────────────────────────────────────────────────
export interface ClientPlaybook {
  id: string;
  clientId: string;
  intakeId: string | null;
  version: number;
  status: "draft" | "final";
  content: string;  // JSON stringified PlaybookContent
  source: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}


// ── Session records ───────────────────────────────────────────────────────────
export interface SessionRecord {
  id: string; clientId: string;
  sessionDate: string; sessionType: string; sessionNumber: number | null;
  recordingUrl: string | null; consentGiven: boolean;
  shareRecap: boolean; recapText: string | null;
  summaryJson: string | null; summarySource: string | null;
  adminNotes: string | null; createdAt: string; updatedAt: string;
}
export interface SessionRecordWithTranscript extends SessionRecord {
  transcript: string | null;
}
export interface SessionSummary {
  decisions: string[];
  actionItems: Array<{ owner: string; item: string; dueHint?: string }>;
  workflowsBuiltOrChanged: string[];
  openQuestions: string[];
  risks: string[];
  nextSessionAgenda: string[];
  shortRecap: string;
  source: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────
export const billing = {
  info:     () => post<{ enabled: boolean; hasCustomer: boolean; hasSubscription: boolean; tier: string }>("/billing/info", {}),
  checkout: (tier: "SELF_SERVE" | "GUIDED" | "WHITE_GLOVE") => post<{ url: string }>("/billing/checkout", { tier }),
  portal:   () => get<{ url: string }>("/billing/portal"),
};

// ── Workflow Templates ────────────────────────────────────────────────────────
export interface WorkflowTemplate {
  slug: string; name: string; description: string;
  verticalTags: string; minTier: string;
  systemPrompt?: string; userPromptTemplate?: string;
  inputSchema: string; outputFormat: string;
  enabled?: boolean; version: number;
  id?: string; createdAt?: string; updatedAt?: string;
}

export const workflowTemplatesApi = {
  list: () => get<WorkflowTemplate[]>("/workflow-templates"),
};


// ── Phase 1 Workbench skills ──────────────────────────────────────────────────
export const skillsApi = {
  inboxTriage:     (body: { messages: string; businessDescription?: string }) =>
                     post<{ output: OutputItem; triage: unknown }>("/workbench/inbox-triage", body),
  reviewRequest:   (body: { businessName: string; businessType: string; channels: string; reviews?: string }) =>
                     post<{ output: OutputItem; result: unknown }>("/workbench/review-request", body),
  socialCalendar:  (body: { businessDescription: string; offers?: string; platforms: string; cadence?: number; weeks?: number }) =>
                     post<{ output: OutputItem; calendar: unknown }>("/workbench/social-calendar", body),
  seoAudit:        (body: { url: string; businessType: string; cityArea?: string }) =>
                     post<{ output: OutputItem; audit: unknown; fetchError: string | null }>("/workbench/seo-audit", body),
};

// ── Phase 2 skills ────────────────────────────────────────────────────────────
export const skills2Api = {
  moneySnapshot:    (body: { data: string; weekEnding?: string; businessName?: string }) =>
                      post<{ output: OutputItem; result: unknown }>("/workbench/money-snapshot", body),
  bookingFlow:      (body: { businessName: string; serviceTypes: string; platform: string; channels: string }) =>
                      post<{ output: OutputItem; result: unknown }>("/workbench/booking-flow", body),
  quoteProposal:    (body: { clientName: string; businessName?: string; servicesAndPricing: string; scopeDescription: string; termsNotes?: string }) =>
                      post<{ output: OutputItem; result: unknown }>("/workbench/quote-proposal", body),
  proposalHtmlUrl:  (id: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/workbench/quote-proposal/${id}/html`,
  prospectResearch: (body: { icp: string; prospects: string; businessName?: string }) =>
                      post<{ output: OutputItem; result: unknown }>("/workbench/prospect-research", body),
  runHistory:       (skip = 0, take = 20) => get<unknown[]>(`/workbench/run-history?skip=${skip}&take=${take}`),
};


// ── Phase 3 skills ────────────────────────────────────────────────────────────
export const skills3Api = {
  faqSupport:    (body: { faqSource: string; customerQuestion?: string }) =>
                   post<{ output: OutputItem; result: unknown }>("/workbench/faq-support", body),
  pipelineRun:   (body: { chainId: string; stepIndex: number; currentInput: string; previousOutput?: string }) =>
                   post<{ output: OutputItem; result: unknown; totalSteps: number; nextStep: number | null }>("/workbench/agent-pipeline/run", body),
};


// ── Portal status + personalization ──────────────────────────────────────────
export interface PortalStatus {
  hasClient:         boolean;
  hasIntake:         boolean;
  clientId:          string | null;
  tier:              string;
  testMode:          boolean;
  personalizedSlugs: string[];
  intakePrefill:     { email: string | null; name: string | null };
  discoveryProposal: { id: string; status: string; approvedAt: string | null } | null;
}

export interface ClientProposal {
  id: string;
  status: string;
  approvedAt: string | null;
  execSummary: string;
  understanding: string;
  scope: string;
  howWeConnect: string;
  milestones: { label: string; description: string }[];
  investment: { tier?: string; price?: string; care?: string; notes?: string };
  acceptanceClause: string;
  contactName: string | null;
}

export type PortalProposal =
  | { state: "empty" | "pending"; proposal?: undefined }
  | { state: "ready"; proposal: ClientProposal };

export interface AccessLogEntry {
  id: string;
  accountSystem: string;
  accessType: string;
  grantedDate: string;
  revokedDate: string | null;
  notes: string;
}

export const portalApi = {
  status:      () => get<PortalStatus>("/portal/status"),
  proposal:    () => get<PortalProposal>("/portal/proposal"),
  personalize: () => post<{ ok: boolean }>("/portal/personalize", {}),
  accessLog:   () => get<AccessLogEntry[]>("/portal/access-log"),
};


// ── Client intake (for account page) ─────────────────────────────────────────
export interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  body: string;
  tags: { verticals: string[]; tiers: string[]; platforms: string[] };
  sortOrder?: number;
}

export interface ResourceTool {
  name: string; slug: string | null; why: string; costNote: string;
  goUrl: string | null; officialUrl: string | null; description: string | null;
  category: string | null; hasReferral: boolean;
}

export interface ResourcesPayload {
  planTools: ResourceTool[];
  featuredTools: ResourceTool[];
  affiliateDisclosure: string;
}

export interface ATGTool {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  bestForVerticals: string[];
  pricingNote: string;
  /** Use this URL for outbound links — routes through /go/:slug for click tracking */
  goUrl: string;
  officialUrl: string;
  hasReferral: boolean;
  platformsSupported: string[];
  setupGuideLink: string;
  logo: string;
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface IntakeSummary {
  id: string;
  createdAt: string;
  aiComfort: number;
  hoursLost: number;
  helpStyle: string;
  areas: string;
  answers: string; // JSON
}

export const clientIntakeApi = {
  latest: () => get<IntakeSummary | null>("/client/intake/latest"),
  history: () => get<{ id: string; createdAt: string; helpStyle: string }[]>("/client/intake/history"),
};

// ── Client access log ─────────────────────────────────────────────────────────
export interface ClientAccessLogEntry {
  id: string;
  clientId: string;
  accountSystem: string;
  accessType: string;
  grantedDate: string;
  revokedDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const accessLogApi = {
  list:   (clientId: string) => get<ClientAccessLogEntry[]>(`/admin/clients/${clientId}/access-log`),
  create: (clientId: string, data: Omit<ClientAccessLogEntry, "id"|"clientId"|"createdAt"|"updatedAt">) =>
            post<ClientAccessLogEntry>(`/admin/clients/${clientId}/access-log`, data),
  update: (clientId: string, entryId: string, data: Partial<Omit<ClientAccessLogEntry, "id"|"clientId"|"createdAt"|"updatedAt">>) =>
            patch<ClientAccessLogEntry>(`/admin/clients/${clientId}/access-log/${entryId}`, data),
  remove: (clientId: string, entryId: string) =>
            del<{ ok: boolean }>(`/admin/clients/${clientId}/access-log/${entryId}`),
};
