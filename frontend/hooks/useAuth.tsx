'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

const TOKEN_KEY = 'ficfinder_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  tier: string;
  searches_used: number;
  search_limit: number;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('[useAuth] Mount — token in localStorage:', token ? `${token.slice(0, 20)}...` : '(none)');

    if (!token) {
      console.log('[useAuth] No token found, skipping rehydration');
      setLoading(false);
      return;
    }

    console.log('[useAuth] Rehydrating user from /api/auth/me...');
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        console.log('[useAuth] /api/auth/me response:', res.status, res.statusText);
        if (!res.ok) throw new Error(`invalid token (${res.status})`);
        return res.json();
      })
      .then((data) => {
        console.log('[useAuth] Rehydrated user:', data?.email, 'tier:', data?.tier);
        setUser(data);
      })
      .catch((err) => {
        console.warn('[useAuth] Rehydration failed, clearing token:', err.message);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse.credential;
    console.log('[useAuth] login() called — id_token present:', !!idToken);

    if (!idToken) {
      console.warn('[useAuth] login() — no credential in response, aborting');
      return;
    }

    console.log('[useAuth] POSTing to /api/auth/login...');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });

    console.log('[useAuth] /api/auth/login response:', res.status, res.statusText);

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      console.error('[useAuth] Login failed:', res.status, body);
      throw new Error('Login failed');
    }

    const data = await res.json();
    console.log('[useAuth] Login success — user:', data.user?.email, 'token length:', data.token?.length);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const token = localStorage.getItem(TOKEN_KEY);
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
