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
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          user = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            kennelId: profile.kennel_id,
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
