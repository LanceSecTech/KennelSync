import fs from "node:fs";
import path from "node:path";

/** Subdomain before `.supabase.co` — stable project identity for logs (no secrets). */
function supabaseRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function databaseUrlHostHint(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}`;
  } catch {
    return "(could not parse)";
  }
}

/**
 * Temporary dev-only diagnostics: which Supabase URL / DB hints the Node server sees.
 * Remove or gate when no longer needed.
 */
export function logDevBackendSupabaseEnv(): void {
  if (process.env.NODE_ENV === "production") return;

  const cwd = process.cwd();
  const dotEnv = path.join(cwd, ".env");
  const dotEnvLocal = path.join(cwd, ".env.local");

  console.info(
    "[dev-env][server] dotenv/config loads `.env` only at process start — `.env.local` is NOT auto-loaded for Node.",
  );
  console.info(
    "[dev-env][server] Files present: .env=%s .env.local=%s",
    fs.existsSync(dotEnv),
    fs.existsSync(dotEnvLocal),
  );

  const backendUrl = process.env.VITE_SUPABASE_URL ?? "";
  console.info("[dev-env][server] Backend Supabase URL (process.env.VITE_SUPABASE_URL):", backendUrl || "(empty)");
  const ref = supabaseRefFromUrl(backendUrl);
  if (ref) {
    console.info("[dev-env][server] Backend Supabase project ref (from URL):", ref);
  }

  console.info(
    "[dev-env][server] SUPABASE_SERVICE_ROLE_KEY:",
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "set (value hidden)" : "missing",
  );

  const db = process.env.DATABASE_URL;
  console.info(
    "[dev-env][server] DATABASE_URL:",
    db ? `present — host ${databaseUrlHostHint(db)}` : "missing",
  );
}
