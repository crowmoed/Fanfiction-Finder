"use client";

/**
 * SavedSearchButton — follow/unfollow the current search.
 *
 * "Following" a search saves it (snapshotting the current result ids) so the
 * /saved page can later re-run it and surface what's new. Reflects live saved
 * state via useSavedSearches so it stays in sync across the app.
 */
import { useEffect, useRef, useState } from "react";

import type { Fic, SearchParams } from "@/lib/contracts";
import { searchKey } from "@/lib/results/resultsCache";
import { toggleSaveSearch, useSavedSearches } from "@/lib/results/savedSearches";
import { Icon } from "@/components/Icon";
import "./saved-search-button.css";

export function SavedSearchButton({
  params,
  fics,
}: {
  params: SearchParams;
  fics: Fic[];
}) {
  const saved = useSavedSearches();
  const isSaved = saved.some((s) => s.key === searchKey(params));

  // Stamp in only on the rest→saved transition, never on a plain re-render or
  // a load that starts out already-saved (DESIGN.md · Motion: the stamp is the
  // one expressive moment, reserved for the moment of commitment).
  const prevSaved = useRef(isSaved);
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (isSaved && !prevSaved.current) {
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 280);
      prevSaved.current = isSaved;
      return () => clearTimeout(t);
    }
    prevSaved.current = isSaved;
  }, [isSaved]);

  return (
    <button
      className={`btn-sm${justSaved ? " stamp-in" : ""}`}
      aria-pressed={isSaved}
      onClick={() => toggleSaveSearch(params, fics)}
      title={isSaved ? "Stop following this search" : "Follow this search for new results"}
    >
      <Icon name={isSaved ? "star-fill" : "star"} size={14} className={isSaved ? "saved-star" : undefined} />
      {isSaved ? "Following" : "Follow search"}
    </button>
  );
}
