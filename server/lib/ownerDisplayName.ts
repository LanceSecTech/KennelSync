import type { SupabaseClient } from "@supabase/supabase-js";

export function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * A string is usable as a person's display name if non-empty and not just a duplicate of their email.
 */
export function isUsableDisplayName(name: string, email: string): boolean {
  const n = name.trim();
  if (!n) return false;
  const e = email.trim().toLowerCase();
  if (!e) return true;
  return n.toLowerCase() !== e;
}

/**
 * Prefer a real profile name; fall back to full email, then a generic label.
 */
export function resolveOwnerDisplayName(
  row: Record<string, unknown> | null | undefined,
  authMetadataName: string | null | undefined,
  email: string | null | undefined,
): string {
  const e = trimStr(email);
  const fromRow = trimStr(row?.name ?? (row as { full_name?: unknown })?.full_name);
  const fromAuth = trimStr(authMetadataName);

  if (isUsableDisplayName(fromRow, e)) return fromRow;
  if (isUsableDisplayName(fromAuth, e)) return fromAuth;
  return e || "Owner";
}

/** Combine optional first/last from a profile row (snake_case or camelCase). */
export function combinedFirstLastName(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const a = trimStr(
    (row as { first_name?: unknown }).first_name ?? (row as { firstName?: unknown }).firstName,
  );
  const b = trimStr(
    (row as { last_name?: unknown }).last_name ?? (row as { lastName?: unknown }).lastName,
  );
  return [a, b].filter(Boolean).join(" ").trim();
}

/**
 * Signed-in user label for `auth.me` (never returns "Owner").
 * Order: profile name, full_name, first+last, auth metadata name, then email, then "User".
 */
export function resolveSessionDisplayName(
  profileRow: Record<string, unknown> | null | undefined,
  authMetadataName: string | null | undefined,
  email: string | null | undefined,
): string {
  const e = trimStr(email);
  const fromRow = trimStr(profileRow?.name ?? (profileRow as { full_name?: unknown })?.full_name);
  const fromParts = combinedFirstLastName(profileRow);
  const fromAuth = trimStr(authMetadataName);
  for (const c of [fromRow, fromParts, fromAuth]) {
    if (isUsableDisplayName(c, e)) return c;
  }
  return e || "User";
}

type AdminGetUser = (id: string) => Promise<{
  data: { user: { user_metadata?: Record<string, unknown> } } | null;
  error: { message: string } | null;
}>;

/** Load display names from Supabase Auth user_metadata (service role). Chunked to limit parallel admin calls. */
export async function fetchAuthMetadataNames(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const admin = (supabase.auth as { admin?: { getUserById: AdminGetUser } }).admin;
  if (!admin?.getUserById || userIds.length === 0) return out;

  const chunkSize = 12;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data, error } = await admin.getUserById(id);
          if (error || !data?.user?.user_metadata) return;
          const raw = data.user.user_metadata.name;
          const n = typeof raw === "string" ? raw.trim() : "";
          if (n) out.set(id, n);
        } catch {
          /* ignore per-user failures */
        }
      }),
    );
  }
  return out;
}

/** Resolve display names for many `users` rows (DB + optional Auth metadata). */
export async function resolveDisplayNamesForUsers(
  supabase: SupabaseClient,
  userRows: Array<Record<string, any>>,
): Promise<Map<string, string>> {
  if (!userRows.length) return new Map();
  const needAuth = userRows
    .filter((u) => !isUsableDisplayName(trimStr(u.name ?? u.full_name), trimStr(u.email)))
    .map((u) => String(u.id));
  const authMeta = await fetchAuthMetadataNames(supabase, needAuth);
  const out = new Map<string, string>();
  for (const u of userRows) {
    const id = String(u.id);
    out.set(id, resolveOwnerDisplayName(u, authMeta.get(id) ?? null, u.email));
  }
  return out;
}
