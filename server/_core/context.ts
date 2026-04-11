import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabase } from "./supabase";
import { resolveSessionDisplayName, trimStr } from "../lib/ownerDisplayName";

export type User = {
  id: string; // UUID from Supabase Auth
  email: string;
  name?: string;
  /** From `users.phone` when the column exists */
  phone?: string | null;
  role: 'owner' | 'employee' | 'customer';
  kennelId?: number;
  /** From `users.onboarding_completed` when the column exists */
  onboardingCompleted?: boolean;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  supabase: typeof supabase;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const authHeader = opts.req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      // Verify JWT with Supabase
      const { data, error } = await supabase.auth.getUser(token);
      
      if (data.user && !error) {
        // Fetch user profile from database (may not exist yet for fresh signups).
        let { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        const authMeta = (data.user.user_metadata || {}) as Record<string, unknown>;
        const metaNameRaw = authMeta.name;
        const metaName = typeof metaNameRaw === "string" ? metaNameRaw : null;

        if (!profile) {
          // Auto-provision public.users row from auth user metadata.
          const roleCandidate = String(authMeta.role || "customer");
          const role: User["role"] =
            roleCandidate === "owner" || roleCandidate === "employee" ? roleCandidate : "customer";
          const initialName = trimStr(metaName);
          const { data: inserted, error: insertError } = await supabase
            .from("users")
            .upsert(
              [
                {
                  id: data.user.id,
                  email: data.user.email || "",
                  role,
                  ...(initialName ? { name: initialName } : {}),
                },
              ],
              { onConflict: "id" }
            )
            .select("*")
            .maybeSingle();
          if (insertError) throw insertError;
          profile = inserted || null;
        }

        if (profile) {
          const rawKennelId = profile.kennel_id ?? profile.kennelId ?? null;
          const parsedKennelId =
            rawKennelId == null ? undefined : Number.isFinite(Number(rawKennelId)) ? Number(rawKennelId) : undefined;
          const rawPhone = profile.phone ?? profile.phone_number ?? null;
          const emailStr = String(profile.email || data.user.email || "");
          const displayName = resolveSessionDisplayName(
            profile as Record<string, unknown>,
            metaName,
            emailStr || null,
          );
          const rawOnboardingDone =
            profile.onboarding_completed ?? profile.onboardingCompleted ?? false;
          user = {
            id: profile.id,
            email: emailStr,
            name: displayName,
            phone: rawPhone != null && String(rawPhone).trim() !== "" ? String(rawPhone) : null,
            role: profile.role,
            kennelId: parsedKennelId,
            onboardingCompleted: Boolean(rawOnboardingDone),
          };
        }
      }
    }
  } catch (error) {
    // Token verification failed, user remains null
    console.error('Auth error:', error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    supabase,
  };
}
