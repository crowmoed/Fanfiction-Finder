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

const STORAGE_KEY = "ficfinder.fics";
const MAX_ENTRIES = 200;

type Store = Record<string, { fic: Fic; at: number }>;

// In-memory mirror of the persisted store. `null` = not yet hydrated this session.
let cache: Store | null = null;

/** Hydrate the in-memory mirror from localStorage once, then reuse it. */
function load(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
}

/** Persist the in-memory mirror (after enforcing the cap), keeping both in sync. */
function persist(store: Store) {
  // Enforce the cap: keep the most-recently-saved entries.
  let next = store;
  const entries = Object.entries(store);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b[1].at - a[1].at);
    next = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
  }
  cache = next;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full/disabled — the in-memory mirror still holds this session. */
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
