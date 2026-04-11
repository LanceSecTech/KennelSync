/**
 * Shared seed identifiers for local/staging Supabase only (no secrets).
 * Names and emails are fictional but formatted like real business and consumer accounts.
 */

/** Kennel display name — no internal/testing wording */
export const SEED_KENNEL_NAME = "Riverbend Pet Lodge";

export const DEMO_STATE_FILE = "scripts/.demo-seed-state.json";

export const OWNER_NAME = "Morgan Hale";
export const OWNER_EMAIL = "morgan.hale@riverbendpetlodge.com";

/** Front desk, kennel, and grooming — same domain as the business */
export const STAFF_ACCOUNTS = [
  { name: "Avery Chen", email: "avery.chen@riverbendpetlodge.com" },
  { name: "Jordan Okonkwo", email: "jordan.okonkwo@riverbendpetlodge.com" },
  { name: "Sam Rivera", email: "sam.rivera@riverbendpetlodge.com" },
] as const;

/** Ten customer accounts — varied personal email providers, no numbered patterns */
export const CUSTOMER_ACCOUNTS = [
  { name: "Sarah Whitfield", email: "s.whitfield82@gmail.com" },
  { name: "James Nolan", email: "james.nolan.pdx@yahoo.com" },
  { name: "Priya Sharma", email: "priya.sharma.oregon@gmail.com" },
  { name: "Marcus Reed", email: "marcus.reed@outlook.com" },
  { name: "Elena Vasquez", email: "elena.v.park@icloud.com" },
  { name: "David Collins", email: "d.collins.work@gmail.com" },
  { name: "Chris Murphy", email: "cmurphywrites@gmail.com" },
  { name: "Olivia Bennett", email: "olivia.bennett@me.com" },
  { name: "Daniel Foster", email: "daniel.foster@hotmail.com" },
  { name: "Michelle Hayes", email: "michelle.hayes.pdx@gmail.com" },
] as const;

/** Every auth email created by the seed — used by reset to delete the right users */
export function allSeedAuthEmails(): string[] {
  return [
    OWNER_EMAIL,
    ...STAFF_ACCOUNTS.map((s) => s.email),
    ...CUSTOMER_ACCOUNTS.map((c) => c.email),
  ];
}
