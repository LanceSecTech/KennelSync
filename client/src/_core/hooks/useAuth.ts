import { getLoginUrl } from "@/const";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};
type SignupRole = "customer" | "employee" | "owner";

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // Always clear browser-side Supabase session first.
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Best effort: also call server logout to clear any server cookie/session state.
      try {
        await logoutMutation.mutateAsync();
      } catch (error: unknown) {
        if (
          error instanceof TRPCClientError &&
          error.data?.code === "UNAUTHORIZED"
        ) {
          // Already signed out server-side; safe to continue.
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      await meQuery.refetch();
    }
  }, [logoutMutation, meQuery, utils]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      await utils.auth.me.invalidate();
      await meQuery.refetch();
      return data;
    },
    [meQuery, utils]
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string, role: SignupRole) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (error) throw error;
      await utils.auth.me.invalidate();
      await meQuery.refetch();
      return data;
    },
    [meQuery, utils]
  );

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    signIn,
    signUp,
    logout,
  };
}
