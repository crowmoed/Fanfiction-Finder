"use client";

import { PIPELINE_STAGES } from "@/lib/contracts";
import type { StageState } from "@/lib/client/useSearch";
import { MatchScore } from "@/components/MatchScore";
import { PipelineStatus } from "@/components/PipelineStatus";
import { ResultsView } from "@/components/ResultsView";
import { Icon } from "@/components/Icon";

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
      <header className="page-head">
        <h1>Atoms</h1>
        <p className="muted" style={{ margin: 0 }}>
          Individual components frozen at every state, so each can be styled in
          isolation.
        </p>
      </header>

      <section className="stack">
        <h3>MatchScore</h3>
        <div className="row" style={{ gap: "1.5rem" }}>
          <MatchScore score={97} />
          <MatchScore score={71} />
          <MatchScore score={12} />
          <MatchScore score={null} />
        </div>
      </section>

      <section className="stack">
        <h3>Pipeline status, frozen at each stage</h3>
        <ol
          className="stack"
          style={{ gap: "0.6rem", margin: 0, padding: 0, listStyle: "none" }}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <li key={stage} className="row" style={{ gap: "0.75rem", alignItems: "stretch" }}>
              <span
                className="muted num"
                style={{ flex: "0 0 1.4rem", textAlign: "right", paddingTop: "0.6rem" }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <p className="muted" style={{ margin: "0 0 0.25rem", fontSize: "var(--text-sm)" }}>
                  active: <strong>{stage}</strong>
                </p>
                <PipelineStatus stages={frozenStages(i)} />
              </div>
            </li>
          ))}
          <li className="row" style={{ gap: "0.75rem", alignItems: "stretch" }}>
            <span
              className="muted num"
              style={{ flex: "0 0 1.4rem", textAlign: "right", paddingTop: "0.6rem" }}
            >
              <Icon name="check" size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <p className="muted" style={{ margin: "0 0 0.25rem", fontSize: "var(--text-sm)" }}>
                all done
              </p>
              <PipelineStatus stages={allDone()} elapsedMs={2840} />
            </div>
          </li>
        </ol>
      </section>

      <section className="stack">
        <h3>Empty &amp; error</h3>
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
