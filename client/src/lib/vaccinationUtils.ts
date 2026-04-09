/** Normalizes vaccination rows from API (camelCase) or legacy snake_case. */

export type VaxLike = {
  vaccineName?: string | null;
  vaccine_name?: string | null;
  status?: string | null;
  dateAdministered?: string | null;
  date_administered?: string | null;
  expirationDate?: string | null;
  expiration_date?: string | null;
  documentUrl?: string | null;
  document_url?: string | null;
};

export function vaxName(v: VaxLike): string {
  const n = v.vaccineName ?? v.vaccine_name;
  return n == null ? "" : String(n).trim();
}

export function vaxStatusSafe(v: VaxLike): string {
  const s = v.status;
  return s && typeof s === "string" ? s : "current";
}

export function vaxDateGiven(v: VaxLike): string | undefined {
  const d = v.dateAdministered ?? v.date_administered;
  return d ? String(d) : undefined;
}

export function vaxExpires(v: VaxLike): string | undefined {
  const d = v.expirationDate ?? v.expiration_date;
  return d ? String(d) : undefined;
}

export function vaxDocUrl(v: VaxLike): string | undefined {
  const u = v.documentUrl ?? v.document_url;
  return u ? String(u) : undefined;
}

export function reqVaccineLabel(rv: { vaccineName?: string | null }): string {
  return rv.vaccineName == null ? "" : String(rv.vaccineName).trim();
}

/** True if this on-file vaccination satisfies the required vaccine label (name match + not expired/missing). */
export function vaxMeetsRequired(v: VaxLike, requiredLabel: string): boolean {
  const req = requiredLabel.trim().toLowerCase();
  if (!req) return false;
  const name = vaxName(v).toLowerCase();
  if (!name) return false;
  const st = vaxStatusSafe(v);
  return name === req && st !== "expired" && st !== "missing";
}
