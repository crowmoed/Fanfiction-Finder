/**
 * board/types.ts — the domain model for the canvas board.
 *
 * The board is a spatial workspace of result TABLES. Its single source of truth
 * is a list of `SearchResultGroup` (one per search you run or seed). How those
 * groups become on-screen table nodes is NOT hardcoded — a swappable
 * `SplitStrategy` maps one group to N `NodePart`s (one combined table, or one
 * per platform, or one per rewritten HyDE prompt, …). Keeping the split behind
 * this interface is what lets the board be "dynamic": adding a new way to slice a
 * search is just registering another strategy (see ./strategies.ts).
 *
 * Dependency-free except for the wire contracts, so it can be imported anywhere.
 */
import type { Fic, SearchParams } from "@/lib/contracts";

/**
 * One rewritten-prompt result list. The live pipeline expands the raw query into
 * several HyDE descriptions and retrieves per variant before RRF-fusing them; if
 * a group carries the pre-fusion lists here, the "by rewritten prompt" strategy
 * shows them verbatim. When absent, that strategy synthesizes a demo split.
 */
export interface VariantResult {
  key: string;
  /** The rewritten / expanded prompt this list was retrieved with. */
  label: string;
  fics: Fic[];
}

/** One search that landed on the board — the unit the board actually owns. */
export interface SearchResultGroup {
  id: string;
  params: SearchParams;
  /** The merged, ranked result set (what GET /search returns today). */
  fics: Fic[];
  /** Optional pre-fusion per-variant lists (the rewritten prompts). */
  variants?: VariantResult[];
  /** Wall-clock ms the search took, when known. */
  elapsedMs?: number | null;
  /** Where the group came from: a live pipeline run or seeded fixtures. */
  origin: "live" | "seed";
}

/** Accent identity for a node's badge + table header. */
export type BadgeTone = "ao3" | "ffn" | "wattpad" | "variant" | "all";

export interface NodeBadge {
  label: string;
  tone: BadgeTone;
}

/** One table node's worth of data, produced by a strategy from a group. */
export interface NodePart {
  /** Unique within its group; combined with the group id to form the node id. */
  partKey: string;
  title: string;
  subtitle?: string;
  badge?: NodeBadge;
  fics: Fic[];
}

/** A pluggable way to turn one search into one-or-more table nodes. */
export interface SplitStrategy {
  id: string;
  label: string;
  description: string;
  split: (group: SearchResultGroup) => NodePart[];
}

/**
 * The `data` payload carried by each React Flow node. React Flow requires node
 * data to be a `Record<string, unknown>`, hence the index signature.
 */
export interface TableNodeData {
  groupId: string;
  title: string;
  subtitle?: string;
  badge?: NodeBadge;
  fics: Fic[];
  origin: "live" | "seed";
  [key: string]: unknown;
}
