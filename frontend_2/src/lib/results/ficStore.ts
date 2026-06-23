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
 * Capped, newest-wins. Pure localStorage; SSR-safe (guards on window).
 */
import type { Fic } from "@/lib/contracts";
import { ficId } from "@/lib/results/ficId";

const STORAGE_KEY = "ficfinder.fics";
const MAX_ENTRIES = 200;

type Store = Record<string, { fic: Fic; at: number }>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    // Enforce the cap: keep the most-recently-saved entries.
    const entries = Object.entries(store);
    if (entries.length > MAX_ENTRIES) {
      entries.sort((a, b) => b[1].at - a[1].at);
      store = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full/disabled — ignore */
  }
}

/** Save a fic (or several) so its detail page can render. Returns its id. */
export function saveFic(fic: Fic): string {
  const id = ficId(fic);
  const store = read();
  store[id] = { fic, at: Date.now() };
  write(store);
  return id;
}

export function saveFics(fics: Fic[]): void {
  if (!fics.length) return;
  const store = read();
  const now = Date.now();
  for (const fic of fics) store[ficId(fic)] = { fic, at: now };
  write(store);
}

/** Look up a saved fic by id. null if it was never opened in this browser. */
export function getFic(id: string): Fic | null {
  return read()[id]?.fic ?? null;
}
