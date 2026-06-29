/**
 * ResultsView — pure presentational results renderer. Given a search state, it
 * renders the right surface: loading (pipeline), error, empty, or the list of
 * fics. Both the real /results page and the demo harness feed it state, so every
 * state is identical between production and demos.
 */
import { useMemo, useState } from "react";

import type { Fic, SearchParams } from "@/lib/contracts";
import type { SearchError, SearchPhase, StageState } from "@/lib/client/useSearch";
import { EMPTY_FACETS, applyFacets, type FacetState } from "@/lib/results/facets";
import { FicCard } from "@/components/FicCard";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResultsTable } from "@/components/ResultsTable";
import { ExportButtons } from "@/components/ExportButtons";
import { FacetFilter } from "@/components/FacetFilter";
import { SavedSearchButton } from "@/components/SavedSearchButton";
import { HighlightProvider } from "@/components/Highlight";

type ResultsLayout = "table" | "cards";

export function ResultsView({
  phase,
  stages,
  results,
  error,
  elapsedMs,
  onRetry,
  onCancel,
  params,
  resuming = false,
}: {
  phase: SearchPhase;
  stages: StageState;
  results: Fic[];
  error: SearchError | null;
  elapsedMs?: number | null;
  onRetry?: () => void;
  onCancel?: () => void;
  /**
   * The search that produced these results. When provided, enables the
   * follow-search toggle and the client-side facet filter (both are no-ops
   * without it, e.g. in pure presentational demos).
   */
  params?: SearchParams;
  /** True while re-issuing a search that a refresh interrupted mid-flight. */
  resuming?: boolean;
}) {
  // Default to the data table; let the user flip to cards. Hooks stay above any
  // early return so hook order is stable across phases.
  const [layout, setLayout] = useState<ResultsLayout>("table");
  const [facets, setFacets] = useState<FacetState>(EMPTY_FACETS);

  // Client-side faceted refinement — instant, no re-search.
  const visible = useMemo(() => applyFacets(results, facets), [results, facets]);

  // (Saving each fic for its on-demand /fic/[id] page now happens once per op in
  // the search registry's finalizeSuccess / hydrateOp — not here — so it no
  // longer depends on this view being mounted.)

  if (phase === "idle") {
    return <p className="muted">Enter a query above to search.</p>;
  }

  if (phase === "searching") {
    return (
      <div className="stack">
        {resuming && (
          <p className="muted" style={{ margin: 0 }}>
            Picking your search back up where it left off…
          </p>
        )}
        <PipelineStatus stages={stages} />
        {onCancel && (
          <div>
            <button onClick={onCancel}>Cancel</button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "error" && error) {
    return (
      <div className="card stack" role="alert">
        <strong className="error">Search failed</strong>
        <p className="error" style={{ margin: 0 }}>
          {error.message}
        </p>
        {error.requestId && (
          <p className="muted" style={{ margin: 0 }}>
            Request ID: {error.requestId}
          </p>
        )}
        {error.retryable && onRetry && <button onClick={onRetry}>Try again</button>}
      </div>
    );
  }

  // done
  if (results.length === 0) {
    return (
      <div className="card stack" role="status">
        <strong>No matches found</strong>
        <p className="muted" style={{ margin: 0 }}>
          Nothing in the archive matched this search. Try loosening the wording or
          turning off strict filters.
        </p>
      </div>
    );
  }

  return (
    <div className="stack enter-rise">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <p className="muted" style={{ margin: 0 }} role="status" aria-live="polite">
          {results.length} result{results.length === 1 ? "" : "s"}
          {elapsedMs != null ? ` · ${(elapsedMs / 1000).toFixed(1)}s` : ""}
        </p>
        <div className="row" style={{ gap: "1rem" }}>
          {params && <SavedSearchButton params={params} fics={results} />}
          <div className="row" style={{ gap: "0.4rem" }}>
            <span className="muted">View:</span>
            <button
              aria-pressed={layout === "table"}
              disabled={layout === "table"}
              onClick={() => setLayout("table")}
            >
              Table
            </button>
            <button
              aria-pressed={layout === "cards"}
              disabled={layout === "cards"}
              onClick={() => setLayout("cards")}
            >
              Cards
            </button>
          </div>
          {/* Export the *filtered* set so it matches what's on screen. */}
          <ExportButtons fics={visible} />
        </div>
      </div>

      {params && (
        <FacetFilter
          fics={results}
          value={facets}
          onChange={setFacets}
          filteredCount={visible.length}
        />
      )}

      <HighlightProvider query={params?.q}>
        {visible.length === 0 ? (
          <p className="muted">No results match the current filters.</p>
        ) : layout === "table" ? (
          <ResultsTable fics={visible} />
        ) : (
          <div className="stack">
            {visible.map((fic, i) => (
              <div
                key={`${fic.url}-${i}`}
                className="xl-row-enter results-card-item"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <FicCard fic={fic} />
              </div>
            ))}
          </div>
        )}
      </HighlightProvider>
    </div>
  );
}
