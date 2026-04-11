export type AppRole = "customer" | "employee" | "owner";

export type OnboardingState = {
  role: AppRole;
  step: number;
  completed: boolean;
  updatedAt: string;
  data: Record<string, unknown>;
};

const VERSION = "v2";

/** Step progress only; completion is stored in `users.onboarding_completed` (see `auth.completeOnboarding`). */

function keyForUser(userId: string) {
  return `kennelsync_onboarding_${VERSION}_${userId}`;
}

export function getOnboardingState(userId: string): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyForUser(userId));
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

export function saveOnboardingState(userId: string, state: OnboardingState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyForUser(userId), JSON.stringify(state));
}

export function clearOnboardingState(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(keyForUser(userId));
}
