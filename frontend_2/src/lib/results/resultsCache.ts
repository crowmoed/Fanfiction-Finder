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
 * stale snapshots eventually fall out. Backed by an in-memory mirror with
 * write-through: reads hit memory (no JSON.parse of the whole store per lookup),
 * writes update memory then persist. The mirror is hydrated lazily on first use.
 */
import type { Fic, SearchParams, SearchVariant } from "@/lib/contracts";
import {
  readJSON,
  isQuotaError,
  subscribeToStorageKey,
} from "@/lib/client/localStore";

const STORAGE_KEY = "ficfinder.results";
const MAX_ENTRIES = 60;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — corpus is a static snapshot anyway.

export interface CachedResults {
  key: string;
  params: SearchParams;
  fics: Fic[];
  count: number;
  elapsedMs: number | null;
  /** Pre-fusion per-variant lists, so the board's "by rewritten prompt" slice
   *  survives a cache restore (a revisit is the common path, not the exception).
   *  Absent for searches cached before this field existed → honest fallback. */
  variants?: SearchVariant[];
  at: number; // epoch ms
}

type Store = Record<string, CachedResults>;

// In-memory mirror of the persisted store. `null` = not yet hydrated this session.
let cache: Store | null = null;

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (e) =>
      !!e &&
      typeof e === "object" &&
      typeof (e as CachedResults).key === "string" &&
      Array.isArray((e as CachedResults).fics) &&
      typeof (e as CachedResults).at === "number"
  );
}

// A change in another tab (new search cached, cache cleared) invalidates our
// mirror so the next read re-hydrates. No subscribers here — reads are on-demand.
let storageBound = false;
function ensureStorageSync() {
  if (storageBound || typeof window === "undefined") return;
  storageBound = true;
  subscribeToStorageKey(STORAGE_KEY, () => {
    cache = null;
  });
}

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

/** Hydrate the in-memory mirror from localStorage once, then reuse it. */
function load(): Store {
  if (cache) return cache;
  ensureStorageSync();
  cache = readJSON(STORAGE_KEY, isStore, {});
  return cache;
}

/**
 * Persist the mirror (after TTL prune + cap), keeping memory and storage in sync.
 * Result sets are the app's largest localStorage payload (up to MAX_ENTRIES full
 * `Fic[]` with summaries, tags, and meta blobs), so a quota failure is realistic
 * — when it hits, halve the retained set and retry rather than silently dropping
 * the write while the in-memory mirror reports success.
 */
function persist(store: Store) {
  const now = Date.now();
  let entries = Object.values(store)
    .filter((e) => now - e.at < TTL_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ENTRIES);

  const build = (list: CachedResults[]): Store => {
    const next: Store = {};
    for (const e of list) next[e.key] = e;
    return next;
  };

  cache = build(entries);
  if (typeof window === "undefined") return;

  // Try to persist; on quota errors, evict the oldest half and retry until it
  // fits or there's nothing left to shed.
  while (entries.length > 0) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      return;
    } catch (err) {
      if (!isQuotaError(err)) return; // disabled storage etc. — keep memory only.
      entries = entries.slice(0, Math.floor(entries.length / 2));
      cache = build(entries);
    }
  }
}

/** Cache a resolved result set. */
export function cacheResults(
  params: SearchParams,
  fics: Fic[],
  count: number,
  elapsedMs: number | null,
  variants?: SearchVariant[]
): void {
  const store = { ...load() };
  const key = searchKey(params);
  store[key] = { key, params, fics, count, elapsedMs, variants, at: Date.now() };
  persist(store);
}

/** Restore a cached result set for these params, or null (miss / expired). */
export function getCachedResults(params: SearchParams): CachedResults | null {
  const entry = load()[searchKey(params)];
  if (!entry) return null;
  if (Date.now() - entry.at >= TTL_MS) return null;
  return entry;
}

/** True if a fresh (non-expired) cache exists for these params. */
export function hasCachedResults(params: SearchParams): boolean {
  return getCachedResults(params) !== null;
}
