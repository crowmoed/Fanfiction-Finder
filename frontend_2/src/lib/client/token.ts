"use client";

/**
 * token.ts — persistence of the FicFinder JWT in the browser.
 *
 * Kept tiny and isolated so the storage mechanism (localStorage today; could
 * become an httpOnly cookie later) is swappable without touching callers. SSR
 * safe: every accessor guards on `window`.
 */

const TOKEN_KEY = "ficfinder.jwt";

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
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
