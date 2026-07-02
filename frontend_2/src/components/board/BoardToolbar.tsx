"use client";

/**
 * BoardToolbar — the top-left control cluster (rendered in a React Flow Panel).
 * Switches the split strategy (the "dynamic" part: Combined / By platform / By
 * rewritten prompt), shows counts, and offers fit-to-view + clear.
 */
import { STRATEGIES } from "@/lib/board/strategies";

export function BoardToolbar({
  strategyId,
  onStrategyChange,
  groupCount,
  nodeCount,
  onFit,
  onClear,
}: {
  strategyId: string;
  onStrategyChange: (id: string) => void;
  groupCount: number;
  nodeCount: number;
  onFit: () => void;
  onClear: () => void;
}) {
  const active = STRATEGIES.find((s) => s.id === strategyId);

  return (
    <div className="btoolbar">
      <div className="btoolbar__brand">
        <span className="btoolbar__mark" aria-hidden>
          ▦
        </span>
        <span>Results board</span>
      </div>

      <div className="btoolbar__seg" role="radiogroup" aria-label="How to split each search into tables">
        {STRATEGIES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === strategyId}
            className={`btoolbar__segbtn${s.id === strategyId ? " is-active" : ""}`}
            title={s.description}
            onClick={() => onStrategyChange(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {active && <p className="btoolbar__hint">{active.description}</p>}

      <div className="btoolbar__meta">
        <span>
          {groupCount} search{groupCount === 1 ? "" : "es"} · {nodeCount} table
          {nodeCount === 1 ? "" : "s"}
        </span>
        <span className="btoolbar__links">
          <button type="button" className="btoolbar__link" onClick={onFit} disabled={!nodeCount}>
            Fit
          </button>
          <button type="button" className="btoolbar__link" onClick={onClear} disabled={!groupCount}>
            Clear
          </button>
        </span>
      </div>
    </div>
  );
}
