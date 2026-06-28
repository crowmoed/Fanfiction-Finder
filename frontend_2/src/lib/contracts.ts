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

// ── Platform-specific per-fic metadata (mirror of backend/data/schema.py) ──────
// The backend returns one tagged blob per fic in `Fic.meta`, discriminated by
// `type` (== the fic's source platform, lowercased). Every field is optional: a
// missed scrape or a legacy row indexed before the `meta` column existed has
// `meta: null`, and even a present blob may have holes. Switch on `meta.type` to
// read platform-native fields; see lib/results/meta.ts for normalized accessors
// that hide the per-platform shape from the UI.

/** AO3 work-blurb metadata. */
export interface AO3Meta {
  type: "ao3";
  author: string | null; // co-authors joined with ", "
  rating: string | null; // General Audiences / Teen / Mature / Explicit / Not Rated
  category: string[]; // M/M, F/M, Gen, ...
  warnings: string[]; // archive warnings
  language: string | null;
  chapters: string | null; // "5/12" (posted/total); "?" total ⇒ WIP
  complete: boolean | null;
  kudos: number | null;
  hits: number | null;
  bookmarks: number | null;
  comments: number | null;
  updated: string | null; // last-updated date as shown on the blurb
}

/** FanFiction.Net z-list row metadata. */
export interface FFNMeta {
  type: "ffn";
  author: string | null;
  rating: string | null; // K / K+ / T / M
  genres: string[];
  characters: string[];
  language: string | null;
  chapters: number | null;
  complete: boolean | null;
  favs: number | null;
  follows: number | null;
  reviews: number | null;
  updated: string | null;
  published: string | null;
}

/** Wattpad v4 search-API metadata. */
export interface WattpadMeta {
  type: "wattpad";
  author: string | null;
  mature: boolean | null;
  complete: boolean | null;
  parts: number | null;
  votes: number | null;
  reads: number | null;
  comments: number | null;
  updated: string | null; // lastPublishedPart.createDate
}

/** Discriminated union — parse by `meta.type`. */
export type FicMeta = AO3Meta | FFNMeta | WattpadMeta;

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
  /** Platform-specific rich metadata (tagged by `type`); null for legacy rows. */
  meta: FicMeta | null;
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
