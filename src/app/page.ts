export type Page =
  | "dashboard"
  | "discover"
  | "job"
  | "applications"
  | "profile"
  | "assistant"
  | "documents"
  | "automation"
  | "integrations"
  | "recommendations"
  | "match-history"
  | "match-detail"
  | "register"
  | "upload"
  | "setup"
  | "preferences"
  | "login"
  | "terms"
  | "privacy"
  | "auth-callback";

const pages = new Set<Page>([
  "dashboard", "discover", "job", "applications", "profile", "assistant",
  "documents", "automation", "integrations", "register", "upload", "setup",
  "preferences", "login", "recommendations", "match-history", "match-detail", "terms", "privacy", "auth-callback",
]);

export function pageFromHash(hash: string): Page {
  const candidate = hash.replace(/^#\/?/, "").split("?")[0].split("/")[0] ?? "";
  if (candidate === "match" && /^\d+$/.test(hash.replace(/^#\/?match\//, "").split(/[/?#]/)[0] ?? "")) {
    return "match-detail";
  }
  return pages.has(candidate as Page) ? candidate as Page : "dashboard";
}

export function pageFromPath(pathname: string): Page {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments[0] === "auth" && segments[1] === "callback") return "auth-callback";
  if (segments[0] === "match" && /^\d+$/.test(segments[1] ?? "")) return "match-detail";
  if (segments[0] === "job") return "job";
  const candidate = segments[0] ?? "dashboard";
  return pages.has(candidate as Page) ? candidate as Page : "dashboard";
}

export function jobRouteFromPath(pathname: string) {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments[0] !== "job" || !segments[1] || !segments[2]) return null;
  try {
    return { source: decodeURIComponent(segments[1]), sourceId: decodeURIComponent(segments[2]) };
  } catch {
    return null;
  }
}

export function pathForJob(source: string, sourceId: string, title?: string, company?: string | null) {
  const path = `/job/${encodeURIComponent(source)}/${encodeURIComponent(sourceId)}`;
  const hints = new URLSearchParams();
  if (title) hints.set("title", title);
  if (company) hints.set("company", company);
  const query = hints.toString();
  return query ? `${path}?${query}` : path;
}

export function matchIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/match\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

export function pathForPage(page: Page) {
  if (page === "auth-callback") return "/auth/callback";
  return page === "dashboard" ? "/" : `/${page}`;
}

export function isPublicPage(page: Page) {
  return page === "login" || page === "register" || page === "terms" || page === "privacy" || page === "auth-callback";
}

export function matchIdFromHash(hash: string): number | null {
  const match = hash.match(/^#\/?match\/(\d+)/);
  return match ? Number(match[1]) : null;
}
