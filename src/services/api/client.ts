export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseUrl = (configuredBaseUrl ?? (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");
const csrfPath = "/api/auth/csrf/";
const refreshPath = "/api/auth/refresh/";
const authPaths = new Set([
  "/api/auth/login/",
  "/api/auth/register/",
  "/api/auth/refresh/",
  "/api/auth/logout/",
]);

let accessToken: string | null = null;
let csrfToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let authenticationInitialization: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function hasAccessToken() {
  return accessToken !== null;
}

export function getApiUrl(path: string) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken() {
  csrfToken = readCsrfCookie() ?? csrfToken;
  if (csrfToken) return csrfToken;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${csrfPath}`, { credentials: "include" });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, error);
  }
  if (!response.ok) throw new ApiError("Could not prepare a secure request.", response.status);
  csrfToken = readCsrfCookie();
  if (!csrfToken) {
    throw new ApiError(
      "The CSRF cookie is unavailable. Check the backend cookie domain and credentialed CORS settings.",
      0,
    );
  }
  return csrfToken;
}

function bodyForFetch(body: unknown, headers: Headers): BodyInit | null | undefined {
  if (body === undefined || body === null) return body;
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

function validationMessage(payload: unknown): string | null {
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(validationMessage).filter(Boolean).join(" ");
  if (!payload || typeof payload !== "object") return null;
  const entries = Object.entries(payload as Record<string, unknown>);
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  const messages = entries
    .filter(([key]) => key !== "detail")
    .map(([key, value]) => {
      const message = validationMessage(value);
      return message ? `${key}: ${message}` : "";
    })
    .filter(Boolean);
  return messages.join(" ") || null;
}

async function send<T>(path: string, init: RequestInit, authenticated = true, onHeaders?: (headers: Headers) => void): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (authenticated && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (unsafe) headers.set("X-CSRFToken", await ensureCsrfToken());

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      body: bodyForFetch(init.body, headers),
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, error);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && response.status !== 204 && !contentType.includes("application/json")) {
    throw new ApiError("The server returned an unexpected response. Check the API base URL.", response.status);
  }
  const payload = response.status === 204
    ? undefined
    : contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);

  if (!response.ok) {
    const message = response.status < 500
      ? validationMessage(payload) ?? `Request failed (${response.status})`
      : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }
  onHeaders?.(response.headers);
  return payload as T;
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = send<{ access: string }>(refreshPath, {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }, false)
      .then(({ access }) => {
        accessToken = access;
        return access;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export function initializeAuthentication() {
  if (!authenticationInitialization) {
    authenticationInitialization = refreshAccessToken().then((token) => Boolean(token));
  }
  return authenticationInitialization;
}

export function refreshAuthenticationFromCookie() {
  authenticationInitialization = refreshAccessToken().then((token) => Boolean(token));
  return authenticationInitialization;
}

async function request<T>(path: string, init: RequestInit, onHeaders?: (headers: Headers) => void): Promise<T> {
  try {
    return await send<T>(path, init, true, onHeaders);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !authPaths.has(path) &&
      !path.startsWith("/jobs/search")
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return send<T>(path, init, true, onHeaders);
      window.dispatchEvent(new CustomEvent("jobpilot:session-expired"));
    }
    throw error;
  }
}

async function streamRequest(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const sendStream = async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("X-CSRFToken", await ensureCsrfToken());
    try {
      return await fetch(getApiUrl(path), {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0, error);
    }
  };

  let response = await sendStream();
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await sendStream();
    if (response.status === 401) window.dispatchEvent(new CustomEvent("jobpilot:session-expired"));
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    const message = response.status < 500
      ? validationMessage(payload) ?? `Request failed (${response.status})`
      : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new ApiError("The server returned an unexpected chat response.", response.status);
  }
  return response;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  getWithHeaders: async <T>(path: string) => {
    const headerRef: { value: Headers | null } = { value: null };
    const data = await request<T>(path, { method: "GET" }, (responseHeaders) => { headerRef.value = responseHeaders; });
    return { data, headers: headerRef.value };
  },
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body as BodyInit | null | undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body as BodyInit | null | undefined }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
  postStream: streamRequest,
};
