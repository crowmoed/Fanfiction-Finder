"use client";

/**
 * BoardLoading — the Stitch-style search loading state.
 *
 * Instead of a list of pipeline steps, we show a blurred, dimmed ghost of the
 * board that's about to appear (a few placeholder slice tables) with a single
 * crisp status line describing what the pipeline is doing right now — so the
 * loading screen already has the SHAPE of the result, and the copy tells you
 * where it is ("Understanding your request…" → "Ranking the best matches…").
 */
import "./board.css";

import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStageId } from "@/lib/contracts";
import type { StageState } from "@/lib/client/useSearch";
import { HankoMark } from "@/components/HankoMark";

function currentLabel(stages: StageState): string {
  const active = PIPELINE_STAGES.find((s) => stages[s] === "active");
  if (active) return STAGE_LABELS[active];
  // No stage active yet, or all done (brief beat before the result lands): show
  // the first pending stage, or the last stage's label if everything's done.
  const firstPending = PIPELINE_STAGES.find((s) => stages[s] === "pending");
  const fallback: PipelineStageId = firstPending ?? PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
  return STAGE_LABELS[fallback];
}

/** How many ghost placeholder tables to sketch (matches the default by-platform slice). */
const GHOSTS = [0, 1, 2];
const GHOST_ROWS = [0, 1, 2, 3, 4, 5];

export function BoardLoading({
  stages,
  onCancel,
}: {
  stages: StageState;
  /** When provided, a Cancel action renders inside the status block — with the
   *  crisp label, not below the (tall) ghost region where it can fall offscreen. */
  onCancel?: () => void;
}) {
  const done = PIPELINE_STAGES.filter((s) => stages[s] === "done").length;
  const pct = Math.round((done / PIPELINE_STAGES.length) * 100);
  const label = currentLabel(stages);

  return (
    <div className="bload" role="status" aria-live="polite">
      {/* The blurred ghost of the coming board layout. Ghost cards stagger in
          rather than appearing pre-formed (enter-rise is reduced-motion-guarded
          globally). */}
      <div className="bload__ghosts" aria-hidden>
        {GHOSTS.map((g) => (
          <div
            key={g}
            className="bload__card enter-rise"
            style={{ animationDelay: `${g * 55}ms` }}
          >
            <div className="bload__cardhead" />
            {GHOST_ROWS.map((r) => (
              <div key={r} className="bload__row" style={{ animationDelay: `${(g * 6 + r) * 90}ms` }} />
            ))}
          </div>
        ))}
      </div>

      {/* The one crisp thing: what the search is doing. The mark above it is
          the brand at work — it stamps in once and sits; the vermilion fill
          bar below carries the ongoing motion (one busy motif, no ring). */}
      <div className="bload__status">
        <span className="hanko bload__hanko stamp-in" aria-hidden>
          <HankoMark />
        </span>
        <span className="bload__label">
          {/* Keyed by the stage label so it crossfades in as the pipeline
              advances, instead of the text mutating in place mid-word. */}
          <span key={label} className="fade-in">
            {label}
          </span>
          <span className="bload__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="bload__track" aria-hidden>
          <span className="bload__fill" style={{ width: `${Math.max(8, pct)}%` }} />
        </span>
        {onCancel && (
          <button type="button" className="bload__cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
