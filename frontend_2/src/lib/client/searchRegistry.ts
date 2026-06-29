"use client";

/**
 * searchRegistry.ts — a tab-wide registry of in-flight (and recently-finished)
 * search operations, keyed by the canonical searchKey (q::fandom::strict).
 *
 * Why this exists: a search lives for several seconds and runs an expensive
 * remote pipeline. Before this, the live search state lived inside the /results
 * component's useState, so it was lost the moment that component unmounted
 * (navigation), and a second mount of the same search fired a *duplicate*
 * backend request.
 *
 * This registry is the single owner of a running search: the AbortController,
 * the SSE read loop, and the reduced SearchState all live here, keyed by the op.
 * useSearch() becomes a *subscriber* — starting a search that's already running
 * just attaches to the existing op (dedup, the same idea as React Query's shared
 * in-flight promise), and navigating away and back re-attaches to the still-
 * running op instead of restarting it.
 *
 * Completion side effects (cache the result set, record history, update any
 * followed search) fire here exactly once per op, so they no longer depend on
 * which component happens to be mounted — fixing a latent double-write when two
 * subscribers both observed the same "done".
 *
 * Persistence model: the live state is in-memory (per tab). What survives a
 * reload is (a) the finished result set via resultsCache and (b) a lightweight
 * "pending" marker (see pendingOps) so a search interrupted mid-flight by a
 * refresh is re-issued with a "resuming" affordance rather than silently lost.
 * The browser tears down an in-flight fetch on reload — it cannot be resumed,
 * only re-run. True cross-refresh *continuation* would need backend job state
 * (see backend/TODO.md) and is deliberately out of scope here.
 */

import {
  PIPELINE_STAGES,
  type Fic,
  type PipelineStageId,
  type SearchParams,
  type SearchStreamEvent,
  type StageStatus,
} from "@/lib/contracts";
import { getToken } from "@/lib/client/token";
import { searchKey, cacheResults } from "@/lib/results/resultsCache";
import { addHistory } from "@/lib/client/history";
import { recordCheck } from "@/lib/results/savedSearches";
import { saveFics } from "@/lib/results/ficStore";
import { markPending, clearPending } from "@/lib/client/pendingOps";

export type SearchPhase = "idle" | "searching" | "done" | "error";

export type StageState = Record<PipelineStageId, StageStatus | "pending">;

export interface SearchError {
  message: string;
  status?: number;
  requestId?: string;
  retryable: boolean;
}

export interface SearchState {
  phase: SearchPhase;
  stages: StageState;
  results: Fic[];
  count: number;
  elapsedMs: number | null;
  error: SearchError | null;
  /** The params of the in-flight / last search (handy for the UI + retry). */
  lastParams: SearchParams | null;
}

function initialStages(): StageState {
  return PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = "pending";
    return acc;
  }, {} as StageState);
}

function allDoneStages(): StageState {
  return PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = "done";
    return acc;
  }, {} as StageState);
}

export const INITIAL: SearchState = {
  phase: "idle",
  stages: initialStages(),
  results: [],
  count: 0,
  elapsedMs: null,
  error: null,
  lastParams: null,
};

interface SearchOp {
  key: string;
  state: SearchState;
  controller: AbortController | null;
  /** Whether the once-per-op completion side effects have run. */
  finalized: boolean;
}

// Module-level store, mirroring history.ts / savedSearches.ts: a Map of ops + a
// listener set, read through useSyncExternalStore. Each state change replaces
// the op object so subscribers see a new reference and re-render.
const ops = new Map<string, SearchOp>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The op for a key, or undefined. Stable reference between state changes. */
export function getOp(key: string): SearchOp | undefined {
  return ops.get(key);
}

/** True if a search for this key is currently live in this tab. */
export function hasRunningOp(key: string): boolean {
  return ops.get(key)?.state.phase === "searching";
}

function setOpState(key: string, update: (prev: SearchState) => SearchState) {
  const op = ops.get(key);
  if (!op) return;
  const next = update(op.state);
  if (next === op.state) return;
  ops.set(key, { ...op, state: next });
  emit();
}

/** Parse a raw SSE buffer into complete events, returning [events, remainder]. */
function drainSSE(buffer: string): [SearchStreamEvent[], string] {
  const events: SearchStreamEvent[] = [];
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";
  for (const frame of frames) {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const json = line.slice("data:".length).trim();
      if (!json) continue;
      try {
        events.push(JSON.parse(json) as SearchStreamEvent);
      } catch {
        /* skip malformed frame */
      }
    }
  }
  return [events, remainder];
}

