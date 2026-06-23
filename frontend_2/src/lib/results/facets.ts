/**
 * facets.ts — client-side faceted refinement of an already-fetched result set.
 *
 * The backend returns a ranked candidate set; narrowing it by platform, length,
 * kudos, or ranked-status is pure presentation and should feel instant (no
 * re-search). This module is the dependency-free filter logic; the UI lives in
 * FacetFilter. Keeping it separate makes it testable and reusable (e.g. export
 * the filtered set).
 */
import type { Fic, Platform } from "@/lib/contracts";

export interface FacetState {
  /** Empty set = all platforms. */
  platforms: Set<Platform>;
  minWords: number | null;
  maxWords: number | null;
  minKudos: number | null;
  /** "ranked" = has a match_score; "all" = include unranked too. */
  ranked: "all" | "ranked";
}

export const EMPTY_FACETS: FacetState = {
  platforms: new Set(),
  minWords: null,
  maxWords: null,
  minKudos: null,
  ranked: "all",
};

export function facetsActive(f: FacetState): boolean {
  return (
    f.platforms.size > 0 ||
    f.minWords != null ||
    f.maxWords != null ||
    f.minKudos != null ||
    f.ranked !== "all"
  );
}

/** Distinct platforms present in a result set, for building the facet chips. */
export function platformsIn(fics: Fic[]): Platform[] {
  return Array.from(new Set(fics.map((f) => f.platform)));
}

export function applyFacets(fics: Fic[], f: FacetState): Fic[] {
  if (!facetsActive(f)) return fics;
  return fics.filter((fic) => {
    if (f.platforms.size > 0 && !f.platforms.has(fic.platform)) return false;
    if (f.ranked === "ranked" && fic.match_score == null) return false;
    const wc = fic.word_count ?? null;
    if (f.minWords != null && (wc == null || wc < f.minWords)) return false;
    if (f.maxWords != null && (wc == null || wc > f.maxWords)) return false;
    const k = fic.kudos ?? null;
    if (f.minKudos != null && (k == null || k < f.minKudos)) return false;
    return true;
  });
}
