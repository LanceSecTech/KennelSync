import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { supabase } from "./supabase";

export type User = {
  id: string; // UUID from Supabase Auth
  email: string;
  name?: string;
  role: 'owner' | 'employee' | 'customer';
  kennelId?: number;
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

        if (!profile) {
          // Auto-provision public.users row from auth user metadata.
          const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
          const roleCandidate = String(meta.role || "customer");
          const role: User["role"] =
            roleCandidate === "owner" || roleCandidate === "employee" ? roleCandidate : "customer";
          const { data: inserted, error: insertError } = await supabase
            .from("users")
            .upsert(
              [
                {
                  id: data.user.id,
                  email: data.user.email || "",
                  role,
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
          user = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            kennelId: parsedKennelId,
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
