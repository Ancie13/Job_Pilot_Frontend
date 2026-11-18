import { apiClient, setAccessToken } from "../../services/api/client";

export interface PublicUser {
  id: number;
  email: string;
  date_joined: string;
}

interface LoginResponse {
  access: string;
  user: PublicUser;
}

export async function login(email: string, password: string) {
  const response = await apiClient.post<LoginResponse>("/api/auth/login/", { email, password });
  setAccessToken(response.access);
  return response.user;
}

export function register(email: string, password: string) {
  return apiClient.post<PublicUser>("/api/auth/register/", { email, password });
}

export function getCurrentUser() {
  return apiClient.get<PublicUser>("/api/auth/me/");
}

export async function logout() {
  try {
    await apiClient.post<void>("/api/auth/logout/", {});
  } finally {
    setAccessToken(null);
  }
}
