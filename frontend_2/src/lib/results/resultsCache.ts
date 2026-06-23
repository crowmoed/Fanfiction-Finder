"use client";

/**
 * resultsCache.ts — local cache of full result sets, keyed by the search.
 *
 * Searches are expensive to regenerate (the LLM pipeline), so once a search
 * resolves we cache the whole result set keyed by a canonical key derived from
 * its params (q + fandom + strict). The /results page is then restorable purely
 * from its URL: open /results?q=…&fandom=…, we rebuild the key, find the cache,
 * and show the exact results instantly — no backend, no re-run. Bookmarking the
 * URL "just works", and history entries are plain links to these URLs.
 *
 * Local-only by design (like the /fic pages). Capped, newest-wins, with a TTL so
 * stale snapshots eventually fall out.
 */
import type { Fic, SearchParams } from "@/lib/contracts";

const STORAGE_KEY = "ficfinder.results";
const MAX_ENTRIES = 60;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — corpus is a static snapshot anyway.

export interface CachedResults {
  key: string;
  params: SearchParams;
  fics: Fic[];
  count: number;
  elapsedMs: number | null;
  at: number; // epoch ms
}

type Store = Record<string, CachedResults>;

/**
 * Canonical, stable key for a search. Normalizes the query (trim + lowercase +
 * collapse whitespace) so trivially-different spellings of the same search hit
 * the same cache entry, and matches the URL params the /results page builds.
 */
export function searchKey(params: SearchParams): string {
  const q = params.q.trim().toLowerCase().replace(/\s+/g, " ");
  const fandom = params.fandom;
  const strict = Boolean(params.strict);
  return `${q}::${fandom}::${strict}`;
}

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
    let entries = Object.values(store);
    // Drop expired, then enforce the cap (keep most recent).
    const now = Date.now();
    entries = entries.filter((e) => now - e.at < TTL_MS);
    entries.sort((a, b) => b.at - a.at);
    entries = entries.slice(0, MAX_ENTRIES);
    const next: Store = {};
    for (const e of entries) next[e.key] = e;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full/disabled — ignore */
  }
}

/** Cache a resolved result set. */
export function cacheResults(
  params: SearchParams,
  fics: Fic[],
  count: number,
  elapsedMs: number | null
): void {
  const store = read();
  const key = searchKey(params);
  store[key] = { key, params, fics, count, elapsedMs, at: Date.now() };
  write(store);
}

/** Restore a cached result set for these params, or null (miss / expired). */
export function getCachedResults(params: SearchParams): CachedResults | null {
  const entry = read()[searchKey(params)];
  if (!entry) return null;
  if (Date.now() - entry.at >= TTL_MS) return null;
  return entry;
}

/** True if a fresh (non-expired) cache exists for these params. */
export function hasCachedResults(params: SearchParams): boolean {
  return getCachedResults(params) !== null;
}
