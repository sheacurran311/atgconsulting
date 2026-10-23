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

const get = <T>(path: string) => req<T>("GET", path);
const post = <T>(path: string, body?: unknown) => req<T>("POST", path, body);
const patch = <T>(path: string, body?: unknown) => req<T>("PATCH", path, body);

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
    intakes: (status?: string) => get<IntakeRecord[]>(`/admin/intakes${status ? `?status=${status}` : ""}`),
    updateIntakeStatus: (id: string, status: string) => patch<IntakeRecord>(`/admin/intakes/${id}/status`, { status }),
    reports: (status?: string) => get<Report[]>(`/admin/reports${status ? `?status=${status}` : ""}`),
    publishReport: (id: string) => post<Report>(`/admin/reports/${id}/publish`),
    updateReport: (id: string, body: { contentMarkdown: string }) => patch<Report>(`/admin/reports/${id}`, body),
    modules: {
      list: () => get<Module[]>("/admin/content/modules"),
      create: (body: unknown) => post<Module>("/admin/content/modules", body),
      update: (id: string, body: unknown) => req<Module>("PUT", `/admin/content/modules/${id}`, body),
    },
    audit: (params?: string) => get<AuditEntry[]>(`/admin/audit${params ? `?${params}` : ""}`),
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
export interface ClientDetail extends ClientAdmin { intakes: IntakeRecord[]; plans: PlanAdmin[]; workflowItems: WorkflowItem[]; consultations: Consultation[]; documents: Document[]; reports: Report[] }
export interface IntakeRecord { id: string; email: string; name: string; areas: string; aiComfort: number; hoursLost: number; status: string; createdAt: string; plans: PlanAdmin[]; client: ClientAdmin | null }
export interface PlanAdmin { id: string; aiReadinessLabel: string; aiReadinessSummary: string; focusAreas: string; recommendedTier: string; tierRationale: string; adminReport: string | null; source: string; createdAt: string }
export interface PrepView { client: ClientDetail; intake: IntakeRecord | null; answers: Record<string, unknown> | null; plan: PlanAdmin | null; talkingPoints: string[] }
export interface AuditEntry { id: string; action: string; entity: string; entityId: string | null; meta: string; createdAt: string; actor: { name: string | null; email: string | null } | null }
