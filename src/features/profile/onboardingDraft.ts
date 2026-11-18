export interface OnboardingDraft {
  profile?: {
    title: string;
    years: string;
    headline: string;
    skills: string;
    location: string;
    workPreference: "remote" | "hybrid" | "onsite" | "";
  };
  preferences?: {
    roles: string;
    location: string;
    workPreferences: Array<"remote" | "hybrid" | "onsite">;
    salaryMin: string;
    salaryMax: string;
    currency: string;
  };
}

const STORAGE_KEY = "jobpilot:onboarding-draft";

export function readOnboardingDraft(): OnboardingDraft {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as OnboardingDraft : {};
  } catch {
    return {};
  }
}

export function saveOnboardingDraft(patch: OnboardingDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readOnboardingDraft(), ...patch }));
  } catch {
    // The API remains the durable store; drafts are a convenience for refreshes.
  }
}

export function clearOnboardingDraft(section?: keyof OnboardingDraft) {
  try {
    if (!section) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const draft = readOnboardingDraft();
    delete draft[section];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore unavailable session storage.
  }
}
