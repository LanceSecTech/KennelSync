/**
 * Date utility functions to handle MySQL DATE fields correctly.
 *
 * MySQL DATE columns return strings like "2026-04-05" which JavaScript's
 * `new Date("2026-04-05")` interprets as UTC midnight. In timezones behind UTC
 * (e.g. US Eastern = UTC-4/5), this shifts the date back one day when displayed
 * with toLocaleDateString(). 
 *
 * These helpers append "T00:00:00" to force local-time interpretation.
 */

/** Parse a date string (or Date object) as local midnight, avoiding timezone shift */
export function parseLocalDate(dateValue: string | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  const str = typeof dateValue === "string" ? dateValue : dateValue.toISOString();
  // If it's just a date (YYYY-MM-DD), append T00:00:00 for local interpretation
  const dateOnly = str.split("T")[0];
  return new Date(dateOnly + "T00:00:00");
}

/** Format a date value to a localized date string (e.g. "4/5/2026") */
export function formatDate(dateValue: string | Date | null | undefined): string {
  const d = parseLocalDate(dateValue);
  if (!d) return "—";
  return d.toLocaleDateString();
}

/** Format a date value to YYYY-MM-DD string for form inputs and comparisons */
export function toDateString(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  const str = typeof dateValue === "string" ? dateValue : dateValue.toISOString();
  return str.split("T")[0];
}

/** Get today's date as YYYY-MM-DD in local timezone */
export function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
