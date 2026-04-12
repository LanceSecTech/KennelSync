import { useEffect, useState } from "react";
import { getCapacitorPlatformLabel } from "@/lib/capacitorPlatform";

export type NativeStartupDebugOverlayProps = {
  /** Router pathname (wouter). */
  pathname: string;
  /** True when using native routing (API + fallbacks). */
  nativeRoutingActive: boolean;
  /** `Capacitor.isNativePlatform()` only — may be false when fallbacks still say native. */
  capacitorApiNative: boolean;
  authLoading: boolean;
  userSessionExists: boolean;
  onboardingFlagRaw: string | null;
  routingDecision: string;
  viteApiUrl: string;
  fullHref: string;
};

/**
 * Temporary startup diagnostics for Capacitor. Top half of the screen, solid background;
 * bottom half stays clear so taps reach the app (outer wrapper is pointer-events-none).
 */
export function NativeStartupDebugOverlay(props: NativeStartupDebugOverlayProps) {
  const [hrefSnap, setHrefSnap] = useState(
    () => (typeof window !== "undefined" ? window.location.href : props.fullHref),
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      setHrefSnap(typeof window !== "undefined" ? window.location.href : "");
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  if (!props.nativeRoutingActive) return null;

  const platform = getCapacitorPlatformLabel();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[2147483000] flex flex-col justify-start"
      aria-hidden
      data-native-startup-debug-overlay
    >
      <div className="pointer-events-auto max-h-[min(52vh,520px)] min-h-[120px] overflow-y-auto border-b-4 border-amber-400 bg-zinc-950/96 px-3 py-2 text-[11px] leading-snug text-amber-50 shadow-xl">
        <p className="font-bold text-amber-300">Native startup debug (temporary)</p>
        <p className="mt-1 text-[10px] text-zinc-400">
          Updates href every 1s. Scroll if needed. Bottom of screen stays interactive.
        </p>
        <ul className="mt-2 space-y-1.5 break-all font-mono">
          <li>
            <span className="text-zinc-400">pathname (wouter):</span> {props.pathname}
          </li>
          <li>
            <span className="text-zinc-400">location.href (live):</span> {hrefSnap || props.fullHref}
          </li>
          <li>
            <span className="text-zinc-400">Capacitor.getPlatform():</span> {platform}
          </li>
          <li>
            <span className="text-zinc-400">Capacitor.isNativePlatform():</span>{" "}
            {props.capacitorApiNative ? "true" : "false"}
          </li>
          <li>
            <span className="text-zinc-400">native routing (API + UA/URL fallback):</span>{" "}
            {props.nativeRoutingActive ? "true" : "false"}
          </li>
          <li>
            <span className="text-zinc-400">auth loading:</span> {props.authLoading ? "true" : "false"}
          </li>
          <li>
            <span className="text-zinc-400">user session (auth.me):</span>{" "}
            {props.userSessionExists ? "yes" : "no"}
          </li>
          <li>
            <span className="text-zinc-400">localStorage hasCompletedOnboarding:</span>{" "}
            {props.onboardingFlagRaw === null ? "(unreadable)" : JSON.stringify(props.onboardingFlagRaw)}
          </li>
          <li>
            <span className="text-zinc-400">routing decision:</span>{" "}
            <span className="text-amber-200">{props.routingDecision}</span>
          </li>
          <li>
            <span className="text-zinc-400">import.meta.env.VITE_API_URL:</span>{" "}
            {props.viteApiUrl.trim() ? props.viteApiUrl : "(empty)"}
          </li>
        </ul>
      </div>
    </div>
  );
}
