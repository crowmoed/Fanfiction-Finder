/**
 * ResultsView — pure presentational results renderer. Given a search state, it
 * renders the right surface: loading (pipeline), error, empty, or the list of
 * fics. Both the real /results page and the demo harness feed it state, so every
 * state is identical between production and demos.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  type Fic,
  type SearchParams,
  type SearchVariant,
} from "@/lib/contracts";
import type { SearchError, SearchPhase, StageState } from "@/lib/client/useSearch";
import {
  EMPTY_FACETS,
  applyFacets,
  facetsActive,
  type FacetState,
} from "@/lib/results/facets";
import { FicCard } from "@/components/FicCard";
import { ResultsTable } from "@/components/ResultsTable";
import { BoardView } from "@/components/board/BoardView";
import { BoardLoading } from "@/components/board/BoardLoading";
import { ExportButtons } from "@/components/ExportButtons";
import { FacetFilter } from "@/components/FacetFilter";
import { SavedSearchButton } from "@/components/SavedSearchButton";
import { HighlightProvider } from "@/components/Highlight";
import { Icon } from "@/components/Icon";
import { ficId } from "@/lib/results/ficId";
import "./results.css";

/** High tier per MatchScore's own rule (score >= 85 = vermilion stamp). Kept
 *  local rather than exported from MatchScore.tsx (foundation's file) since
 *  it's only needed here, to pick which ONE seal gets to animate. */
const HIGH_TIER_MIN = 85;

// Board is the default way a search's results show; Table / Cards are alternates.
export type ResultsLayout = "board" | "table" | "cards";

/** Coarse "N minutes/hours ago" for a cache timestamp. Exported so the page
 *  head's folio line (page.tsx) can render "cached {rel}" in the same words
 *  as the (now-removed) inline cached note used to. */
export function relativeAge(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/** Vertical drag distance (px) past which releasing dismisses the sheet. */
const DISMISS_THRESHOLD = 80;

/**
 * RefineSheet — the ≤720px Table/Cards replacement for the inline Refine card
 * (REDESIGN-SPEC §3.3). Slide-up + scrim; Escape and the Close button both
 * work. The handle does real pan-to-dismiss (pointer-tracked drag, released
 * past DISMISS_THRESHOLD closes it) — honesty rule: a drag handle only
 * renders because this behavior is actually implemented, not as a fake
 * affordance sitting on top of a Close-button-only sheet.
 */
function RefineSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);
  const dragY = useRef(0);
  const dragging = useRef(false);

  // Focus a real control (Close) on mount so Escape works regardless of what
  // triggered the sheet (the toggle button that opened it stays focused
  // otherwise, outside this dialog, and never sees the keydown) — and so the
  // focus ring lands on an actual interactive element, not the bare panel.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  const requestClose = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, 160); // matches sheet-out in results.css
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - dragY.current); // only downward drag
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging.current || !sheetRef.current) return;
    dragging.current = false;
    const delta = Math.max(0, e.clientY - dragY.current);
    sheetRef.current.style.transform = "";
    if (delta > DISMISS_THRESHOLD) requestClose();
  };

  // Portalled to document.body: ResultsView's own root carries `.enter-rise`,
  // whose animation leaves a non-`none` `transform` in its held end state
  // (`animation: ... both`) — and ANY computed transform on an ancestor,
  // including a visually-identity one, creates a new containing block for
  // descendant `position: fixed` elements. Nested normally, this sheet would
  // anchor to that ancestor's box instead of the viewport and render off
  // -screen below the fold. The portal escapes it, same as how Modal.tsx's
  // native <dialog> sidesteps the same class of bug via the top layer.
  return createPortal(
    <>
      <div className="sheet-scrim" onClick={requestClose} />
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-label="Refine results"
        tabIndex={-1}
        data-closing={closing ? "" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Escape") requestClose();
        }}
      >
        <div
          className="sheet__handle"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-hidden="true"
        />
        <div className="sheet__head">
          <span className="sheet__title">Refine</span>
          <button
            ref={closeBtnRef}
            type="button"
            className="icon-btn"
            onClick={requestClose}
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </>,
    document.body
  );
}

