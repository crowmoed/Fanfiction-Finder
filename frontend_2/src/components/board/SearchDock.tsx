"use client";

/**
 * SearchDock — the bottom command bar. Runs a REAL search through the SSE
 * pipeline (useSearch), and when it completes, hands the results up so the board
 * turns them into node(s) via the current strategy. Also seeds the demo fixtures.
 *
 * useSearch is a subscriber to a tab-wide op; we add the group exactly once when
 * the op reaches "done" (guarded by the last-handled key), then reset so the next
 * query starts clean.
 */
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { Fic, SearchParams } from "@/lib/contracts";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/contracts";
import { useSearch } from "@/lib/client/useSearch";

export function SearchDock({
  onAddLive,
  onSeed,
  seeded,
}: {
  onAddLive: (params: SearchParams, fics: Fic[], elapsedMs: number | null) => void;
  onSeed: () => void;
  seeded: boolean;
}) {
  const [q, setQ] = useState("");
  const [fandom, setFandom] = useState("");
  const { phase, stages, results, elapsedMs, error, lastParams, search, reset } = useSearch();
  const handledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (phase !== "done" || !lastParams) return;
    const key = `${lastParams.q}::${lastParams.fandom}`;
    if (handledKeyRef.current === key) return;
    handledKeyRef.current = key;
    onAddLive(lastParams, results, elapsedMs);
    reset();
  }, [phase, lastParams, results, elapsedMs, onAddLive, reset]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    handledKeyRef.current = null;
    search({ q: query, fandom: fandom.trim() || "All Fandoms", strict: false });
  };

  const searching = phase === "searching";

  return (
    <form className="bdock" onSubmit={submit}>
      <div className="bdock__row">
        <input
          className="bdock__q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe the fic… e.g. drarry enemies to lovers slow burn, no MCD"
          aria-label="Search query"
        />
        <input
          className="bdock__fandom"
          value={fandom}
          onChange={(e) => setFandom(e.target.value)}
          placeholder="Fandom (optional)"
          aria-label="Fandom"
        />
        <button type="submit" className="bdock__go" disabled={searching || !q.trim()}>
          {searching ? "Searching…" : "Search → table"}
        </button>
        <button type="button" className="bdock__seed" onClick={onSeed} disabled={seeded}>
          {seeded ? "Demo on board" : "Seed demo"}
        </button>
      </div>

      {searching && (
        <div className="bdock__stages" aria-live="polite">
          {PIPELINE_STAGES.map((s) => (
            <span key={s} className={`bdock__stage is-${stages[s]}`}>
              {STAGE_LABELS[s]}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="bdock__err" role="alert">
          {error.message}
        </div>
      )}
    </form>
  );
}
