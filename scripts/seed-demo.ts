/**
 * Seeds realistic local/staging data into the Supabase project from .env / .env.local.
 *
 * Safety:
 * - Requires DEMO_SEED_OK=yes
 *
 * Run: pnpm run seed:demo
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  allSeedAuthEmails,
  CUSTOMER_ACCOUNTS,
  DEMO_STATE_FILE,
  OWNER_EMAIL,
  OWNER_NAME,
  SEED_KENNEL_NAME,
  STAFF_ACCOUNTS,
} from "./demo-seed-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

loadDotenv({ path: path.join(ROOT, ".env") });
loadDotenv({ path: path.join(ROOT, ".env.local"), override: true });

const DEMO_SEED_OK = process.env.DEMO_SEED_OK === "yes";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim() || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const SEED_PASSWORD =
  process.env.DEMO_SEED_PASSWORD?.trim() || "RiverbendLodge2026!";

const DOG_NAME_POOL = [
  "Maple",
  "Cooper",
  "Biscuit",
  "Luna",
  "Bear",
  "Willow",
  "Murphy",
  "Pepper",
  "Finn",
  "Ruby",
  "Oliver",
  "Sadie",
  "Winston",
  "Mabel",
  "Tucker",
  "Rosie",
  "Duke",
  "Stella",
  "Bentley",
  "Milo",
  "Zoey",
  "Charlie",
  "Harper",
  "Archie",
  "Nala",
  "George",
  "Ivy",
  "Teddy",
  "Penny",
  "Louie",
  "Scout",
  "Mocha",
  "Bailey",
  "Coco",
  "Gus",
] as const;

const FEEDING_SNIPPETS = [
  "Purina Pro Plan — 1 cup dry at 7 AM and 5 PM. Warm water on morning meal only.",
  "Fromm Gold — ¾ cup twice daily. Sensitive stomach; no table scraps or treats from staff.",
  "Royal Canin medium — 1⅓ cups split AM/PM. Slow feeder bowl in suite.",
  "Freshpet roll — half patty breakfast, half dinner. Keep refrigerated; staff has spare in freezer.",
  "Kibble from home (blue bin). Free-feed not allowed — measured portions only.",
  "Hill’s Science Diet — 1 cup AM, 1 cup PM. Fish oil squirt on dinner.",
  "Grain-free kibble — 1¼ cups twice daily. Bring own measuring scoop (in bag).",
] as const;

const BEHAVIOR_SNIPPETS = [
  "Friendly with people; cautious around intact males. Slow intros in yard.",
  "High prey drive — no small-dog group. Thrives with ball-chase sessions.",
  "Noise-sensitive during storms; thundershirt in locker if needed.",
  "Resource guards food bowl — fed alone in suite or last in rotation.",
  "Separation anxiety first night; second night usually settles. Night light OK.",
  "Loves water play; hose time OK in afternoons if weather permits.",
  "Timid in lobby; warms up after 10–15 min in back. No forced petting.",
  "Play bows often; can read overstimulation — give cool-down breaks.",
  "Muzzle not required; never shown aggression. Nervous on leash near cats.",
] as const;

const SPECIAL_SNIPPETS = [
  null,
  null,
  null,
  "Mild hip dysplasia — no jumping from tall SUV without ramp assistance.",
  "Deaf in right ear — approach from left and use hand signals.",
  "Epilepsy — medication times strict; seizures logged if any (rare).",
  "Blind in one eye — avoid sudden approaches from blind side.",
  "Arthritis — prefer ground-level run; limit stairs.",
] as const;

const BREED_SPECS = [
  { breed: "Golden Retriever", minW: 52, maxW: 74 },
  { breed: "Labrador Retriever", minW: 55, maxW: 82 },
  { breed: "Border Collie", minW: 28, maxW: 48 },
  { breed: "Australian Shepherd", minW: 35, maxW: 58 },
  { breed: "French Bulldog", minW: 18, maxW: 30 },
  { breed: "German Shepherd", minW: 55, maxW: 88 },
  { breed: "Standard Poodle", minW: 40, maxW: 62 },
  { breed: "Bernese Mountain Dog", minW: 70, maxW: 110 },
  { breed: "Cavalier King Charles Spaniel", minW: 13, maxW: 20 },
  { breed: "Mixed breed", minW: 28, maxW: 55 },
  { breed: "Boxer", minW: 50, maxW: 72 },
  { breed: "Siberian Husky", minW: 40, maxW: 62 },
  { breed: "Beagle", minW: 18, maxW: 32 },
  { breed: "Pembroke Welsh Corgi", minW: 22, maxW: 34 },
  { breed: "Shih Tzu", minW: 9, maxW: 16 },
  { breed: "Yorkshire Terrier", minW: 4, maxW: 7 },
] as const;

function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** UTC timestamp for a check-in on `isoDay` + `dayOffset`, at hour:minute */
function checkInAt(isoDay: string, dayOffset: number, hourUTC: number, minuteUTC: number): string {
  const d = new Date(isoDay + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hourUTC, minuteUTC, 0, 0);
  return d.toISOString();
}

function assertGate() {
  if (!DEMO_SEED_OK) {
    console.error("Refusing to run: set DEMO_SEED_OK=yes (local/staging database only).");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }
  if (SERVICE_KEY.length < 80) {
    console.warn(
      "[seed] Warning: SUPABASE_SERVICE_ROLE_KEY looks short. Use the service_role key from Supabase (Settings → API), not the anon key.",
    );
  }
}

