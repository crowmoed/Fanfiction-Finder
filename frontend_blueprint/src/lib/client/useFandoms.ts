"use client";

/**
 * useFandoms.ts — loads the supported fandoms and exposes them with a simple
 * loading/error state. The list changes only when the indexer runs, so we cache
 * it at three levels: the backend proxy (Next data cache), the browser (HTTP
 * cache-control), and here in-memory for the session — the in-flight promise is
 * shared so navigating between pages reuses one fetch instead of refetching on
 * every mount.
 */

import { useEffect, useState } from "react";

import { ALL_FANDOMS, type FandomOption } from "@/lib/contracts";
import { api } from "@/lib/client/api";

interface FandomsState {
  fandoms: FandomOption[];
  loading: boolean;
  error: string | null;
}

// Session-level cache: resolved data, or the in-flight promise so concurrent
// callers dedupe onto one request.
let cached: FandomOption[] | null = null;
let inflight: Promise<FandomOption[]> | null = null;

function loadFandoms(): Promise<FandomOption[]> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = api
    .fandoms()
    .then((data) => {
      cached = data.fandoms;
      return data.fandoms;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useFandoms(): FandomsState {
  const [state, setState] = useState<FandomsState>(() =>
    cached
      ? { fandoms: cached, loading: false, error: null }
      : { fandoms: [{ name: ALL_FANDOMS, collected: true }], loading: true, error: null }
  );

  useEffect(() => {
    if (cached) return; // already have it — no fetch
    let active = true;
    loadFandoms()
      .then((fandoms) => {
        if (active) setState({ fandoms, loading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setState((p) => ({ ...p, loading: false, error: err?.message ?? "Failed to load fandoms" }));
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
