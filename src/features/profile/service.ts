import { apiClient } from "../../services/api/client";

export interface CandidateProfile {
  phone: string;
  location: string;
  summary: string;
  desired_positions: string[];
  skills: string[];
  preferred_technologies: string[];
  experience: Array<Record<string, string | boolean>>;
  education: Array<Record<string, string>>;
  languages: Array<Record<string, string>>;
  work_preferences: Array<"remote" | "hybrid" | "onsite">;
  employment_preferences: Array<"full-time" | "part-time" | "contract" | "internship" | "temporary" | "freelance">;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string;
  updated_at: string;
}

export function getCandidateProfile() {
  return apiClient.get<CandidateProfile>("/api/profile/me/");
}

export function updateCandidateProfile(patch: Partial<CandidateProfile>) {
  return apiClient.patch<CandidateProfile>("/api/profile/me/", patch);
}
