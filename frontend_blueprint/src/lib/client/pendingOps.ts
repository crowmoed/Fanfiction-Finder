"use client";

/**
 * pendingOps.ts — a tiny localStorage marker of searches that were in flight.
 *
 * The browser kills an in-flight fetch when the page reloads, so a search the
 * user refreshed *mid-flight* can't be resumed — only re-issued. This records
 * which search keys are currently running so that, after a reload, the /results
 * page can tell "this was interrupted" apart from "this is a brand-new search"
 * and show a gentle "resuming…" affordance instead of looking like a fresh start.
 *
 * The search registry writes a marker when an op starts and removes it when the
 * op settles (done / error / cancel). Markers carry a timestamp and are purged
 * past a short TTL — a search can't outlive the 120s route cap, so anything
 * older is stale (e.g. a tab closed before its op finished).
 */
import type { SearchParams } from "@/lib/contracts";
import { searchKey } from "@/lib/results/resultsCache";

const STORAGE_KEY = "ficfinder.pending";
const TTL_MS = 3 * 60 * 1000; // > the 120s /api/search cap, so live ops never expire.

type PendingStore = Record<string, number>; // key -> started-at epoch ms

function persist(store: PendingStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full/disabled — ignore */
  }
}

function read(): PendingStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const store = raw ? (JSON.parse(raw) as PendingStore) : {};
    // Purge stale markers on every read so they never accumulate.
    const now = Date.now();
    let changed = false;
    for (const [k, at] of Object.entries(store)) {
      if (now - at >= TTL_MS) {
        delete store[k];
        changed = true;
      }
    }
    if (changed) persist(store);
    return store;
  } catch {
    return {};
  }
}

export function markPending(params: SearchParams): void {
  const store = read();
  store[searchKey(params)] = Date.now();
  persist(store);
}

export function clearPending(key: string): void {
  const store = read();
  if (key in store) {
    delete store[key];
    persist(store);
  }
}

/** True if a (non-stale) marker exists for this key — i.e. it was interrupted. */
export function wasPending(key: string): boolean {
  return key in read();
}