/**
 * SaaS billing fields for the seeded demo kennel so the owner UI matches a paying subscriber.
 *
 * Server logic (subscriptionAccess.kennelShowTrialUpgradeBanner): the “You’re on a trial” banner
 * only shows when trial_ends_at is in the future AND subscription_status is not active/trialing.
 * Here we set subscription_status=active, clear trial_ends_at, and use placeholder Stripe ids.
 */
function demoKennelPaidBillingPayload(): Record<string, unknown> {
  return {
    subscription_status: "active",
    trial_ends_at: null,
    stripe_subscription_id: "sub_rpl_active_placeholder",
    stripe_customer_id: "cus_rpl_placeholder",
    subscription_tier: "standard",
  };
}

/**
 * Final UPDATE so the demo kennel is always in paid-active shape (clears stale app trials, etc.).
 */
async function applyDemoKennelPaidBillingState(db: SupabaseClient, kennelId: number): Promise<void> {
  const full = demoKennelPaidBillingPayload();
  const { error } = await db.from("kennels").update(full).eq("id", kennelId);
  if (!error) {
    console.log(
      "[seed] Demo kennel SaaS row: subscription_status=active, trial_ends_at cleared (no trial banner when billing is enforced).",
    );
    return;
  }
  const core: Record<string, unknown> = {
    subscription_status: full.subscription_status,
    trial_ends_at: full.trial_ends_at,
    stripe_subscription_id: full.stripe_subscription_id,
    stripe_customer_id: full.stripe_customer_id,
  };
  const { error: e2 } = await db.from("kennels").update(core).eq("id", kennelId);
  if (e2) {
    throw new Error(
      `[seed] Could not apply demo paid billing to kennel ${kennelId}: ${e2.message}. Apply MIGRATION_R30_kennel_stripe_subscription.sql if kennels billing columns are missing.`,
    );
  }
  console.log(
    "[seed] Demo kennel SaaS row (without subscription_tier column): subscription_status=active, trial_ends_at cleared.",
  );
}

/**
 * Inserts kennel; retries with fewer columns if billing migrations are missing.
 * Then PATCHes subscription/Stripe columns when possible so owner billing UI has values.
 */
async function insertKennelForSeed(db: SupabaseClient, ownerId: string): Promise<number> {
  const base: Record<string, unknown> = {
    owner_id: ownerId,
    name: SEED_KENNEL_NAME,
    description:
      "Full-service boarding, daycare, and grooming in Bend. Climate-controlled suites, fenced play yards, and experienced handlers on site every day.",
    address: "1842 River Road",
    city: "Bend",
    state: "OR",
    zip: "97702",
    phone: "(541) 555-0148",
    email: "reservations@riverbendpetlodge.com",
    total_capacity: 42,
    policies:
      "Current vaccination records required before check-in. Afternoon drop-off after 2:00 PM may be billed as an additional day. Holiday minimums may apply.",
    is_active: true,
  };
  const billing = demoKennelPaidBillingPayload();

  const attempts: Record<string, unknown>[] = [{ ...base, ...billing }, base];
  let lastErr: string | undefined;
  for (let i = 0; i < attempts.length; i++) {
    const { data, error } = await db.from("kennels").insert([attempts[i]!]).select("id").single();
    if (!error && data?.id != null) {
      const id = data.id as number;
      if (i > 0) {
        const { error: u1 } = await db.from("kennels").update(billing).eq("id", id);
        if (u1) console.warn("[seed] kennel billing columns (optional):", u1.message);
      }
      return id;
    }
    lastErr = error?.message;
    console.warn(`[seed] Kennel insert attempt ${i + 1}/${attempts.length} failed:`, lastErr);
  }
  throw new Error(
    `kennels.insert failed after retries: ${lastErr}. Apply MIGRATION_R30_kennel_stripe_subscription.sql if needed, or check RLS/policies for service role.`,
  );
}

async function verifySeedCounts(db: SupabaseClient, kennelId: number): Promise<void> {
  console.log("\n[seed] Verification (row counts for this kennel):");
  const line = async (label: string, p: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    const { count, error } = await p;
    console.log(error ? `  ${label}: error — ${error.message}` : `  ${label}: ${count ?? 0}`);
  };
  await line(
    "kennels (this row)",
    db.from("kennels").select("id", { count: "exact", head: true }).eq("id", kennelId),
  );
  await line(
    "users with kennel_id set",
    db.from("users").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId),
  );
  await line(
    "customer_kennel_associations",
    db.from("customer_kennel_associations").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId),
  );
  await line("dogs", db.from("dogs").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line("services", db.from("services").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line("checkout_add_ons", db.from("checkout_add_ons").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line("rooms", db.from("rooms").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line("bookings", db.from("bookings").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line("payments", db.from("payments").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId));
  await line(
    "alerts (unresolved)",
    db.from("alerts").select("id", { count: "exact", head: true }).eq("kennel_id", kennelId).eq("is_resolved", false),
  );
}

async function createAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
  meta: { name: string; role: string },
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: meta.name, role: meta.role },
  });
  if (error) throw new Error(`auth.createUser ${email}: ${error.message}`);
  if (!data.user?.id) throw new Error(`auth.createUser ${email}: no user id`);
  return data.user.id;
}

