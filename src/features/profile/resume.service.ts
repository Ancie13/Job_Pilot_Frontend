import { apiClient } from "../../services/api/client";

export interface ResumeRecord {
  id: number;
  original_filename: string;
  file_type: "pdf" | "docx";
  file_size: number;
  parse_status: "pending" | "processing" | "completed" | "failed";
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeDetail extends ResumeRecord {
  parse_error: string;
  extracted_text: string;
  extracted_data: Record<string, unknown>;
}

export function getResumes() {
  return apiClient.get<ResumeRecord[]>("/api/resumes/");
}

export function getResumeDetails(id: number) {
  return apiClient.get<ResumeDetail>(`/api/resumes/${id}/`);
}

export async function uploadResume(file: File) {
  const data = new FormData();
  data.append("document", file);
  return apiClient.post<ResumeRecord>("/api/resumes/", data);
}

export function setPrimaryResume(id: number) {
  return apiClient.post<ResumeRecord>(`/api/resumes/${id}/set-primary/`, {});
}
