/**
 * Shared client-side rules for showing the signed-in user (backed by `auth.me` / `User` from API).
 * Server should populate `user.name` via `resolveSessionDisplayName`; these helpers handle edge cases.
 */

/** True when `name` looks like a real person label (not empty, not the email, not an email-shaped string). */
export function hasRealProfileName(
  user: { name?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  const n = String(user.name ?? "").trim();
  const e = String(user.email ?? "").trim().toLowerCase();
  if (!n) return false;
  if (n.includes("@")) return false;
  if (e && n.toLowerCase() === e) return false;
  return true;
}

/** Profile / account summary: real name when available, otherwise email, then last resort. */
export function accountDisplayName(
  user: { name?: string | null; email?: string | null } | null | undefined,
): string {
  if (!user) return "User";
  if (hasRealProfileName(user)) return String(user.name).trim();
  const e = String(user.email ?? "").trim();
  if (e) return e;
  return String(user.name ?? "").trim() || "User";
}

/**
 * Short greeting token: first name only when we have a real profile name; otherwise “there”
 * (avoids showing email local-part as a fake name).
 */
export function accountGreetingFirstName(
  user: { name?: string | null; email?: string | null } | null | undefined,
): string {
  if (!hasRealProfileName(user)) return "there";
  const n = String(user!.name!).trim();
  return n.split(/\s+/)[0] || "there";
}
