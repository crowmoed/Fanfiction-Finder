"use client";

/**
 * ficStore.ts — local, on-demand cache of fics the user has clicked into.
 *
 * The detail page (/fic/[id]) is generated on-demand from the indexed data we
 * already have in the browser — no backend, no live scraping. When a result is
 * opened we save the full Fic here keyed by its stable id (see ficId), so the
 * route renders immediately and survives a refresh / back-button. It's
 * deliberately local-only (not a shareable public link).
 *
 * Capped, newest-wins. Backed by an in-memory mirror with write-through: reads
 * hit memory (no JSON.parse per lookup), writes update memory then persist. The
 * mirror is lazily hydrated from localStorage on first access. SSR-safe.
 */
import type { Fic } from "@/lib/contracts";
import { ficId } from "@/lib/results/ficId";
import {
  readJSON,
  isQuotaError,
  subscribeToStorageKey,
} from "@/lib/client/localStore";

const STORAGE_KEY = "ficfinder.fics";
const MAX_ENTRIES = 200;

type Entry = { fic: Fic; at: number };
type Store = Record<string, Entry>;

// In-memory mirror of the persisted store. `null` = not yet hydrated this session.
let cache: Store | null = null;

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (e) =>
      !!e &&
      typeof e === "object" &&
      typeof (e as Entry).at === "number" &&
      !!(e as Entry).fic &&
      typeof (e as Entry).fic === "object"
  );
}

// Invalidate our mirror when another tab opens a fic (writes this key).
let storageBound = false;
function ensureStorageSync() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  subscribeToStorageKey(STORAGE_KEY, () => {
    cache = null;
  });
}

/** Hydrate the in-memory mirror from localStorage once, then reuse it. */
function load(): Store {
  if (cache) return cache;
  ensureStorageSync();
  cache = readJSON(STORAGE_KEY, isStore, {});
  return cache;
}

/** Persist the in-memory mirror (after enforcing the cap), keeping both in sync. */
function persist(store: Store) {
  // Enforce the cap: keep the most-recently-saved entries.
  let entries = Object.entries(store).sort((a, b) => b[1].at - a[1].at);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(0, MAX_ENTRIES);
  cache = Object.fromEntries(entries);
  if (typeof window === "undefined") return;

  // On quota failure, halve the retained set and retry (opened fics are large).
  while (entries.length > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      return;
    } catch (err) {
      if (!isQuotaError(err)) return;
      entries = entries.slice(0, Math.floor(entries.length / 2));
      cache = Object.fromEntries(entries);
    }
  }
}

/** Save a fic (or several) so its detail page can render. Returns its id. */
export function saveFic(fic: Fic): string {
  const id = ficId(fic);
  const store = { ...load() };
  store[id] = { fic, at: Date.now() };
  persist(store);
  return id;
}

export function saveFics(fics: Fic[]): void {
  if (!fics.length) return;
  const store = { ...load() };
  const now = Date.now();
  for (const fic of fics) store[ficId(fic)] = { fic, at: now };
  persist(store);
}

/** Look up a saved fic by id. null if it was never opened in this browser. */
export function getFic(id: string): Fic | null {
  return load()[id]?.fic ?? null;
}
