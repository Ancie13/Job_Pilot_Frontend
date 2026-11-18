import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { isPublicPage, jobRouteFromPath, matchIdFromHash, matchIdFromPath, pageFromHash, pageFromPath, pathForJob, pathForPage, type Page } from "./page";
import { getCurrentUser, login, logout, register } from "../features/auth/service";
import type { PublicUser } from "../features/auth/service";
import AIChatPage from "../features/ai/AIChatPage";
import {
  analyzeApplication,
  analyzeJob,
  analyzeJobs,
  getApplications,
  getMatch,
  getMatchHistory,
  getRecommendations,
  refreshMatch,
  rankJobs,
  saveApplication,
  searchJobs,
  searchJobsWithMetadata,
} from "../features/jobs/service";
import { ApiError, getApiUrl, initializeAuthentication, refreshAuthenticationFromCookie } from "../services/api/client";
import type { JobSnapshot, MatchCategory, MatchResult, RankedJob, SavedApplication } from "../features/jobs/matching.types";
import { getCandidateProfile, updateCandidateProfile } from "../features/profile/service";
import type { CandidateProfile } from "../features/profile/service";
import { getResumeDetails, getResumes, setPrimaryResume, uploadResume } from "../features/profile/resume.service";
import type { ResumeDetail, ResumeRecord } from "../features/profile/resume.service";
import { clearOnboardingDraft, readOnboardingDraft, saveOnboardingDraft } from "../features/profile/onboardingDraft";
import type { OnboardingDraft } from "../features/profile/onboardingDraft";

type IconName =
  | "grid"
  | "search"
  | "briefcase"
  | "user"
  | "sparkles"
  | "file"
  | "zap"
  | "plug"
  | "bell"
  | "chevron"
  | "arrow"
  | "plus"
  | "calendar"
  | "clock"
  | "check"
  | "x"
  | "sliders"
  | "bookmark"
  | "location"
  | "money"
  | "send"
  | "paperclip"
  | "download"
  | "edit"
  | "trash"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "menu"
  | "more"
  | "upload"
  | "linkedin"
  | "globe"
  | "shield"
  | "layers"
  | "chart"
  | "logout";

const iconPaths: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 12h6M9 16h6" />
    </>
  ),
  zap: <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
  plug: (
    <>
      <path d="m8 12 8-8M14 3l7 7M3 14l7 7M4 20l4-4M16 8l4-4M10 14l-3-3a3 3 0 0 1 0-4l1-1 9 9-1 1a3 3 0 0 1-4 0l-2-2Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  x: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  money: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9H4v6h2M18 9h2v6h-2" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />
    </>
  ),
  paperclip: (
    <path d="m21 12-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.9-2.8l8.5-8.5" />
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </>
  ),
  edit: (
    <>
      <path d="m14 4 6 6L8 22H2v-6zM12 6l6 6" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V3h8v3M6 6l1 16h10l1-16M10 10v8M14 10v8" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7L22 7" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3 3.7M6.2 6.2C3.5 8 2 12 2 12s4 7 10 7c1.5 0 2.8-.4 4-1.1" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="9" width="4" height="12" />
      <path d="M5 3.5v.1M11 21V9h4v2c1-3 6-3 6 2v8M15 14v7" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5V3H3v18h7v-2M14 8l4 4-4 4M18 12H8" />
    </>
  ),
};

function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

const nav: { id: Page; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "discover", label: "Discover Jobs", icon: "search" },
  { id: "recommendations", label: "Recommendations", icon: "sparkles" },
  { id: "match-history", label: "Match History", icon: "chart" },
  { id: "applications", label: "Applications", icon: "briefcase" },
  { id: "profile", label: "My Profile", icon: "user" },
  { id: "assistant", label: "AI Assistant", icon: "sparkles" },
  { id: "documents", label: "Documents", icon: "file" },
  { id: "automation", label: "Automation", icon: "zap" },
  { id: "integrations", label: "Integrations", icon: "plug" },
];

function Logo({ compact = false, onClick }: { compact?: boolean; onClick?: () => void }) {
  const content = <>
      <span className="logo-mark">
        <Icon name="arrow" size={18} />
      </span>
      {!compact && (
        <span>
          Job<span>Pilot</span>
        </span>
      )}
    </>;
  return onClick
    ? <button type="button" className="logo logo-button" onClick={onClick} aria-label="Go to JobPilot dashboard" title="Go to Dashboard">{content}</button>
    : <div className="logo">{content}</div>;
}

