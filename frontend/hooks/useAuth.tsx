'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { googleLogout } from '@react-oauth/google';

const TOKEN_KEY = 'semantic_archive_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: string;
  searches_used: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (credentialResponse: { credential?: string }) => Promise<void>;
  logout: () => void;
  getAuthHeader: () => Record<string, string>;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Token helpers — single source of truth for reading/writing the session token.
function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
function writeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard so React 18 StrictMode's double-mount doesn't run rehydrate twice.
  const didRehydrate = useRef(false);

  // Rehydrate the session on first mount by validating the stored token.
  //
  // IMPORTANT: only a genuine auth rejection (401/403) clears the token. A
  // transient failure — backend cold start (App Runner / Neon waking), 5xx, or a
  // network blip — must NOT delete the token, otherwise a refresh during a cold
  // start silently logs the user out. On those we keep the token and simply stay
  // un-rehydrated for this load; the next request (or refresh) can recover.
  useEffect(() => {
    if (didRehydrate.current) return;
    didRehydrate.current = true;

    const token = readToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as AuthUser;
          if (!cancelled) setUser(data);
        } else if (res.status === 401 || res.status === 403) {
          // Token is genuinely invalid/expired — clear it.
          clearToken();
        }
        // else: transient (5xx / network) — keep the token, try again next load.
      } catch {
        // Network error / backend unreachable — keep the token, do not log out.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-tab sync: if the token is removed (logout) or changed in another tab,
  // reflect it here so all tabs stay consistent.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== TOKEN_KEY) return;
      if (!e.newValue) {
        // Logged out elsewhere.
        setUser(null);
      } else if (e.newValue !== e.oldValue) {
        // Logged in (or switched account) elsewhere — re-validate.
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${e.newValue}` } })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => data && setUser(data as AuthUser))
          .catch(() => {});
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse.credential;
    if (!idToken) return;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    writeToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    // Clear the Google One-Tap / auto-select session too, so a subsequent visit
    // doesn't silently re-authenticate the same Google account.
    try {
      googleLogout();
    } catch {
      /* no-op if the GIS script isn't loaded */
    }
  }, []);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const token = readToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, []);

  const isLoggedIn = user !== null;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getAuthHeader, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
