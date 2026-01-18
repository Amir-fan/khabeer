import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as Auth from "@/lib/_core/auth";

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
      setError(null);
      
      const [storedToken, storedUser] = await Promise.all([
        Auth.getSessionToken(),
        Auth.getUserInfo(),
      ]);

      // On web, cookie-based auth means token is null but user exists
      // On native, both token and user must exist
      if (Platform.OS === "web") {
        if (storedUser) {
          setUser(storedUser as any);
          setToken("cookie"); // Placeholder to indicate cookie-based auth
          console.log("[Auth] Restored session from storage (web cookie-based)");
        } else {
          console.log("[Auth] No stored session found");
        }
      } else {
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser as any);
          console.log("[Auth] Restored session from storage");
        } else {
          console.log("[Auth] No stored session found");
        }
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
        Auth.setSessionToken(authToken),
        Auth.setUserInfo(authUser as any),
      ]);
      // On web, token is not stored (cookie-based), but we set a placeholder
      setToken(Platform.OS === "web" ? "cookie" : authToken);
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
        Auth.removeSessionToken(),
        Auth.clearUserInfo(),
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

  // On web, user existence means authenticated (cookie-based)
  // On native, both user and token must exist
  const isAuthenticated = useMemo(() => {
    if (Platform.OS === "web") {
      return Boolean(user); // Web uses cookies, so user existence = authenticated
    }
    return Boolean(user && token); // Native requires both
  }, [user, token]);

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

