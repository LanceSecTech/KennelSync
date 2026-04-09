/** Kennel required-vaccine checks (mirrors client vaccinationUtils name matching). */

export type RawVax = {
  vaccine_name?: string | null;
  status?: string | null;
  expiration_date?: string | null;
};

function normName(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function normDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return String(d).split("T")[0];
}

/** Returns null if this required vaccine is satisfied for check-in; otherwise an issue descriptor. */
export function requiredVaccineIssueForStay(
  requiredLabel: string,
  dogVaxRows: RawVax[],
  checkInDate: string,
): { kind: "missing" | "expired" | "expires_before_stay"; label: string; detail: string } | null {
  const req = normName(requiredLabel);
  if (!req) return null;
  const rows = dogVaxRows.filter((v) => normName(v.vaccine_name) === req);
  const checkIn = normDate(checkInDate);
  if (!checkIn) return null;

  if (rows.length === 0) {
    return {
      kind: "missing",
      label: requiredLabel.trim(),
      detail: `${requiredLabel.trim()} — no vaccination on file`,
    };
  }

  for (const v of rows) {
    const st = normName(v.status || "current");
    if (st === "missing") continue;
    if (st === "expired") continue;
    const exp = normDate(v.expiration_date ?? undefined);
    if (exp && exp < checkIn) continue;
    return null;
  }

  const hasExpiredStatus = rows.some((v) => normName(v.status) === "expired");
  if (hasExpiredStatus) {
    return {
      kind: "expired",
      label: requiredLabel.trim(),
      detail: `${requiredLabel.trim()} — expired or marked expired`,
    };
  }

  const exps = rows
    .map((v) => normDate(v.expiration_date ?? undefined))
    .filter((x): x is string => !!x);
  const maxExp = exps.length ? exps.sort().at(-1)! : null;
  if (maxExp && maxExp < checkIn) {
    return {
      kind: "expires_before_stay",
      label: requiredLabel.trim(),
      detail: `${requiredLabel.trim()} — expires ${maxExp} before check-in ${checkIn}`,
    };
  }

  return {
    kind: "missing",
    label: requiredLabel.trim(),
    detail: `${requiredLabel.trim()} — not valid for this check-in`,
  };
}
