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
} from "@/lib/results/facets";

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

  const togglePlatform = (p: Platform) => {
    const next = new Set(value.platforms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    onChange({ ...value, platforms: next });
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
