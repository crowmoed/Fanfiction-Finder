"use client";

/**
 * token.ts — persistence of the FicFinder JWT in the browser.
 *
 * Kept tiny and isolated so the storage mechanism (localStorage today; could
 * become an httpOnly cookie later — note that with the current CSP allowing
 * 'unsafe-inline', localStorage has no XSS backstop, so this indirection is also
 * where that hardening would land) is swappable without touching callers. SSR
 * safe: every accessor guards on `window`.
 *
 * Exposes a subscription so auth state can react to token changes from anywhere —
 * a 401 handler clearing the token in this tab, or a sign-out in another tab
 * (via the cross-tab `storage` event) — without a full reload.
 */

import { subscribeToStorageKey } from "@/lib/client/localStore";

const TOKEN_KEY = "ficfinder.jwt";
const listeners = new Set<() => void>();
let crossTabBound = false;

function notify(): void {
  listeners.forEach((l) => l());
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage disabled — ignore */
  }
  notify();
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/**
 * Clear the token if `status` is an auth rejection (401/403). Returns whether it
 * cleared — so a shared 401 seen outside the auth context (search proxy, billing
 * redirect) can drop a dead session in-place, and the auth provider (subscribed
 * below) flips to anonymous without a reload.
 */
export function clearTokenIfUnauthorized(status: number): boolean {
  if (status === 401 || status === 403) {
    clearToken();
    return true;
  }
  return false;
}

/** Subscribe to token changes (same-tab writes/clears and cross-tab sign-outs). */
export function subscribeToken(listener: () => void): () => void {
  if (!crossTabBound) {
    crossTabBound = true;
    subscribeToStorageKey(TOKEN_KEY, notify);
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
