import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, getCurrentUser, signOut as supabaseSignOut } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type User = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: Date;
};

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null;
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || null,
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || null,
      phone: supabaseUser.phone || supabaseUser.user_metadata?.phone || null,
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
      role: supabaseUser.user_metadata?.role || 'user',
      createdAt: new Date(supabaseUser.created_at),
    };
  };

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log("[useAuth] Session:", currentSession ? "present" : "missing");
      
      setSession(currentSession);
      
      if (currentSession?.user) {
        const mappedUser = mapSupabaseUser(currentSession.user);
        setUser(mappedUser);
        console.log("[useAuth] User set:", mappedUser);
      } else {
        setUser(null);
        console.log("[useAuth] No authenticated user");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabaseSignOut();
      if (error) {
        console.error("[useAuth] Logout error:", error);
      }
    } catch (err) {
      console.error("[useAuth] Logout failed:", err);
    } finally {
      setUser(null);
      setSession(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user && session), [user, session]);

  // Listen to auth state changes
  useEffect(() => {
    console.log("[useAuth] Setting up auth state listener");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("[useAuth] Auth state changed:", event);
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          const mappedUser = mapSupabaseUser(currentSession.user);
          setUser(mappedUser);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Initial fetch
    if (autoFetch) {
      fetchUser();
    } else {
      setLoading(false);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      hasSession: !!session,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, session, loading, isAuthenticated, error]);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