async function upsertPublicUser(
  db: SupabaseClient,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from("users").upsert(row, { onConflict: "id" });
  if (error) {
    const { id, email, role, kennel_id } = row;
    const minimal = { id, email, role, kennel_id: kennel_id ?? null };
    const { error: e2 } = await db.from("users").upsert(minimal, { onConflict: "id" });
    if (e2) throw new Error(`users.upsert: ${e2.message}`);
  }
}

type BSpec = {
  customerIdx: number;
  dogSlot: number;
  service: "boarding" | "daycare" | "grooming";
  checkIn: string;
  checkOut: string;
  status: string;
  price: number;
  payment_status: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  roomName?: string | null;
  addOns?: string[];
  /** Staff-facing booking notes */
  notes?: string | null;
};

function buildBookingSpecs(t0: string): BSpec[] {
  return [
    // —— Completed stays (past), varied lengths and dates ——
    {
      customerIdx: 0,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -92),
      checkOut: addDays(t0, -85),
      status: "completed",
      price: 544,
      payment_status: "paid",
      notes: "Regular guest; prefers Suite A wing. Left frozen meals — used through Wednesday.",
    },
    {
      customerIdx: 1,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -48),
      checkOut: addDays(t0, -41),
      status: "completed",
      price: 476,
      payment_status: "paid",
      notes: "Pickup was 4:15 PM; owner called ahead.",
    },
    {
      customerIdx: 2,
      dogSlot: 0,
      service: "daycare",
      checkIn: addDays(t0, -27),
      checkOut: addDays(t0, -27),
      status: "completed",
      price: 44,
      payment_status: "paid",
      notes: "Half-day extension to 5 PM approved.",
    },
    {
      customerIdx: 3,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -19),
      checkOut: addDays(t0, -12),
      status: "completed",
      price: 476,
      payment_status: "paid",
      notes: "Anxiety vest used first two nights; slept well after that.",
    },
    {
      customerIdx: 4,
      dogSlot: 0,
      service: "grooming",
      checkIn: addDays(t0, -16),
      checkOut: addDays(t0, -16),
      status: "completed",
      price: 95,
      payment_status: "paid",
      notes: "Full groom; coat heavily matted behind ears — noted for next visit.",
    },
    {
      customerIdx: 5,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -11),
      checkOut: addDays(t0, -8),
      status: "completed",
      price: 204,
      payment_status: "paid",
      notes: "Weekend stay; early Sunday pickup.",
    },
    {
      customerIdx: 6,
      dogSlot: 0,
      service: "daycare",
      checkIn: addDays(t0, -8),
      checkOut: addDays(t0, -8),
      status: "completed",
      price: 44,
      payment_status: "paid",
      notes: "Group play OK after slow intro with retriever pack.",
    },
    {
      customerIdx: 7,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -6),
      checkOut: addDays(t0, -2),
      status: "completed",
      price: 272,
      payment_status: "paid",
      notes: "Fed kibble from home bag only — no substitutions.",
    },
    {
      customerIdx: 8,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -73),
      checkOut: addDays(t0, -66),
      status: "completed",
      price: 476,
      payment_status: "paid",
      notes: "Holiday week; extra play package billed.",
    },
    {
      customerIdx: 9,
      dogSlot: 0,
      service: "daycare",
      checkIn: addDays(t0, -4),
      checkOut: addDays(t0, -4),
      status: "completed",
      price: 44,
      payment_status: "paid",
      notes: "Tired easily in afternoon heat — extra water breaks.",
    },
    {
      customerIdx: 0,
      dogSlot: 1,
      service: "grooming",
      checkIn: addDays(t0, -3),
      checkOut: addDays(t0, -3),
      status: "completed",
      price: 52,
      payment_status: "paid",
      notes: "Bath & brush only; nails done last month.",
    },
    {
      customerIdx: 4,
      dogSlot: 1,
      service: "boarding",
      checkIn: addDays(t0, -35),
      checkOut: addDays(t0, -28),
      status: "completed",
      price: 476,
      payment_status: "paid",
      notes: "Second dog same suite; feeding schedule staggered by 15 min.",
    },
    // Checked out yesterday (awaiting back-office completion if your flow uses it)
    {
      customerIdx: 5,
      dogSlot: 1,
      service: "boarding",
      checkIn: addDays(t0, -5),
      checkOut: addDays(t0, -1),
      status: "checked_out",
      price: 340,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, -5, 16, 10),
      checked_out_at: checkInAt(t0, -1, 11, 45),
      roomName: "Suite A2",
      notes: "Checkout yesterday AM; balance settled at desk.",
    },
    // —— Currently checked in (active stays), staggered arrivals ——
    {
      customerIdx: 0,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -4),
      checkOut: addDays(t0, 6),
      status: "checked_in",
      price: 680,
      payment_status: "deposit_paid",
      checked_in_at: checkInAt(t0, -4, 15, 20),
      roomName: "Suite A1",
      addOns: ["Nail trim", "Medication administration"],
      notes: "Mid-stay nail trim scheduled; meds in labeled bag in fridge.",
    },
    {
      customerIdx: 1,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -2),
      checkOut: addDays(t0, 5),
      status: "checked_in",
      price: 476,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, -2, 9, 40),
      roomName: "Run 2",
      notes: "Bring-out only for bathroom first day; now using yard freely.",
    },
    {
      customerIdx: 2,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -1),
      checkOut: addDays(t0, 3),
      status: "checked_in",
      price: 272,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, -1, 14, 5),
      roomName: "Suite B1",
      notes: "Owner requested photo update mid-week (sent).",
    },
    {
      customerIdx: 7,
      dogSlot: 0,
      service: "daycare",
      checkIn: t0,
      checkOut: t0,
      status: "checked_in",
      price: 44,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, 0, 7, 55),
      roomName: "Play Yard 1",
      notes: "Full day; pickup by 6 PM confirmed.",
    },
    {
      customerIdx: 8,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -3),
      checkOut: addDays(t0, 8),
      status: "checked_in",
      price: 748,
      payment_status: "partial",
      checked_in_at: checkInAt(t0, -3, 10, 15),
      roomName: "Family Suite",
      addOns: ["Extra play session (15 min)"],
      notes: "Balance due at checkout; owner aware.",
    },
    {
      customerIdx: 9,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -5),
      checkOut: t0,
      status: "checked_in",
      price: 340,
      payment_status: "unpaid",
      checked_in_at: checkInAt(t0, -5, 11, 0),
      roomName: "Quiet Room 1",
      addOns: ["Nail trim", "Express bath"],
      notes: "Checkout today — nail trim + bath on schedule; collect payment at pickup.",
    },
    {
      customerIdx: 3,
      dogSlot: 0,
      service: "boarding",
      checkIn: t0,
      checkOut: addDays(t0, 9),
      status: "checked_in",
      price: 612,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, 0, 8, 25),
      roomName: "Run 1",
      notes: "Same-day check-in this morning; food from home labeled.",
    },
    {
      customerIdx: 6,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, -6),
      checkOut: addDays(t0, 11),
      status: "checked_in",
      price: 816,
      payment_status: "paid",
      checked_in_at: checkInAt(t0, -6, 13, 50),
      roomName: "Run 3",
      notes: "Long stay; mid-stay wellness check OK.",
    },
    // —— Confirmed upcoming (arriving soon through next month) ——
    {
      customerIdx: 2,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 5),
      checkOut: addDays(t0, 12),
      status: "confirmed",
      price: 476,
      payment_status: "unpaid",
      notes: "Deposit reminder email queued.",
    },
    {
      customerIdx: 3,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 11),
      checkOut: addDays(t0, 18),
      status: "confirmed",
      price: 476,
      payment_status: "deposit_paid",
      notes: "Deposit received; awaiting rabies cert upload.",
    },
    {
      customerIdx: 4,
      dogSlot: 1,
      service: "daycare",
      checkIn: addDays(t0, 1),
      checkOut: addDays(t0, 1),
      status: "confirmed",
      price: 44,
      payment_status: "unpaid",
      notes: "Tomorrow full day; second dog — intake form complete.",
    },
    {
      customerIdx: 5,
      dogSlot: 0,
      service: "grooming",
      checkIn: addDays(t0, 3),
      checkOut: addDays(t0, 3),
      status: "confirmed",
      price: 95,
      payment_status: "unpaid",
      notes: "Full groom; matting behind ears per last visit.",
    },
    {
      customerIdx: 6,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 14),
      checkOut: addDays(t0, 28),
      status: "confirmed",
      price: 952,
      payment_status: "unpaid",
      notes: "Two-week vacation; airport pickup contact on file.",
    },
    {
      customerIdx: 7,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 14),
      checkOut: addDays(t0, 21),
      status: "confirmed",
      price: 476,
      payment_status: "unpaid",
      notes: "Spring break block; suite preference noted.",
    },
    {
      customerIdx: 0,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 18),
      checkOut: addDays(t0, 25),
      status: "confirmed",
      price: 476,
      payment_status: "unpaid",
      notes: "Overlaps with current stay — staff flagged for room move planning.",
    },
    {
      customerIdx: 8,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 24),
      checkOut: addDays(t0, 31),
      status: "confirmed",
      price: 476,
      payment_status: "unpaid",
      notes: "Memorial Day adjacent dates; policy acknowledgment on file.",
    },
    {
      customerIdx: 9,
      dogSlot: 0,
      service: "daycare",
      checkIn: addDays(t0, 5),
      checkOut: addDays(t0, 5),
      status: "confirmed",
      price: 44,
      payment_status: "unpaid",
      notes: "Pack walk day — handler assigned.",
    },
    // Arriving today, still confirmed (not yet flipped to checked_in in lobby)
    {
      customerIdx: 1,
      dogSlot: 1,
      service: "daycare",
      checkIn: t0,
      checkOut: t0,
      status: "confirmed",
      price: 44,
      payment_status: "unpaid",
      notes: "Expected drop-off 9:30 AM — second dog same household.",
    },
    {
      customerIdx: 4,
      dogSlot: 0,
      service: "boarding",
      checkIn: t0,
      checkOut: addDays(t0, 5),
      status: "confirmed",
      price: 408,
      payment_status: "unpaid",
      notes: "Arriving this afternoon; owner running late — ETA 4 PM.",
    },
    // —— Pending requests (need owner/staff action) ——
    {
      customerIdx: 7,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 24),
      checkOut: addDays(t0, 31),
      status: "pending",
      price: 476,
      payment_status: "unpaid",
      notes: "New online request — verify vaccine PDF before confirming.",
    },
    {
      customerIdx: 8,
      dogSlot: 1,
      service: "daycare",
      checkIn: addDays(t0, 7),
      checkOut: addDays(t0, 7),
      status: "pending",
      price: 44,
      payment_status: "unpaid",
      notes: "Sibling dog; link to primary profile once approved.",
    },
    {
      customerIdx: 9,
      dogSlot: 0,
      service: "boarding",
      checkIn: addDays(t0, 12),
      checkOut: addDays(t0, 19),
      status: "pending",
      price: 476,
      payment_status: "unpaid",
      notes: "Requested adjoining run — pending availability.",
    },
    {
      customerIdx: 5,
      dogSlot: 0,
      service: "grooming",
      checkIn: addDays(t0, 15),
      checkOut: addDays(t0, 15),
      status: "pending",
      price: 52,
      payment_status: "unpaid",
      notes: "Sensitive skin — confirm hypoallergenic shampoo.",
    },
    // Far-future hold
    {
      customerIdx: 2,
      dogSlot: 1,
      service: "boarding",
      checkIn: addDays(t0, 42),
      checkOut: addDays(t0, 49),
      status: "confirmed",
      price: 476,
      payment_status: "unpaid",
      notes: "Summer trip placeholder; dates may shift ±1 day.",
    },
  ];
}

