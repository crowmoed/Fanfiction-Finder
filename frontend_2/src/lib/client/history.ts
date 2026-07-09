"use client";

/**
 * history.ts — local, privacy-preserving search history (localStorage).
 *
 * Stores just enough to repeat a search and show a reading log: the query, the
 * fandom, a timestamp, and the result count. No fic content is cached here; the
 * backend deliberately doesn't store query text either. Capped to a sane size.
 *
 * Exposed as a tiny pub/sub store + a useSearchHistory() hook so multiple
 * components stay in sync without a heavier state library.
 */

import { useSyncExternalStore } from "react";

import type { SearchParams } from "@/lib/contracts";
import { searchKey } from "@/lib/results/resultsCache";
import { pinKey, unpinKey } from "@/lib/client/sidebarPins";
import {
  readJSON,
  writeJSON,
  subscribeToStorageKey,
} from "@/lib/client/localStore";

const STORAGE_KEY = "ficfinder.history";
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  q: string;
  fandom: string;
  strict: boolean;
  resultCount: number | null;
  at: number; // epoch ms
}

let cache: HistoryEntry[] | null = null;
const listeners = new Set<() => void>();

function isHistory(value: unknown): value is HistoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof (e as HistoryEntry).id === "string" &&
        typeof (e as HistoryEntry).q === "string" &&
        typeof (e as HistoryEntry).at === "number"
    )
  );
}

function read(): HistoryEntry[] {
  if (cache) return cache;
  cache = readJSON(STORAGE_KEY, isHistory, []);
  return cache;
}

function write(next: HistoryEntry[]) {
  cache = next;
  writeJSON(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

export function addHistory(
  params: SearchParams,
  resultCount: number | null
): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    q: params.q,
    fandom: params.fandom,
    strict: Boolean(params.strict),
    resultCount,
    at: Date.now(),
  };
  const current = read();
  // De-dupe against the identical search — using the same canonical key the
  // results cache and pins use, so `strict` is part of the identity. Running the
  // same query with Strict toggled is a *different* search and keeps both rows.
  const entryKey = searchKey(entry);
  const deduped = current.filter((e) => searchKey(e) !== entryKey);
  write([entry, ...deduped].slice(0, MAX_ENTRIES));
  return entry;
}

export function clearHistory(): void {
  // Dropping every history row also orphans every pin (pins are keyed by search
  // identity and only reachable via a history row), so clear them together.
  for (const e of read()) unpinKey(pinKey(e.q, e.fandom, e.strict));
  write([]);
}

/** Remove a single history entry by id (no-op if it's already gone). */
export function removeHistory(id: string): void {
  const current = read();
  const target = current.find((e) => e.id === id);
  const next = current.filter((e) => e.id !== id);
  if (next.length !== current.length) {
    // Drop the matching pin too, unless another surviving row shares its key.
    if (target) {
      const key = pinKey(target.q, target.fandom, target.strict);
      if (!next.some((e) => pinKey(e.q, e.fandom, e.strict) === key)) {
        unpinKey(key);
      }
    }
    write(next);
  }
}

let storageBound = false;
function subscribe(listener: () => void): () => void {
  if (!storageBound) {
    storageBound = true;
    subscribeToStorageKey(STORAGE_KEY, () => {
      cache = null; // another tab changed history — re-read on next access.
      listeners.forEach((l) => l());
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: HistoryEntry[] = [];

export function useSearchHistory(): HistoryEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => EMPTY // server snapshot — history is client-only
  );
}
