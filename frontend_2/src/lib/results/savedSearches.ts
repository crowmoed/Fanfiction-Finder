"use client";

/**
 * savedSearches.ts — "saved searches" (a.k.a. feeds / alerts).
 *
 * The #1 missing feature for archive-search tools: pin a search, then later see
 * what's NEW since you last ran it. History records *that* you searched; this
 * records a search you want to *follow*, plus a snapshot of the fic ids it
 * returned last time. Re-running the search and diffing against that snapshot
 * yields the "N new results" badge — entirely client-side, no backend change
 * (it just re-runs the existing search and compares ids).
 *
 * Local-only, pub/sub via useSyncExternalStore so the saved-searches page and
 * any "save" button stay in sync. Keyed by the canonical search key.
 */
import { useSyncExternalStore } from "react";

import type { Fic, SearchParams } from "@/lib/contracts";
import { searchKey } from "@/lib/results/resultsCache";
import { ficId } from "@/lib/results/ficId";
import {
  readJSON,
  writeJSON,
  subscribeToStorageKey,
} from "@/lib/client/localStore";

const STORAGE_KEY = "ficfinder.saved";

export interface SavedSearch {
  key: string;
  params: SearchParams;
  /** fic ids seen the last time this search was run/checked. */
  seenIds: string[];
  /** ids that are new since the previous check (computed on re-run). */
  newIds: string[];
  createdAt: number;
  lastCheckedAt: number;
}

type Store = Record<string, SavedSearch>;

let cache: Store | null = null;
const listeners = new Set<() => void>();

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (e) =>
      !!e &&
      typeof e === "object" &&
      typeof (e as SavedSearch).key === "string" &&
      Array.isArray((e as SavedSearch).seenIds) &&
      typeof (e as SavedSearch).createdAt === "number"
  );
}

function read(): Store {
  if (cache) return cache;
  cache = readJSON(STORAGE_KEY, isStore, {});
  return cache;
}

function write(next: Store) {
  cache = next;
  writeJSON(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

export function isSaved(params: SearchParams): boolean {
  return Boolean(read()[searchKey(params)]);
}

/** Pin a search, snapshotting the current result ids as "seen". */
export function saveSearch(params: SearchParams, fics: Fic[]): void {
  const key = searchKey(params);
  const store = { ...read() };
  const now = Date.now();
  store[key] = {
    key,
    params,
    seenIds: fics.map(ficId),
    newIds: [],
    createdAt: store[key]?.createdAt ?? now,
    lastCheckedAt: now,
  };
  write(store);
}

export function unsaveSearch(params: SearchParams): void {
  const key = searchKey(params);
  const store = { ...read() };
  delete store[key];
  write(store);
}

/**
 * Re-insert a previously-saved record exactly as it was (REDESIGN-SPEC §6.3):
 * unlike `saveSearch`, which snapshots seenIds fresh and resets createdAt for a
 * brand-new follow, this restores the whole `SavedSearch` object as-is so an
 * Unfollow → Undo doesn't lose the "N new" badge or the original follow date.
 * No-op if a record for this key already exists (don't clobber a re-follow).
 */
export function restoreSearch(record: SavedSearch): void {
  const store = read();
  if (record.key in store) return;
  write({ ...store, [record.key]: record });
}

export function toggleSaveSearch(params: SearchParams, fics: Fic[]): boolean {
  if (isSaved(params)) {
    unsaveSearch(params);
    return false;
  }
  saveSearch(params, fics);
  return true;
}

/**
 * Update a saved search with a freshly-run result set: compute which ids are new
 * vs. the last snapshot, store them as `newIds`, and advance the seen set.
 * Returns the new ids. No-op (returns []) if the search isn't saved.
 */
export function recordCheck(params: SearchParams, fics: Fic[]): string[] {
  const key = searchKey(params);
  const store = read();
  const existing = store[key];
  if (!existing) return [];
  const currentIds = fics.map(ficId);
  const seen = new Set(existing.seenIds);
  const newIds = currentIds.filter((id) => !seen.has(id));
  const next = { ...store };
  next[key] = {
    ...existing,
    seenIds: currentIds,
    newIds,
    lastCheckedAt: Date.now(),
  };
  write(next);
  return newIds;
}

let storageBound = false;
function subscribe(listener: () => void): () => void {
  if (!storageBound) {
    storageBound = true;
    subscribeToStorageKey(STORAGE_KEY, () => {
      cache = null; // another tab changed saved searches — re-read next access.
      listeners.forEach((l) => l());
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: SavedSearch[] = [];

// Memoized snapshot: useSyncExternalStore requires getSnapshot to return a
// stable reference between changes (else it loops). We recompute the sorted
// array only when the underlying store object identity changes (i.e. on write).
let snapStore: Store | null = null;
let snapResult: SavedSearch[] = EMPTY;

function getSnapshot(): SavedSearch[] {
  const store = read();
  if (store !== snapStore) {
    snapStore = store;
    snapResult = Object.values(store).sort((a, b) => b.createdAt - a.createdAt);
  }
  return snapResult;
}

export function useSavedSearches(): SavedSearch[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
