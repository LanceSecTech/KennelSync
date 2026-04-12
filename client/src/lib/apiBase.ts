/**
 * Base URL for the KennelSync API (Railway in production, same-origin in unified dev).
 * Set VITE_API_URL in Vercel to your public Railway URL, e.g. https://your-app.up.railway.app
 * (no trailing slash). Omit for local dev when the Vite+Express server serves /api/trpc.
 *
 * Capacitor: VITE_API_URL must be set at **build time** (`vite build` / `cap sync`).
 * Relative `/api/trpc` resolves to `capacitor://localhost` and will not reach your API.
 */
import { getCapacitorPlatformLabel, isCapacitorNative } from "./capacitorPlatform";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === "") {
    return "";
  }
  return String(raw).replace(/\/$/, "");
}

let trpcUrlLogged = false;

/** Full URL for the tRPC HTTP batch endpoint (absolute when VITE_API_URL is set). */
export function getTrpcUrl(): string {
  const base = getApiBaseUrl();
  const native = typeof window !== "undefined" && isCapacitorNative();
  const url = base ? `${base}/api/trpc` : "/api/trpc";

  if (typeof window !== "undefined" && !trpcUrlLogged) {
    trpcUrlLogged = true;
    console.info("[KennelSync tRPC]", {
      isNativeCapacitor: native,
      "import.meta.env.VITE_API_URL": import.meta.env.VITE_API_URL,
      resolvedApiBase: base || "(empty — using same-origin path)",
      resolvedTrpcUrl: url,
      windowOrigin: window.location.origin,
    });
    if (native && !base) {
      console.error(
        "[KennelSync] Native app: VITE_API_URL is empty. tRPC is using a relative URL that points at the WebView origin, not your API. Set VITE_API_URL before building the iOS/Android bundle.",
      );
    }
  }

  return url;
}

export type TrpcDebugInfo = {
  capacitorNative: boolean;
  capacitorPlatform: string;
  viteApiUrlEnv: string;
  resolvedApiBase: string;
  trpcHttpUrl: string;
  windowOrigin: string;
  relativeTrpcWouldResolveTo: string;
};

/** Snapshot for on-screen debug (login / support). */
export function getTrpcDebugInfo(): TrpcDebugInfo {
  const base = getApiBaseUrl();
  const native = typeof window !== "undefined" && isCapacitorNative();
  const trpcHttpUrl = getTrpcUrl();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    capacitorNative: native,
    capacitorPlatform: typeof window !== "undefined" ? getCapacitorPlatformLabel() : "ssr",
    viteApiUrlEnv: String(import.meta.env.VITE_API_URL ?? ""),
    resolvedApiBase: base,
    trpcHttpUrl,
    windowOrigin: origin,
    relativeTrpcWouldResolveTo: origin ? `${origin}/api/trpc` : "",
  };
}