async function main() {
  assertGate();

  const db = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingKennel } = await db
    .from("kennels")
    .select("id")
    .eq("name", SEED_KENNEL_NAME)
    .maybeSingle();
  if (existingKennel?.id) {
    console.error(
      `Kennel "${SEED_KENNEL_NAME}" already exists (id=${existingKennel.id}). Run reset first: pnpm run seed:demo:reset`,
    );
    process.exit(1);
  }

  console.log("[seed] Creating auth users + profiles…");
  const ownerId = await createAuthUser(db, OWNER_EMAIL, SEED_PASSWORD, {
    name: OWNER_NAME,
    role: "owner",
  });
  await upsertPublicUser(db, {
    id: ownerId,
    email: OWNER_EMAIL,
    name: OWNER_NAME,
    role: "owner",
    kennel_id: null,
  });

  const employeeIds: string[] = [];
  for (const staff of STAFF_ACCOUNTS) {
    const id = await createAuthUser(db, staff.email, SEED_PASSWORD, {
      name: staff.name,
      role: "employee",
    });
    employeeIds.push(id);
    await upsertPublicUser(db, {
      id,
      email: staff.email,
      name: staff.name,
      role: "employee",
      kennel_id: null,
    });
  }

  const customerIds: string[] = [];
  for (const cust of CUSTOMER_ACCOUNTS) {
    const id = await createAuthUser(db, cust.email, SEED_PASSWORD, {
      name: cust.name,
      role: "customer",
    });
    customerIds.push(id);
    await upsertPublicUser(db, {
      id,
      email: cust.email,
      name: cust.name,
      role: "customer",
      kennel_id: null,
    });
  }

  console.log("[seed] Creating kennel (owner linkage via kennels.owner_id + users.kennel_id)…");
  const kennelId = await insertKennelForSeed(db, ownerId);

  const { error: ownerKennelErr } = await db.from("users").update({ kennel_id: kennelId }).eq("id", ownerId);
  if (ownerKennelErr) {
    console.warn("[seed] users.update owner kennel_id:", ownerKennelErr.message);
  }

  for (const eid of employeeIds) {
    const { error } = await db.from("users").update({ kennel_id: kennelId }).eq("id", eid);
    if (error) throw new Error(`users.update employee kennel: ${error.message}`);
  }

  const assocRows = [...employeeIds, ...customerIds].map((customer_id) => ({
    customer_id,
    kennel_id: kennelId,
  }));
  const { error: aErr } = await db.from("customer_kennel_associations").insert(assocRows);
  if (aErr) throw new Error(`customer_kennel_associations: ${aErr.message}`);

  console.log("[seed] Services, add-ons, rooms, hours…");
  const servicesPayload = [
    {
      name: "Overnight boarding",
      type: "boarding",
      price_per_unit: 68,
      unit_type: "per_night",
      description: "Private suite, three outdoor breaks, evening treat.",
    },
    {
      name: "Daycare — full day",
      type: "daycare",
      price_per_unit: 44,
      unit_type: "per_day",
      description: "Supervised group play and rest periods.",
    },
    {
      name: "Spa bath & brush",
      type: "grooming",
      price_per_unit: 52,
      unit_type: "per_session",
      description: "Bath, blow-dry, and brush-out.",
    },
    {
      name: "Full groom",
      type: "grooming",
      price_per_unit: 95,
      unit_type: "per_session",
      description: "Haircut, bath, nails, and ear cleaning.",
    },
  ];
  const { data: svcRows, error: sErr } = await db
    .from("services")
    .insert(
      servicesPayload.map((s) => ({
        kennel_id: kennelId,
        name: s.name,
        type: s.type,
        price_per_unit: s.price_per_unit,
        unit_type: s.unit_type,
        description: s.description,
        is_active: true,
      })),
    )
    .select("id,type,name");
  if (sErr) throw new Error(`services: ${sErr.message}`);
  const svcByType = new Map<string, number>();
  for (const r of svcRows || []) {
    svcByType.set(String((r as { type: string }).type), (r as { id: number }).id);
  }
  const svcBoarding = svcByType.get("boarding")!;
  const svcDaycare = svcByType.get("daycare")!;
  const svcGroom = svcByType.get("grooming")!;

  const addOnPayload = [
    { name: "Nail trim", price: 18 },
    { name: "Medication administration", price: 12 },
    { name: "Extra play session (15 min)", price: 15 },
    { name: "De-shedding treatment", price: 35 },
    { name: "Teeth brushing", price: 22 },
    { name: "Late pickup (after 6 PM)", price: 25 },
    { name: "Express bath", price: 28 },
  ];
  const { data: addOnRows, error: aoErr } = await db
    .from("checkout_add_ons")
    .insert(addOnPayload.map((a) => ({ kennel_id: kennelId, name: a.name, price: a.price, is_active: true })))
    .select("id,name,price");
  if (aoErr) throw new Error(`checkout_add_ons: ${aoErr.message}`);
  const addOnByName = new Map((addOnRows || []).map((r: { id: number; name: string }) => [r.name, r.id]));

  const roomNames = [
    { name: "Suite A1", building: "Main", size_type: "large", capacity: 1 },
    { name: "Suite A2", building: "Main", size_type: "medium", capacity: 1 },
    { name: "Suite B1", building: "Main", size_type: "large", capacity: 1 },
    { name: "Run 1", building: "Outdoor wing", size_type: "medium", capacity: 1 },
    { name: "Run 2", building: "Outdoor wing", size_type: "medium", capacity: 1 },
    { name: "Run 3", building: "Outdoor wing", size_type: "small", capacity: 1 },
    { name: "Play Yard 1", building: "Yards", size_type: "mixed", capacity: 3 },
    { name: "Play Yard 2", building: "Yards", size_type: "mixed", capacity: 3 },
    { name: "Quiet Room 1", building: "Wellness", size_type: "small", capacity: 1 },
    { name: "Quiet Room 2", building: "Wellness", size_type: "small", capacity: 1 },
    { name: "Family Suite", building: "Main", size_type: "large", capacity: 2 },
    { name: "Recovery Suite", building: "Wellness", size_type: "special_care", capacity: 1 },
  ];
  const { data: roomRows, error: rErr } = await db
    .from("rooms")
    .insert(
      roomNames.map((r) => ({
        kennel_id: kennelId,
        name: r.name,
        building: r.building,
        size_type: r.size_type,
        capacity: r.capacity,
        is_available: true,
      })),
    )
    .select("id,name");
  if (rErr) throw new Error(`rooms: ${rErr.message}`);
  const rooms = (roomRows || []) as { id: number; name: string }[];
  const roomIdByName = new Map(rooms.map((r) => [r.name, r.id]));

  const hours = [];
  for (let dow = 0; dow < 7; dow++) {
    const closed = dow === 0;
    hours.push({
      kennel_id: kennelId,
      day_of_week: dow,
      open_time: closed ? "09:00:00" : "07:00:00",
      close_time: closed ? "17:00:00" : "19:00:00",
      is_closed: closed,
    });
  }
  const { error: bhErr } = await db.from("business_hours").insert(hours);
  if (bhErr) {
    console.warn("[seed] business_hours skipped:", bhErr.message);
  }

  const { error: vReqErr } = await db.from("kennel_required_vaccines").insert([
    { kennel_id: kennelId, vaccine_name: "Rabies" },
    { kennel_id: kennelId, vaccine_name: "DHPP" },
    { kennel_id: kennelId, vaccine_name: "Bordetella" },
  ]);
  if (vReqErr) console.warn("[seed] kennel_required_vaccines:", vReqErr.message);

  const { error: badgeErr } = await db.from("dog_badges").insert([
    { kennel_id: kennelId, key: "meds_required", name: "Meds required", description: "Medication during stay.", icon: "pill", is_default: true, is_active: true },
    { kennel_id: kennelId, key: "food_guarding", name: "Food guarding", description: "Feed separately.", icon: "food", is_default: true, is_active: true },
    { kennel_id: kennelId, key: "escape_risk", name: "Escape risk", description: "Secure exits.", icon: "door", is_default: true, is_active: true },
  ]);
  if (badgeErr) console.warn("[seed] dog_badges:", badgeErr.message);

  const t0 = todayISO();
  const bookingSpecs = buildBookingSpecs(t0);

  const maxDogSlot = new Array(CUSTOMER_ACCOUNTS.length).fill(0);
  for (const s of bookingSpecs) {
    maxDogSlot[s.customerIdx] = Math.max(maxDogSlot[s.customerIdx]!, s.dogSlot);
  }
  maxDogSlot[0] = Math.max(maxDogSlot[0]!, 1);

  const dogCounts = maxDogSlot.map((maxS) => {
    const minDogs = maxS + 1;
    const roll = 1 + Math.floor(Math.random() * 3);
    return Math.max(minDogs, roll);
  });

  type DogRow = { id: number; name: string; customerIdx: number };
  const dogsByCustomer: number[][] = CUSTOMER_ACCOUNTS.map(() => []);
  const dogRows: DogRow[] = [];
  let nameCursor = 0;

  console.log("[seed] Dogs + vaccinations…");
  for (let c = 0; c < CUSTOMER_ACCOUNTS.length; c++) {
    const ownerUuid = customerIds[c]!;
    const n = dogCounts[c]!;
    for (let j = 0; j < n; j++) {
      const bi = nameCursor % BREED_SPECS.length;
      const spec = BREED_SPECS[bi]!;
      const span = spec.maxW - spec.minW;
      const weight = spec.minW + (nameCursor % (span + 1));
      const nm = DOG_NAME_POOL[nameCursor % DOG_NAME_POOL.length]!;
      const fi =
        nameCursor % 5 !== 0 ? FEEDING_SNIPPETS[nameCursor % FEEDING_SNIPPETS.length]! : null;
      const meds = nameCursor % 6 === 0 ? "Apoquel 16mg once daily with breakfast." : null;
      const beh =
        nameCursor % 4 !== 0 ? BEHAVIOR_SNIPPETS[nameCursor % BEHAVIOR_SNIPPETS.length]! : null;
      const special = SPECIAL_SNIPPETS[nameCursor % SPECIAL_SNIPPETS.length];
      nameCursor++;

      const { data: dog, error: dErr } = await db
        .from("dogs")
        .insert([
          {
            owner_id: ownerUuid,
            kennel_id: kennelId,
            name: nm,
            breed: spec.breed,
            age: 1 + (nameCursor % 14),
            weight,
            birthday: addDays(todayISO(), -(365 * (2 + (nameCursor % 10)))),
            sex: nameCursor % 2 === 0 ? "male" : "female",
            is_spayed_neutered: nameCursor % 3 !== 0,
            feeding_instructions: fi,
            medications: meds,
            behavior_notes: beh,
            special_needs: special,
            vet_name: "Cascade Veterinary Clinic",
            vet_phone: "(541) 555-0182",
            emergency_contact_name: nameCursor % 2 === 0 ? "Alex (spouse)" : "Pat Kim (neighbor)",
            emergency_contact_phone: `(503) 555-${String(1000 + (nameCursor % 8999)).padStart(4, "0")}`,
          },
        ])
        .select("id")
        .single();
      if (dErr) throw new Error(`dogs.insert: ${dErr.message}`);
      const id = (dog as { id: number }).id;
      dogsByCustomer[c]!.push(id);
      dogRows.push({ id, name: nm, customerIdx: c });
    }
  }

  const expFar = addDays(todayISO(), 300);
  const expSoon = addDays(todayISO(), 25);
  for (let i = 0; i < dogRows.length; i++) {
    const dogId = dogRows[i]!.id;
    const status = i % 11 === 0 ? "expiring_soon" : "current";
    const exp = i % 11 === 0 ? expSoon : expFar;
    await db.from("vaccinations").insert([
      { dog_id: dogId, vaccine_name: "Rabies", expiration_date: exp, date_administered: addDays(exp, -365), status },
      { dog_id: dogId, vaccine_name: "DHPP", expiration_date: expFar, date_administered: addDays(todayISO(), -400), status: "current" },
      { dog_id: dogId, vaccine_name: "Bordetella", expiration_date: expFar, date_administered: addDays(todayISO(), -200), status: "current" },
    ]);
  }

  if (dogRows.length >= 3) {
    await db.from("dog_badge_assignments").insert([
      { dog_id: dogRows[2]!.id, badge_key: "meds_required" },
      { dog_id: dogRows[5]!.id, badge_key: "food_guarding" },
    ]);
  }

  console.log("[seed] Bookings, rooms, payments, alerts…");

  function svcIdFor(s: BSpec["service"]) {
    if (s === "boarding") return svcBoarding;
    if (s === "daycare") return svcDaycare;
    return svcGroom;
  }

  function dogIdForSpec(spec: BSpec): number {
    const list = dogsByCustomer[spec.customerIdx]!;
    const id = list[spec.dogSlot];
    if (id == null) throw new Error(`No dog at customer ${spec.customerIdx} slot ${spec.dogSlot}`);
    return id;
  }

  const bookingIds: number[] = [];
  for (const spec of bookingSpecs) {
    const custId = customerIds[spec.customerIdx]!;
    const dogId = dogIdForSpec(spec);
    const row: Record<string, unknown> = {
      kennel_id: kennelId,
      customer_id: custId,
      dog_id: dogId,
      service_id: svcIdFor(spec.service),
      check_in_date: spec.checkIn,
      check_out_date: spec.checkOut,
      status: spec.status,
      total_price: spec.price,
      payment_status: spec.payment_status,
      notes:
        spec.notes ??
        (spec.status === "checked_in"
          ? "Guest settling in; follow feeding card in suite."
          : spec.status === "confirmed"
            ? "Confirmed — standard pre-arrival checklist."
            : null),
    };
    if (spec.checked_in_at) row.checked_in_at = spec.checked_in_at;
    if (spec.checked_out_at) row.checked_out_at = spec.checked_out_at;

    const { data: bRow, error: bErr } = await db.from("bookings").insert([row]).select("id").single();
    if (bErr) throw new Error(`bookings: ${bErr.message}`);
    const bid = (bRow as { id: number }).id;
    bookingIds.push(bid);

    if (spec.roomName) {
      const rid = roomIdByName.get(spec.roomName);
      if (rid) {
        const { error: raErr } = await db.from("room_assignments").insert([{ booking_id: bid, room_id: rid }]);
        if (raErr) console.warn("[seed] room_assignments:", raErr.message);
      }
    }

    if (spec.addOns?.length) {
      for (const an of spec.addOns) {
        const aid = addOnByName.get(an);
        if (!aid) continue;
        const { error: baErr } = await db.from("booking_add_ons").insert([
          {
            booking_id: bid,
            add_on_id: aid,
            dog_id: dogId,
            price: addOnPayload.find((x) => x.name === an)?.price ?? 0,
            completed: an === "Nail trim",
          },
        ]);
        if (baErr) console.warn("[seed] booking_add_ons:", baErr.message);
      }
    }
  }

  if (bookingIds.length > 0 && dogsByCustomer[0]!.length >= 2) {
    const bid = bookingIds[0]!;
    const extraDog = dogsByCustomer[0]![1]!;
    const { error: bdErr } = await db.from("booking_dogs").insert([{ booking_id: bid, dog_id: extraDog, room_id: null }]);
    if (bdErr) console.warn("[seed] booking_dogs:", bdErr.message);
  }

  async function insertPayment(bookingId: number, customerId: string, amount: number, status: string) {
    const stripeId = `pi_rpl_${bookingId}_${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await db.from("payments").insert([
      {
        booking_id: bookingId,
        customer_id: customerId,
        kennel_id: kennelId,
        amount,
        status,
        stripe_payment_id: stripeId,
      },
    ]);
    if (error) console.warn("[seed] payment:", error.message);
  }

  for (let i = 0; i < bookingSpecs.length; i++) {
    const spec = bookingSpecs[i]!;
    const bid = bookingIds[i]!;
    const custId = customerIds[spec.customerIdx]!;
    if (spec.status === "completed" && spec.payment_status === "paid") {
      await insertPayment(bid, custId, spec.price, "succeeded");
    }
    if (spec.status === "checked_out" && spec.payment_status === "paid") {
      await insertPayment(bid, custId, spec.price, "succeeded");
    }
    if (spec.status === "checked_in" && spec.payment_status === "paid") {
      await insertPayment(bid, custId, Math.min(spec.price, 220), "succeeded");
    }
    if (spec.status === "checked_in" && spec.payment_status === "deposit_paid") {
      await insertPayment(bid, custId, Math.round(spec.price * 0.35), "succeeded");
    }
    if (spec.status === "checked_in" && spec.payment_status === "partial") {
      await insertPayment(bid, custId, Math.round(spec.price * 0.45), "succeeded");
    }
  }

  const firstCompleted = bookingSpecs.find((s) => s.status === "completed");
  const partialStay = bookingSpecs.find((s) => s.status === "checked_in" && s.payment_status === "partial");
  const unpaidStay = bookingSpecs.find((s) => s.status === "checked_in" && s.payment_status === "unpaid");
  let lastPendingIdx = -1;
  for (let i = bookingSpecs.length - 1; i >= 0; i--) {
    if (bookingSpecs[i]!.status === "pending") {
      lastPendingIdx = i;
      break;
    }
  }
  if (!firstCompleted || !partialStay || !unpaidStay || lastPendingIdx < 0) {
    throw new Error("seed: missing booking spec for alerts");
  }
  const lastPendingSpec = bookingSpecs[lastPendingIdx]!;
  const dog0 = dogIdForSpec(firstCompleted);
  const dog0name = dogRows.find((d) => d.id === dog0)?.name ?? "guest";
  const payDog = dogIdForSpec(partialStay);
  const incompleteDog = dogIdForSpec(unpaidStay);
  const missingVacDog = dogIdForSpec(lastPendingSpec);

  const alertPayload = [
    {
      type: "vaccination_expiring_soon",
      message: `Bordetella for ${dog0name} is due for renewal within 30 days. Owner has been emailed.`,
      dog_id: dog0,
      booking_id: null as number | null,
    },
    {
      type: "booking_pending",
      message: "New boarding request awaiting confirmation — review details and confirm or decline.",
      dog_id: null,
      booking_id: bookingIds[lastPendingIdx]!,
    },
    {
      type: "payment_due",
      message: "Balance due for an active suite stay — follow up before checkout.",
      dog_id: payDog,
      booking_id: null,
    },
    {
      type: "dog_info_incomplete",
      message: "Emergency contact number missing for one active guest — update before checkout.",
      dog_id: incompleteDog,
      booking_id: null,
    },
    {
      type: "vaccination_missing",
      message: "Annual DHPP record not on file for an upcoming reservation — hold until uploaded.",
      dog_id: missingVacDog,
      booking_id: null,
    },
  ];
  for (const a of alertPayload) {
    const { error } = await db.from("alerts").insert([
      {
        kennel_id: kennelId,
        type: a.type,
        message: a.message,
        dog_id: a.dog_id,
        booking_id: a.booking_id,
        is_resolved: false,
      },
    ]);
    if (error) console.warn("[seed] alerts:", error.message);
  }

  const { error: discErr } = await db.from("checkout_discounts").insert([
    {
      kennel_id: kennelId,
      name: "Extended stay (7+ nights)",
      discount_type: "percent",
      amount: 10,
      notes: "Automatically applied at checkout for qualifying stays.",
      is_active: true,
    },
  ]);
  if (discErr) console.warn("[seed] checkout_discounts:", discErr.message);

  await applyDemoKennelPaidBillingState(db, kennelId);

  const state = {
    kennelId,
    ownerId,
    employeeIds,
    customerIds,
    seededEmails: allSeedAuthEmails(),
    seededAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ROOT, DEMO_STATE_FILE), JSON.stringify(state, null, 2), "utf-8");

  await verifySeedCounts(db, kennelId);

  console.log("\n[seed] Done — full app dataset written (not auth-only).");
  console.log(`  Kennel id: ${kennelId}`);
  console.log(`  State file: ${DEMO_STATE_FILE}`);
  console.log(`  Owner: ${OWNER_EMAIL} (password: DEMO_SEED_PASSWORD or default)`);
  console.log(`  Staff: ${STAFF_ACCOUNTS.map((s) => s.email).join(", ")}`);
  console.log(`  Customers (${CUSTOMER_ACCOUNTS.length}): ${CUSTOMER_ACCOUNTS.map((c) => c.email).join(", ")}`);
  console.log("\nSee scripts/DEMO_SEED_README.md for the default password and screenshot ideas.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