export function ResultsView({
  phase,
  stages,
  results,
  variants,
  error,
  onRetry,
  onCancel,
  onEdit,
  params,
  resuming = false,
  freshResultSet = false,
  layout: layoutProp,
  onLayoutChange,
}: {
  phase: SearchPhase;
  stages: StageState;
  results: Fic[];
  /** Pre-fusion per-variant lists, for the board view's "by rewritten prompt"
   *  slice. Null when the search didn't request them or was restored from an
   *  older cache — the board then shows its honest per-prompt fallback. */
  variants?: SearchVariant[] | null;
  error: SearchError | null;
  /** Accepted for API stability with existing callers (e.g. /dev/search) —
   *  the elapsed-time display now lives in the page head's folio line
   *  (page.tsx), not here, so this view no longer reads it. */
  elapsedMs?: number | null;
  onRetry?: () => void;
  onCancel?: () => void;
  /** Opens the boxed composer (REDESIGN-SPEC §3.6's "Edit search" action on
   *  the backend-zero empty state). No-op when absent (e.g. pure demos). */
  onEdit?: () => void;
  /**
   * The search that produced these results. When provided, enables the
   * follow-search toggle and the client-side facet filter (both are no-ops
   * without it, e.g. in pure presentational demos).
   */
  params?: SearchParams;
  /** True while re-issuing a search that a refresh interrupted mid-flight. */
  resuming?: boolean;
  /** Accepted for API stability with existing callers — the request-id hover
   *  title now lives on the page head's folio line (page.tsx), a small,
   *  precise hover target rather than this whole toolbar row. */
  requestId?: string | null;
  /**
   * True when `results` came from a search that just completed live (not
   * restored from the local cache). Gates the seal stamp: only the first
   * high-tier seal of a genuinely fresh result set animates — one stamp per
   * view, ever (REDESIGN-SPEC §1.5/§3.4), never a cache-restore replay.
   */
  freshResultSet?: boolean;
  /** Optional controlled view layout: /results owns it so the page shell can
   *  switch into the full-window board workspace. Uncontrolled (internal state)
   *  when absent, e.g. in the dev demo harnesses. */
  layout?: ResultsLayout;
  onLayoutChange?: (layout: ResultsLayout) => void;
}) {
  // Board is the default view — searching brings you to the board for that
  // search; Table / Cards are alternates. Hooks stay above any early return so
  // hook order is stable across phases.
  const [internalLayout, setInternalLayout] = useState<ResultsLayout>("board");
  const layout = layoutProp ?? internalLayout;
  const setLayout = onLayoutChange ?? setInternalLayout;
  // On phone widths the board's 980px micro-tables are unreadable — default the
  // uncontrolled case to Cards there. Runs once on mount (after hydration, so
  // SSR markup agrees); an explicit toggle afterwards always wins. The
  // controlled case (/results) applies the same check where its state lives.
  useEffect(() => {
    if (layoutProp !== undefined) return; // controlled — the owner decides
    if (window.matchMedia("(max-width: 720px)").matches) {
      setInternalLayout("cards");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first mount only
  }, []);
  const [facets, setFacets] = useState<FacetState>(EMPTY_FACETS);
  // Board mode tucks the facet panel behind a toolbar toggle (the workspace has
  // no room for a permanently-open card); Table/Cards keep the inline card
  // ABOVE this breakpoint. Below it (REDESIGN-SPEC §3.3), Table/Cards ALSO
  // tuck Refine behind a toggle — the inline panel is replaced by a bottom
  // sheet, so this same refineOpen boolean now serves three trigger patterns:
  // board's popover, and (narrow) Table/Cards' sheet.
  const [refineOpen, setRefineOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    setNarrow(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // The one seal that gets to stamp in (REDESIGN-SPEC §1.5/§3.4): the FIRST
  // high-tier fic in a fresh (live, non-cached) result set, in the backend's
  // own order — not re-derived per layout/sort, so Board/Table/Cards and any
  // sort the user applies all agree on which single fic earned the moment.
  // null on a cache restore, so revisiting a search never replays the stamp.
  const stampFicId = useMemo(() => {
    if (!freshResultSet) return null;
    const first = results.find((f) => (f.match_score ?? 0) >= HIGH_TIER_MIN);
    return first ? ficId(first) : null;
  }, [results, freshResultSet]);

  // Client-side faceted refinement — instant, no re-search.
  const visible = useMemo(() => applyFacets(results, facets), [results, facets]);
  // The same refinement applied to each pre-fusion variant list, so the board's
  // "by rewritten prompt" slices obey the Refine panel exactly like the merged
  // set does (they used to ignore it).
  const visibleVariants = useMemo(
    () =>
      variants
        ? variants.map((v) => ({ ...v, fics: applyFacets(v.fics, facets) }))
        : null,
    [variants, facets]
  );

  // (Saving each fic for its on-demand /fic/[id] page now happens once per op in
  // the search registry's finalizeSuccess / hydrateOp — not here — so it no
  // longer depends on this view being mounted.)

  if (phase === "idle") {
    return <p className="muted">Enter a query above to search.</p>;
  }

  if (phase === "searching") {
    // Stitch-style: a blurred ghost of the board that's coming, with one status
    // line for what the pipeline is doing right now. Cancel lives inside the
    // status block, so it can never fall below the fold of the tall ghost area.
    return (
      <div className="stack results-view">
        {resuming && (
          <p className="muted" style={{ margin: 0 }}>
            Picking your search back up where it left off…
          </p>
        )}
        {/* Same full-width, integrated region the board itself renders into. */}
        <div className="results-board">
          <BoardLoading stages={stages} onCancel={onCancel} />
        </div>
      </div>
    );
  }

  if (phase === "error" && error) {
    return (
      <div className="alert" data-tone="danger" role="alert">
        <Icon name="alert" size={18} />
        <div>
          <p className="alert-title">Search failed</p>
          <p>{error.message}</p>
          {error.requestId && <p className="muted">Request ID: {error.requestId}</p>}
          {error.retryable && onRetry && (
            <div className="empty-state-actions" style={{ marginTop: "0.5rem" }}>
              <button className="btn" onClick={onRetry}>
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // done, backend zero (REDESIGN-SPEC §3.6): distinct from the facet-filtered
  // empty case below — this is the archive itself coming up empty, so the
  // copy echoes the query and the action is Edit search, not Reset filters.
  if (results.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state-icon">
          <Icon name="search" size={22} />
        </span>
        <h2 className="empty-state-title">
          No fics matched &quot;{params?.q ?? ""}&quot;.
        </h2>
        <p>Try loosening the wording, or turning off strict filters.</p>
        {onEdit && (
          <div className="empty-state-actions">
            <button className="btn" onClick={onEdit}>
              Edit search
            </button>
          </div>
        )}
      </div>
    );
  }

  const boardMode = layout === "board" && Boolean(params);

  return (
    <div className="stack enter-rise results-view">
      {/* The result count + timing now live in the page head's folio line
          (page.tsx · REDESIGN-SPEC §3.1, which also carries the requestId
          hover title — a small, precise target, not this whole row) — this
          toolbar is controls only. The live region moves with the folio, so
          the count is still announced once, just from its one home. */}
      <div className="results-toolbar" style={{ justifyContent: "flex-end" }}>
        <div className="row" style={{ gap: 0, flexWrap: "wrap" }}>
          {/* Board mode always tucks Refine behind this toggle (the workspace
              has no room for a permanently-open card). At <=720px Table/Cards
              ALSO tuck it here — the inline card below is replaced by a
              bottom sheet (REDESIGN-SPEC §3.3) — sharing refineOpen since the
              two conditions are mutually exclusive. */}
          {(boardMode || (narrow && params)) && (
            <div className="toolbar-group">
              <div className="refine-anchor">
                <button
                  type="button"
                  className="btn-sm btn-ghost"
                  aria-expanded={refineOpen}
                  aria-haspopup="true"
                  onClick={() => setRefineOpen((o) => !o)}
                >
                  <Icon name="sliders" size={14} />
                  Refine
                  {facetsActive(facets) && (
                    <span className="num">
                      {" "}
                      · {visible.length}/{results.length}
                    </span>
                  )}
                  {/* One chevron that rotates on open (results.css keys off the
                      button's aria-expanded), instead of swapping icon names. */}
                  <span className="refine-caret" aria-hidden="true">
                    <Icon name="chevron-down" size={12} />
                  </span>
                </button>
                {refineOpen && boardMode && (
                  <>
                    {/* Light-dismiss scrim: click anywhere outside to close. */}
                    <div className="refine-scrim" onClick={() => setRefineOpen(false)} />
                    <div
                      className="refine-pop"
                      role="dialog"
                      aria-label="Refine results"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setRefineOpen(false);
                      }}
                    >
                      <FacetFilter
                        fics={results}
                        value={facets}
                        onChange={setFacets}
                        filteredCount={visible.length}
                      />
                    </div>
                  </>
                )}
                {refineOpen && !boardMode && narrow && (
                  <RefineSheet onClose={() => setRefineOpen(false)}>
                    <FacetFilter
                      fics={results}
                      value={facets}
                      onChange={setFacets}
                      filteredCount={visible.length}
                    />
                  </RefineSheet>
                )}
              </div>
            </div>
          )}

          {params && (
            <>
              <div className="toolbar-sep" />
              <div className="toolbar-group">
                <SavedSearchButton params={params} fics={results} />
              </div>
            </>
          )}

          <div className="toolbar-sep" />
          <div className="toolbar-group">
            <span className="sr-only">View</span>
            <div className="seg" role="group" aria-label="Results view">
              {/* Hidden <=720px (results.css): the board's 980px slices are
                  unreadable on phones, so the segment never offers it there. */}
              <button
                type="button"
                className="seg-btn seg-btn--board"
                aria-pressed={layout === "board"}
                onClick={() => setLayout("board")}
              >
                <Icon name="board" size={14} />
                Board
              </button>
              <button
                type="button"
                className="seg-btn"
                aria-pressed={layout === "table"}
                onClick={() => setLayout("table")}
              >
                <Icon name="table" size={14} />
                Table
              </button>
              <button
                type="button"
                className="seg-btn"
                aria-pressed={layout === "cards"}
                onClick={() => setLayout("cards")}
              >
                <Icon name="cards" size={14} />
                Cards
              </button>
            </div>
          </div>

          <div className="toolbar-sep" />
          <div className="toolbar-group">
            {/* Export the *filtered* set so it matches what's on screen. */}
            <ExportButtons fics={visible} />
          </div>
        </div>
      </div>

      {/* Board mode reaches Refine via the toolbar popover; the inline card
          would eat the workspace's vertical space. Below 720px, Table/Cards
          reach it via the same toggle -> a bottom sheet (REDESIGN-SPEC §3.3),
          so the always-open inline card only shows at desktop widths. */}
      {params && !boardMode && !narrow && (
        <FacetFilter
          fics={results}
          value={facets}
          onChange={setFacets}
          filteredCount={visible.length}
        />
      )}

      <HighlightProvider query={params?.q}>
        {visible.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">
              <Icon name="filter" size={22} />
            </span>
            <h2 className="empty-state-title">No results match the current filters</h2>
            <p>None of the {results.length} matches for this search pass the filters you set.</p>
            <div className="empty-state-actions">
              <button className="btn" onClick={() => setFacets(EMPTY_FACETS)}>
                Reset filters
              </button>
            </div>
          </div>
        ) : layout === "board" ? (
          // The board view needs the search params for its slices. When absent
          // (pure presentational demos), fall back to the table so it still shows.
          // NOTE: board's slices render ResultsTable via components/board/*
          // (out of this surface's ownership), so stampFicId can't reach them —
          // the one-stamp moment is Table/Cards only (see stampFicId above).
          params ? (
            <div className="results-board">
              <BoardView fics={visible} variants={visibleVariants} params={params} />
            </div>
          ) : (
            <ResultsTable fics={visible} stampFicId={stampFicId} />
          )
        ) : layout === "table" ? (
          <ResultsTable fics={visible} stampFicId={stampFicId} />
        ) : (
          <div className="stack">
            {visible.map((fic, i) => (
              <div
                // Keyed by STABLE fic identity, not the post-filter index: a
                // Refine facet toggle must not remount surviving cards (which
                // would replay their staggered entrance and, worse, re-pop the
                // one stamped seal). Matches ResultsTable's keying (F: one-stamp
                // rule holds through refinement, not just first paint).
                key={ficId(fic)}
                className="xl-row-enter results-card-item"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <FicCard fic={fic} animate={ficId(fic) === stampFicId} />
              </div>
            ))}
          </div>
        )}
      </HighlightProvider>
    </div>
  );
}
