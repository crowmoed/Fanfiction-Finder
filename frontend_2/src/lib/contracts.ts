/**
 * contracts.ts — the single source of truth for every shape that crosses the
 * boundary between this frontend and the FicFinder backend.
 *
 * These types mirror the backend exactly (see backend/data/schema.py,
 * backend/api.py, backend/auth/*). The browser NEVER talks to the backend
 * directly — it talks to the Next server routes in src/app/api/*, which talk to
 * the backend. So "the contract" has two halves:
 *
 *   1. Backend wire types        — what the FastAPI app returns.
 *   2. Frontend stream protocol  — the SSE event shapes the /api/search route
 *                                  emits to the browser while a (slow) search
 *                                  runs through the backend pipeline.
 *
 * Keep this file dependency-free so it can be imported from both server routes
 * and client components.
 */

// ───────────────────────────────────────────────────────────────────────────
// 1. Backend wire types (mirror of backend/data/schema.py + api.py responses)
// ───────────────────────────────────────────────────────────────────────────

export type Platform = "AO3" | "FFN" | "Wattpad" | (string & {});

/** Mirror of the Pydantic `Fic` model returned by GET /search. */
export interface Fic {
  title: string;
  url: string;
  platform: Platform;
  fandom: string | null;
  summary: string | null;
  tags: string[];
  word_count: number | null;
  kudos: number | null;
  hits: number | null;
  /** 0–100 when the LLM ranker scored it; null when it omitted the fic. */
  match_score: number | null;
  match_reason: string | null;
}

/** One entry from GET /fandoms. */
export interface FandomOption {
  name: string;
  collected: boolean;
}

export interface FandomsResponse {
  fandoms: FandomOption[];
}

/** The sentinel fandom name the backend uses for a cross-fandom search. */
export const ALL_FANDOMS = "All Fandoms" as const;

/** User tier as stored in DynamoDB. */
export type Tier = "free" | "paid" | (string & {});

/**
 * The user dict returned by /auth/login, /auth/me. Only `id`, `email`, `tier`
 * are guaranteed; the rest appear once set. Indexed so callers can read
 * optional fields without casting.
 */
export interface User {
  id: string;
  email: string;
  tier: Tier;
  searches_used?: number;
  week_start?: string;
  created_at?: string;
  stripe_customer_id?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  token: string;
  user: User;
}

/** Standard backend error envelope (api.py exception handlers). */
export interface BackendError {
  detail: string;
  request_id?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Search request shape (what the client asks /api/search for)
// ───────────────────────────────────────────────────────────────────────────

export interface SearchParams {
  q: string;
  fandom: string;
  limit?: number;
  strict?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// 3. The SSE pipeline protocol
// ───────────────────────────────────────────────────────────────────────────
//
// GET /search on the backend is a single slow request that runs:
//   enhance → embed → RRF retrieve → LLM rank → return.
// The /api/search server route turns that into an SSE stream so the UI can show
// per-stage progress and the design layer can choreograph the loading scene to
// real pipeline events instead of a fake spinner.
//
// Each stage is a named, ordered step. The route emits a `stage` event when a
// step starts/completes, a single terminal `result` event with the fics, or an
// `error` event. This contract is what the loading UI (and its demo) animate to.

export const PIPELINE_STAGES = [
  "enhance", // HyDE query expansion (Bedrock Haiku)
  "embed", // Gemini embeddings for raw + HyDE blends
  "retrieve", // pgvector RRF across AO3 / FFN / Wattpad
  "rank", // Bedrock Haiku scores candidates 0–100
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number];

export type StageStatus = "active" | "done";

/** Human-facing copy for each stage. Design can override; logic uses the id. */
export const STAGE_LABELS: Record<PipelineStageId, string> = {
  enhance: "Understanding your request",
  embed: "Reading the shelves",
  retrieve: "Gathering candidates",
  rank: "Ranking the best matches",
};

/** Discriminated union of everything the /api/search SSE stream can emit. */
export type SearchStreamEvent =
  | { type: "stage"; stage: PipelineStageId; status: StageStatus; at: number }
  | { type: "result"; fics: Fic[]; count: number; elapsed_ms: number }
  | {
      type: "error";
      message: string;
      status?: number;
      request_id?: string;
      retryable: boolean;
    };

/** SSE event name used on the wire (single named event carrying JSON). */
export const SEARCH_SSE_EVENT = "message" as const;