function Pill({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function AIBadge({ text = "AI generated" }: { text?: string }) {
  return (
    <span className="ai-badge">
      <Icon name="sparkles" size={12} />
      {text}
    </span>
  );
}

function oauthDestination() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next) return null;
  try {
    const parsed = new URL(next, window.location.origin);
    const page = pageFromPath(parsed.pathname);
    if (parsed.origin !== window.location.origin || isPublicPage(page)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function startGoogleOAuth() {
  const destination = oauthDestination();
  try {
    if (destination) sessionStorage.setItem("jobpilot:oauth-next", destination);
    else sessionStorage.removeItem("jobpilot:oauth-next");
  } catch { /* redirect still works when storage is unavailable */ }
  window.location.assign(getApiUrl("/api/auth/google/start/"));
}

function GoogleOAuthButton() {
  const [starting, setStarting] = useState(false);
  return <button className="oauth" type="button" disabled={starting} onClick={() => { if (starting) return; setStarting(true); startGoogleOAuth(); }}><span className="google-mark" aria-hidden="true">G</span>{starting ? "Redirecting to Google…" : "Continue with Google"}</button>;
}

function GoogleOAuthCallback({ onSuccess }: { onSuccess: (user: PublicUser, destination?: string) => void }) {
  const [status, setStatus] = useState("Completing Google authentication…");
  const [error, setError] = useState("");
  const started = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google_auth");
    const code = params.get("error");
    let destination: string | undefined;
    try {
      const saved = sessionStorage.getItem("jobpilot:oauth-next");
      sessionStorage.removeItem("jobpilot:oauth-next");
      if (saved) {
        const parsed = new URL(saved, window.location.origin);
        const targetPage = pageFromPath(parsed.pathname);
        if (parsed.origin === window.location.origin && !isPublicPage(targetPage)) destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch { /* optional redirect preference */ }
    window.history.replaceState({}, "", "/auth/callback");

    if (result !== "success") {
      const messages: Record<string, string> = {
        cancelled: "Google sign-in was cancelled. You can try again when you’re ready.",
        invalid_state: "The Google sign-in session expired or could not be verified. Please try again.",
        invalid_response: "Google authorization expired or returned an incomplete response. Please try again.",
        account_conflict: "This Google account conflicts with an existing account. Sign in using the account already linked to it.",
        google_auth_unavailable: "Google sign-in is not available right now. Please use email and password or try again later.",
        google_oauth_unavailable: "Google sign-in is not configured on the server yet.",
        google_auth_failed: "Google sign-in could not be completed. Please try again.",
      };
      setError(result === "error" ? messages[code ?? ""] ?? "Google sign-in could not be completed. Please try again." : "This Google sign-in link is incomplete. Return to login and try again.");
      return;
    }

    setStatus("Securing the session and loading your account…");
    void (async () => {
      try {
        const refreshed = await refreshAuthenticationFromCookie();
        if (!refreshed) throw new Error("session");
        const user = await getCurrentUser();
        setStatus("Signed in. Opening your workspace…");
        onSuccessRef.current(user, destination);
      } catch {
        setError("Google sign-in succeeded, but JobPilot could not establish your session. Please return to login and try again.");
      }
    })();
  }, []);

  return <main className="auth-shell oauth-callback"><div className="auth-main"><div className="auth-mobile-logo"><Logo /></div><section className="card oauth-callback-card" aria-live="polite">{error ? <><h1>Google sign-in didn’t finish</h1><p role="alert">{error}</p><a className="primary oauth-return" href="/login">Return to login</a></> : <><span className="google-mark large" aria-hidden="true">G</span><h1>Google sign-in</h1><p role="status">{status}</p></>}</section></div></main>;
}

function Avatar({ small = false, email = "" }: { small?: boolean; email?: string }) {
  return <div className={`avatar ${small ? "small" : ""}`} aria-hidden="true">{email.trim().charAt(0).toUpperCase() || <Icon name="user" />}</div>;
}

function Sidebar({ page, go, onLogout, user }: { page: Page; go: (p: Page) => void; onLogout: () => void; user: PublicUser }) {
  return (
    <aside className="sidebar">
      <Logo onClick={() => go("dashboard")} />
      <div className="workspace">
        <Avatar small email={user.email} />
        <div>
          <b title={user.email}>{user.email}</b>
          <span>Personal workspace</span>
        </div>
      </div>
      <nav>
        <p className="nav-label">Workspace</p>
        {nav.slice(0, 5).map((item) => (
          <button
            className={
              page === item.id || (page === "job" && item.id === "discover") ? "active" : ""
            }
            onClick={() => go(item.id)}
            key={item.id}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.id === "assistant" && <em>AI</em>}
          </button>
        ))}
        <p className="nav-label second">Tools</p>
        {nav.slice(5).map((item) => (
          <button
            className={page === item.id ? "active" : ""}
            onClick={() => go(item.id)}
            key={item.id}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={onLogout}>
          <Icon name="logout" />
          Log out
        </button>
        <div className="profile-mini">
          <Avatar small email={user.email} />
          <div>
            <b title={user.email}>{user.email}</b>
            <span>Member since {new Date(user.date_joined).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Header({
  title,
  subtitle,
  onMenu,
  user,
  onProfile,
  onLogout,
  onHome,
}: {
  title: string;
  subtitle?: string;
  onMenu: () => void;
  user: PublicUser;
  onProfile: () => void;
  onLogout: () => void;
  onHome: () => void;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu icon-btn" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div className="topbar-heading">
        <h1><button type="button" className="topbar-home" onClick={onHome} aria-label="Go to Dashboard" title="Go to Dashboard">{title}</button></h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="top-actions">
        <button className="avatar-button" onClick={onProfile} aria-label={`Open profile for ${user.email}`} title={user.email}>
          <Avatar small email={user.email} />
          <span title={user.email}>{user.email}</span>
          <Icon name="chevron" size={13} />
        </button>
        <button className="icon-btn" onClick={onLogout} aria-label="Log out"><Icon name="logout" /></button>
      </div>
    </header>
  );
}

function MobileNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  const items = nav.filter((item) => ["dashboard", "discover", "applications", "profile"].includes(item.id));
  return (
    <nav className="mobile-nav">
      {items.map((item) => (
        <button
          className={page === item.id ? "active" : ""}
          onClick={() => go(item.id)}
          key={item.id}
        >
          <Icon name={item.icon} />
          <span>{item.label.split(" ")[0]}</span>
        </button>
      ))}
      <button onClick={() => go("assistant")} className={page === "assistant" ? "active" : ""}>
        <Icon name="sparkles" />
        <span>AI</span>
      </button>
    </nav>
  );
}

function StatCard({
  label,
  value,
  trend,
  icon,
  tone,
}: {
  label: string;
  value: string;
  trend: string;
  icon: IconName;
  tone: string;
}) {
  return (
    <div className="card stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{trend}</small>
      </div>
    </div>
  );
}

function Dashboard({ go, user }: { go: (p: Page) => void; user: PublicUser }) {
  const [applicationsData, setApplicationsData] = useState<SavedApplication[]>([]);
  const [applicationCount, setApplicationCount] = useState<number | null>(null);
  const [averageMatch, setAverageMatch] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([getApplications(1, 100), getMatchHistory({ page: 1, page_size: 100 })])
      .then(([applicationResponse, matches]) => {
        if (!active) return;
        setApplicationsData(applicationResponse.results);
        setApplicationCount(applicationResponse.count);
        const scores = matches.results.map((item) => item.overall_score).filter((score): score is number => typeof score === "number");
        setAverageMatch(scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : null);
      })
      .catch((reason) => { if (active) setError(apiMessage(reason, "Could not load your dashboard.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const interviews = applicationsData.filter((item) => item.status === "interview").length;
  return (
    <div className="page-content dashboard-page">
      <section className="welcome">
        <div>
          <h2>Your job search</h2>
          <p className="account-email" title={user.email}>{user.email}</p>
        </div>
        <button className="primary" onClick={() => go("discover")}>
          <Icon name="search" />
          Find new jobs
        </button>
      </section>
      {error && <FormNotice kind="error" message={error} />}
      {loading ? <section className="card matching-empty" role="status">Loading your job search…</section> : <div className="stats-grid">
        <StatCard label="Saved applications" value={String(applicationCount ?? "—")} trend="Your saved opportunities" icon="briefcase" tone="purple" />
        <StatCard label="Interviews" value={String(interviews)} trend="In the loaded application list" icon="calendar" tone="blue" />
        <StatCard label="Average match" value={averageMatch === null ? "—" : `${averageMatch}%`} trend="From your saved match history" icon="sparkles" tone="orange" />
      </div>}
      <div className="dashboard-grid">
        <section className="card activity-card">
          <CardTitle title="Recent applications" action="View all" onAction={() => go("applications")} />
          {applicationsData.length ? <div className="dashboard-recent-list">{applicationsData.slice(0, 5).map((item) => <div key={item.id}><b>{item.title}</b><span>{item.company || "Company not listed"} · {item.status}</span></div>)}</div> : <p className="matching-empty">{error ? "Applications could not be loaded." : "No saved applications yet."}</p>}
        </section>
        <section className="card pipeline-card">
          <CardTitle title="Application status" action="View all" onAction={() => go("applications")} />
          <p className="matching-empty">{applicationCount === null ? "Status totals unavailable." : `${applicationCount} saved opportunities. Review current statuses in Applications.`}</p>
        </section>
        <section className="card recommended">
          <CardTitle
            title="Recommended for you"
            subtitle="Backend-ranked roles from one current search page"
            action="See all jobs"
            onAction={() => go("recommendations")}
          />
          <DashboardRecommendations go={go} />
        </section>
        <section className="card events">
          <CardTitle title="Next steps" />
          <p className="matching-empty">Interview dates appear here when added to your saved applications.</p>
        </section>
      </div>
    </div>
  );
}

function CardTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card-title">
      <div>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && onAction && (
        <button onClick={onAction}>
          {action}
          <Icon name="chevron" size={14} />
        </button>
      )}
    </div>
  );
}

function CompanyLogo({ letter, color }: { letter: string; color: string }) {
  return (
    <div
      className="company-logo"
      style={{
        background: color,
        color: color === "#f3f3f3" || color === "#ececec" ? "#111" : "#fff",
      }}
    >
      {letter}
    </div>
  );
}

function DashboardRecommendations({ go }: { go: (p: Page) => void }) {
  const [results, setResults] = useState<Awaited<ReturnType<typeof getRecommendations>>["results"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    getRecommendations().then((data) => setResults(data.results.slice(0, 3)))
      .catch((reason) => setError(apiMessage(reason, "Could not load recommendations.")))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="job-rows"><p className="matching-empty">Loading recommendations…</p></div>;
  if (error) return <div className="job-rows"><p className="matching-empty">{error}</p></div>;
  if (!results.length) return <div className="job-rows"><p className="matching-empty">No recommendations available. Add desired roles or skills to your profile.</p></div>;
  return <div className="job-rows">{results.map((result) => <button className="job-row" key={jobIdentity(result.job)} onClick={() => go("recommendations")}><CompanyLogo letter={(result.job.company || "?").slice(0, 1).toUpperCase()} color="#635bff" /><div className="job-main"><h4>{result.job.title}</h4><p>{result.job.company || "Company not listed"} · {result.job.location || "Location not listed"}</p></div><div className="match"><AIBadge text="Compatibility" /><b>{scoreText(result.overall_score)}</b></div><Icon name="chevron" /></button>)}</div>;
}

function Documents() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState<ResumeDetail | null>(null);
  const reload = () => { setLoading(true); setLoadError(""); return getResumes().then((items) => { setResumes(items); setMessage(""); }).catch((reason) => { const error = apiMessage(reason, "Could not load your CVs."); setLoadError(error); setMessage(error); }).finally(() => setLoading(false)); };
  useEffect(() => { void reload(); }, []);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(-1); setMessage("");
    try { await uploadResume(file); await reload(); setMessage("CV uploaded."); }
    catch (reason) { setMessage(apiMessage(reason, "Could not upload this CV.")); }
    finally { setBusy(null); }
  };
  const makePrimary = async (id: number) => {
    setBusy(id); setMessage("");
    try { await setPrimaryResume(id); await reload(); setMessage("Primary CV updated."); }
    catch (reason) { setMessage(apiMessage(reason, "Could not update the primary CV.")); }
    finally { setBusy(null); }
  };
  const showDetails = async (id: number) => {
    setBusy(id); setMessage("");
    try { setDetails(await getResumeDetails(id)); }
    catch (reason) { setMessage(apiMessage(reason, "Could not load CV parsing results.")); }
    finally { setBusy(null); }
  };
  return <div className="page-content documents-page"><div className="page-heading"><div><h2>Your CVs</h2><p>Manage uploaded CVs and review their parsing status.</p></div><label className="primary upload-cv-button"><Icon name="upload" />Upload CV<input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={busy !== null} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
    {message && <p className="matching-notice" role="status">{message}</p>}
    {loading ? <div className="card matching-empty" role="status">Loading your CVs…</div> : loadError ? <div className="card matching-empty" role="alert">{loadError}<button className="secondary" onClick={() => void reload()}>Try again</button></div> : resumes.length ? <div className="card matching-section">{resumes.map((resume) => <div className="profile-resume-row" key={resume.id}><span><b>{resume.original_filename}</b><small>{resume.file_type.toUpperCase()} · {resume.parse_status}{resume.is_primary ? " · Primary" : ""}</small></span><div className="matching-card-actions"><button className="secondary" disabled={busy !== null} onClick={() => void showDetails(resume.id)}>{busy === resume.id ? "Loading…" : "Parsing details"}</button>{!resume.is_primary && <button className="secondary" disabled={busy !== null} onClick={() => void makePrimary(resume.id)}>Set primary</button>}</div></div>)}</div> : <div className="card matching-empty">No CVs uploaded yet. Upload a PDF or DOCX to get started.</div>}
    {details && <section className="card matching-section"><div className="card-title"><h3>Parsing results: {details.original_filename}</h3><button onClick={() => setDetails(null)}>Close</button></div>{details.parse_error && <p role="alert">{details.parse_error}</p>}{details.parse_status === "completed" ? <pre className="resume-extracted-text">{details.extracted_text || JSON.stringify(details.extracted_data, null, 2) || "No extracted content was returned."}</pre> : <p>Parsing status: {details.parse_status}</p>}</section>}
  </div>;
}

function Toggle({
  initial = false,
  onChange,
}: {
  initial?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [on, setOn] = useState(initial);
  return (
    <button
      type="button"
      className={`toggle ${on ? "on" : ""}`}
      onClick={() => {
        setOn(!on);
        onChange?.(!on);
      }}
    >
      <i />
    </button>
  );
}

function Automation({ go }: { go: (page: Page) => void }) {
  return <UnavailableFeature go={go} title="Automation" message="Automated job sourcing and application submission are not available in the current backend." links={[{ label: "Explore jobs", page: "discover" }, { label: "Manage applications", page: "applications" }]} />;
}

function Integrations({ go }: { go: (page: Page) => void }) {
  return <UnavailableFeature go={go} title="Integrations" message="External account connections and synchronization are not configured in the current backend." links={[{ label: "View your profile", page: "profile" }]} />;
}

function UnavailableFeature({ go, title, message, links }: { go: (page: Page) => void; title: string; message: string; links: Array<{ label: string; page: Page }> }) {
  return <div className="page-content"><section className="card matching-empty"><h2>{title}</h2><p>{message}</p><p>No connection or automated action has been performed.</p><div className="matching-card-actions">{links.map((link) => <button className="secondary" key={link.page} onClick={() => go(link.page)}>{link.label}</button>)}</div></section></div>;
}

function StepProgress({ step, completed = false }: { step: number; completed?: boolean }) {
  return (
    <div className="step-progress" aria-label="Onboarding progress">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={completed || n < step ? "done" : n === step ? "active" : ""} aria-current={!completed && n === step ? "step" : undefined}>
          <span>{completed || n < step ? <Icon name="check" size={14} /> : n}</span>
          <p>{["Account", "Upload CV", "Profile", "Preferences"][n - 1]}<small>{completed || n < step ? "Completed" : n === step ? "Current" : "Remaining"}</small></p>
          {n < 4 && <i />}
        </div>
      ))}
    </div>
  );
}

function AuthShell({
  children,
  step,
  completed,
  go,
}: {
  children: ReactNode;
  step?: number;
  completed?: boolean;
  go: (p: Page) => void;
}) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <Logo />
        <div className="auth-copy">
          <AIBadge text="YOUR AI CAREER COPILOT" />
          <h1>
            Land the right job.
            <br />
            <span>Faster.</span>
          </h1>
          <p>
            Discover better opportunities, create standout applications, and manage your entire
            search in one place.
          </p>
          <div className="auth-quote"><p>Your profile, CV, and saved opportunities stay together in one place.</p></div>
        </div>
        <div className="aside-grid" />
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        {step && <StepProgress step={step} completed={completed} />}
        <div className="auth-content">{children}</div>
        <footer>
          © JobPilot <button type="button" onClick={() => go("privacy")}>Privacy</button>
          <button type="button" onClick={() => go("terms")}>Terms</button>
        </footer>
      </main>
    </div>
  );
}

function Register({ go, onComplete }: { go: (p: Page) => void; onComplete: () => void }) {
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("error");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [accountCreated, setAccountCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const clearFieldError = (name: string) => {
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setMessage("");
  };
  return (
    <AuthShell step={1} go={go}>
      <div className="auth-heading">
        <Pill>STEP 1 OF 4</Pill>
        <h2>Create your account</h2>
        <p>Start your smarter job search. It’s free to try.</p>
      </div>
      <GoogleOAuthButton />
      <div className="or">
        <span />
        or continue with email
        <span />
      </div>
      <form
        className="auth-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const email = String(form.get("email") ?? "").trim();
          const password = String(form.get("password") ?? "");
          const confirmation = String(form.get("confirm_password") ?? "");
          const errors: Record<string, string> = {};
          const emailInput = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
          if (!email) errors.email = "Email is required.";
          else if (!emailInput.validity.valid) errors.email = "Enter a valid email address.";
          if (!password) errors.password = "Password is required.";
          else if (password.length < 8) errors.password = "Password must contain at least 8 characters.";
          if (!confirmation) errors.confirm_password = "Confirm your password.";
          else if (password !== confirmation) errors.confirm_password = "Passwords do not match.";
          setFieldErrors(errors);
          setMessage("");
          setAccountCreated(false);
          if (Object.keys(errors).length) return;
          setSubmitting(true);
          try {
            await register(email, password);
            clearOnboardingDraft();
            try { sessionStorage.removeItem("jobpilot:onboarding-complete"); } catch { /* optional */ }
            setAccountCreated(true);
            try {
              await login(email, password);
              try { sessionStorage.setItem("jobpilot:registration-success", "true"); } catch { /* optional */ }
              setMessageKind("success");
              setMessage("Account created. Let's set up your JobPilot workspace.");
              onComplete();
            } catch {
              sessionStorage.setItem("jobpilot:registration-email", email);
              setMessageKind("error");
              setMessage("Your account was created, but automatic sign-in failed. Continue to sign in and finish setup.");
            }
          } catch (reason) {
            const serverErrors = apiFieldErrors(reason);
            setFieldErrors(serverErrors);
            setMessage(Object.keys(serverErrors).length ? "" : apiMessage(reason, "Could not create the account."));
            setMessageKind("error");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Field label="Work email" name="email" placeholder="name@example.com" icon="mail" type="email" required error={fieldErrors.email} autoComplete="email" onChange={() => clearFieldError("email")} />
        <Field label="Password" name="password" placeholder="At least 8 characters" icon="lock" type="password" required error={fieldErrors.password} autoComplete="new-password" onChange={() => clearFieldError("password")} />
        <Field label="Confirm password" name="confirm_password" placeholder="Enter your password again" icon="lock" type="password" required error={fieldErrors.confirm_password} autoComplete="new-password" onChange={() => clearFieldError("confirm_password")} />
        <p className="legal-links">Review the <button type="button" onClick={() => go("terms")}>Terms of Service</button> and <button type="button" onClick={() => go("privacy")}>Privacy Policy</button>.</p>
        {message && <FormNotice kind={messageKind} message={message} />}
        <button className="primary auth-submit" disabled={submitting || accountCreated}>
          {submitting ? "Creating account…" : "Create account"} <Icon name="arrow" />
        </button>
        {accountCreated && <button className="secondary auth-submit" type="button" onClick={() => go("login")}>Continue to sign in <Icon name="arrow" /></button>}
      </form>
      <p className="auth-switch">
        Already have an account? <button onClick={() => go("login")}>Log in</button>
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  placeholder,
  icon,
  type = "text",
  value,
  name,
  required = false,
  error,
  onChange,
  autoComplete,
  controlled = false,
}: {
  label: string;
  placeholder: string;
  icon?: IconName;
  type?: string;
  value?: string;
  name?: string;
  required?: boolean;
  error?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string;
  controlled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = `field-${(name ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className={`field form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        {icon && <Icon name={icon} />}
        <input id={id} name={name} type={type === "password" && visible ? "text" : type} placeholder={placeholder} {...(controlled ? { value: value ?? "" } : { defaultValue: value })} required={required} autoComplete={autoComplete} onChange={onChange} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
        {type === "password" && <button className="password-visibility" type="button" aria-label={visible ? "Hide password" : "Show password"} onMouseDown={(event) => event.preventDefault()} onClick={() => setVisible((current) => !current)}><Icon name={visible ? "eyeOff" : "eye"} /></button>}
      </div>
      {error && <small id={`${id}-error`} className="form-field-error">{error}</small>}
    </div>
  );
}

function UploadCV({ go }: { go: (p: Page) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<ResumeRecord | null>(null);
  const [resumeDetails, setResumeDetails] = useState<ResumeDetail | null>(null);
  const [primarySet, setPrimarySet] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  useEffect(() => {
    try {
      if (sessionStorage.getItem("jobpilot:registration-success") === "true") {
        setUploadMessage("Account created and signed in. Continue with these optional setup steps.");
        sessionStorage.removeItem("jobpilot:registration-success");
      }
    } catch { /* optional */ }
    let active = true;
    getResumes().then((items) => {
      const primary = items.find((item) => item.is_primary);
      if (!active || !primary) return;
      setUploadedResume(primary);
      setPrimarySet(true);
      setUploadMessage(`A primary CV is already set (${primary.original_filename}). You can continue or choose another file.`);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const chooseFile = (selected?: File) => {
    setError("");
    setFile(null);
    setUploadedResume(null);
    setResumeDetails(null);
    setPrimarySet(false);
    setUploadMessage("");
    if (!selected) return;
    if (!/\.(pdf|docx)$/i.test(selected.name)) return setError("Choose a PDF or DOCX file.");
    if (selected.size > 10 * 1024 * 1024) return setError("The file must be 10 MB or smaller.");
    setFile(selected);
  };
  const continueWithUpload = async () => {
    if (!file && !uploadedResume) return;
    if (uploadedResume && primarySet) {
      go("setup");
      return;
    }
    setUploading(true); setError(""); setUploadMessage("");
    try {
      let resume: ResumeRecord | null = uploadedResume;
      let details = resumeDetails;
      if (!resume && file) {
        resume = await uploadResume(file);
        setUploadedResume(resume);
      }
      if (resume && !details) {
        details = await getResumeDetails(resume.id);
        setResumeDetails(details);
      }
      if (resume && !primarySet) {
        await setPrimaryResume(resume.id);
        setPrimarySet(true);
      }
      setUploadMessage(details?.parse_status === "completed"
        ? `CV uploaded, parsed, and set as your primary CV. Parsed ${Array.isArray(details.extracted_data.skills) ? details.extracted_data.skills.length : 0} skill suggestions; none were applied to your profile.`
        : details?.parse_status === "failed"
          ? `CV uploaded and set as primary, but parsing failed${details.parse_error ? `: ${details.parse_error}` : "."}`
          : `CV uploaded and set as primary. Parsing status: ${details?.parse_status ?? resume?.parse_status ?? "unknown"}.`);
    } catch (reason) {
      setError(apiMessage(reason, "Could not upload your CV."));
    } finally {
      setUploading(false);
    }
  };
  return (
    <AuthShell step={2} go={go}>
      <div className="auth-heading">
        <Pill>STEP 2 OF 4</Pill>
        <h2>Bring your experience</h2>
        <p>Upload and parse your CV for matching. Parsed suggestions do not overwrite your profile.</p>
      </div>
      <input id="resume-file" type="file" accept=".pdf,.docx" hidden aria-invalid={Boolean(error)} aria-describedby={error ? "cv-upload-error" : undefined} onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
      <button
        className={`drop-zone ${file ? "uploaded" : ""} ${error ? "error" : ""}`}
        type="button"
        aria-label="Choose a PDF or DOCX CV"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "cv-upload-error" : undefined}
        onClick={() => document.getElementById("resume-file")?.click()}
      >
        {file ? (
          <>
            <span className="success-upload">
              <Icon name="check" />
            </span>
            <h3>{file.name}</h3>
            <p>{(file.size / (1024 * 1024)).toFixed(1)} MB · Selected on this device</p>
            <Pill tone="success">FILE SELECTED</Pill>
          </>
        ) : (
          <>
            <span>
              <Icon name="upload" />
            </span>
            <h3>Drop your CV here</h3>
            <p>
              or <u>browse files</u> from your computer
            </p>
            <small>PDF or DOCX · Maximum 10 MB</small>
          </>
        )}
      </button>
      {error && <FormNotice id="cv-upload-error" kind="error" message={error} />}
      {uploadMessage && <FormNotice kind="success" message={uploadMessage} />}
      <div className="privacy">
        <Icon name="shield" />
        <p>
          <b>Your information is protected</b>
          <span>The CV is stored privately and used for matching only after it has been set as primary.</span>
        </p>
      </div>
      <div className="auth-nav">
        <button className="secondary" onClick={() => go("dashboard")}>Exit setup</button>
        <button className="primary" onClick={() => void continueWithUpload()} disabled={(!file && !uploadedResume) || uploading}>
          {uploading ? "Uploading and parsing…" : uploadedResume && primarySet ? "Continue" : "Upload and continue"} <Icon name="arrow" />
        </button>
      </div>
      <button className="skip" type="button" onClick={() => go("setup")}>
        Skip for now
      </button>
    </AuthShell>
  );
}

function ProfileSetup({ go }: { go: (p: Page) => void }) {
  const savedDraft = readOnboardingDraft().profile;
  type ProfileDraft = NonNullable<OnboardingDraft["profile"]>;
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(savedDraft ?? { title: "", years: "", headline: "", skills: "", location: "", workPreference: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const change = (field: keyof typeof draft, value: string) => setDraft((current) => {
    const next = { ...current, [field]: value };
    saveOnboardingDraft({ profile: next });
    setFieldErrors((previous) => ({ ...previous, [field]: "" }));
    return next;
  });
  useEffect(() => {
    getCandidateProfile().then((data) => {
      setProfile(data);
      if (!readOnboardingDraft().profile) {
        const experience = data.experience[0] ?? {};
        const years = Object.values(experience).join(" ").match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)/i)?.[1] ?? "";
        setDraft({ title: typeof experience.title === "string" ? experience.title : "", years, headline: data.summary, skills: data.skills.join(", "), location: data.location, workPreference: data.work_preferences[0] ?? "" });
      }
    }).catch((reason) => setError(apiMessage(reason, "Could not load your profile."))).finally(() => setLoading(false));
  }, []);
  const saveAndContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    if (draft.years && (!Number.isFinite(Number(draft.years)) || Number(draft.years) < 0)) {
      setFieldErrors({ years: "Enter a valid, non-negative number of years." });
      return;
    }
    setSaving(true); setError("");
    const current = profile.experience[0];
    const experience = draft.title.trim() || draft.years.trim()
      ? [{ ...(current ?? {}), title: draft.title.trim() || current?.title || "Professional experience", description: draft.years.trim() ? `${draft.years.trim()} years of experience` : current?.description ?? "" }, ...profile.experience.slice(current ? 1 : 0)]
      : profile.experience;
    try {
      await updateCandidateProfile({
        summary: draft.headline.trim(),
        skills: draft.skills.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        location: draft.location.trim(),
        experience,
        work_preferences: draft.workPreference ? [draft.workPreference] : [],
      });
      clearOnboardingDraft("profile");
      go("preferences");
    } catch (reason) {
      const serverErrors = apiFieldErrors(reason);
      setFieldErrors(serverErrors);
      setError(Object.keys(serverErrors).length ? "" : apiMessage(reason, "Could not save your profile."));
    } finally { setSaving(false); }
  };
  const skip = () => { clearOnboardingDraft("profile"); go("preferences"); };
  if (loading) return <AuthShell step={3} go={go}><div className="auth-heading"><h2>Loading your profile…</h2></div></AuthShell>;
  return (
    <AuthShell step={3} go={go}>
      <div className="auth-heading">
        <Pill>STEP 3 OF 4</Pill>
        <h2>Review your profile</h2>
        <p>Use existing profile details or add a few optional details now.</p>
      </div>
      <div className="imported-note">
        <AIBadge text="YOUR PROFILE" />
        <span>CV suggestions are not applied automatically.</span>
      </div>
      {error && <FormNotice kind="error" message={error} />}
      <form className="auth-form" onChangeCapture={() => { if (error) setError(""); }} onSubmit={(event) => void saveAndContinue(event)}>
        <Field label="Current job title" name="title" placeholder="e.g. Product Designer" value={draft.title} controlled onChange={(event) => change("title", event.currentTarget.value)} />
        <Field label="Years of experience" name="years" type="number" placeholder="e.g. 5" value={draft.years} controlled error={fieldErrors.years} onChange={(event) => change("years", event.currentTarget.value)} />
        <Field label="Professional headline" name="headline" placeholder="A short summary of your experience" value={draft.headline} controlled onChange={(event) => change("headline", event.currentTarget.value)} />
        <Field label="Top skills" name="skills" placeholder="Design systems, Figma, research" value={draft.skills} controlled onChange={(event) => change("skills", event.currentTarget.value)} />
        <Field label="Current location" name="location" placeholder="City, country" value={draft.location} controlled onChange={(event) => change("location", event.currentTarget.value)} />
        <label className="field form-field"><span>Work preference</span><select value={draft.workPreference} onChange={(event) => change("workPreference", event.currentTarget.value)}><option value="">No preference</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></label>
        <div className="auth-nav">
          <button className="secondary" type="button" onClick={() => go("upload")}>Back</button>
          <button className="primary" disabled={saving}>{saving ? "Saving profile…" : "Continue"} <Icon name="arrow" /></button>
        </div>
      </form>
      <button className="skip" type="button" onClick={skip}>Skip for now</button>
    </AuthShell>
  );
}

function Preferences({ go }: { go: (p: Page) => void }) {
  type PreferenceDraft = NonNullable<OnboardingDraft["preferences"]>;
  const savedDraft = readOnboardingDraft().preferences;
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [draft, setDraft] = useState<PreferenceDraft>(savedDraft ?? { roles: "", location: "", workPreferences: [], salaryMin: "", salaryMax: "", currency: "USD" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(() => {
    try { return sessionStorage.getItem("jobpilot:onboarding-complete") === "true"; } catch { return false; }
  });
  useEffect(() => {
    getCandidateProfile().then((data) => {
      setProfile(data);
      if (!readOnboardingDraft().preferences) {
        setDraft({ roles: data.desired_positions.join(", "), location: data.location, workPreferences: data.work_preferences, salaryMin: data.salary_min ?? "", salaryMax: data.salary_max ?? "", currency: data.salary_currency || "USD" });
      }
    }).catch((reason) => setError(apiMessage(reason, "Could not load your preferences."))).finally(() => setLoading(false));
  }, []);
  const updateDraft = (patch: Partial<PreferenceDraft>) => setDraft((current) => {
    const next = { ...current, ...patch };
    saveOnboardingDraft({ preferences: next });
    return next;
  });
  const toggle = (value: "remote" | "hybrid" | "onsite") => {
    const next = draft.workPreferences.includes(value)
      ? draft.workPreferences.filter((item) => item !== value)
      : [...draft.workPreferences, value];
    updateDraft({ workPreferences: next });
  };
  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    if (draft.salaryMin && draft.salaryMax && Number(draft.salaryMin) > Number(draft.salaryMax)) {
      setFieldErrors({ salary_max: "Maximum salary must be at least the minimum salary." });
      return;
    }
    setSaving(true); setError(""); setFieldErrors({});
    try {
      await updateCandidateProfile({
        desired_positions: draft.roles.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        location: draft.location.trim(),
        work_preferences: draft.workPreferences,
        salary_min: draft.salaryMin.trim() ? draft.salaryMin.trim() : null,
        salary_max: draft.salaryMax.trim() ? draft.salaryMax.trim() : null,
        salary_currency: draft.currency.trim().toUpperCase(),
      });
      clearOnboardingDraft("preferences");
      try { sessionStorage.setItem("jobpilot:onboarding-complete", "true"); } catch { /* optional */ }
      setCompleted(true);
    } catch (reason) {
      const serverErrors = apiFieldErrors(reason);
      setFieldErrors(serverErrors);
      setError(Object.keys(serverErrors).length ? "" : apiMessage(reason, "Could not save your preferences."));
    } finally { setSaving(false); }
  };
  if (loading) return <AuthShell step={4} go={go}><div className="auth-heading"><h2>Loading your preferences…</h2></div></AuthShell>;
  if (completed) return <AuthShell step={4} completed go={go}><div className="auth-heading"><Pill tone="success">SETUP COMPLETE</Pill><h2>You’re all set</h2><p>Your profile and job preferences are saved. You can update them any time.</p></div><button className="primary auth-submit" onClick={() => go("dashboard")}>Open JobPilot <Icon name="sparkles" /></button></AuthShell>;
  return <AuthShell step={4} go={go}>
    <div className="auth-heading"><Pill>FINAL STEP</Pill><h2>What are you looking for?</h2><p>These optional preferences help rank your job matches.</p></div>
    {error && <FormNotice kind="error" message={error} />}
    <form className="auth-form preferences-form" onChangeCapture={() => { if (error) setError(""); }} onSubmit={(event) => void savePreferences(event)}>
      <Field label="Target roles" name="roles" placeholder="e.g. Product Designer, UX Designer" value={draft.roles} controlled onChange={(event) => updateDraft({ roles: event.currentTarget.value })} error={fieldErrors.desired_positions} />
      <Field label="Preferred location" name="preference-location" placeholder="City, country or Remote" value={draft.location} controlled onChange={(event) => updateDraft({ location: event.currentTarget.value })} error={fieldErrors.location} />
      <fieldset className="preference-choice"><legend>Work arrangement</legend>{(["remote", "hybrid", "onsite"] as const).map((value) => <label key={value}><input type="checkbox" checked={draft.workPreferences.includes(value)} onChange={() => toggle(value)} />{value === "onsite" ? "On-site" : value[0].toUpperCase() + value.slice(1)}</label>)}</fieldset>
      <div className="two-fields"><Field label="Minimum salary" name="salary-min" type="number" placeholder="Optional" value={draft.salaryMin} controlled error={fieldErrors.salary_min} onChange={(event) => { updateDraft({ salaryMin: event.currentTarget.value }); setFieldErrors((previous) => ({ ...previous, salary_max: "" })); }} /><Field label="Maximum salary" name="salary-max" type="number" placeholder="Optional" value={draft.salaryMax} controlled error={fieldErrors.salary_max} onChange={(event) => { updateDraft({ salaryMax: event.currentTarget.value }); setFieldErrors((previous) => ({ ...previous, salary_max: "" })); }} /></div>
      <Field label="Salary currency" name="salary-currency" placeholder="USD" value={draft.currency} controlled error={fieldErrors.salary_currency} onChange={(event) => updateDraft({ currency: event.currentTarget.value.toUpperCase() })} />
      <div className="auth-nav"><button className="secondary" type="button" onClick={() => go("setup")}>Back</button><button className="primary" disabled={saving}>{saving ? "Saving preferences…" : "Save and continue"} <Icon name="arrow" /></button></div>
    </form>
    <button className="skip" type="button" onClick={() => { clearOnboardingDraft("preferences"); try { sessionStorage.setItem("jobpilot:onboarding-complete", "true"); } catch { /* optional */ } setCompleted(true); }}>Skip for now</button>
  </AuthShell>;
}

function Login({ go, onLoginSuccess }: { go: (p: Page) => void; onLoginSuccess: (user: PublicUser) => void }) {
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const registeredEmail = (() => { try { return sessionStorage.getItem("jobpilot:registration-email") ?? ""; } catch { return ""; } })();
  return (
    <AuthShell go={go}>
      <div className="auth-heading login-heading">
        <AIBadge text="WELCOME BACK" />
        <h2>Log in to JobPilot</h2>
        <p>Your next opportunity is waiting.</p>
      </div>
      <GoogleOAuthButton />
      <div className="or">
        <span />
        or continue with email
        <span />
      </div>
      <form
        className="auth-form"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const email = String(form.get("email") ?? "").trim();
          const password = String(form.get("password") ?? "");
          const errors: Record<string, string> = {};
          const emailInput = e.currentTarget.elements.namedItem("email") as HTMLInputElement;
          if (!email) errors.email = "Email is required.";
          else if (!emailInput.validity.valid) errors.email = "Enter a valid email address.";
          if (!password) errors.password = "Password is required.";
          setFieldErrors(errors);
          setMessage("");
          if (Object.keys(errors).length) return;
          setSubmitting(true);
          try {
            const user = await login(email, password);
            try { sessionStorage.removeItem("jobpilot:registration-email"); } catch { /* optional */ }
            onLoginSuccess(user);
          } catch (reason) {
            const serverErrors = apiFieldErrors(reason);
            if (reason instanceof ApiError && reason.status === 401) {
              setFieldErrors({ password: "Email or password is incorrect." });
              setMessage("");
            } else {
              setFieldErrors(serverErrors);
              setMessage(Object.keys(serverErrors).length ? "" : apiMessage(reason, "Could not sign in."));
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Field label="Email address" name="email" placeholder="name@example.com" icon="mail" type="email" required value={registeredEmail} autoComplete="email" error={fieldErrors.email} onChange={() => { setFieldErrors((previous) => ({ ...previous, email: "" })); setMessage(""); }} />
        <Field label="Password" name="password" placeholder="Enter your password" icon="lock" type="password" required autoComplete="current-password" error={fieldErrors.password} onChange={() => { setFieldErrors((previous) => ({ ...previous, password: "" })); setMessage(""); }} />
        <div className="login-options">
          <button type="button" onClick={() => setMessage("Password recovery is unavailable until its backend flow is configured.")}>Forgot password?</button>
        </div>
        {message && <FormNotice kind="error" message={message} />}
        <button className="primary auth-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Log in"} <Icon name="arrow" />
        </button>
      </form>
      <p className="auth-switch">
        New to JobPilot? <button onClick={() => go("register")}>Create an account</button>
      </p>
    </AuthShell>
  );
}

function apiMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 0) return "Could not reach the backend. Check your connection and API URL.";
  if (error.status === 401) return "Your session is missing or expired. Log in, then try again.";
  if (error.status === 429) return "The service is receiving too many requests. Try again shortly.";
  if (error.status === 409) return "This job is already saved in your applications.";
  if (error.status >= 500) return "The backend could not complete this request. Try again later.";
  if (error.message) return error.message;
  return fallback;
}

function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== "object") return {};
  const result: Record<string, string> = {};
  const knownFields = new Set(["email", "password", "confirm_password", "phone", "location", "summary", "desired_positions", "skills", "preferred_technologies", "experience", "education", "languages", "work_preferences", "salary_min", "salary_max", "salary_currency"]);
  const readMessage = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(readMessage).filter(Boolean).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(readMessage).filter(Boolean).join(" ");
    return "";
  };
  for (const [key, value] of Object.entries(error.payload as Record<string, unknown>)) {
    const message = readMessage(value);
    if (message && knownFields.has(key)) result[key] = message;
  }
  return result;
}

function FormNotice({ kind, message, id }: { kind: "success" | "error" | "warning"; message: string; id?: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    if (kind !== "success") return;
    const timeout = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [kind, message]);
  if (!visible || !message) return null;
  return <div id={id} className={`form-notice ${kind}`} role={kind === "error" ? "alert" : "status"}>{message}</div>;
}

function scoreText(score: number | null | undefined) {
  return score === null || score === undefined ? "Not enough information" : `${score}%`;
}

function categoryDetails(key: keyof MatchResult["categories"], category: MatchCategory) {
  if (key === "experience") {
    const years = category.candidate_years;
    const required = category.required_years;
    const education = category.education_score;
    return [
      typeof years === "number" ? `${years} years in profile${typeof required === "number" ? ` · ${required} required` : ""}` : "",
      education !== undefined ? `Education: ${scoreText(typeof education === "number" ? education : null)}` : "",
    ].filter(Boolean);
  }
  if (key === "location_preferences") {
    return typeof category.job_mode === "string" ? [`Job mode: ${category.job_mode}`] : [];
  }
  if (key === "salary" && Array.isArray(category.salary_range)) {
    return [`Job range: ${category.salary_range.join(" – ")}`];
  }
  return [];
}

function jobIdentity(job: JobSnapshot) {
  return job.source_id ? `${job.source}:${job.source_id}` : job.url;
}

const selectedJobStorageKey = "jobpilot:discovery-selected-job";

type JobRecommendation = Awaited<ReturnType<typeof getRecommendations>>["results"][number];

function cacheSelectedJob(job: JobSnapshot, recommendation?: JobRecommendation) {
  try { sessionStorage.setItem(selectedJobStorageKey, JSON.stringify({ job, recommendation: recommendation ?? null })); } catch { /* optional cache */ }
}

const EXPERIENCE_LABELS: Record<NonNullable<JobSnapshot["experience_level"]>, string> = {
  internship: "Internship", junior: "Junior", mid_level: "Mid level",
  senior_level: "Senior level", lead_manager: "Lead / Manager", unknown: "Unknown",
};
const EXPERIENCE_FILTERS = [
  ["Internship", "internship"], ["Junior", "junior"], ["Mid level", "mid_level"],
  ["Senior level", "senior_level"], ["Lead / Manager", "lead_manager"], ["Unknown", "unknown"],
] as const;

function experienceLabel(job: Pick<JobSnapshot, "experience_level">, match?: RankedJob | MatchResult) {
  const level = job.experience_level ?? match?.categories.experience.job_experience_level;
  return typeof level === "string" && level in EXPERIENCE_LABELS
    ? EXPERIENCE_LABELS[level as NonNullable<JobSnapshot["experience_level"]>]
    : "Unknown";
}

function readCachedJob(source: string | null, sourceId: string | null): JobSnapshot | null {
  if (!source || !sourceId) return null;
  try {
    const raw = sessionStorage.getItem(selectedJobStorageKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as JobSnapshot | { job?: JobSnapshot };
    const value = "job" in cached && cached.job ? cached.job : cached as JobSnapshot;
    return value.source === source && value.source_id === sourceId && typeof value.title === "string" ? value : null;
  } catch { return null; }
}

function readCachedRecommendation(source: string | null, sourceId: string | null): JobRecommendation | null {
  if (!source || !sourceId) return null;
  try {
    const raw = sessionStorage.getItem(selectedJobStorageKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { job?: JobSnapshot; recommendation?: JobRecommendation | null };
    return cached.job?.source === source && cached.job.source_id === sourceId ? cached.recommendation ?? null : null;
  } catch { return null; }
}

function JobSearchPage({ openMatch, openJob }: { openMatch: (id: number) => void; openJob: (job: JobSnapshot) => void }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [jobList, setJobList] = useState<JobSnapshot[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [matches, setMatches] = useState<Record<string, MatchResult>>({});
  const [ranked, setRanked] = useState<Record<string, RankedJob>>({});
  const [profileHasData, setProfileHasData] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [minimumMatchScore, setMinimumMatchScore] = useState(35);
  const [rankError, setRankError] = useState("");
  const profileTerms = useRef<string[]>([]);
  const searchSequence = useRef(0);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("All jobs");
  const [sortBy, setSortBy] = useState("Best match");
  const [minimumScoreFilter, setMinimumScoreFilter] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [minimumSalaryFilter, setMinimumSalaryFilter] = useState("");
  const [maximumSalaryFilter, setMaximumSalaryFilter] = useState("");
  const [posted, setPosted] = useState("Any time");
  const [jobTypes, setJobTypes] = useState<Set<string>>(new Set());
  const [experienceLevels, setExperienceLevels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [providerWarning, setProviderWarning] = useState("");
  const [error, setError] = useState("");
  const [consentJob, setConsentJob] = useState<JobSnapshot | null>(null);
  const [consented, setConsented] = useState(false);

  const search = async (terms: string[] = [], broader = false) => {
    const sequence = ++searchSequence.current;
    const explicitTerms = terms.map((term) => term.trim()).filter(Boolean);
    const queryTerms = explicitTerms.length ? explicitTerms : broader ? [] : profileTerms.current;
    setLoading(true);
    setError("");
    setRankError("");
    setMessage("");
    setProviderWarning("");
    try {
      const result = await searchJobsWithMetadata(queryTerms);
      if (sequence !== searchSequence.current) return;
      setJobList(result.jobs);
      if (result.warnings.length) {
        setProviderWarning(`Some job sources are temporarily unavailable (${result.warnings.join(", ")}); showing the available listings.`);
      }
      setSelected(new Set());
      setCurrentPage(1);
      setRanked({});
      if (result.jobs.length) {
        try {
          const nextScores: Record<string, RankedJob> = {};
          for (let index = 0; index < result.jobs.length; index += 100) {
            const response = await rankJobs(result.jobs.slice(index, index + 100));
            if (sequence !== searchSequence.current) return;
            for (const item of response.results) nextScores[jobIdentity(item.job)] = item;
            setMinimumMatchScore(response.minimum_relevance_score);
          }
          setRanked(nextScores);
        } catch (reason) {
          if (sequence === searchSequence.current) setRankError(apiMessage(reason, "Jobs loaded, but profile matching is unavailable right now."));
        }
      }
    } catch (reason) {
      if (sequence === searchSequence.current) {
        setJobList([]);
        setError(apiMessage(reason, "Could not search jobs."));
      }
    } finally {
      if (sequence === searchSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getCandidateProfile().then((profile) => {
      if (!active) return;
      profileTerms.current = [...profile.desired_positions.slice(0, 5), ...profile.skills.slice(0, 5), ...profile.preferred_technologies.slice(0, 5), profile.location].filter(Boolean);
      setProfileHasData(Boolean(profile.desired_positions.length || profile.skills.length || profile.preferred_technologies.length || profile.location || profile.work_preferences.length || profile.employment_preferences?.length || profile.experience.length || profile.education.length || profile.salary_min || profile.salary_max));
      setProfileError("");
      void search();
    }).catch((reason) => {
      if (!active) return;
      setProfileHasData(false);
      setProfileError(apiMessage(reason, "Could not load your profile; using broad job discovery."));
      void search();
    });
    return () => { active = false; searchSequence.current += 1; };
  }, []);
  useEffect(() => {
    getApplications(1, 100).then((data) => {
      setSaved(new Set(data.results.map((application) =>
        application.source_id ? `${application.source}:${application.source_id}` : application.url,
      )));
    }).catch(() => undefined);
  }, []);
  useEffect(() => { setCurrentPage(1); }, [filter, posted, jobTypes, experienceLevels, minimumScoreFilter, workMode, minimumSalaryFilter, maximumSalaryFilter, sortBy]);

  const filteredJobs = jobList.filter((job) => {
    const key = jobIdentity(job);
    const score = ranked[key] ?? matches[key];
    const topMatchScore = ranked[key]?.overall_score;
    if (filter === "Top matches" && (typeof topMatchScore !== "number" || topMatchScore < minimumMatchScore)) return false;
    if (filter === "Remote" && !(job.remote === true || /remote/i.test(job.location ?? ""))) return false;
    if (filter === "Saved" && !saved.has(key)) return false;
    const type = Array.isArray(job.employment_type) ? job.employment_type.join(" ") : job.employment_type ?? "";
    if (jobTypes.size && ![...jobTypes].some((selectedType) => type.toLowerCase().includes(selectedType.toLowerCase()))) return false;
    const modeText = `${job.remote === true ? "remote" : ""} ${job.title} ${job.description} ${job.location}`.toLowerCase();
    if (workMode === "Remote" && !/remote/.test(modeText)) return false;
    if (workMode === "Hybrid" && !/hybrid/.test(modeText)) return false;
    if (workMode === "On-site" && !/(on.site|onsite)/.test(modeText)) return false;
    if (minimumScoreFilter && (typeof score?.overall_score !== "number" || score.overall_score < Number(minimumScoreFilter))) return false;
    const salaryValues = (job.salary_text ?? "").match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => Number(value.replace(/,/g, ""))).filter(Number.isFinite) ?? [];
    if ((minimumSalaryFilter || maximumSalaryFilter) && !salaryValues.length) return false;
    if (minimumSalaryFilter && Math.max(...salaryValues) < Number(minimumSalaryFilter)) return false;
    if (maximumSalaryFilter && Math.min(...salaryValues) > Number(maximumSalaryFilter)) return false;
    if (posted !== "Any time") {
      if (!job.published_at) return false;
      const age = Date.now() - new Date(job.published_at).getTime();
      if (!Number.isFinite(age)) return false;
      if (posted === "Past 24 hours" && age > 24 * 60 * 60 * 1000) return false;
      if (posted === "Past week" && age > 7 * 24 * 60 * 60 * 1000) return false;
    }
    if (experienceLevels.size) {
      const level = job.experience_level ?? score?.categories.experience.job_experience_level;
      const normalizedLevel = typeof level === "string" && level in EXPERIENCE_LABELS ? level : "unknown";
      if (!experienceLevels.has(EXPERIENCE_LABELS[normalizedLevel as keyof typeof EXPERIENCE_LABELS])) return false;
    }
    return true;
  });
  const visibleJobs = [...filteredJobs].sort((a, b) => {
    const scoreA = (ranked[jobIdentity(a)] ?? matches[jobIdentity(a)])?.overall_score;
    const scoreB = (ranked[jobIdentity(b)] ?? matches[jobIdentity(b)])?.overall_score;
    if (sortBy === "Best match" && scoreA !== scoreB) return (scoreB ?? -1) - (scoreA ?? -1);
    const dateA = a.published_at ? Date.parse(a.published_at) : Number.NaN;
    const dateB = b.published_at ? Date.parse(b.published_at) : Number.NaN;
    if ((sortBy === "Newest" || sortBy === "Best match") && dateA !== dateB) return (Number.isFinite(dateB) ? dateB : -Infinity) - (Number.isFinite(dateA) ? dateA : -Infinity);
    if (sortBy === "Oldest" && dateA !== dateB) return (Number.isFinite(dateA) ? dateA : Infinity) - (Number.isFinite(dateB) ? dateB : Infinity);
    if (sortBy.startsWith("Salary")) {
      const salaryA = (a.salary_text?.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? "").replace(/,/g, "");
      const salaryB = (b.salary_text?.match(/\d[\d,]*(?:\.\d+)?/)?.[0] ?? "").replace(/,/g, "");
      const firstA = salaryA ? Number(salaryA) : null;
      const firstB = salaryB ? Number(salaryB) : null;
      if (firstA !== firstB) return sortBy === "Salary (high to low)" ? (firstB ?? -Infinity) - (firstA ?? -Infinity) : (firstA ?? Infinity) - (firstB ?? Infinity);
    }
    return 0;
  });
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / pageSize));
  const pageJobs = visibleJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const analyze = async (job: JobSnapshot, useAi = false) => {
    const key = jobIdentity(job);
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const match = await analyzeJob(job, useAi
        ? { include_ai: true, external_ai_consent: true }
        : undefined);
      setMatches((previous) => ({ ...previous, [key]: match }));
      openMatch(match.id);
    } catch (reason) {
      setError(apiMessage(reason, "Could not analyze this job."));
    } finally {
      setBusy("");
      setConsentJob(null);
      setConsented(false);
    }
  };

  const save = async (job: JobSnapshot) => {
    const key = jobIdentity(job);
    setBusy(`save:${key}`);
    setError("");
    setMessage("");
    try {
      await saveApplication(job);
      setSaved((previous) => new Set(previous).add(key));
      setMessage("Job saved to your applications.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setSaved((previous) => new Set(previous).add(key));
        setMessage("This job is already in your applications.");
      } else {
        setError(apiMessage(reason, "Could not save this job."));
      }
    } finally {
      setBusy("");
    }
  };

  const bulkAnalyze = async () => {
    const selectedJobs = jobList.filter((job) => selected.has(jobIdentity(job))).slice(0, 20);
    if (!selectedJobs.length) return;
    setBusy("bulk");
    setError("");
    setMessage("");
    try {
      const response = await analyzeJobs(selectedJobs);
      setMatches((previous) => ({ ...previous, ...Object.fromEntries(response.results.map((match) => [jobIdentity(match.job), match])) }));
      setMessage(`${response.count} job${response.count === 1 ? "" : "s"} analyzed. Open Match History to review the results.`);
      setSelected(new Set());
    } catch (reason) {
      setError(apiMessage(reason, "Could not analyze the selected jobs."));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="page-content discover-page">
      <section className="search-hero">
        <AIBadge text="Backend job search" />
        <h2>Find work that fits you.</h2>
        <p>Search current public listings, then request a compatibility estimate. Any keyword may match across title, company, location, or description.</p>
        <form className="search-box" onSubmit={(event) => { event.preventDefault(); void search([query, location]); }}>
          <Icon name="search" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title, skill, or company" />
          <span />
          <Icon name="location" />
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Additional keyword (location, skill, etc.)" />
          <button className="primary" type="submit" disabled={loading}>Search jobs</button>
        </form>
      </section>
      <div className="jobs-toolbar">
        <div className="filter-pills">
          {["All jobs", "Top matches", "Remote", "Saved"].map((value) => (
            <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value}</button>
          ))}
          <button className="secondary" onClick={() => { setFilter("All jobs"); void search([query, location], true); }}>Broader discovery</button>
        </div>
        <div className="matching-toolbar-actions">
          <span>{selected.size}/20 selected</span>
          <label className="jobs-sort-control">Sort by <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option>Best match</option><option>Newest</option><option>Oldest</option><option>Salary (high to low)</option><option>Salary (low to high)</option></select></label>
          <label className="jobs-sort-control">Min match <input type="number" min="0" max="100" value={minimumScoreFilter} onChange={(event) => setMinimumScoreFilter(event.target.value)} placeholder="Any" /></label>
          <button className="secondary" disabled={!selected.size || busy === "bulk"} onClick={() => void bulkAnalyze()}>
            {busy === "bulk" ? "Analyzing…" : "Analyze selected"}
          </button>
        </div>
      </div>
      {error && <p className="matching-alert" role="alert">{error}</p>}
      {profileError && <p className="matching-notice" role="status">{profileError}</p>}
      {rankError && <p className="matching-alert" role="alert">{rankError}</p>}
      {message && <p className="matching-notice" role="status">{message}</p>}
      {providerWarning && <p className="matching-notice" role="status">{providerWarning}</p>}
      <div className="jobs-layout">
      <aside className="filter-panel card">
        <div className="filter-head"><b>Filters</b><button onClick={() => { setPosted("Any time"); setJobTypes(new Set()); setExperienceLevels(new Set()); setWorkMode(""); setMinimumScoreFilter(""); setMinimumSalaryFilter(""); setMaximumSalaryFilter(""); }}>Clear all</button></div>
        <div className="filter-group"><b>Date posted</b>{["Any time", "Past 24 hours", "Past week"].map((option) => <label key={option}><input type="radio" name="posted" checked={posted === option} onChange={() => setPosted(option)} /><span>{option}</span></label>)}</div>
        <div className="filter-group"><b>Job type</b>{["Full-time", "Contract", "Part-time"].map((option) => <label key={option}><input type="checkbox" checked={jobTypes.has(option)} onChange={(event) => { const checked = event.currentTarget.checked; setJobTypes((previous) => { const next = new Set(previous); checked ? next.add(option) : next.delete(option); return next; }); }} /><span>{option}</span></label>)}</div>
        <div className="filter-group"><b>Experience level</b>{EXPERIENCE_FILTERS.map(([option]) => <label key={option}><input type="checkbox" checked={experienceLevels.has(option)} onChange={(event) => { const checked = event.currentTarget.checked; setExperienceLevels((previous) => { const next = new Set(previous); checked ? next.add(option) : next.delete(option); return next; }); }} /><span>{option}</span></label>)}</div>
        <div className="filter-group"><b>Work mode</b><select value={workMode} onChange={(event) => setWorkMode(event.target.value)}><option value="">Any mode</option><option>Remote</option><option>Hybrid</option><option>On-site</option></select></div>
        <div className="filter-group"><b>Salary range</b><label>Minimum<input type="number" min="0" value={minimumSalaryFilter} onChange={(event) => setMinimumSalaryFilter(event.target.value)} /></label><label>Maximum<input type="number" min="0" value={maximumSalaryFilter} onChange={(event) => setMaximumSalaryFilter(event.target.value)} /></label></div>
      </aside>
      <section className="job-list">
        <div className="result-count">
          <b>{loading ? "Loading jobs…" : visibleJobs.length ? `Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, visibleJobs.length)} of ${visibleJobs.length} jobs` : "0 jobs"}</b>
          <span>Aggregated from available providers · page {currentPage} of {pageCount}</span>
        </div>
        {!loading && visibleJobs.length === 0 && <div className="card matching-empty">{filter === "Top matches" && !profileHasData ? "Add desired positions, skills, technologies, experience or preferences to your profile to calculate Top Matches." : filter === "Top matches" ? `No jobs currently meet the ${minimumMatchScore}% relevance threshold. Use All jobs or Broader discovery to browse more results.` : "No jobs found for this search."}</div>}
        {pageJobs.map((job) => {
          const key = jobIdentity(job);
          const result = ranked[key] ?? matches[key];
          const company = job.company || "Company not listed";
          const logoColor = "#635bff";
          return (
            <article className="job-card card" key={key} tabIndex={0} role="link" aria-label={`View details for ${job.title}`} onClick={(event: MouseEvent<HTMLElement>) => {
              if ((event.target as HTMLElement).closest("button, a, input, label")) return;
              openJob(job);
            }} onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
              if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
              event.preventDefault();
              openJob(job);
            }}>
              <CompanyLogo letter={company.slice(0, 1).toUpperCase()} color={logoColor} />
              <div className="job-card-body">
                <div className="job-card-top">
                  <div><h3>{job.title}</h3><p>{company}</p></div>
                  <label className="matching-select"><input type="checkbox" checked={selected.has(key)} onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    if (checked && selected.size >= 20) {
                      setError("Bulk analysis is limited to 20 jobs per request.");
                      event.currentTarget.checked = false;
                      return;
                    }
                    setSelected((previous) => {
                      const next = new Set(previous);
                      checked ? next.add(key) : next.delete(key);
                      return next;
                    });
                  }} /><span>Select</span></label>
                </div>
                <div className="meta">
                  <span>{experienceLabel(job, result)}</span>
                  {job.location && <span><Icon name="location" />{job.location}</span>}
                  <span><Icon name="globe" />{job.source}</span>
                  {job.published_at && Number.isFinite(Date.parse(job.published_at)) && <span><Icon name="calendar" />{new Date(job.published_at).toLocaleDateString()}</span>}
                  {job.salary_text && <span><Icon name="money" />{job.salary_text}</span>}
                  {job.employment_type && <span><Icon name="briefcase" />{Array.isArray(job.employment_type) ? job.employment_type.join(", ") : job.employment_type}</span>}
                </div>
                <div className="job-bottom">
                  <div>{job.tags.slice(0, 5).map((tag) => <Pill key={tag}>{tag}</Pill>)}</div>
                  {result && <div className="job-match-summary"><strong>{scoreText(result.overall_score)} match</strong>{result.matching_skills.length > 0 && <span>Skills: {result.matching_skills.slice(0, 3).join(", ")}</span>}{result.missing_skills.length > 0 && <small>Missing required: {result.missing_skills.slice(0, 3).join(", ")}</small>}<small>{result.explanation}</small></div>}
                  <div className="matching-card-actions">
                    {result && <span className="matching-score">{scoreText(result.overall_score)} match</span>}
                    <button className="secondary" onClick={() => openJob(job)}>View details</button>
                    <button className="secondary" disabled={Boolean(busy)} onClick={() => void analyze(job)}>{busy === key ? "Analyzing…" : "Analyze match"}</button>
                    <button className="secondary" disabled={Boolean(busy)} onClick={() => void save(job)}>{busy === `save:${key}` ? "Saving…" : saved.has(key) ? "Saved" : "Save job"}</button>
                    {job.url && <a className="matching-link" href={job.url} target="_blank" rel="noreferrer">Original listing</a>}
                    <button className="matching-ai-button" disabled={Boolean(busy)} onClick={() => { setConsentJob(job); setConsented(false); }}>Analyze with AI</button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {!loading && visibleJobs.length > pageSize && <nav className="job-search-pagination" aria-label="Job search pages">
          <button className="secondary" disabled={currentPage <= 1} onClick={() => { setCurrentPage((page) => Math.max(1, page - 1)); document.querySelector(".job-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Previous</button>
          <span>Page {currentPage} of {pageCount}</span>
          <button className="secondary" disabled={currentPage >= pageCount} onClick={() => { setCurrentPage((page) => Math.min(pageCount, page + 1)); document.querySelector(".job-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Next</button>
        </nav>}
      </section>
      </div>
      {consentJob && <div className="matching-modal-backdrop" role="presentation">
        <section className="card matching-consent" role="dialog" aria-modal="true" aria-labelledby="matching-consent-title">
          <h2 id="matching-consent-title">Allow AI analysis?</h2>
          <p>To generate an AI explanation, relevant profile and CV-derived information is processed by the backend’s configured AI provider. Contact details and raw CV text are excluded. Regular accounts use Groq; staff accounts use local Ollama. The compatibility score remains deterministic.</p>
          <label><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /> I agree to this one-time AI analysis.</label>
          <div><button className="secondary" onClick={() => setConsentJob(null)}>Cancel</button><button className="primary" disabled={!consented || Boolean(busy)} onClick={() => void analyze(consentJob, true)}>Continue</button></div>
        </section>
      </div>}
    </div>
  );
}

function JobDetailsPage({ source, sourceId, initialJob, recommendation, goBack, backLabel, openMatch }: {
  source: string | null;
  sourceId: string | null;
  initialJob: JobSnapshot | null;
  recommendation: JobRecommendation | null;
  goBack: () => void;
  backLabel: string;
  openMatch: (id: number) => void;
}) {
  const [job, setJob] = useState<JobSnapshot | null>(initialJob);
  const [loading, setLoading] = useState(!initialJob);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    if (initialJob || !source || !sourceId) { setJob(initialJob); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError("");
    const hints = new URLSearchParams(window.location.search);
    const terms = [sourceId, hints.get("title") ?? "", hints.get("company") ?? ""].filter(Boolean);
    searchJobs(terms).then((jobs) => {
      if (!active) return;
      const found = jobs.find((candidate) => candidate.source === source && candidate.source_id === sourceId);
      if (found) { setJob(found); cacheSelectedJob(found); }
      else setError("This job listing is no longer available or has expired.");
    }).catch((reason) => { if (active) setError(apiMessage(reason, "Could not load this job listing.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source, sourceId, initialJob]);
  const analyze = async (withAi = false) => {
    if (!job) return;
    setBusy(true); setError("");
    try { const match = await analyzeJob(job, withAi ? { include_ai: true, external_ai_consent: true } : undefined); openMatch(match.id); }
    catch (reason) { setError(apiMessage(reason, "Could not analyze this job.")); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!job) return;
    setBusy(true); setError(""); setNotice("");
    try { await saveApplication(job); setNotice("Job saved to your applications."); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 409) setNotice("This job is already in your applications."); else setError(apiMessage(reason, "Could not save this job.")); }
    finally { setBusy(false); }
  };
  if (loading) return <main className="page-content"><p role="status">Loading job details…</p></main>;
  if (!job) return <main className="page-content job-details-page"><button className="secondary" onClick={goBack}>← Back to {backLabel}</button><section className="card job-details-unavailable"><h2>Job listing unavailable</h2><p>{error || "This job listing could not be found."}</p><button className="primary" onClick={goBack}>Back to {backLabel}</button></section></main>;
  const employment = Array.isArray(job.employment_type) ? job.employment_type.join(", ") : job.employment_type;
  return <main className="page-content job-details-page">
    <button className="secondary job-details-back" onClick={goBack}>← Back to {backLabel}</button>
    {error && <p className="matching-alert" role="alert">{error}</p>}{notice && <p className="matching-notice" role="status">{notice}</p>}
    <article className="card job-details-card">
      <header><div><h1>{job.title}</h1><p className="job-details-company">{job.company || "Company not listed"}</p></div><CompanyLogo letter={(job.company || job.title).slice(0, 1).toUpperCase()} color="#635bff" /></header>
      <dl className="job-details-meta">
        {job.location && <div><dt>Location</dt><dd>{job.location}</dd></div>}
        {job.remote === true && <div><dt>Work mode</dt><dd>Remote</dd></div>}
        {job.salary_text && <div><dt>Salary</dt><dd>{job.salary_text}</dd></div>}
        {employment && <div><dt>Employment type</dt><dd>{employment}</dd></div>}
        <div><dt>Experience level</dt><dd>{experienceLabel(job, recommendation ?? undefined)}</dd></div>
        {job.published_at && <div><dt>Published</dt><dd>{new Date(job.published_at).toLocaleDateString()}</dd></div>}
        <div><dt>Source</dt><dd>{job.source}</dd></div>
      </dl>
      {recommendation && <section className="job-details-recommendation"><h2>Your recommendation</h2><p><strong>{scoreText(recommendation.overall_score)} match</strong></p><p>{recommendation.explanation}</p>{recommendation.matching_skills.length > 0 && <><h3>Matching skills</h3><div>{recommendation.matching_skills.map((skill) => <Pill key={skill} tone="success">{skill}</Pill>)}</div></>}{recommendation.missing_skills.length > 0 && <><h3>Skills to develop</h3><div>{recommendation.missing_skills.map((skill) => <Pill key={skill}>{skill}</Pill>)}</div></>}{recommendation.requirements.length > 0 && <><h3>Requirements</h3><ul>{recommendation.requirements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></>}{recommendation.strengths.length > 0 && <><h3>Strengths</h3><ul>{recommendation.strengths.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></>}{recommendation.weaknesses.length > 0 && <><h3>Areas to address</h3><ul>{recommendation.weaknesses.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></>}{recommendation.recommendations.length > 0 && <><h3>Suggestions</h3><ul>{recommendation.recommendations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></>}</section>}
      {job.tags.length > 0 && <section className="job-details-skills"><h2>Skills and tags</h2><div>{job.tags.map((tag, index) => <Pill key={`${tag}-${index}`}>{tag}</Pill>)}</div></section>}
      <section className="job-details-description"><h2>Full description</h2><div>{job.description || "No description was provided by the source."}</div></section>
      <footer className="job-details-actions">
        <button className="primary" disabled={busy} onClick={() => void analyze()}>{busy ? "Working…" : "Analyze match"}</button>
        <button className="secondary" disabled={busy} onClick={() => void save()}>Save to applications</button>
        <button className="matching-ai-button" disabled={busy} onClick={() => { setConsented(false); setShowConsent(true); }}>Analyze with AI</button>
        {job.url && <a className="matching-link" href={job.url} target="_blank" rel="noreferrer">Open original posting</a>}
      </footer>
    </article>
    {showConsent && <div className="matching-modal-backdrop" role="presentation"><section className="card matching-consent" role="dialog" aria-modal="true" aria-labelledby="job-ai-consent-title">
      <h2 id="job-ai-consent-title">Allow AI analysis?</h2>
      <p>Relevant profile and CV-derived information may be processed by the backend's configured AI provider. Contact details and raw CV text are excluded. The compatibility score remains deterministic.</p>
      <label><input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /> I agree to this one-time AI analysis.</label>
      <div><button className="secondary" onClick={() => setShowConsent(false)}>Cancel</button><button className="primary" disabled={!consented || busy} onClick={() => { setShowConsent(false); void analyze(true); }}>Continue</button></div>
    </section></div>}
  </main>;
}

function RecommendationsPage({ openMatch, openJob }: { openMatch: (id: number) => void; openJob: (job: JobSnapshot, recommendation?: JobRecommendation, fromPage?: "discover" | "recommendations") => void }) {
  const [results, setResults] = useState<Awaited<ReturnType<typeof getRecommendations>>["results"]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [saved, setSaved] = useState("");
  const load = async (requestedPage = page, forceRefresh = false) => {
    setLoading(true); setError("");
    try {
      const data = await getRecommendations(requestedPage, forceRefresh);
      setResults(data.results); setTotalCount(data.count); setDetail(data.detail ?? ""); setNext(data.next ?? null); setPrevious(data.previous ?? null); setWarnings(data.warnings ?? []); setPage(requestedPage);
    } catch (reason) { setError(apiMessage(reason, "Could not load recommendations.")); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { void load(1); }, []);
  const analyze = async (job: JobSnapshot) => {
    setBusy(jobIdentity(job));
    setError("");
    try { const result = await analyzeJob(job); openMatch(result.id); }
    catch (reason) { setError(apiMessage(reason, "Could not analyze this recommendation.")); }
    finally { setBusy(""); }
  };
  const save = async (job: JobSnapshot) => {
    setBusy(`save:${jobIdentity(job)}`); setError(""); setSaved("");
    try { await saveApplication(job); setSaved("Job saved to your applications."); }
    catch (reason) { setError(apiMessage(reason, "Could not save this job.")); }
    finally { setBusy(""); }
  };
  return <div className="page-content matching-page"><div className="page-heading"><div><h2>Recommended jobs</h2><p>Globally ranked across multiple pages of discovered listings using your profile.</p></div><button className="secondary" disabled={loading} onClick={() => { setRefreshing(true); void load(1, true); }}>{refreshing ? "Refreshing…" : "Refresh recommendations"}</button></div>
    {error && <p className="matching-alert" role="alert">{error}</p>}{detail && <p className="matching-notice">{detail}</p>}{warnings.length > 0 && <p className="matching-notice">Some job sources were unavailable: {warnings.join(", ")}.</p>}{saved && <p className="matching-notice" role="status">{saved}</p>}
    {loading ? <div className="card matching-empty">Loading recommendations…</div> : results.length === 0 ? <div className="card matching-empty">{detail || "No relevant recommendations are available right now."}</div> : <><div className="matching-results">{results.map((item) => <article className="card matching-result-card recommendation-job-card" key={jobIdentity(item.job)} tabIndex={0} role="link" aria-label={`View details for ${item.job.title}`} onClick={(event) => { if ((event.target as HTMLElement).closest("button, a, input, label")) return; openJob(item.job, item, "recommendations"); }} onKeyDown={(event) => { if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); openJob(item.job, item, "recommendations"); }}><div><h3>{item.job.title}</h3><p>{item.job.company || "Company not listed"} · {item.job.location || "Location not listed"}</p><Pill>{experienceLabel(item.job, item)}</Pill><p>{item.explanation}</p></div><strong>{scoreText(item.overall_score)}</strong><div className="matching-tags">{item.matching_skills.map((skill) => <Pill key={skill} tone="success">{skill}</Pill>)}</div><div className="matching-card-actions"><button className="secondary" onClick={() => openJob(item.job, item, "recommendations")}>View details</button>{item.job.url && <a className="matching-link" href={item.job.url} target="_blank" rel="noreferrer">Original listing</a>}<button className="secondary" disabled={Boolean(busy)} onClick={() => void save(item.job)}>Save job</button><button className="primary" disabled={Boolean(busy)} onClick={() => void analyze(item.job)}>{busy === jobIdentity(item.job) ? "Analyzing…" : "Analyze details"}</button></div></article>)}</div><div className="matching-pagination"><button className="secondary" disabled={!previous || loading} onClick={() => void load(page - 1)}>Previous</button><span>Page {page} · {totalCount} jobs</span><button className="secondary" disabled={!next || loading} onClick={() => void load(page + 1)}>Next</button></div></>}
  </div>;
}

function MatchHistoryPage({ openMatch }: { openMatch: (id: number) => void }) {
  const [response, setResponse] = useState<Awaited<ReturnType<typeof getMatchHistory>> | null>(null);
  const [page, setPage] = useState(1);
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async (nextPage = page) => {
    setLoading(true); setError("");
    try { setResponse(await getMatchHistory({ page: nextPage, page_size: 20, min_score: minimum || undefined, max_score: maximum || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, status: status || undefined })); setPage(nextPage); }
    catch (reason) { setError(apiMessage(reason, "Could not load match history.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);
  return <div className="page-content matching-page"><div className="page-heading"><div><h2>Match history</h2><p>Previously analyzed jobs, including recalculated versions.</p></div></div>
    <form className="matching-filters" onSubmit={(event) => { event.preventDefault(); void load(1); }}><label>Minimum score <input type="number" min="0" max="100" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></label><label>Maximum score <input type="number" min="0" max="100" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></label><label>From <input type="datetime-local" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label>To <input type="datetime-local" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label>Application status <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Any status</option>{["saved", "applied", "assessment", "interview", "offer", "rejected", "withdrawn"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><button className="secondary">Apply filters</button></form>
    {error && <p className="matching-alert" role="alert">{error}</p>}
    {loading ? <div className="card matching-empty">Loading match history…</div> : !response?.results.length ? <div className="card matching-empty">No saved match results yet. Analyze a job to start your history.</div> : <><div className="matching-results">{response.results.map((match) => <button className="card matching-history-row" key={match.id} onClick={() => openMatch(match.id)}><span><b>{match.job.title}</b><small>{match.job.company || "Company not listed"} · {new Date(match.created_at).toLocaleDateString()}</small></span><strong>{scoreText(match.overall_score)}</strong><span>{match.recalculated_from_id ? `Refresh of #${match.recalculated_from_id}` : `Match #${match.id}`}</span></button>)}</div><div className="matching-pagination"><button className="secondary" disabled={!response.previous || loading} onClick={() => void load(page - 1)}>Previous</button><span>{response.count} results</span><button className="secondary" disabled={!response.next || loading} onClick={() => void load(page + 1)}>Next</button></div></>}
  </div>;
}

function MatchDetailPage({ id, goMatch, goHistory }: { id: number | null; goMatch: (id: number) => void; goHistory: () => void }) {
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (id === null) { setLoading(false); setError("Choose a saved match from Match History."); return; }
    let active = true;
    setLoading(true);
    getMatch(id).then((result) => { if (active) setMatch(result); })
      .catch((reason) => { if (active) setError(apiMessage(reason, "Could not load match details.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  const refresh = async () => {
    if (!match) return;
    setRefreshing(true); setError("");
    try { const updated = await refreshMatch(match.id); setMatch(updated); goMatch(updated.id); }
    catch (reason) { setError(apiMessage(reason, "Could not refresh this analysis.")); }
    finally { setRefreshing(false); }
  };
  const saveJob = async () => {
    if (!match || match.application_id) return;
    setSaving(true); setError(""); setSaveMessage("");
    try { await saveApplication(match.job); setSaveMessage("Job saved to your applications."); }
    catch (reason) { setSaveMessage(apiMessage(reason, "Could not save this job.")); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="page-content matching-page"><div className="card matching-empty">Loading match details…</div></div>;
  if (error && !match) return <div className="page-content matching-page"><p className="matching-alert" role="alert">{error}</p></div>;
  if (!match) return null;
  const categoryNames: Record<keyof MatchResult["categories"], string> = { skills: "Skills", technologies: "Preferred technologies", experience: "Experience and education", position: "Position relevance", location_preferences: "Location and work preferences", salary: "Salary and employment" };
  return <div className="page-content matching-page"><button className="back" onClick={goHistory}>? Match History</button>
    {error && <p className="matching-alert" role="alert">{error}</p>}
    <section className="card matching-detail-header"><div><p>{match.job.company || "Company not listed"} · {match.job.location || "Location not listed"}</p><h2>{match.job.title}</h2><span>Analyzed {new Date(match.created_at).toLocaleString()} · Algorithm {match.algorithm_version}</span></div><strong>{scoreText(match.overall_score)}<small> compatibility estimate</small></strong></section>
    <p className="matching-notice">{match.estimate_notice}</p>
    {match.reused && match.ai_status === "not_requested" && <p className="matching-notice">An existing deterministic result was reused. The backend did not run a new AI analysis for this request.</p>}
    <section className="card matching-section"><h3>Compatibility</h3><div className="matching-categories">{(Object.keys(categoryNames) as Array<keyof MatchResult["categories"]>).map((key) => <div key={key}><span>{categoryNames[key]}</span><strong>{scoreText(match.categories[key]?.score)}</strong>{categoryDetails(key, match.categories[key]).map((item) => <small key={item}>{item}</small>)}</div>)}</div></section>
    <div className="matching-detail-grid"><section className="card matching-section"><h3>Skills and requirements</h3><h4>Matching skills</h4><div className="matching-tags">{match.matching_skills.length ? match.matching_skills.map((skill) => <Pill tone="success" key={skill}>{skill}</Pill>) : <span>None identified</span>}</div><h4>Missing skills</h4><div className="matching-tags">{match.missing_skills.length ? match.missing_skills.map((skill) => <Pill tone="warning" key={skill}>{skill}</Pill>) : <span>None identified</span>}</div><h4>Job requirements</h4><div className="matching-tags">{match.requirements.length ? match.requirements.map((skill) => <Pill key={skill}>{skill}</Pill>) : <span>No explicit requirements identified</span>}</div></section>
      <section className="card matching-section"><h3>Analysis</h3><p>{match.explanation}</p><h4>Strengths</h4><ul>{match.strengths.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul><h4>Areas to address</h4><ul>{match.weaknesses.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul><h4>Recommendations</h4><ul>{match.recommendations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul><p className="matching-ai-status">AI analysis: {match.ai_status === "completed" ? "completed" : match.ai_status === "unavailable" ? "unavailable; deterministic match is shown" : "not requested"}</p>{match.ai_explanation && <p>{match.ai_explanation}</p>}</section></div>
    <div className="matching-card-actions"><button className="secondary" disabled={refreshing} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : "Refresh deterministic analysis"}</button>{!match.application_id && <button className="secondary" disabled={saving} onClick={() => void saveJob()}>{saving ? "Saving…" : "Save job to applications"}</button>}{match.job.url && <a className="matching-link" href={match.job.url} target="_blank" rel="noreferrer">Open original listing</a>}</div>
    {saveMessage && <p className="matching-notice" role="status">{saveMessage}</p>}
    {match.job.description && <details className="card matching-description"><summary>Job description</summary><p>{match.job.description}</p></details>}
  </div>;
}

function ApplicationsPage({ openMatch }: { openMatch: (id: number) => void }) {
  const [response, setResponse] = useState<Awaited<ReturnType<typeof getApplications>> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const load = async (nextPage = page) => {
    setLoading(true); setError("");
    try { setResponse(await getApplications(nextPage)); setPage(nextPage); }
    catch (reason) { setError(apiMessage(reason, "Could not load applications.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, []);
  const analyze = async (application: SavedApplication) => {
    setBusy(application.id); setError("");
    try { const result = await analyzeApplication(application.id); openMatch(result.id); }
    catch (reason) { setError(apiMessage(reason, "Could not analyze this saved application.")); }
    finally { setBusy(null); }
  };
  return <div className="page-content applications-page"><div className="page-heading"><div><h2>Your applications</h2><p>Saved opportunities from your backend account.</p></div></div>
    {error && <p className="matching-alert" role="alert">{error}</p>}
    {loading ? <div className="card matching-empty">Loading applications…</div> : !response?.results.length ? <div className="card matching-empty">No saved applications yet. Save a job from Discover Jobs to track it here.</div> : <><div className="matching-results">{response.results.map((application) => <article className="card application-match-row" key={application.id}><div><h3>{application.title}</h3><p>{application.company || "Company not listed"} · {application.location || "Location not listed"}</p><Pill>{experienceLabel({ experience_level: application.experience_level })}</Pill> <Pill>{application.status}</Pill></div><div className="matching-card-actions"><button className="primary" disabled={busy !== null} onClick={() => void analyze(application)}>{busy === application.id ? "Analyzing…" : "Analyze saved job"}</button>{application.url && <a className="matching-link" href={application.url} target="_blank" rel="noreferrer">Original listing</a>}</div></article>)}</div><div className="matching-pagination"><button className="secondary" disabled={!response.previous || loading} onClick={() => void load(page - 1)}>Previous</button><span>{response.count} applications</span><button className="secondary" disabled={!response.next || loading} onClick={() => void load(page + 1)}>Next</button></div></>}
  </div>;
}

const roleSuggestions = ["Full-Stack Developer", "Frontend Developer", "Backend Developer", "Web Developer", "Software Engineer", "Junior Software Developer", ".NET Developer", "C# Developer", "Python Developer", "Java Developer", "JavaScript Developer", "TypeScript Developer", "React Developer", "React Native Developer", "Mobile Developer", "Android Developer", "iOS Developer", "DevOps Engineer", "Cloud Engineer", "AI Engineer", "Machine Learning Engineer", "Data Engineer", "Data Analyst", "QA Engineer", "Automation Tester", "Game Developer", "Unity Developer", "C++ Developer", "System Administrator", "IT Support Engineer"];
const skillSuggestions = ["C#", "C++", "Python", "Java", "JavaScript", "TypeScript", "Kotlin", "Swift", "Go", "PHP", "SQL", "HTML", "CSS", "React", "React Native", "Angular", "Vue.js", "Next.js", "Redux", "Responsive Design", "ASP.NET Core", "Django", "Node.js", "REST API", "GraphQL", "Entity Framework Core", "Dapper", "Authentication", "Microservices", "PostgreSQL", "MySQL", "Microsoft SQL Server", "SQLite", "MongoDB", "Redis", "Azure Cosmos DB", "Docker", "Kubernetes", "Azure", "AWS", "CI/CD", "GitHub Actions", "Azure DevOps", "Linux", "Git", "Terraform", "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow", "Pandas", "NumPy", "LLM Integration", "Prompt Engineering", "OOP", "Data Structures", "Algorithms", "Unit Testing", "Integration Testing", "Agile", "Scrum", "Debugging", "Problem Solving"];
const languageSuggestions = ["English", "Czech", "Ukrainian", "Russian", "German", "Polish", "French", "Spanish"];
const employmentTypeSuggestions = ["full-time", "part-time", "contract", "internship", "temporary", "freelance"];
const locationSuggestions = ["Prague", "Brno", "Ostrava", "Berlin", "Munich", "Hamburg", "Frankfurt", "Vienna", "Warsaw", "Kraków", "Amsterdam", "Rotterdam", "London", "Dublin", "Paris", "Barcelona", "Madrid", "Lisbon", "Stockholm", "Copenhagen", "Helsinki", "Tallinn", "Wrocław", "Czechia", "Ukraine", "Germany", "Austria", "Poland", "Netherlands", "United Kingdom", "Ireland", "France", "Spain", "Portugal", "Sweden", "Denmark", "Finland", "Estonia"];

function TagAutocomplete({ label, values, onChange, suggestions, hint }: { label: string; values: string[]; onChange: (values: string[]) => void; suggestions: string[]; hint?: string }) {
  const [input, setInput] = useState("");
  const [active, setActive] = useState(-1);
  const options = suggestions.filter((suggestion) => suggestion.toLowerCase().includes(input.trim().toLowerCase()) && !values.some((value) => value.toLowerCase() === suggestion.toLowerCase())).slice(0, 8);
  const add = (raw: string) => {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setInput(""); setActive(-1);
  };
  return <div className="field profile-tag-field"><span>{label}</span><div className="profile-tag-control"><div className="profile-tag-list">{values.map((value) => <span className="profile-tag" key={value}>{value}<button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>×</button></span>)}<input value={input} aria-label={label} aria-autocomplete="list" aria-expanded={Boolean(input && options.length)} aria-controls={`${label.toLowerCase().replace(/\s+/g, "-")}-suggestions`} placeholder={hint || "Type or choose a suggestion"} onChange={(event) => { setInput(event.target.value); setActive(-1); }} onKeyDown={(event) => { if (event.key === "ArrowDown" && options.length) { event.preventDefault(); setActive((index) => (index + 1) % options.length); } else if (event.key === "ArrowUp" && options.length) { event.preventDefault(); setActive((index) => index <= 0 ? options.length - 1 : index - 1); } else if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(event.key === "Enter" && active >= 0 ? options[active] : input); } else if (event.key === "Backspace" && !input && values.length) onChange(values.slice(0, -1)); else if (event.key === "Escape") { setInput(""); setActive(-1); } }} /></div>{input && options.length > 0 && <ul id={`${label.toLowerCase().replace(/\s+/g, "-")}-suggestions`} className="profile-tag-options" role="listbox">{options.map((option, index) => <li key={option}><button type="button" role="option" aria-selected={index === active} onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => add(option)}>{option}</button></li>)}</ul>}</div></div>;
}

function CandidateProfilePage({ go, user }: { go: (p: Page) => void; user: PublicUser }) {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [employmentPreferences, setEmploymentPreferences] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [educationInstitution, setEducationInstitution] = useState("");
  const [educationDegree, setEducationDegree] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [workPreferences, setWorkPreferences] = useState<Set<"remote" | "hybrid" | "onsite">>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");
  const [settingPrimary, setSettingPrimary] = useState<number | null>(null);

  useEffect(() => {
    getCandidateProfile().then((data) => {
      setProfile(data);
      setPositions(data.desired_positions);
      setSkills(data.skills);
      setTechnologies(data.preferred_technologies);
      setLanguages(data.languages.map((item) => item.language));
      setEmploymentPreferences(data.employment_preferences ?? []);
      setLocation(data.location);
      setSummary(data.summary);
      const years = data.experience.flatMap((item) => Object.values(item)).join(" ").match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)/i);
      setExperienceYears(years?.[1] ?? "");
      setEducationInstitution(data.education[0]?.institution ?? "");
      setEducationDegree(data.education[0]?.degree ?? "");
      setSalaryMin(data.salary_min ?? "");
      setSalaryMax(data.salary_max ?? "");
      setSalaryCurrency(data.salary_currency || "USD");
      setWorkPreferences(new Set(data.work_preferences));
      getResumes().then((items) => {
        setResumes(items);
      }).catch((reason) => setResumeMessage(apiMessage(reason, "Could not load your CVs.")));
    }).catch((reason) => setError(apiMessage(reason, "Could not load your profile.")))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const localErrors: Record<string, string> = {};
    if (experienceYears && (!Number.isFinite(Number(experienceYears)) || Number(experienceYears) < 0)) localErrors.experience = "Enter a valid, non-negative number of years.";
    if (salaryMin && Number(salaryMin) < 0) localErrors.salary_min = "Salary cannot be negative.";
    if (salaryMax && Number(salaryMax) < 0) localErrors.salary_max = "Salary cannot be negative.";
    if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) localErrors.salary_max = "Maximum salary must be at least the minimum salary.";
    if (salaryCurrency.length > 3) localErrors.salary_currency = "Currency must be 3 characters or fewer.";
    if (educationDegree.trim() && !educationInstitution.trim()) {
      localErrors.education = "Add the institution for the education entry.";
    }
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length) {
      setError("");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const currentYears = profile.experience.flatMap((item) => Object.values(item)).join(" ").match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)/i)?.[1] ?? "";
    let experienceData = profile.experience;
    if (experienceYears.trim() && experienceYears.trim() !== currentYears) {
      const first = profile.experience[0];
      const oldDescription = typeof first?.description === "string" ? first.description : "";
      const description = oldDescription.match(/\d+(?:\.\d+)?\s*\+?\s*(?:years|yrs)/i)
        ? oldDescription.replace(/\d+(?:\.\d+)?\s*\+?\s*(?:years|yrs)/i, `${experienceYears.trim()} years`)
        : [oldDescription, `${experienceYears.trim()} years of experience`].filter(Boolean).join(". ");
      experienceData = first
        ? [{ ...first, description }, ...profile.experience.slice(1)]
        : [{ title: "Professional experience", description }];
    }
    const educationData = educationInstitution.trim()
      ? profile.education.length
        ? [{ ...profile.education[0], institution: educationInstitution.trim(), degree: educationDegree.trim() }, ...profile.education.slice(1)]
        : [{ institution: educationInstitution.trim(), degree: educationDegree.trim() }]
      : profile.education;
    try {
      const updated = await updateCandidateProfile({
        desired_positions: positions,
        skills,
        preferred_technologies: technologies,
        location,
        summary,
        experience: experienceData,
        education: educationData,
        languages: languages.map((language) => ({ language, proficiency: profile.languages.find((item) => item.language.toLowerCase() === language.toLowerCase())?.proficiency ?? "" })),
        work_preferences: [...workPreferences],
        employment_preferences: employmentPreferences as CandidateProfile["employment_preferences"],
        salary_min: salaryMin || null,
        salary_max: salaryMax || null,
        salary_currency: salaryCurrency,
      });
      setProfile(updated);
      setMessage("Profile saved. Recommendations and match scores now use these preferences.");
    } catch (reason) {
      const serverErrors = apiFieldErrors(reason);
      setFieldErrors(serverErrors);
      setError(Object.keys(serverErrors).length ? "" : apiMessage(reason, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  const toggleWork = (value: "remote" | "hybrid" | "onsite") => setWorkPreferences((current) => {
    const next = new Set(current);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
  const choosePrimaryResume = async (id: number) => {
    setSettingPrimary(id);
    setResumeMessage("");
    try {
      const updated = await setPrimaryResume(id);
      setResumes((items) => items.map((item) => ({ ...item, is_primary: item.id === updated.id })));
      setResumeMessage("Primary CV updated. Future match requests will use it.");
    } catch (reason) {
      setResumeMessage(apiMessage(reason, "Could not change the primary CV."));
    } finally {
      setSettingPrimary(null);
    }
  };

  if (loading) return <div className="page-content matching-page"><div className="card matching-empty">Loading your profile…</div></div>;
  if (!profile) return <div className="page-content matching-page"><p className="matching-alert" role="alert">{error || "Log in to view your profile."}</p></div>;
  return <div className="page-content matching-page"><div className="page-heading"><div><h2>Candidate profile</h2><p>These profile details are used by the backend matching service. Your primary parsed CV is included automatically.</p></div></div>
    <section className="card matching-section account-details"><h3>Account</h3><p><b>Email:</b> <span className="account-email" title={user.email}>{user.email || "Not provided"}</span></p><p><b>Member since:</b> {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "Not provided"}</p></section>
    {error && <FormNotice kind="error" message={error} />}{message && <FormNotice kind="success" message={message} />}
    <form className="card profile-editor" onChangeCapture={() => { if (error) setError(""); }} onSubmit={save}>
      <div className="profile-editor-grid">
        <TagAutocomplete label="Desired positions" values={positions} onChange={setPositions} suggestions={roleSuggestions} hint="Type a role and press Enter" />
        <TagAutocomplete label="Skills" values={skills} onChange={setSkills} suggestions={skillSuggestions} hint="Type a skill and press Enter" />
        <TagAutocomplete label="Preferred technologies" values={technologies} onChange={setTechnologies} suggestions={skillSuggestions} hint="Type a technology and press Enter" />
        <TagAutocomplete label="Languages" values={languages} onChange={setLanguages} suggestions={languageSuggestions} hint="Type a language and press Enter" />
        <TagAutocomplete label="Preferred employment types" values={employmentPreferences} onChange={setEmploymentPreferences} suggestions={employmentTypeSuggestions} hint="Choose full-time, contract, etc." />
        <label className="field"><span>Location</span><input list="profile-location-suggestions" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, country" /><datalist id="profile-location-suggestions">{locationSuggestions.map((value) => <option key={value} value={value} />)}</datalist></label>
        <label className={`field ${fieldErrors.experience ? "has-error" : ""}`}><span>Experience (years)</span><input type="number" min="0" step="0.5" value={experienceYears} aria-invalid={Boolean(fieldErrors.experience)} aria-describedby={fieldErrors.experience ? "profile-experience-error" : undefined} onChange={(event) => { setExperienceYears(event.target.value); setFieldErrors((previous) => ({ ...previous, experience: "" })); }} placeholder="e.g. 5" />{fieldErrors.experience && <small id="profile-experience-error" className="form-field-error">{fieldErrors.experience}</small>}</label>
        <label className={`field ${fieldErrors.education ? "has-error" : ""}`}><span>Education institution</span><input value={educationInstitution} aria-invalid={Boolean(fieldErrors.education)} aria-describedby={fieldErrors.education ? "profile-education-error" : undefined} onChange={(event) => { setEducationInstitution(event.target.value); setFieldErrors((previous) => ({ ...previous, education: "" })); }} placeholder="University or institution" />{fieldErrors.education && <small id="profile-education-error" className="form-field-error">{fieldErrors.education}</small>}</label>
        <label className="field"><span>Degree</span><input value={educationDegree} onChange={(event) => setEducationDegree(event.target.value)} placeholder="Bachelor of Computer Science" /></label>
        <label className={`field ${fieldErrors.salary_min ? "has-error" : ""}`}><span>Minimum salary</span><input type="number" min="0" value={salaryMin} aria-invalid={Boolean(fieldErrors.salary_min)} aria-describedby={fieldErrors.salary_min ? "profile-salary-min-error" : undefined} onChange={(event) => { setSalaryMin(event.target.value); setFieldErrors((previous) => ({ ...previous, salary_min: "", salary_max: "" })); }} />{fieldErrors.salary_min && <small id="profile-salary-min-error" className="form-field-error">{fieldErrors.salary_min}</small>}</label>
        <label className={`field ${fieldErrors.salary_max ? "has-error" : ""}`}><span>Maximum salary</span><input type="number" min="0" value={salaryMax} aria-invalid={Boolean(fieldErrors.salary_max)} aria-describedby={fieldErrors.salary_max ? "profile-salary-max-error" : undefined} onChange={(event) => { setSalaryMax(event.target.value); setFieldErrors((previous) => ({ ...previous, salary_max: "" })); }} />{fieldErrors.salary_max && <small id="profile-salary-max-error" className="form-field-error">{fieldErrors.salary_max}</small>}</label>
        <label className={`field ${fieldErrors.salary_currency ? "has-error" : ""}`}><span>Salary currency</span><input maxLength={3} value={salaryCurrency} aria-invalid={Boolean(fieldErrors.salary_currency)} aria-describedby={fieldErrors.salary_currency ? "profile-salary-currency-error" : undefined} onChange={(event) => { setSalaryCurrency(event.target.value.toUpperCase()); setFieldErrors((previous) => ({ ...previous, salary_currency: "" })); }} />{fieldErrors.salary_currency && <small id="profile-salary-currency-error" className="form-field-error">{fieldErrors.salary_currency}</small>}</label>
      </div>
      <label className="field profile-summary"><span>Professional summary</span><textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={4} /></label>
      <fieldset className="profile-work-modes"><legend>Work preferences</legend>{(["remote", "hybrid", "onsite"] as const).map((value) => <label key={value}><input type="checkbox" checked={workPreferences.has(value)} onChange={() => toggleWork(value)} />{value}</label>)}</fieldset>
      <button className="primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
    </form>
    <section className="card matching-section profile-resumes"><h3>Your CVs</h3>{resumeMessage && <p className="matching-notice" role="status">{resumeMessage}</p>}{resumes.length ? resumes.map((resume) => <div className="profile-resume-row" key={resume.id}><span><b>{resume.original_filename}</b><small>{resume.parse_status}{resume.is_primary ? " · Primary" : ""}</small></span>{!resume.is_primary && <button className="secondary" disabled={settingPrimary !== null} onClick={() => void choosePrimaryResume(resume.id)}>{settingPrimary === resume.id ? "Updating…" : "Set primary"}</button>}</div>) : <p>No CVs uploaded.</p>}<button className="secondary" onClick={() => go("upload")}>Upload a CV</button></section>
  </div>;
}

const titles: Partial<Record<Page, [string, string]>> = {
  dashboard: ["Dashboard", "Your job search at a glance"],
  discover: ["Discover Jobs", "Current public listings and compatibility estimates"],
  job: ["Job Details", "Full listing details from the original source"],
  applications: ["Applications", "Saved opportunities and match analysis"],
  recommendations: ["Recommendations", "Ranked roles from current job listings"],
  "match-history": ["Match History", "Your saved compatibility analyses"],
  "match-detail": ["Match Details", "Compatibility estimate and analysis"],
  profile: ["My Profile", "Keep your story accurate and up to date"],
  assistant: ["AI Assistant", "Your personal career copilot"],
  documents: ["Documents", "Resumes, cover letters, and more"],
  automation: ["Automation", "Rules, thresholds, and approvals"],
  integrations: ["Integrations", "Connect your favorite tools"],
};

function LegalInfoPage({ page, go }: { page: "terms" | "privacy"; go: (page: Page) => void }) {
  const isTerms = page === "terms";
  return <main className="auth-shell legal-page"><div className="auth-main"><div className="auth-mobile-logo"><Logo /></div><section className="card legal-content"><h1>{isTerms ? "Terms of Service" : "Privacy Policy"}</h1><p>The {isTerms ? "terms of service" : "privacy policy"} content has not been provided for this application yet.</p><p>This page is informational only. No agreement or acceptance is recorded here.</p><button className="primary" onClick={() => go("login")}>Return to sign in</button></section></div></main>;
}

export default function App() {
  const initialPage = window.location.pathname === "/" && window.location.hash
    ? pageFromHash(window.location.hash)
    : pageFromPath(window.location.pathname);
  const [page, setPage] = useState<Page>(initialPage);
  const initialJobRoute = jobRouteFromPath(window.location.pathname);
  const [selectedJob, setSelectedJob] = useState<JobSnapshot | null>(() => readCachedJob(initialJobRoute?.source ?? null, initialJobRoute?.sourceId ?? null));
  const [selectedRecommendation, setSelectedRecommendation] = useState<JobRecommendation | null>(() => readCachedRecommendation(initialJobRoute?.source ?? null, initialJobRoute?.sourceId ?? null));
  const [matchId, setMatchId] = useState<number | null>(() => matchIdFromPath(window.location.pathname));
  const [authState, setAuthState] = useState<"initializing" | "authenticated" | "unauthenticated">("initializing");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loginNotice, setLoginNotice] = useState("");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    let active = true;
    initializeAuthentication()
      .then(async (authenticated) => {
        if (!active) return;
        if (!authenticated) { setUser(null); setAuthState("unauthenticated"); return; }
        try {
          const currentUser = await getCurrentUser();
          if (active) { setUser(currentUser); setAuthState("authenticated"); }
        } catch {
          if (active) { setUser(null); setAuthState("unauthenticated"); }
        }
      })
      .catch(() => { if (active) setAuthState("unauthenticated"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const expireSession = () => { setUser(null); setAuthState("unauthenticated"); };
    window.addEventListener("jobpilot:session-expired", expireSession);
    return () => window.removeEventListener("jobpilot:session-expired", expireSession);
  }, []);

  useEffect(() => {
    if (authState === "initializing") return;
    const syncRoute = () => {
      const legacyHashRoute = window.location.pathname === "/" && Boolean(window.location.hash);
      const nextPage = legacyHashRoute ? pageFromHash(window.location.hash) : pageFromPath(window.location.pathname);
      const nextMatchId = legacyHashRoute ? matchIdFromHash(window.location.hash) : matchIdFromPath(window.location.pathname);
      const requestedPath = legacyHashRoute
        ? (nextMatchId !== null ? `/match/${nextMatchId}` : pathForPage(nextPage))
        : `${window.location.pathname}${window.location.search}`;
      if (authState === "authenticated" && isPublicPage(nextPage) && nextPage !== "auth-callback") {
        window.history.replaceState({}, "", "/discover");
        setPage("discover");
        setMatchId(null);
        return;
      }
      if (authState === "unauthenticated" && !isPublicPage(nextPage)) {
        const destination = requestedPath === "/" ? "/discover" : requestedPath;
        window.history.replaceState({}, "", `/login?next=${encodeURIComponent(destination)}`);
        setPage("login");
        setMatchId(null);
        return;
      }
      if (legacyHashRoute) window.history.replaceState({}, "", requestedPath);
      setPage(nextPage);
      setMatchId(nextMatchId);
      const jobRoute = jobRouteFromPath(window.location.pathname);
      setSelectedJob(readCachedJob(jobRoute?.source ?? null, jobRoute?.sourceId ?? null));
      setSelectedRecommendation(readCachedRecommendation(jobRoute?.source ?? null, jobRoute?.sourceId ?? null));
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, [authState]);

  const go = (p: Page) => {
    if (authState !== "authenticated" && !isPublicPage(p)) {
      const destination = pathForPage(p);
      window.history.pushState({}, "", `/login?next=${encodeURIComponent(destination)}`);
      setPage("login");
      setMatchId(null);
      setDrawer(false);
      return;
    }
    if (authState === "authenticated" && isPublicPage(p)) p = "discover";
    setPage(p);
    setMatchId(null);
    setSelectedJob(null);
    setSelectedRecommendation(null);
    setDrawer(false);
    window.history.pushState({}, "", pathForPage(p));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const completeLogin = (account: PublicUser, destinationOverride?: string) => {
    const requested = new URLSearchParams(window.location.search).get("next");
    let destination = destinationOverride ?? "/discover";
    if (!destinationOverride && requested) {
      try {
        const parsed = new URL(requested, window.location.origin);
        const requestedPage = pageFromPath(parsed.pathname);
        if (parsed.origin === window.location.origin && !isPublicPage(requestedPage)) {
          destination = `${parsed.pathname}${parsed.search}`;
        }
      } catch {
        destination = "/discover";
      }
    }
    window.history.replaceState({}, "", destination);
    const nextPage = pageFromPath(window.location.pathname);
    setPage(nextPage);
    setMatchId(matchIdFromPath(window.location.pathname));
    setAuthState("authenticated");
    setUser(account);
    setLoginNotice(destination === "/upload" ? "" : "Signed in successfully.");
    window.scrollTo({ top: 0 });
  };

  const openMatch = (id: number) => {
    setMatchId(id);
    setPage("match-detail");
    setSelectedJob(null);
    setSelectedRecommendation(null);
    setDrawer(false);
    window.history.pushState({}, "", `/match/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openJob = (job: JobSnapshot, recommendation?: JobRecommendation, fromPage: "discover" | "recommendations" = "discover") => {
    cacheSelectedJob(job, recommendation);
    setSelectedJob(job);
    setSelectedRecommendation(recommendation ?? null);
    setPage("job");
    setMatchId(null);
    setDrawer(false);
    window.history.pushState({ fromPage }, "", pathForJob(job.source, job.source_id, job.title, job.company));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const backToDiscovery = () => {
    if (window.history.state?.fromPage === "recommendations" || window.history.state?.fromPage === "discover" || window.history.state?.fromDiscovery) window.history.back();
    else go(selectedRecommendation ? "recommendations" : "discover");
  };
  const handleLogout = async () => {
    await logout().catch(() => undefined);
    clearOnboardingDraft();
    try {
      sessionStorage.removeItem("jobpilot:registration-email");
      sessionStorage.removeItem("jobpilot:registration-success");
      sessionStorage.removeItem("jobpilot:onboarding-complete");
    } catch { /* optional */ }
    setUser(null);
    setAuthState("unauthenticated");
    go("login");
  };

  if (authState === "initializing") {
    return <main className="auth-loading" role="status">Checking your session…</main>;
  }
  if ((authState === "authenticated" && isPublicPage(page) && page !== "auth-callback") || (authState === "unauthenticated" && !isPublicPage(page))) {
    return <main className="auth-loading" role="status">Loading your page…</main>;
  }
  const content = (
    {
      dashboard: user ? <Dashboard go={go} user={user} /> : null,
      discover: <JobSearchPage openMatch={openMatch} openJob={openJob} />,
      job: <JobDetailsPage source={jobRouteFromPath(window.location.pathname)?.source ?? null} sourceId={jobRouteFromPath(window.location.pathname)?.sourceId ?? null} initialJob={selectedJob} recommendation={selectedRecommendation} goBack={backToDiscovery} backLabel={selectedRecommendation ? "Recommendations" : "Discovery"} openMatch={openMatch} />,
      applications: <ApplicationsPage openMatch={openMatch} />,
      recommendations: <RecommendationsPage openMatch={openMatch} openJob={openJob} />,
      "match-history": <MatchHistoryPage openMatch={openMatch} />,
      "match-detail": <MatchDetailPage id={matchId} goMatch={openMatch} goHistory={() => go("match-history")} />,
      profile: <CandidateProfilePage go={go} user={user!} />,
      assistant: <AIChatPage />,
      documents: <Documents />,
      automation: <Automation go={go} />,
      integrations: <Integrations go={go} />,
    } as Partial<Record<Page, ReactNode>>
  )[page];
  if (page === "register") return <Register go={go} onComplete={() => { void getCurrentUser().then((account) => completeLogin(account, "/upload")).catch(() => go("login")); }} />;
  if (page === "upload") return <UploadCV go={go} />;
  if (page === "setup") return <ProfileSetup go={go} />;
  if (page === "preferences") return <Preferences go={go} />;
  if (page === "login") return <Login go={go} onLoginSuccess={(account) => completeLogin(account)} />;
  if (page === "auth-callback") return <GoogleOAuthCallback onSuccess={(account, destination) => completeLogin(account, destination)} />;
  if (page === "terms" || page === "privacy") return <LegalInfoPage page={page} go={go} />;
  if (!user) return <main className="auth-loading" role="status">Loading your account…</main>;
  const [title, subtitle] = titles[page] || ["JobPilot", ""];
  return (
    <div className="app-shell">
      <Sidebar page={page} go={go} onLogout={handleLogout} user={user} />
      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Logo />
              <button onClick={() => setDrawer(false)}>
                <Icon name="x" />
              </button>
            </div>
            {nav.map((n) => (
              <button className={page === n.id ? "active" : ""} onClick={() => go(n.id)} key={n.id}>
                <Icon name={n.icon} />
                {n.label}
              </button>
            ))}
            <button onClick={handleLogout}>
              <Icon name="logout" />
              Log out
            </button>
          </div>
        </div>
      )}
      <div className="main-shell">
        <Header title={title} subtitle={subtitle} onMenu={() => setDrawer(true)} user={user} onProfile={() => go("profile")} onLogout={handleLogout} onHome={() => go("dashboard")} />
        {loginNotice && <div className="page-content"><FormNotice kind="success" message={loginNotice} /></div>}
        {content}
      </div>
      <MobileNav page={page} go={go} />
    </div>
  );
}
