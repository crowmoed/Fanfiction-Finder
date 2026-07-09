"use client";

/**
 * PipelineStatus — the loading scene's data anchor.
 *
 * Renders each backend pipeline stage and its live status (pending → active →
 * done) as driven by the SSE stream, plus an *adaptive, duration-aware* line:
 * a live timer (started when this component mounts = when the search begins)
 * feeds loadingMessage(), so a long wait reads as "still working, here's why"
 * instead of a frozen spinner.
 *
 * The design layer ("the diorama reacts: lanterns flare, shelves fill, candles
 * gutter") choreographs to the stage ids/statuses and the message tone — the
 * logic lives here so the visuals can be replaced without changing the contract.
 */
import { useEffect, useRef, useState } from "react";

import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStageId } from "@/lib/contracts";
import type { StageState } from "@/lib/client/useSearch";
import { loadingMessage } from "@/lib/results/loadingMessage";
import { Icon } from "@/components/Icon";

/** "5643" -> "5.6s"; sub-second reads as "0.x s" rather than a bare ms count (F119). */
function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

// The backend runs enhance→embed→retrieve→rank as one opaque call, so the SSE
// route flips ALL stages "active" at once (no real sub-stage events). When that's
// the case we estimate progression from elapsed time so the scene advances
// believably instead of freezing on the first stage — an honest estimate, not a
// claim of real timing. Rough cumulative thresholds (ms) for each stage's end;
// the last stage runs until the result lands.
const STAGE_ESTIMATE_MS: Record<PipelineStageId, number> = {
  enhance: 1500,
  embed: 3500,
  retrieve: 6000,
  rank: Number.POSITIVE_INFINITY,
};

function estimatedStage(elapsedMs: number): PipelineStageId {
  for (const stage of PIPELINE_STAGES) {
    if (elapsedMs < STAGE_ESTIMATE_MS[stage]) return stage;
  }
  return PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
}

/** True when the stream gave no real granularity (all stages active, none done). */
function isCoarse(stages: StageState): boolean {
  return PIPELINE_STAGES.every((s) => stages[s] === "active");
}

function activeStageOf(
  stages: StageState,
  elapsedMs: number
): PipelineStageId | null {
  // No real per-stage boundaries → estimate the current stage from elapsed time.
  if (isCoarse(stages)) return estimatedStage(elapsedMs);
  // Real granularity (future): the active stage is the first not yet done.
  for (const stage of PIPELINE_STAGES) {
    if (stages[stage] === "active") return stage;
  }
  for (const stage of PIPELINE_STAGES) {
    if (stages[stage] !== "done") return stage;
  }
  return null;
}

/**
 * The status to *display* for a stage. With real granularity, pass through. In
 * coarse mode, render the estimated progression (stages before the estimated one
 * read done, the estimated one active, later ones pending) so the list advances
 * as a single moving step instead of showing four simultaneous "working…" lines.
 */
function displayStatus(
  stage: PipelineStageId,
  stages: StageState,
  estimated: PipelineStageId | null
): StageState[PipelineStageId] {
  if (!isCoarse(stages) || estimated == null) return stages[stage];
  const idx = PIPELINE_STAGES.indexOf(stage);
  const activeIdx = PIPELINE_STAGES.indexOf(estimated);
  if (idx < activeIdx) return "done";
  if (idx === activeIdx) return "active";
  return "pending";
}

export function PipelineStatus({
  stages,
  elapsedMs,
}: {
  stages: StageState;
  elapsedMs?: number | null;
}) {
  // Live elapsed clock — starts when this loading scene first mounts.
  const startRef = useRef<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const liveElapsed = now - startRef.current;
  const active = activeStageOf(stages, liveElapsed);
  const message = loadingMessage(liveElapsed, active);
  const anyActive = active != null;

  return (
    // rise-in: the loading scene visibly arrives instead of just riding the
    // route-fade. (Guarded → plain fade under reduced motion.)
    <div className="pipeline rise-in" aria-live="polite" aria-busy="true">
      {anyActive && <span className="pipeline-bar" aria-hidden="true" />}
      <div className="pipeline-head">
        <span className="pipeline-title">Searching…</span>
        {elapsedMs != null && <span className="muted num">{formatElapsed(elapsedMs)}</span>}
      </div>
      <ol className="pipeline-steps">
        {PIPELINE_STAGES.map((stage, i) => {
          const s = displayStatus(stage, stages, active);
          return (
            <li
              key={stage}
              className="pipeline-step rise-in"
              style={{ "--rise-delay": `${i * 40}ms` } as React.CSSProperties}
              data-stage={stage}
              data-state={s}
            >
              <span className="pipeline-marker" aria-hidden="true">
                {/* Keyed by state + pop-in so a stage resolving (spinner→check)
                    reads as a small settled beat, not an instant swap. */}
                {s !== "pending" && (
                  <span className="pop-in" key={s} style={{ display: "inline-flex" }}>
                    <Icon name={s === "done" ? "check" : "spinner"} size={13} />
                  </span>
                )}
              </span>
              {STAGE_LABELS[stage]}
            </li>
          );
        })}
      </ol>

      {/* Adaptive, duration-aware reassurance — tone escalates as the wait grows.
          Keyed by tone so a tone change crossfades in (fade-in) instead of the
          copy mutating in place. No aria-live here: the whole card is already a
          polite live region, and a nested one causes duplicate announcements. */}
      <span
        key={message.tone}
        className="muted fade-in"
        data-tone={message.tone}
      >
        {message.text}
      </span>
    </div>
  );
}
