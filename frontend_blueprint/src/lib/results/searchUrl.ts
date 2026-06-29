/**
 * searchUrl.ts — build the canonical /results URL for a search.
 *
 * Several places (sidebar recent searches, the Saved + History panels, the dev
 * seed page) link to a search's results page; this is the single source of truth
 * for that URL so the query-string shape can't drift between them. Dependency-free.
 */

/** The minimal search shape a /results link needs. */
export interface SearchLinkParams {
  q: string;
  fandom: string;
  strict?: boolean;
}

/** The /results URL (path + query string) that restores this search. */
export function resultsHref({ q, fandom, strict }: SearchLinkParams): string {
  return `/results?${new URLSearchParams({
    q,
    fandom,
    strict: String(strict ?? false),
  }).toString()}`;
}
