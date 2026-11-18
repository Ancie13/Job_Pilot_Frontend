export interface JobSnapshot {
  source: string;
  source_id: string;
  title: string;
  company: string | null;
  location: string | null;
  url: string;
  description: string;
  published_at: string | null;
  remote: boolean | null;
  employment_type: string | string[] | null;
  tags: string[];
  salary_text: string | null;
  /** Canonical backend classification used by discovery and matching. */
  experience_level?: "internship" | "junior" | "mid_level" | "senior_level" | "lead_manager" | "unknown";
}

export interface AnalyzeJobRequest {
  job: JobSnapshot;
  resume_id?: number;
  include_ai?: boolean;
  external_ai_consent?: boolean;
}

export interface BulkAnalyzeJobsRequest {
  jobs: JobSnapshot[];
  resume_id?: number;
}

export interface RefreshMatchRequest {
  resume_id?: number;
  include_ai?: boolean;
  external_ai_consent?: boolean;
}

export interface MatchCategory {
  score: number | null;
  [detail: string]: unknown;
}

export interface MatchResult {
  id: number;
  application_id: number | null;
  job: JobSnapshot;
  overall_score: number | null;
  categories: {
    skills: MatchCategory;
    technologies: MatchCategory;
    experience: MatchCategory;
    position: MatchCategory;
    location_preferences: MatchCategory;
    salary: MatchCategory;
  };
  weight_contributions: Record<string, number>;
  matching_skills: string[];
  missing_skills: string[];
  requirements: string[];
  strengths: string[];
  weaknesses: string[];
  explanation: string;
  ai_explanation?: string;
  recommendations: string[];
  estimate_notice: string;
  algorithm_version: string;
  ai_status: "not_requested" | "completed" | "unavailable" | string;
  recalculated_from_id: number | null;
  created_at: string;
  reused?: boolean;
}

export interface MatchListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MatchResult[];
}

export interface RecommendationsResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  minimum_relevance_score?: number;
  warnings?: string[];
  results: Array<Omit<MatchResult, "id" | "application_id" | "algorithm_version" | "ai_status" | "recalculated_from_id" | "created_at" | "reused">>;
  detail?: string;
}

export type RankedJob = RecommendationsResponse["results"][number];

export interface SavedApplication {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  salary_text: string;
  tags?: string[];
  remote?: boolean | null;
  saved_at: string;
  status: "saved" | "applied" | "assessment" | "interview" | "offer" | "rejected" | "withdrawn";
  application_date: string | null;
  application_source: string;
  interview_at: string | null;
  updated_at: string;
  source: string;
  source_id: string;
  resume: number | null;
  experience_level?: JobSnapshot["experience_level"];
}

export interface PagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
