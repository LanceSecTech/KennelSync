/**
 * Base URL for the KennelSync API (Railway in production, same-origin in unified dev).
 * Set VITE_API_URL in Vercel to your public Railway URL, e.g. https://your-app.up.railway.app
 * (no trailing slash). Omit for local dev when the Vite+Express server serves /api/trpc.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === "") {
    return "";
  }
  return String(raw).replace(/\/$/, "");
}

let trpcUrlLogged = false;

/** Full URL for the tRPC HTTP batch endpoint. */
export function getTrpcUrl(): string {
  const base = getApiBaseUrl();
  const url = base ? `${base}/api/trpc` : "/api/trpc";

  // Temporary: confirm Vercel/Railway URL wiring (remove after verified).
  if (typeof window !== "undefined" && !trpcUrlLogged) {
    trpcUrlLogged = true;
    console.info("[KennelSync tRPC]", {
      "import.meta.env.VITE_API_URL": import.meta.env.VITE_API_URL,
      resolvedTrpcUrl: url,
    });
  }

  return url;
}
