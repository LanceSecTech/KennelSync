/**
 * Removes seeded Riverbend data from the Supabase project in .env / .env.local.
 *
 * Safety:
 * - Requires DEMO_RESET_OK=yes
 * - Deletes kennel named SEED_KENNEL_NAME, then auth users whose emails are in the seed list
 *
 * Run: pnpm run seed:demo:reset
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allSeedAuthEmails, DEMO_STATE_FILE, SEED_KENNEL_NAME } from "./demo-seed-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadDotenv({ path: path.join(ROOT, ".env") });
loadDotenv({ path: path.join(ROOT, ".env.local"), override: true });

const DEMO_RESET_OK = process.env.DEMO_RESET_OK === "yes";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim() || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

type SeedState = {
  kennelId?: number;
  ownerId?: string;
  employeeIds?: string[];
  customerIds?: string[];
  seededEmails?: string[];
};

function assertGate() {
  if (!DEMO_RESET_OK) {
    console.error("Refusing to run: set DEMO_RESET_OK=yes (local/staging database only).");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
}

async function main() {
  assertGate();

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const statePath = path.join(ROOT, DEMO_STATE_FILE);
  let state: SeedState = {};
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, "utf-8")) as SeedState;
    } catch {
      console.warn("[reset] Could not parse state file; continuing with kennel name + email list.");
    }
  }

  let kennelId: number | null = typeof state.kennelId === "number" ? state.kennelId : null;
  if (kennelId == null) {
    const { data: row } = await db.from("kennels").select("id").eq("name", SEED_KENNEL_NAME).maybeSingle();
    if (row?.id != null) kennelId = row.id as number;
  }

  if (kennelId != null) {
    const { error: delK } = await db.from("kennels").delete().eq("id", kennelId);
    if (delK) {
      console.error("[reset] Failed to delete kennel:", delK.message);
      process.exit(1);
    }
    console.log(`[reset] Deleted kennel id=${kennelId} (“${SEED_KENNEL_NAME}”) and dependent rows.`);
  } else {
    console.log("[reset] No matching kennel row (already removed or never seeded).");
  }

  const legacyKennelNames = ["Riverbend Pet Lodge & Daycare"] as const;
  for (const legacyName of legacyKennelNames) {
    const { data: leg } = await db.from("kennels").select("id").eq("name", legacyName).maybeSingle();
    if (leg?.id != null) {
      const { error: e } = await db.from("kennels").delete().eq("id", leg.id);
      if (e) console.warn(`[reset] Legacy kennel “${legacyName}”:`, e.message);
      else console.log(`[reset] Deleted legacy kennel “${legacyName}” (id=${leg.id}).`);
    }
  }

  const emailList = [...new Set([...(state.seededEmails ?? []), ...allSeedAuthEmails()])];
  const { data: seededUsers, error: listErr } = await db.from("users").select("id,email").in("email", emailList);
  if (listErr) {
    console.error("[reset] Could not list seeded users:", listErr.message);
    process.exit(1);
  }

  const { data: legacyDomainUsers } = await db
    .from("users")
    .select("id,email")
    .like("email", "%@demo-riverbend.io");

  const merged = [...(seededUsers ?? []), ...(legacyDomainUsers ?? [])];
  const ids = [...new Set(merged.map((u: { id: string }) => u.id))];
  if (ids.length === 0) {
    console.log("[reset] No public.users rows matched the seed email list or legacy domain.");
  }

  for (const id of ids) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error) {
      console.warn(`[reset] auth.deleteUser ${id}:`, error.message);
    } else {
      const u = merged.find((x: { id: string }) => x.id === id);
      console.log(`[reset] Removed auth user ${u?.email ?? id}`);
    }
  }

  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
    console.log(`[reset] Removed ${DEMO_STATE_FILE}`);
  }

  console.log("\n[reset] Done. You can run seed:demo again.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
