import { Capacitor } from "@capacitor/core";

/** True when running inside the native Capacitor shell (iOS/Android), not the browser. */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Fallback when `@capacitor/core` mis-detects (e.g. stale bundle): WebView URL or UA hints.
 * Not used for security—only to pick native vs browser UI routing.
 */
export function isLikelyCapacitorWebView(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.protocol;
  if (p === "capacitor:" || p === "ionic:") return true;
  if (typeof navigator !== "undefined" && /Capacitor/i.test(navigator.userAgent)) {
    return true;
  }
  return false;
}

/** Native shell OR strong WebView hints (covers detection gaps). */
export function isNativeAppClient(): boolean {
  return isCapacitorNative() || isLikelyCapacitorWebView();
}

/** Direct read for debug overlay (may differ if `isNativeAppClient` uses fallbacks). */
export function readCapacitorIsNativePlatformApi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** `ios` | `android` | `web` — for debug / diagnostics. */
export function getCapacitorPlatformLabel(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    return Capacitor.getPlatform();
  } catch {
    return "unknown";
  }
}
