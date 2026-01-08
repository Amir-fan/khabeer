import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";

const AUTH_TOKEN_KEY = "@khabeer_auth_token";
const AUTH_USER_KEY = "@khabeer_auth_user";

export type User = {
  id: number;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: string;
  tier: string;
  status: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load stored auth state on mount
  const loadStoredAuth = useCallback(async () => {
    try {
      setLoading(true);
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        console.log("[Auth] Restored session from storage");
      } else {
        console.log("[Auth] No stored session found");
      }
    } catch (err) {
      console.error("[Auth] Failed to load stored auth:", err);
      setError(err instanceof Error ? err : new Error("Failed to load auth"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Save auth state to storage
  const saveAuth = useCallback(async (authToken: string, authUser: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, authToken),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser)),
      ]);
      setToken(authToken);
      setUser(authUser);
      console.log("[Auth] Session saved to storage");
    } catch (err) {
      console.error("[Auth] Failed to save auth:", err);
    }
  }, []);

  // Clear auth state
  const clearAuth = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
      setToken(null);
      setUser(null);
      console.log("[Auth] Session cleared");
    } catch (err) {
      console.error("[Auth] Failed to clear auth:", err);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setLoading(true);
    await clearAuth();
    setLoading(false);
  }, [clearAuth]);

  // Initial load
  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const isAuthenticated = useMemo(() => Boolean(user && token), [user, token]);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    saveAuth,
    clearAuth,
    refresh: loadStoredAuth,
    logout,
  };
}

