"use client";

/**
 * FacetFilter — instant client-side refinement of the current result set.
 *
 * Filtering the already-fetched candidates (platform / length / kudos / ranked)
 * happens in-memory, so it's immediate — no re-search, no backend round-trip.
 * Controlled: the parent owns FacetState and re-derives the filtered list.
 */
import { useMemo } from "react";

import type { Fic, Platform } from "@/lib/contracts";
import {
  type FacetState,
  EMPTY_FACETS,
  facetsActive,
  platformsIn,
  ratingsIn,
  hasCompletionData,
  tagsIn,
} from "@/lib/results/facets";
import type { RatingBucket } from "@/lib/results/meta";
import { Icon } from "@/components/Icon";

function parseNum(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
}

/** A pressable filter chip. Pressed state gets a check + the filled chip look
 *  (globals.css `.chip[aria-pressed]`) — never font-weight alone (F126). */
function FacetChip({
  pressed,
  onClick,
  title,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick} title={title}>
      {/* The check pops in when the chip becomes pressed (mounts → pop-in). */}
      {pressed && (
        <span className="pop-in" style={{ display: "inline-flex" }}>
          <Icon name="check" size={12} />
        </span>
      )}
      {children}
    </button>
  );
}

export function FacetFilter({
  fics,
  value,
  onChange,
  filteredCount,
}: {
  fics: Fic[];
  value: FacetState;
  onChange: (next: FacetState) => void;
  filteredCount: number;
}) {
  // These derive only from `fics`, so memoize them — otherwise every facet
  // toggle (which only changes `value`) recomputes the full tag frequency map etc.
  const platforms = useMemo(() => platformsIn(fics), [fics]);
  const ratings = useMemo(() => ratingsIn(fics), [fics]);
  const showCompletion = useMemo(() => hasCompletionData(fics), [fics]);
  const allTags = useMemo(() => tagsIn(fics), [fics]);

  // Cap the tag chips so a huge tag set doesn't swamp the panel; the most common
  // tags are the most useful to filter by. Always keep already-selected tags
  // visible even if they fall outside the top slice. (This slice depends on the
  // current selection, so it's intentionally not memoized on `fics` alone.)
  const TAG_LIMIT = 16;
  const tags = allTags
    .filter((t, i) => i < TAG_LIMIT || value.tags.has(t.tag))
    .slice(0, Math.max(TAG_LIMIT, value.tags.size + TAG_LIMIT));

  const togglePlatform = (p: Platform) => {
    const next = new Set(value.platforms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onChange({ ...value, platforms: next });
  };

  const toggleRating = (r: RatingBucket) => {
    const next = new Set(value.ratings);
    if (next.has(r)) next.delete(r);
    else next.add(r);
    onChange({ ...value, ratings: next });
  };

  const toggleTag = (t: string) => {
    const next = new Set(value.tags);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange({ ...value, tags: next });
  };

  return (
    <div className="card facet-panel stack" style={{ gap: "0.7rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        {/* Inside the mobile sheet the sheet's own header already says Refine
            (results.css hides this one there); the count row stays. */}
        <strong className="facet-panel__title">Refine</strong>
        <span className="muted">
          <span className="num">
            {filteredCount} of {fics.length}
          </span>{" "}
          shown
          {facetsActive(value) && (
            <>
              {" · "}
              <button
                className="btn-sm btn-ghost pop-in"
                onClick={() => onChange(EMPTY_FACETS)}
              >
                <Icon name="refresh" size={12} />
                Reset
              </button>
            </>
          )}
        </span>
      </div>

      {/* Group 1: categorical facets (REDESIGN-SPEC §3.3 — 600-weight sans
          group labels, NOT eyebrows; hairline rules between groups). */}
      <div className="facet-group">
        <span className="facet-group__label">Facets</span>
        <div className="row" style={{ gap: "0.4rem" }}>
          <span className="muted">Platform:</span>
          {platforms.map((p) => (
            <FacetChip key={p} pressed={value.platforms.has(p)} onClick={() => togglePlatform(p)}>
              {p}
            </FacetChip>
          ))}
        </div>

        {ratings.length > 0 && (
          <div className="row" style={{ gap: "0.4rem" }}>
            <span className="muted">Rating:</span>
            {ratings.map((r) => (
              <FacetChip key={r} pressed={value.ratings.has(r)} onClick={() => toggleRating(r)}>
                {r}
              </FacetChip>
            ))}
          </div>
        )}

        {showCompletion && (
          <div className="row" style={{ gap: "0.4rem" }}>
            <span className="muted">Status:</span>
            {(
              [
                ["all", "All"],
                ["complete", "Complete"],
                ["wip", "In progress"],
              ] as const
            ).map(([key, label]) => (
              <FacetChip
                key={key}
                pressed={value.completion === key}
                onClick={() => onChange({ ...value, completion: key })}
              >
                {label}
              </FacetChip>
            ))}
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="facet-group">
          <span className="facet-group__label">Tags (match all)</span>
          <div className="row" style={{ gap: "0.3rem", flexWrap: "wrap" }}>
            {tags.map(({ tag, count }) => (
              <FacetChip
                key={tag}
                pressed={value.tags.has(tag)}
                onClick={() => toggleTag(tag)}
                title={`${count} result${count === 1 ? "" : "s"}`}
              >
                {tag}
                <span className="num muted"> · {count}</span>
              </FacetChip>
            ))}
          </div>
        </div>
      )}

      <div className="facet-group">
        <span className="facet-group__label">Range</span>
        <div className="row" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <label className="row" style={{ gap: "0.3rem" }}>
            <span className="muted">Words ≥</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 50000"
              style={{ width: "7rem" }}
              value={value.minWords ?? ""}
              onChange={(e) => onChange({ ...value, minWords: parseNum(e.target.value) })}
            />
          </label>
          <label className="row" style={{ gap: "0.3rem" }}>
            <span className="muted">Words ≤</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 200000"
              style={{ width: "7rem" }}
              value={value.maxWords ?? ""}
              onChange={(e) => onChange({ ...value, maxWords: parseNum(e.target.value) })}
            />
          </label>
          <label className="row" style={{ gap: "0.3rem" }}>
            <span className="muted">Kudos ≥</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 100"
              style={{ width: "7rem" }}
              value={value.minKudos ?? ""}
              onChange={(e) => onChange({ ...value, minKudos: parseNum(e.target.value) })}
            />
          </label>
          <label className="row" style={{ gap: "0.3rem" }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={value.ranked === "ranked"}
              onChange={(e) =>
                onChange({ ...value, ranked: e.target.checked ? "ranked" : "all" })
              }
            />
            <span className="muted">Ranked only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
