"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ALL_FANDOMS, type SearchParams } from "@/lib/contracts";
import { useCountUp } from "@/lib/client/motion";
import { useSearch, type SearchPhase } from "@/lib/client/useSearch";
import { hasRunningOp, opKey } from "@/lib/client/searchRegistry";
import { wasPending } from "@/lib/client/pendingOps";
import { getCachedResults, searchKey } from "@/lib/results/resultsCache";
import { SearchForm } from "@/components/SearchForm";
import { ResultsView, relativeAge, type ResultsLayout } from "@/components/ResultsView";
import { ResultsTableSkeleton } from "@/components/ResultsSkeleton";

/**
 * ResultsHead — the query-as-headline (REDESIGN-SPEC §3.1). Replaces the old
 * sr-only h1 + always-visible composer: once a query exists, the page reads as
 * a masthead (kicker/folio, then the query itself as a real, visible h1)
 * instead of pre-search chrome sitting above an empty results area.
 *
 * `compact` is the board-workspace collapse: one inline strip instead of a
 * full head, so the fixed-height workspace only loses a small amount of
 * height, not a whole masthead (§3.1's "collapses to ONE compact strip").
 */
function ResultsHead({
  q,
  fandom,
  strict,
  phase,
  resultCount,
  elapsedMs,
  cachedAt,
  requestId,
  onRefresh,
  onEdit,
  compact,
}: {
  q: string;
  fandom: string;
  strict: boolean;
  phase: SearchPhase;
  resultCount: number;
  elapsedMs?: number | null;
  cachedAt: number | null;
  /** Backend request id for the delivered result set (support correlation) —
   *  surfaced as a hover title on the folio line, a small precise target. */
  requestId?: string | null;
  onRefresh: () => void;
  onEdit: () => void;
  compact: boolean;
}) {
  const scoped = fandom !== ALL_FANDOMS || strict;

  // The result tally ticks up 0→N when a fresh (non-cached) set lands — a small
  // "counting the matches" beat. A cached/revisited search shows the final
  // number immediately (and useCountUp returns it instantly under reduced
  // motion), so it never replays on a plain revisit.
  const shownCount = useCountUp(resultCount, {
    enabled: phase === "done" && cachedAt == null,
    duration: 500,
  });

  return (
    <div className={`results-head${compact ? " results-head--compact" : ""}`}>
      {/* Masthead entrance (REDESIGN-SPEC §3.1): kicker -> folio -> the query
          headline -> rule cascade in on each new search, the same staggered
          .rise-in the home hero uses for its structurally identical shape. The
          usage in ResultsInner keys this component by the search, so it replays
          on a re-search within /results (where the pathname, and thus the
          .app-main route-fade, doesn't change). Reduced-motion collapses
          .rise-in to a plain opacity fade (globals.css §18). */}
      {!compact && (
        <p
          className="eyebrow rise-in"
          style={{ "--rise-delay": "0ms" } as React.CSSProperties}
        >
          Results
        </p>
      )}
      <p
        className="eyebrow results-head__folio rise-in"
        style={{ "--rise-delay": compact ? "0ms" : "50ms" } as React.CSSProperties}
        role="status"
        aria-live="polite"
        title={requestId ? `Request ID: ${requestId}` : undefined}
      >
        {phase === "searching" ? (
          <span>Searching…</span>
        ) : phase === "done" ? (
          <>
            <span className="num">
              {shownCount} fic{resultCount === 1 ? "" : "s"}
            </span>
            {elapsedMs != null && (
              <>
                <span className="results-head__folio-sep" aria-hidden="true">
                  ·
                </span>
                <span className="num">{(elapsedMs / 1000).toFixed(1)}s</span>
              </>
            )}
            {cachedAt != null && (
              <>
                <span className="results-head__folio-sep" aria-hidden="true">
                  ·
                </span>
                <span>cached {relativeAge(cachedAt)}</span>
              </>
            )}
            <span className="results-head__folio-sep" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              className="results-head__folio-action"
              onClick={onRefresh}
              title="Re-run this search against the archive"
            >
              Refresh
            </button>
          </>
        ) : (
          <span>&nbsp;</span>
        )}
        <span className="results-head__folio-sep" aria-hidden="true">
          ·
        </span>
        <button type="button" className="results-head__folio-action" onClick={onEdit}>
          Edit search
        </button>
        {scoped && (
          <>
            <span className="results-head__folio-sep" aria-hidden="true">
              ·
            </span>
            <span className="results-head__scope">
              {fandom !== ALL_FANDOMS ? fandom.toUpperCase() : ""}
              {fandom !== ALL_FANDOMS && strict ? " · " : ""}
              {strict ? "STRICT" : ""}
            </span>
          </>
        )}
      </p>
      <h1
        className={`${
          compact ? "results-head__quote" : "t-display-quote results-head__quote"
        } rise-in`}
        style={{ "--rise-delay": compact ? "40ms" : "90ms" } as React.CSSProperties}
      >
        {q}
      </h1>
      {!compact && (
        <hr
          className="rule-strong rule-draw"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        />
      )}
    </div>
  );
}

function ResultsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const fandom = params.get("fandom") ?? ALL_FANDOMS;
  const strict = params.get("strict") === "true";
  // Stable object identity across re-renders: the board derives its slice memos
  // from this, so an inline literal would rebuild every slice node on any
  // unrelated state change here.
  const viewParams = useMemo<SearchParams>(
    () => ({ q, fandom, strict }),
    [q, fandom, strict]
  );

  const {
    phase,
    stages,
    results,
    variants,
    elapsedMs,
    error,
    requestId,
    search,
    hydrate,
    cancel,
  } = useSearch();

  // When results were restored from the local cache, the original run time — so
  // the view can show a "cached N ago · Refresh" cue. null after a live search.
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // The view layout lives here (not inside ResultsView) because board mode
  // changes the PAGE: the whole /results surface locks to the viewport as a
  // full-window workspace (form + toolbar + canvas, nothing scrolls) instead of
  // a scrolling document with a canvas strip in the middle.
  const [layout, setLayout] = useState<ResultsLayout>("board");
  // Phones default to Cards — the board's 980px tables are unreadable at
  // 390px. First mount only (post-hydration, so SSR markup agrees); a user's
  // explicit toggle afterwards is never overridden.
  const layoutTouched = useRef(false);
  useEffect(() => {
    if (layoutTouched.current) return;
    if (window.matchMedia("(max-width: 720px)").matches) setLayout("cards");
  }, []);
  const chooseLayout = (l: ResultsLayout) => {
    layoutTouched.current = true;
    setLayout(l);
  };

  // The cached-restore check reads localStorage, so it's client-only. Gate it
  // behind a mounted flag so SSR and the first client render agree (no hydration
  // mismatch); the skeleton only appears after mount, during the restore window.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Query-as-headline state (REDESIGN-SPEC §3.1): `editing || !q` renders the
  // boxed composer; otherwise the headline. `editing` alone only matters when
  // q is non-empty — with an empty q the composer already shows via the `!q`
  // half of the OR, so there's nothing for Cancel/Escape to "restore" to.
  // `autoFocusComposer` is separate from `editing` itself: opening the
  // composer via Edit search should autofocus it, but landing on a genuinely
  // empty /results should NOT (only the home hero autofocuses on a bare
  // empty-state visit — this page's plain empty state stays quiet).
  const [editing, setEditing] = useState(false);
  const [autoFocusComposer, setAutoFocusComposer] = useState(false);
  const openEditor = () => {
    setAutoFocusComposer(true);
    setEditing(true);
  };
  const closeEditor = () => {
    setAutoFocusComposer(false);
    setEditing(false);
  };
  // A fresh navigation to a different search (new q) closes any open editor —
  // otherwise submitting from the composer would leave it stuck open over the
  // new headline's results.
  useEffect(() => {
    setEditing(false);
    setAutoFocusComposer(false);
  }, [q, fandom, strict]);

  // Client Component (reads useSearchParams) → can't export Next `metadata`, so
  // set the tab title from an effect. Runs after the router applies its own
  // metadata on navigation, so the per-search title wins on client nav.
  useEffect(() => {
    document.title = q.trim() ? `${q} · Ficwell` : "Search results · Ficwell";
  }, [q]);

  // True when we're re-issuing a search that was interrupted mid-flight by a
  // refresh (a "pending" marker exists but nothing is live in this tab), so the
  // loading scene can say "resuming" instead of looking like a brand-new search.
  const [resuming, setResuming] = useState(false);

  // On every URL change: restore from the local cache instantly if we have it
  // (so a saved/bookmarked URL just works, no backend, no re-run); otherwise run
  // the search — which, via the registry, attaches to an already-running op for
  // this key instead of firing a duplicate request. A ref guards against
  // re-firing on unrelated re-renders. Completion side effects (cache, history,
  // followed-search diff) now live in the registry, fired once per op.
  const lastKey = useRef<string>("");
  useEffect(() => {
    if (!q.trim()) return;
    // Always ask for per-variant lists: the board (the default view) slices by
    // rewritten prompt. searchKey ignores includeVariants, so the cache key and
    // the restore guard below are unaffected.
    const sp: SearchParams = { q, fandom, strict, includeVariants: true };
    const key = searchKey(sp);
    if (key === lastKey.current) return;
    lastKey.current = key;

    const cached = getCachedResults(sp);
    // A live op for this key (e.g. a Refresh still streaming after a Back-nav
    // remount) always wins over the cache: hydrate() would abort it and pin the
    // stale snapshot. search() just attaches to the running op.
    if (cached && !hasRunningOp(opKey(sp))) {
      setResuming(false);
      setCachedAt(cached.at);
      hydrate(sp, cached.fics, cached.count, cached.elapsedMs, cached.variants ?? null);
    } else if (cached) {
      setCachedAt(null);
      setResuming(false);
      void search(sp);
    } else {
      // No cached result. If a marker says this exact search was mid-flight when
      // the page reloaded (and nothing is live in this tab), it was interrupted —
      // re-issue it and tell the user we're resuming, not starting over.
      // `wasPending` is keyed by the plain searchKey (`key`); the live op lives
      // under the variant-suffixed key, so check that one for hasRunningOp.
      setCachedAt(null);
      setResuming(!hasRunningOp(opKey(sp)) && wasPending(key));
      void search(sp);
    }
  }, [q, fandom, strict, search, hydrate]);

  const submit = (p: SearchParams) => {
    const qs = new URLSearchParams({
      q: p.q,
      fandom: p.fandom,
      strict: String(p.strict ?? false),
    });
    router.push(`/results?${qs.toString()}`);
    // Resubmitting the *same* query (e.g. after Cancel, or a failed run) pushes
    // an identical URL, so the restore effect's deps don't change and it won't
    // re-fire. If there's nothing cached to restore, kick the search directly so
    // the form isn't a dead end.
    if (searchKey(p) === searchKey({ q, fandom, strict }) && !getCachedResults(p)) {
      lastKey.current = "";
      setResuming(false);
      setCachedAt(null);
      void search({ ...p, includeVariants: true });
    }
  };

  const retry = () => {
    lastKey.current = ""; // force re-run, bypassing cache
    setResuming(false);
    setCachedAt(null);
    void search({ q, fandom, strict, includeVariants: true });
  };

  // Cancelling deletes the op (phase → idle); clear the guard so the same query
  // can be searched again rather than being silently skipped by the effect.
  const onCancel = () => {
    lastKey.current = "";
    cancel();
  };

  // Brief window when opening an already-made (cached) search URL: there's a
  // query but the restore effect hasn't run yet, so phase is still "idle". Show
  // the results skeleton instead of the idle prompt so saved searches load into
  // their shape, not a flash of "enter a query".
  const restoringCached =
    mounted &&
    phase === "idle" &&
    q.trim().length > 0 &&
    getCachedResults({ q, fandom, strict }) !== null;

  // Board is a full-window workspace: while searching or showing board results,
  // the page pins to the viewport (see .results-workspace in globals.css).
  // Table/Cards, errors, empty and idle states stay a normal scrolling document.
  const workspace =
    layout === "board" &&
    !restoringCached &&
    (phase === "searching" || (phase === "done" && results.length > 0));

  // editing || !q renders the composer; otherwise the headline (REDESIGN-SPEC
  // §3.1). Never both — the two are alternate states of the same slot.
  const showComposer = editing || !q.trim();

  return (
    <div
      // Data-dense surfaces opt into the wide 1160px column (F046/F120) — the
      // 11-column table needs the room. Board's fixed-position .results-workspace
      // already out-ranks the centering clamp on its own (see globals.css
      // `.app-main > .results-workspace`), so it doesn't need `.page-wide` too.
      className={workspace ? "stack results-workspace" : "stack page-wide"}
      style={workspace ? undefined : { gap: "1.5rem" }}
    >
      {showComposer ? (
        <>
          {/* The query-as-headline's own <h1> only exists once a query is
              showing (ResultsHead, below); the composer states need their own
              programmatic heading so the page always has exactly one h1. */}
          <h1 className="sr-only">
            {q.trim() ? `Editing search for “${q}”` : "Search results"}
          </h1>
          {/* Keyed by the search so navigating to a different /results query
              remounts the form with the new initial values — SearchForm reads
              `initial` only on mount, so without this the input would keep
              showing the old query. */}
          <SearchForm
            key={searchKey({ q, fandom, strict })}
            initial={{ q, fandom, strict }}
            onSubmit={submit}
            busy={phase === "searching"}
            autoFocus={autoFocusComposer}
            onCancel={q.trim() ? closeEditor : undefined}
          />
        </>
      ) : (
        <ResultsHead
          // Keyed by the search so the masthead entrance (.rise-in on its
          // parts) replays on a new /results query — a searchParams change keeps
          // the same pathname, so .app-main isn't remounted and its route-fade
          // wouldn't otherwise fire here.
          key={searchKey({ q, fandom, strict })}
          q={q}
          fandom={fandom}
          strict={strict}
          phase={phase}
          resultCount={results.length}
          elapsedMs={elapsedMs}
          cachedAt={cachedAt}
          requestId={requestId}
          onRefresh={retry}
          onEdit={openEditor}
          compact={workspace}
        />
      )}
      {restoringCached ? (
        // withHead=false: ResultsHead (above) already rendered live — the
        // query text is already known during this brief cache-restore window.
        <ResultsTableSkeleton rows={6} withHead={false} />
      ) : (
        <ResultsView
          // Re-keyed per search like SearchForm above, and for the same reason:
          // per-search state (facet filters, slice collapse/sort inside the
          // board) must not leak from search A into unrelated search B. The
          // prefix keeps it distinct from SearchForm's sibling key.
          key={`results:${searchKey(viewParams)}`}
          phase={phase}
          stages={stages}
          results={results}
          variants={variants}
          error={error}
          elapsedMs={elapsedMs}
          onRetry={retry}
          onCancel={onCancel}
          onEdit={openEditor}
          params={viewParams}
          resuming={resuming}
          requestId={requestId}
          freshResultSet={cachedAt == null}
          layout={layout}
          onLayoutChange={chooseLayout}
        />
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <ResultsInner />
    </Suspense>
  );
}
