import type {
  Claim,
  Decision,
  InsightRun,
  Project,
  Source,
  Task,
  Theme,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new Error(typeof detail === "string" ? detail || "Request failed" : JSON.stringify(detail));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export const api = {
  getProjects: () => request<Project[]>("/projects/"),
  createProject: (payload: { name: string; description?: string }) =>
    request<Project>("/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteProject: (projectId: string) =>
    request<void>(`/projects/${projectId}`, {
      method: "DELETE",
    }),
  getSources: (projectId?: string) =>
    request<Source[]>(`/sources/${projectId ? `?project_id=${projectId}` : ""}`),
  uploadSource: async (payload: {
    projectId: string;
    file: File;
    kind?: string;
    title?: string;
    tags?: string[];
  }) => {
    const form = new FormData();
    form.append("project_id", payload.projectId);
    form.append("file", payload.file);
    if (payload.kind) form.append("kind", payload.kind);
    if (payload.title) form.append("title", payload.title);
    if (payload.tags?.length) form.append("tags", JSON.stringify(payload.tags));

    const response = await fetch(`${API_BASE_URL}/sources/`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to upload source");
    }
    return (await response.json()) as Source;
  },
  deleteSource: (sourceId: string) =>
    request<void>(`/sources/${sourceId}`, {
      method: "DELETE",
    }),
  getInsightRuns: (projectId?: string) =>
    request<InsightRun[]>(`/insight-runs/${projectId ? `?project_id=${projectId}` : ""}`),
  getInsightRun: (runId: string) => request<InsightRun>(`/insight-runs/${runId}`),
  createInsightRun: (payload: { project_id: string; prompt?: string }) =>
    request<InsightRun>("/insight-runs/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateInsightRun: (runId: string, payload: { status?: string; payload?: Record<string, unknown> | null }) =>
    request<InsightRun>(`/insight-runs/${runId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteInsightRun: (runId: string) =>
    request<void>(`/insight-runs/${runId}`, {
      method: "DELETE",
    }),
  getThemes: (runId: string) => request<Theme[]>(`/themes/?run_id=${runId}`),
  getClaims: (themeId: string) => request<Claim[]>(`/claims/?theme_id=${themeId}`),
  getDecisions: (projectId?: string) =>
    request<Decision[]>(`/decisions/${projectId ? `?project_id=${projectId}` : ""}`),
  createDecision: (payload: {
    project_id: string;
    title: string;
    rationale?: string;
    pros?: string;
    cons?: string;
    risks?: string;
    confidence?: number;
    citation_source_ids?: string[];
    linked_claim_ids?: string[];
  }) =>
    request<Decision>("/decisions/", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        citation_source_ids: payload.citation_source_ids ?? [],
        linked_claim_ids: payload.linked_claim_ids ?? [],
      }),
    }),
  updateDecision: (decisionId: string, payload: {
    project_id: string;
    title: string;
    rationale?: string;
    pros?: string;
    cons?: string;
    risks?: string;
    confidence?: number;
    citation_source_ids?: string[];
    linked_claim_ids?: string[];
  }) =>
    request<Decision>(`/decisions/${decisionId}`, {
      method: "PUT",
      body: JSON.stringify({
        ...payload,
        citation_source_ids: payload.citation_source_ids ?? [],
        linked_claim_ids: payload.linked_claim_ids ?? [],
      }),
    }),
  deleteDecision: (decisionId: string) =>
    request<void>(`/decisions/${decisionId}`, {
      method: "DELETE",
    }),
  getTasks: (projectId?: string) =>
    request<Task[]>(`/tasks/${projectId ? `?project_id=${projectId}` : ""}`),
  createTask: (payload: {
    project_id: string;
    title: string;
    status?: string;
    owner?: string;
    due_date?: string;
    decision_id?: string | null;
  }) =>
    request<Task>("/tasks/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTask: (taskId: string, payload: {
    title?: string;
    status?: string;
    owner?: string;
    due_date?: string;
    decision_id?: string | null;
  }) =>
    request<Task>(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: string) =>
    request<void>(`/tasks/${taskId}`, {
      method: "DELETE",
    }),
  exportProjectMarkdown: (projectId: string) => request<string>(`/export/${projectId}.md`),
  getDailyDigest: (projectId: string, date?: string) =>
    request<string>(`/digest/${projectId}.md${date ? `?date=${date}` : ""}`),
  importObsidian: (payload: { project_id: string; folder?: string; base_path?: string | null; limit?: number }) =>
    request<Source[]>("/sources/import/obsidian", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
