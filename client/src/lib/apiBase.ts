/**
 * Base URL for the KennelSync API (Railway in production, same-origin in unified dev).
 * Set VITE_API_URL in Vercel to your public Railway URL, e.g. https://your-app.up.railway.app
 * (no trailing slash). Omit for local dev when the Vite+Express server serves /api/trpc.
 *
 * Capacitor: VITE_API_URL must be set at **build time** (`vite build` / `cap sync`).
 * Relative `/api/trpc` resolves to the WebView origin and will not reach your API.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === "") {
    return "";
  }
  return String(raw).replace(/\/$/, "");
}

/** Full URL for the tRPC HTTP batch endpoint (absolute when VITE_API_URL is set). */
export function getTrpcUrl(): string {
  const base = getApiBaseUrl();
  return base ? `${base}/api/trpc` : "/api/trpc";
}
