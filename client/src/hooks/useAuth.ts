import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthUser = {
  id: string;
  email: string;
  role: 'owner' | 'employee' | 'customer';
  kennelId?: number;
};

export type SignupRole = 'customer' | 'employee' | 'owner';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setUser({
        id: data.id,
        email: data.email,
        role: data.role,
        kennelId: data.kennel_id,
      });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, name: string, role: SignupRole) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (error) throw error;

    return data;
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  }

  return {
    user,
    loading,
    session,
    signUp,
    signIn,
    signOut,
  };
}
