export type UUID = string;

export interface Project {
  id: UUID;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface Source {
  id: UUID;
  project_id: UUID;
  kind: string;
  uri: string;
  title?: string | null;
  tags: string[];
  content_ptr: string;
  created_at: string;
}

export interface CitationSnippet {
  id: UUID;
  source_id: UUID;
  quote?: string | null;
  location?: string | null;
}

export interface Claim {
  id: UUID;
  theme_id: UUID;
  statement: string;
  confidence: number;
  citations?: CitationSnippet[];
}

export interface Theme {
  id: UUID;
  insight_run_id: UUID;
  title: string;
  summary?: string | null;
  confidence: number;
  claims?: Claim[];
}

export interface InsightRun {
  id: UUID;
  project_id: UUID;
  status: string;
  created_at: string;
  payload?: {
    themes?: Theme[];
  } | null;
}

export interface Decision {
  id: UUID;
  project_id: UUID;
  title: string;
  rationale?: string | null;
  pros?: string | null;
  cons?: string | null;
  risks?: string | null;
  confidence?: number | null;
  linked_claim_ids: string[];
  created_at: string;
}

export interface Task {
  id: UUID;
  project_id: UUID;
  title: string;
  status: string;
  owner?: string | null;
  due_date?: string | null;
  created_at: string;
}
