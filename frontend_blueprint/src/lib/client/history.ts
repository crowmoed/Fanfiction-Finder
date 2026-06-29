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

function read(): HistoryEntry[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: HistoryEntry[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full/disabled — keep in-memory copy */
  }
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
  // De-dupe consecutive identical queries; newest first; cap length.
  const deduped = current.filter((e) => !(e.q === entry.q && e.fandom === entry.fandom));
  write([entry, ...deduped].slice(0, MAX_ENTRIES));
  return entry;
}

export function clearHistory(): void {
  write([]);
}

function subscribe(listener: () => void): () => void {
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
