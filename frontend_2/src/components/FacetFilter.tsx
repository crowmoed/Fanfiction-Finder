"use client";

/**
 * FacetFilter — instant client-side refinement of the current result set.
 *
 * Filtering the already-fetched candidates (platform / length / kudos / ranked)
 * happens in-memory, so it's immediate — no re-search, no backend round-trip.
 * Controlled: the parent owns FacetState and re-derives the filtered list.
 * Skeleton styling only.
 */
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

function parseNum(v: string): number | null {
  const n = Number(v.replace(/[^\d]/g, ""));
  return v.trim() === "" || Number.isNaN(n) ? null : n;
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
  const platforms = platformsIn(fics);
  const ratings = ratingsIn(fics);
  const showCompletion = hasCompletionData(fics);
  // Cap the tag chips so a huge tag set doesn't swamp the panel; the most common
  // tags are the most useful to filter by. Always keep already-selected tags
  // visible even if they fall outside the top slice.
  const TAG_LIMIT = 16;
  const allTags = tagsIn(fics);
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
    <div className="card stack" style={{ gap: "0.6rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Refine</strong>
        <span className="muted">
          {filteredCount} of {fics.length} shown
          {facetsActive(value) && (
            <>
              {" · "}
              <button
                style={{ padding: "0.1rem 0.4rem" }}
                onClick={() => onChange(EMPTY_FACETS)}
              >
                Reset
              </button>
            </>
          )}
        </span>
      </div>

      <div className="row" style={{ gap: "0.4rem" }}>
        <span className="muted">Platform:</span>
        {platforms.map((p) => (
          <button
            key={p}
            aria-pressed={value.platforms.has(p)}
            onClick={() => togglePlatform(p)}
            style={{
              padding: "0.1rem 0.5rem",
              fontWeight: value.platforms.has(p) ? 700 : 400,
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {ratings.length > 0 && (
        <div className="row" style={{ gap: "0.4rem" }}>
          <span className="muted">Rating:</span>
          {ratings.map((r) => (
            <button
              key={r}
              aria-pressed={value.ratings.has(r)}
              onClick={() => toggleRating(r)}
              style={{
                padding: "0.1rem 0.5rem",
                fontWeight: value.ratings.has(r) ? 700 : 400,
              }}
            >
              {r}
            </button>
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
            <button
              key={key}
              aria-pressed={value.completion === key}
              onClick={() => onChange({ ...value, completion: key })}
              style={{
                padding: "0.1rem 0.5rem",
                fontWeight: value.completion === key ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="stack" style={{ gap: "0.3rem" }}>
          <span className="muted">Tags (match all):</span>
          <div className="row" style={{ gap: "0.3rem", flexWrap: "wrap" }}>
            {tags.map(({ tag, count }) => (
              <button
                key={tag}
                aria-pressed={value.tags.has(tag)}
                onClick={() => toggleTag(tag)}
                title={`${count} result${count === 1 ? "" : "s"}`}
                style={{
                  padding: "0.1rem 0.5rem",
                  fontWeight: value.tags.has(tag) ? 700 : 400,
                }}
              >
                {tag}
                <span className="muted"> · {count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="row" style={{ gap: "0.75rem" }}>
        <label className="row" style={{ gap: "0.3rem" }}>
          <span className="muted">Words ≥</span>
          <input
            type="text"
            inputMode="numeric"
            style={{ width: "6rem" }}
            value={value.minWords ?? ""}
            onChange={(e) => onChange({ ...value, minWords: parseNum(e.target.value) })}
          />
        </label>
        <label className="row" style={{ gap: "0.3rem" }}>
          <span className="muted">Words ≤</span>
          <input
            type="text"
            inputMode="numeric"
            style={{ width: "6rem" }}
            value={value.maxWords ?? ""}
            onChange={(e) => onChange({ ...value, maxWords: parseNum(e.target.value) })}
          />
        </label>
        <label className="row" style={{ gap: "0.3rem" }}>
          <span className="muted">Kudos ≥</span>
          <input
            type="text"
            inputMode="numeric"
            style={{ width: "6rem" }}
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
  );
}
