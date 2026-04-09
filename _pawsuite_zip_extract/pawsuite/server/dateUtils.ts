/**
 * Server-side date utilities for handling MySQL DATE fields.
 *
 * MySQL DATE columns may return Date objects interpreted at UTC midnight.
 * When the server runs in a non-UTC timezone, `toISOString().split('T')[0]`
 * works correctly (since toISOString always returns UTC), but
 * `new Date("2026-04-05")` can shift when used with local methods.
 *
 * These helpers ensure consistent YYYY-MM-DD string extraction.
 */

/** Extract YYYY-MM-DD string from a Date or string value */
export function toDateStr(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    // Already a string like "2026-04-05" or "2026-04-05T00:00:00.000Z"
    return value.split("T")[0];
  }
  // Date object - use UTC methods to avoid timezone shift
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Get today's date as YYYY-MM-DD in local server timezone */
export function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
