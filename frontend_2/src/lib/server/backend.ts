/**
 * backend.ts — the ONLY module that knows the backend's URL.
 *
 * Server-only. Importing this from a client component is a build error because
 * it reads process.env.BACKEND_URL, which is undefined in the browser. Every
 * server route in src/app/api/* funnels through here so the contract with the
 * backend lives in exactly one place.
 */
import "server-only";

import type { BackendError } from "@/lib/contracts";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(
  /\/+$/,
  ""
);

/** A backend call that failed, carrying the upstream status + parsed detail. */
export class BackendCallError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public requestId?: string
  ) {
    super(detail);
    this.name = "BackendCallError";
  }

  /** True for statuses where a retry could plausibly succeed. */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export interface BackendRequestInit extends Omit<RequestInit, "body"> {
  /** JSON body — serialized and sent with the right content-type. */
  json?: unknown;
  /** Bearer token forwarded as Authorization. */
  token?: string | null;
  /** Per-request timeout (ms). Search needs a long one; default is generous. */
  timeoutMs?: number;
  /**
   * Seconds to cache this GET in Next's data cache. Omit (default) for no
   * caching — per-user or expensive calls (search, auth) must stay uncached.
   * Set only for near-static, non-authed data (e.g. the fandom list).
   */
  revalidate?: number;
  /**
   * Number of automatic retries for transient failures (network error or 5xx),
   * using exponential backoff with jitter. Default 0 (no retry). Only enable for
   * idempotent GETs — never for writes or the streaming search.
   */
  retries?: number;
  /**
   * Deduplicate concurrent identical in-flight GETs: a second call with the same
   * method+path+token while the first is in flight shares its promise instead of
   * issuing a duplicate upstream request. Default false.
   */
  dedupe?: boolean;
}

function buildHeaders(init: BackendRequestInit): Headers {
  const headers = new Headers(init.headers);
  if (init.json !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }
  return headers;
}

async function parseError(res: Response): Promise<BackendCallError> {
  let detail = `Backend responded ${res.status}`;
  let requestId: string | undefined =
    res.headers.get("x-request-id") ?? undefined;
  try {
    const body = (await res.json()) as Partial<BackendError>;
    if (body?.detail) detail = body.detail;
    if (body?.request_id) requestId = body.request_id;
  } catch {
    // Non-JSON error body — keep the generic detail.
  }
  return new BackendCallError(res.status, detail, requestId);
}

/** A single fetch attempt — no retry. Throws BackendCallError on failure. */
async function fetchOnce(
  path: string,
  init: BackendRequestInit
): Promise<Response> {
  const { json, token, timeoutMs = 60_000, revalidate, ...rest } = init;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Compose the timeout with any caller-supplied signal so BOTH are honored.
  // (Previously `rest.signal ?? controller.signal` dropped the timeout entirely
  // whenever a caller passed its own signal — e.g. the search route, whose 115s
  // timeout therefore never fired.) Either abort aborts the fetch.
  const signal = rest.signal
    ? AbortSignal.any([rest.signal, timeoutController.signal])
    : timeoutController.signal;

  // Cacheable when a revalidate window is given; otherwise never cache.
  const cacheOpts: Pick<RequestInit, "cache"> & { next?: { revalidate: number } } =
    revalidate !== undefined
      ? { next: { revalidate } }
      : { cache: "no-store" };

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...rest,
      headers: buildHeaders({ json, token, ...rest }),
      body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
      signal,
      ...cacheOpts,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    // Distinguish our own timeout from a caller-initiated abort: only the timeout
    // controller firing means "timed out". A caller abort (client disconnect)
    // re-throws so the route can treat it as a disconnect, not a backend error.
    if (aborted && timeoutController.signal.aborted) {
      throw new BackendCallError(0, "Backend request timed out");
    }
    if (aborted) throw err; // caller-initiated abort — propagate as AbortError
    throw new BackendCallError(0, "Could not reach the backend");
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw await parseError(res);
  }
  return res;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Full jitter exponential backoff: random in [0, base * 2^attempt], capped. */
function backoffDelay(attempt: number, baseMs = 200, capMs = 3_000): number {
  const ceiling = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.random() * ceiling;
}

// In-flight GET dedup: same method+path+token shares one promise.
const inFlight = new Map<string, Promise<Response>>();

function dedupeKey(path: string, init: BackendRequestInit): string {
  return `${init.method ?? "GET"}::${path}::${init.token ?? ""}`;
}

/**
 * Low-level fetch to the backend that returns the raw Response. Throws
 * BackendCallError on a non-OK status or network failure.
 *
 * Resilience (both opt-in, default off, so existing callers are unchanged):
 *   - `retries`: retry transient failures (network / 5xx) with full-jitter
 *     exponential backoff. Only safe for idempotent GETs.
 *   - `dedupe`: collapse concurrent identical in-flight GETs into one request.
 *
 * Aborts (client disconnect / timeout) are never retried.
 */
export async function backendFetch(
  path: string,
  init: BackendRequestInit = {}
): Promise<Response> {
  const { retries = 0, dedupe = false } = init;

  const run = async (): Promise<Response> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetchOnce(path, init);
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof BackendCallError && err.retryable;
        if (!retryable || attempt === retries) throw err;
        await sleep(backoffDelay(attempt));
      }
    }
    throw lastErr;
  };

  if (!dedupe) return run();

  const key = dedupeKey(path, init);
  const existing = inFlight.get(key);
  if (existing) {
    // Share the in-flight response; clone so each caller can read the body.
    return existing.then((res) => res.clone());
  }
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise.then((res) => res.clone());
}

/** backendFetch + JSON parse, for the common case. */
export async function backendJson<T>(
  path: string,
  init: BackendRequestInit = {}
): Promise<T> {
  const res = await backendFetch(path, init);
  return (await res.json()) as T;
}

/** Translate a thrown BackendCallError into a Next Response body + status. */
export function errorToResponse(err: unknown): {
  status: number;
  body: BackendError;
} {
  if (err instanceof BackendCallError) {
    return {
      status: err.status === 0 ? 502 : err.status,
      body: { detail: err.detail, request_id: err.requestId },
    };
  }
  return {
    status: 500,
    body: { detail: "Unexpected proxy error" },
  };
}
