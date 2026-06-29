"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ALL_FANDOMS, type SearchParams } from "@/lib/contracts";
import { useSearch } from "@/lib/client/useSearch";
import { hasRunningOp } from "@/lib/client/searchRegistry";
import { wasPending } from "@/lib/client/pendingOps";
import { getCachedResults, searchKey } from "@/lib/results/resultsCache";
import { SearchForm } from "@/components/SearchForm";
import { ResultsView } from "@/components/ResultsView";
import { ResultsTableSkeleton } from "@/components/ResultsSkeleton";

function ResultsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const fandom = params.get("fandom") ?? ALL_FANDOMS;
  const strict = params.get("strict") === "true";

  const { phase, stages, results, elapsedMs, error, search, hydrate, cancel } =
    useSearch();

  // The cached-restore check reads localStorage, so it's client-only. Gate it
  // behind a mounted flag so SSR and the first client render agree (no hydration
  // mismatch); the skeleton only appears after mount, during the restore window.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    const sp: SearchParams = { q, fandom, strict };
    const key = searchKey(sp);
    if (key === lastKey.current) return;
    lastKey.current = key;

    const cached = getCachedResults(sp);
    if (cached) {
      setResuming(false);
      hydrate(sp, cached.fics, cached.count, cached.elapsedMs);
    } else {
      // No cached result. If a marker says this exact search was mid-flight when
      // the page reloaded (and nothing is live in this tab), it was interrupted —
      // re-issue it and tell the user we're resuming, not starting over.
      setResuming(!hasRunningOp(key) && wasPending(key));
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
  };

  const retry = () => {
    lastKey.current = ""; // force re-run, bypassing cache
    setResuming(false);
    void search({ q, fandom, strict });
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

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      {/* Keyed by the search so navigating to a different /results query remounts
          the form with the new initial values — SearchForm reads `initial` only
          on mount, so without this the input would keep showing the old query. */}
      <SearchForm
        key={searchKey({ q, fandom, strict })}
        initial={{ q, fandom, strict }}
        onSubmit={submit}
        busy={phase === "searching"}
      />
      {restoringCached ? (
        <ResultsTableSkeleton rows={6} />
      ) : (
        <ResultsView
          phase={phase}
          stages={stages}
          results={results}
          error={error}
          elapsedMs={elapsedMs}
          onRetry={retry}
          onCancel={cancel}
          params={{ q, fandom, strict }}
          resuming={resuming}
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
