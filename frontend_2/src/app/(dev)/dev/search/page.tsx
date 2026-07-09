"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import type { SearchParams } from "@/lib/contracts";
import { MANY_FICS, SAMPLE_FICS } from "@/lib/demo/fixtures";
import {
  type DemoScenario,
  useSimulatedSearch,
} from "@/lib/demo/useSimulatedSearch";
import { cacheResults } from "@/lib/results/resultsCache";
import { ResultsView } from "@/components/ResultsView";

const SCENARIOS: { id: DemoScenario; label: string }[] = [
  { id: "success", label: "Success (3 results)" },
  { id: "many", label: "Many results (12)" },
  { id: "empty", label: "No matches" },
  { id: "error", label: "Error (retryable)" },
  { id: "slow", label: "Slow run (long loading)" },
];

// Each scenario "searches" a distinct demo query so it gets its own saveable URL.
const DEMO_QUERY: Record<DemoScenario, string> = {
  success: "demo: drarry slow burn",
  many: "demo: many results",
  empty: "demo: no matches",
  error: "demo: error",
  slow: "demo: slow run",
};

function paramsFor(id: DemoScenario): SearchParams {
  return { q: DEMO_QUERY[id], fandom: "Harry Potter", strict: false };
}

function resultsUrl(p: SearchParams): string {
  return `/results?${new URLSearchParams({
    q: p.q,
    fandom: p.fandom,
    strict: String(p.strict ?? false),
  }).toString()}`;
}

export default function SearchDemo() {
  const sim = useSimulatedSearch();
  const router = useRouter();
  // Remember which scenario is in flight so we can route once it resolves.
  const pending = useRef<DemoScenario | null>(null);

  const trigger = (id: DemoScenario) => {
    const fics =
      id === "empty" ? [] : id === "many" ? MANY_FICS : SAMPLE_FICS;
    pending.current = id;
    sim.run(id, fics);
  };

  // When a simulated search finishes successfully, cache it and navigate to its
  // saveable /results URL — exactly like the real search flow lands the user on
  // the shareable URL. (Empty/error stay here so those states stay visible.)
  useEffect(() => {
    if (sim.phase !== "done" || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    if (sim.results.length === 0) return; // "empty" — show it in place
    const p = paramsFor(id);
    cacheResults(p, sim.results, sim.results.length, sim.elapsedMs);
    router.push(resultsUrl(p));
  }, [sim.phase, sim.results, sim.elapsedMs, router]);

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="page-head">
        <h1>Search flow &amp; loading</h1>
        <p className="muted" style={{ margin: 0 }}>
          These buttons emit the same SSE pipeline events the real backend stream
          produces. The loading scene below is the production component. A
          successful run caches its results and navigates to the saveable
          /results URL, just like a real search.
        </p>
      </header>

      <div className="row">
        {SCENARIOS.map((s) => (
          <button key={s.id} onClick={() => trigger(s.id)}>
            {s.label}
          </button>
        ))}
        <span className="spacer" />
        <button onClick={sim.reset}>Reset</button>
      </div>

      <ResultsView
        phase={sim.phase}
        stages={sim.stages}
        results={sim.results}
        error={sim.error}
        elapsedMs={sim.elapsedMs}
        onRetry={() => trigger("success")}
        onCancel={sim.cancel}
      />
    </div>
  );
}
