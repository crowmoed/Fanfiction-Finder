"use client";

/**
 * useSearch.ts — React binding over the tab-wide search registry.
 *
 * The actual work — AbortController, the SSE read loop, the reduced state, and
 * the once-per-op completion side effects — lives in searchRegistry.ts, keyed by
 * the canonical search key. This hook is a thin *subscriber*: it tracks which op
 * the component cares about and re-renders when that op's state changes.
 *
 * Consequences for callers (e.g. /results): starting a search that's already
 * running just attaches to it (no duplicate backend request), and navigating
 * away and back re-attaches to the still-running op instead of restarting it.
 * The public shape is unchanged from the old component-local hook, so callers
 * and the type imports below keep working. See searchRegistry.ts for the why.
 */

import { useCallback, useState, useSyncExternalStore } from "react";

import type { Fic, SearchParams } from "@/lib/contracts";
import {
  INITIAL,
  cancelOp,
  getOp,
  hydrateOp,
  startSearch,
  subscribe,
  type SearchState,
} from "@/lib/client/searchRegistry";

// Re-exported so existing imports from "@/lib/client/useSearch" keep resolving.
export type {
  SearchPhase,
  StageState,
  SearchError,
  SearchState,
} from "@/lib/client/searchRegistry";

export function useSearch() {
  // The op key this component is currently observing (null until it searches).
  const [key, setKey] = useState<string | null>(null);

  const op = useSyncExternalStore(
    subscribe,
    () => (key ? getOp(key) : undefined),
    () => undefined // server snapshot — the registry is client-only
  );
  const state: SearchState = op?.state ?? INITIAL;

  const search = useCallback((params: SearchParams) => {
    setKey(startSearch(params));
  }, []);

  const hydrate = useCallback(
    (params: SearchParams, fics: Fic[], count: number, elapsedMs: number | null) => {
      setKey(hydrateOp(params, fics, count, elapsedMs));
    },
    []
  );

  const cancel = useCallback(() => {
    if (key) cancelOp(key);
  }, [key]);

  const reset = useCallback(() => {
    if (key) cancelOp(key);
    setKey(null);
  }, [key]);

  return { ...state, search, hydrate, cancel, reset };
}
