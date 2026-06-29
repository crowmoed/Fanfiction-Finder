"use client";

/**
 * SavedSearchButton — follow/unfollow the current search.
 *
 * "Following" a search saves it (snapshotting the current result ids) so the
 * /saved page can later re-run it and surface what's new. Reflects live saved
 * state via useSavedSearches so it stays in sync across the app.
 */
import type { Fic, SearchParams } from "@/lib/contracts";
import { searchKey } from "@/lib/results/resultsCache";
import { toggleSaveSearch, useSavedSearches } from "@/lib/results/savedSearches";

export function SavedSearchButton({
  params,
  fics,
}: {
  params: SearchParams;
  fics: Fic[];
}) {
  const saved = useSavedSearches();
  const isSaved = saved.some((s) => s.key === searchKey(params));

  return (
    <button
      aria-pressed={isSaved}
      onClick={() => toggleSaveSearch(params, fics)}
      title={isSaved ? "Stop following this search" : "Follow this search for new results"}
      style={{ fontWeight: isSaved ? 700 : 400 }}
    >
      {isSaved ? "★ Following" : "☆ Follow search"}
    </button>
  );
}
