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

function activeStageOf(stages: StageState): PipelineStageId | null {
  // The active stage is the first one not yet done (drives the contextual hint).
  for (const stage of PIPELINE_STAGES) {
    if (stages[stage] === "active") return stage;
  }
  for (const stage of PIPELINE_STAGES) {
    if (stages[stage] !== "done") return stage;
  }
  return null;
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
  const message = loadingMessage(liveElapsed, activeStageOf(stages));

  return (
    <div className="card stack" aria-live="polite" aria-busy="true">
      <strong>Searching…</strong>
      <ol className="stack" style={{ gap: "0.4rem", margin: 0, paddingLeft: "1.2rem" }}>
        {PIPELINE_STAGES.map((stage) => {
          const s = stages[stage];
          const marker = s === "done" ? "✓" : s === "active" ? "…" : "·";
          return (
            <li
              key={stage}
              data-stage={stage}
              data-status={s}
              style={{ opacity: s === "pending" ? 0.5 : 1 }}
            >
              <span aria-hidden style={{ display: "inline-block", width: "1.2em" }}>
                {marker}
              </span>
              {STAGE_LABELS[stage]}
              {s === "active" && <span className="muted"> (working…)</span>}
            </li>
          );
        })}
      </ol>

      {/* Adaptive, duration-aware reassurance — tone escalates as the wait grows. */}
      <span className="muted" data-tone={message.tone} aria-live="polite">
        {message.text}
      </span>

      {elapsedMs != null && <span className="muted">Took {elapsedMs} ms</span>}
    </div>
  );
}