function finalizeSuccess(
  key: string,
  params: SearchParams,
  fics: Fic[],
  count: number,
  elapsedMs: number
) {
  const op = ops.get(key);
  if (!op || op.finalized) return;
  ops.set(key, { ...op, finalized: true });
  // Completion side effects, exactly once per op (no longer tied to whichever
  // component is mounted): cache the set, save each fic for its on-demand /fic
  // page, log history, and update any followed search's "new since last check".
  cacheResults(params, fics, count, elapsedMs);
  saveFics(fics);
  addHistory(params, count);
  recordCheck(params, fics);
}

async function runSSE(key: string, params: SearchParams, controller: AbortController) {
  const qs = new URLSearchParams({
    q: params.q,
    fandom: params.fandom,
    limit: String(params.limit ?? 20),
    strict: String(params.strict ?? false),
  });

  const headers = new Headers({ accept: "text/event-stream" });
  const token = getToken();
  if (token) headers.set("authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`/api/search?${qs.toString()}`, { headers, signal: controller.signal });
  } catch {
    if (!controller.signal.aborted) {
      setOpState(key, (p) => ({
        ...p,
        phase: "error",
        error: { message: "Network error — could not start the search.", retryable: true },
      }));
    }
    clearPending(key);
    return;
  }

  if (!res.ok || !res.body) {
    let message = `Search failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) message = body.detail;
    } catch {
      /* keep generic */
    }
    setOpState(key, (p) => ({
      ...p,
      phase: "error",
      error: { message, status: res.status, retryable: res.status >= 500 },
    }));
    clearPending(key);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const [events, remainder] = drainSSE(buffer);
      buffer = remainder;
      for (const ev of events) {
        setOpState(key, (prev) => {
          switch (ev.type) {
            case "stage":
              return { ...prev, stages: { ...prev.stages, [ev.stage]: ev.status } };
            case "result":
              return {
                ...prev,
                phase: "done",
                results: ev.fics,
                count: ev.count,
                elapsedMs: ev.elapsed_ms,
              };
            case "error":
              return {
                ...prev,
                phase: "error",
                error: {
                  message: ev.message,
                  status: ev.status,
                  requestId: ev.request_id,
                  retryable: ev.retryable,
                },
              };
            default:
              return prev;
          }
        });
        if (ev.type === "result") {
          finalizeSuccess(key, params, ev.fics, ev.count, ev.elapsed_ms);
          clearPending(key);
        } else if (ev.type === "error") {
          clearPending(key);
        }
      }
    }
  } catch {
    if (!controller.signal.aborted) {
      setOpState(key, (p) => ({
        ...p,
        phase: "error",
        error: { message: "The search stream was interrupted.", retryable: true },
      }));
    }
    clearPending(key);
  } finally {
    const op = ops.get(key);
    if (op && op.controller === controller) ops.set(key, { ...op, controller: null });
  }
}

/**
 * Start a search, or attach to one already running for the same key. Returns the
 * op key the caller should subscribe to. A live search for this exact key is NOT
 * restarted — we dedup to a single backend request and let all callers share it.
 */
export function startSearch(params: SearchParams): string {
  const key = searchKey(params);
  const existing = ops.get(key);
  if (existing && existing.state.phase === "searching") return key;

  const controller = new AbortController();
  ops.set(key, {
    key,
    state: { ...INITIAL, phase: "searching", stages: initialStages(), lastParams: params },
    controller,
    finalized: false,
  });
  markPending(params);
  emit();
  void runSSE(key, params, controller);
  return key;
}

/**
 * Seed an op straight into "done" from a cached result set, skipping the live
 * pipeline. Used by /results to restore from the local cache. Marked finalized:
 * it came from cache, so its completion side effects already ran on the original
 * search and must not run again.
 */
export function hydrateOp(
  params: SearchParams,
  fics: Fic[],
  count: number,
  elapsedMs: number | null
): string {
  const key = searchKey(params);
  ops.get(key)?.controller?.abort();
  ops.set(key, {
    key,
    state: {
      ...INITIAL,
      phase: "done",
      stages: allDoneStages(),
      results: fics,
      count,
      elapsedMs,
      lastParams: params,
    },
    controller: null,
    finalized: true,
  });
  // Re-save the fics so their on-demand /fic/[id] pages render after a cache
  // restore too (cheap, write-through to the in-memory store).
  saveFics(fics);
  clearPending(key);
  emit();
  return key;
}

/** Abort a running op and drop it, so a later search for the same key re-runs. */
export function cancelOp(key: string): void {
  const op = ops.get(key);
  if (!op) return;
  op.controller?.abort();
  ops.delete(key);
  clearPending(key);
  emit();
}
