const STORAGE_KEY = "hasCompletedOnboarding";

/** Raw localStorage value for debug overlays (`null` if missing). */
export function readMobileOnboardingFlagRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function hasCompletedMobileAppOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setMobileAppOnboardingComplete(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    /* ignore quota / private mode */
  }
}
