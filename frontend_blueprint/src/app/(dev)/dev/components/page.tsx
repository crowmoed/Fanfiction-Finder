"use client";

import { PIPELINE_STAGES } from "@/lib/contracts";
import type { StageState } from "@/lib/client/useSearch";
import { MatchScore } from "@/components/MatchScore";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResultsView } from "@/components/ResultsView";

// Build a frozen StageState with `activeIndex` active, earlier stages done.
function frozenStages(activeIndex: number): StageState {
  return PIPELINE_STAGES.reduce((acc, s, i) => {
    acc[s] = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
    return acc;
  }, {} as StageState);
}

function allDone(): StageState {
  return PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = "done";
    return acc;
  }, {} as StageState);
}

export default function ComponentsDemo() {
  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>Atoms</h1>
        <p className="muted" style={{ margin: 0 }}>
          Individual components frozen at every state, so each can be styled in
          isolation.
        </p>
      </header>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>MatchScore</h2>
        <div className="row" style={{ gap: "1.5rem" }}>
          <MatchScore score={97} />
          <MatchScore score={71} />
          <MatchScore score={12} />
          <MatchScore score={null} />
        </div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>
          Pipeline status — frozen at each stage
        </h2>
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage}>
            <p className="muted" style={{ margin: "0 0 0.25rem" }}>
              active: {stage}
            </p>
            <PipelineStatus stages={frozenStages(i)} />
          </div>
        ))}
        <p className="muted" style={{ margin: "0 0 0.25rem" }}>
          all done
        </p>
        <PipelineStatus stages={allDone()} elapsedMs={2840} />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Empty & error</h2>
        <ResultsView
          phase="done"
          stages={allDone()}
          results={[]}
          error={null}
        />
        <ResultsView
          phase="error"
          stages={allDone()}
          results={[]}
          error={{
            message: "Could not reach the backend.",
            status: 502,
            requestId: "demo-req-cafe",
            retryable: true,
          }}
          onRetry={() => {}}
        />
      </section>
    </div>
  );
}
