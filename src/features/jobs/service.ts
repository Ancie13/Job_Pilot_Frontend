import { apiClient } from "../../services/api/client";
import type {
  AnalyzeJobRequest,
  BulkAnalyzeJobsRequest,
  JobSnapshot,
  MatchListResponse,
  MatchResult,
  PagedResponse,
  RecommendationsResponse,
  RankedJob,
  SavedApplication,
} from "./matching.types";

export interface MatchOptions {
  include_ai?: boolean;
  external_ai_consent?: boolean;
  resume_id?: number;
}

export function searchJobs(keywords: string[]) {
  return searchJobsWithMetadata(keywords).then((result) => result.jobs);
}

export async function searchJobsWithMetadata(keywords: string[]) {
  const query = new URLSearchParams();
  keywords.map((term) => term.trim()).filter(Boolean).forEach((term) => query.append("keywords", term));
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  const result = await apiClient.getWithHeaders<JobSnapshot[]>(`/jobs/search${suffix}`);
  const warnings = result.headers?.get("X-Job-Search-Warnings")?.split(",").filter(Boolean) ?? [];
  return { jobs: result.data, warnings };
}

export function analyzeJob(job: JobSnapshot, options: MatchOptions = {}) {
  const request: AnalyzeJobRequest = { job, ...options };
  return apiClient.post<MatchResult>("/api/matching/jobs/", request);
}

export function analyzeJobs(jobs: JobSnapshot[]) {
  if (jobs.length > 20) throw new Error("You can analyze up to 20 jobs at a time.");
  const request: BulkAnalyzeJobsRequest = { jobs };
  return apiClient.post<{ count: number; results: MatchResult[] }>("/api/matching/jobs/bulk/", request);
}

export function analyzeApplication(id: number, options: MatchOptions = {}) {
  return apiClient.post<MatchResult>(`/api/matching/applications/${id}/`, options);
}

export function getMatch(id: number) {
  return apiClient.get<MatchResult>(`/api/matching/${id}/`);
}

export function refreshMatch(id: number, options: MatchOptions = {}) {
  return apiClient.post<MatchResult>(`/api/matching/${id}/refresh/`, options);
}

export function getMatchHistory(filters: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const queryString = query.toString();
  return apiClient.get<MatchListResponse>(`/api/matching/${queryString ? `?${queryString}` : ""}`);
}

export function rankJobs(jobs: JobSnapshot[]) {
  if (jobs.length > 100) throw new Error("You can rank up to 100 jobs per request.");
  return apiClient.post<{ count: number; minimum_relevance_score: number; results: RankedJob[] }>("/api/matching/jobs/rank/", { jobs });
}

export function getRecommendations(page = 1, refresh = false) {
  const query = new URLSearchParams({ page: String(page) });
  if (refresh) query.set("refresh", "true");
  return apiClient.get<RecommendationsResponse>(`/api/matching/recommendations/?${query.toString()}`);
}

export function getApplications(page = 1, pageSize = 20) {
  return apiClient.get<PagedResponse<SavedApplication>>(`/api/applications/?page=${page}&page_size=${pageSize}`);
}

export function saveApplication(job: JobSnapshot) {
  return apiClient.post<SavedApplication>("/api/applications/", job);
}
