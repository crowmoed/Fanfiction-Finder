"use client";

/**
 * auth.tsx — app-wide auth state.
 *
 * Flow: the browser gets a Google ID token (via Google Identity Services), we
 * POST it to /api/auth/login, get back { token, user }, persist the JWT, and
 * hold the user in context. On mount, if a token exists we revalidate via
 * /api/auth/me. Sign-out clears the token.
 *
 * `loginWithIdToken` is exposed directly so the demo harness (and tests) can
 * drive auth without a real Google popup.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { User } from "@/lib/contracts";
import { api, ApiError } from "@/lib/client/api";
import {
  clearToken,
  getToken,
  setToken,
  subscribeToken,
} from "@/lib/client/token";
import { isDemoMode } from "@/lib/demo/demoMode";
import { DEMO_USER } from "@/lib/demo/fixtures";

// "unreachable": we hold a token but couldn't verify it (network / server error,
// not a rejection) — distinct from "anonymous" so the UI can offer a retry
// instead of a misleading "you're signed out".
type AuthStatus = "loading" | "authenticated" | "anonymous" | "unreachable";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Exchange a Google ID token for a session. */
  loginWithIdToken: (idToken: string) => Promise<void>;
  /** Re-fetch the current user (e.g. after an upgrade). */
  refresh: () => Promise<void>;
  signOut: () => void;
  /**
   * Dev-only: inject a fake signed-in user without a backend or token. Used by
   * the /dev seed page to preview the authenticated UI. Pass null to clear back
   * to anonymous. No network, no token persisted — purely in-memory.
   */
  setDevUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    // Demo mode: a fake signed-in account, no token or backend. This runs on
    // mount and on every token change, so the demo stays signed in across reloads.
    if (isDemoMode()) {
      setUser(DEMO_USER);
      setStatus("authenticated");
      return;
    }
    if (!getToken()) {
      setUser(null);
      setStatus("anonymous");
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      const rejected =
        err instanceof ApiError && (err.status === 401 || err.status === 403);
      if (rejected) {
        // Token genuinely rejected/expired — drop it and go anonymous.
        clearToken();
        setUser(null);
        setStatus("anonymous");
      } else {
        // Network / 5xx — the token may still be valid. Keep it and surface a
        // recoverable "unreachable" state instead of a false sign-out.
        setUser(null);
        setStatus("unreachable");
      }
    }
  }, []);

  const loginWithIdToken = useCallback(async (idToken: string) => {
    const { token, user: u } = await api.login(idToken);
    setToken(token);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const setDevUser = useCallback((u: User | null) => {
    setUser(u);
    setStatus(u ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    void refresh();
    // Re-validate whenever the token changes from outside this context: a 401
    // handler clearing a dead session (search proxy / billing), or a sign-out in
    // another tab. refresh() with no token resolves cleanly to anonymous.
    return subscribeToken(() => {
      void refresh();
    });
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, loginWithIdToken, refresh, signOut, setDevUser }),
    [status, user, loginWithIdToken, refresh, signOut, setDevUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
