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
import { ficComplete, ficRating, type RatingBucket } from "@/lib/results/meta";

/** Completion-status facet: "all" ignores it; the others require a known status. */
export type CompletionFacet = "all" | "complete" | "wip";

export interface FacetState {
  /** Empty set = all platforms. */
  platforms: Set<Platform>;
  /** Empty set = all ratings. Members are normalized RatingBuckets. */
  ratings: Set<RatingBucket>;
  /** Completion status from `meta.complete`. */
  completion: CompletionFacet;
  /** Empty set = no tag filter; non-empty = fic must contain ALL of these tags. */
  tags: Set<string>;
  minWords: number | null;
  maxWords: number | null;
  minKudos: number | null;
  /** "ranked" = has a match_score; "all" = include unranked too. */
  ranked: "all" | "ranked";
}

export const EMPTY_FACETS: FacetState = {
  platforms: new Set(),
  ratings: new Set(),
  completion: "all",
  tags: new Set(),
  minWords: null,
  maxWords: null,
  minKudos: null,
  ranked: "all",
};

export function facetsActive(f: FacetState): boolean {
  return (
    f.platforms.size > 0 ||
    f.ratings.size > 0 ||
    f.completion !== "all" ||
    f.tags.size > 0 ||
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

/**
 * Distinct rating buckets present in a result set, in canonical order, so the
 * rating chips only show buckets that can actually match something.
 */
const RATING_ORDER: RatingBucket[] = ["G", "T", "M", "E", "Not Rated"];
export function ratingsIn(fics: Fic[]): RatingBucket[] {
  const present = new Set<RatingBucket>();
  for (const fic of fics) {
    const r = ficRating(fic);
    if (r) present.add(r);
  }
  return RATING_ORDER.filter((r) => present.has(r));
}

/** Whether any fic in the set has a known completion status (to show the facet). */
export function hasCompletionData(fics: Fic[]): boolean {
  return fics.some((f) => ficComplete(f) != null);
}

/** Tag with its frequency in the result set, most-common first. */
export interface TagCount {
  tag: string;
  count: number;
}

export function tagsIn(fics: Fic[]): TagCount[] {
  const freq = new Map<string, number>();
  for (const fic of fics) {
    for (const t of fic.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return Array.from(freq.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function applyFacets(fics: Fic[], f: FacetState): Fic[] {
  if (!facetsActive(f)) return fics;
  return fics.filter((fic) => {
    if (f.platforms.size > 0 && !f.platforms.has(fic.platform)) return false;
    if (f.ranked === "ranked" && fic.match_score == null) return false;

    if (f.ratings.size > 0) {
      const r = ficRating(fic);
      if (r == null || !f.ratings.has(r)) return false;
    }

    if (f.completion !== "all") {
      const c = ficComplete(fic);
      if (c == null) return false; // unknown status can't satisfy a status filter
      if (f.completion === "complete" && !c) return false;
      if (f.completion === "wip" && c) return false;
    }

    // AND semantics: the fic must carry every selected tag. Build a Set of the
    // fic's tags once so each membership check is O(1) rather than scanning the
    // array per selected tag.
    if (f.tags.size > 0) {
      const ficTags = new Set(fic.tags);
      for (const t of f.tags) if (!ficTags.has(t)) return false;
    }

    const wc = fic.word_count ?? null;
    if (f.minWords != null && (wc == null || wc < f.minWords)) return false;
    if (f.maxWords != null && (wc == null || wc > f.maxWords)) return false;
    const k = fic.kudos ?? null;
    if (f.minKudos != null && (k == null || k < f.minKudos)) return false;
    return true;
  });
}
