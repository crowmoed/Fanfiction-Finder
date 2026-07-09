"use client";

/**
 * localStore.ts — shared primitives for the app's localStorage-backed stores
 * (history, results cache, fic store, saved searches, sidebar pins, pending ops).
 *
 * Every store keeps an in-memory mirror of a single localStorage key and exposes
 * a useSyncExternalStore-style pub/sub. These helpers centralize the three things
 * each store must get right and used to get subtly wrong:
 *
 *   1. read  — SSR-safe parse with a shape guard, so a stale / corrupt /
 *              hand-edited value falls back cleanly instead of poisoning the app.
 *   2. write — SSR-safe persist that reports whether it actually hit disk, so a
 *              quota failure is recoverable rather than silently "successful".
 *   3. sync  — a cross-tab `storage` listener so a change in another tab
 *              invalidates this tab's mirror and re-notifies subscribers.
 */

/** SSR-safe read: parse the key, shape-validate it, else return `fallback`. */
export function readJSON<T>(
  key: string,
  validate: (value: unknown) => value is T,
  fallback: T
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * SSR-safe write. Returns `true` if the value actually persisted, `false` on a
 * quota / disabled-storage failure — so callers that care (the results cache)
 * can evict and retry instead of assuming success.
 */
export function writeJSON(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** True for a DOMException raised because localStorage is out of quota. */
export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    // 22 = QuotaExceededError; 1014 = NS_ERROR_DOM_QUOTA_REACHED (Firefox).
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014)
  );
}

/**
 * Register a cross-tab sync listener for one storage key. The native `storage`
 * event only fires in *other* tabs (never the writing tab), so `onChange` runs
 * exactly when another tab mutated this key — the moment to drop the in-memory
 * mirror and re-read. A null `e.key` means `localStorage.clear()`; treat it as
 * "everything changed". Returns an unsubscribe fn; no-op on the server.
 */
export function subscribeToStorageKey(
  key: string,
  onChange: () => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === key || e.key === null) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
