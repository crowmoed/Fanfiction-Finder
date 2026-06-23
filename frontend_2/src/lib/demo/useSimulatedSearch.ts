"use client";

/**
 * useSimulatedSearch.ts — a backend-free driver that produces the SAME state
 * shape as useSearch, by emitting the SAME SearchStreamEvent sequence on timers.
 *
 * This lets the demo harness exercise the real ResultsView / PipelineStatus
 * components through every phase — including the live loading choreography — with
 * zero backend. Because it speaks the SearchStreamEvent contract, anything that
 * works here works against the real stream.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PIPELINE_STAGES,
  type Fic,
  type SearchStreamEvent,
} from "@/lib/contracts";
import {
  type SearchError,
  type SearchPhase,
  type StageState,
} from "@/lib/client/useSearch";

export type DemoScenario = "success" | "many" | "empty" | "error" | "slow";

function initialStages(): StageState {
  return PIPELINE_STAGES.reduce((acc, s) => {
    acc[s] = "pending";
    return acc;
  }, {} as StageState);
}

interface SimState {
  phase: SearchPhase;
  stages: StageState;
  results: Fic[];
  error: SearchError | null;
  elapsedMs: number | null;
}

const IDLE: SimState = {
  phase: "idle",
  stages: initialStages(),
  results: [],
  error: null,
  elapsedMs: null,
};

/** Build the scripted event timeline for a scenario. */
function buildScript(
  scenario: DemoScenario,
  fics: Fic[]
): { delay: number; event: SearchStreamEvent }[] {
  const gap = scenario === "slow" ? 1400 : 650;
  const script: { delay: number; event: SearchStreamEvent }[] = [];
  let t = 0;
  PIPELINE_STAGES.forEach((stage, i) => {
    if (i > 0) {
      script.push({
        delay: t,
        event: { type: "stage", stage: PIPELINE_STAGES[i - 1], status: "done", at: 0 },
      });
    }
    script.push({ delay: t, event: { type: "stage", stage, status: "active", at: 0 } });
    t += gap;
  });
  // Final stage done.
  script.push({
    delay: t,
    event: { type: "stage", stage: PIPELINE_STAGES.at(-1)!, status: "done", at: 0 },
  });

  if (scenario === "error") {
    script.push({
      delay: t,
      event: {
        type: "error",
        message: "The ranking model timed out. This is a simulated failure.",
        status: 503,
        request_id: "demo-req-deadbeef",
        retryable: true,
      },
    });
  } else {
    script.push({
      delay: t,
      event: { type: "result", fics, count: fics.length, elapsed_ms: t },
    });
  }
  return script;
}

export function useSimulatedSearch() {
  const [state, setState] = useState<SimState>(IDLE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const apply = useCallback((ev: SearchStreamEvent) => {
    setState((prev) => {
      switch (ev.type) {
        case "stage":
          return { ...prev, stages: { ...prev.stages, [ev.stage]: ev.status } };
        case "result":
          return { ...prev, phase: "done", results: ev.fics, elapsedMs: ev.elapsed_ms };
        case "error":
          return {
            ...prev,
            phase: "error",
            error: {
              message: ev.message,
              status: ev.status,
              requestId: ev.request_id,
              retryable: ev.retryable,
            },
          };
        default:
          return prev;
      }
    });
  }, []);

  const run = useCallback(
    (scenario: DemoScenario, fics: Fic[]) => {
      clearTimers();
      setState({ ...IDLE, phase: "searching", stages: initialStages() });
      const script = buildScript(scenario, fics);
      for (const step of script) {
        timers.current.push(setTimeout(() => apply(step.event), step.delay));
      }
    },
    [apply, clearTimers]
  );

  const reset = useCallback(() => {
    clearTimers();
    setState(IDLE);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  return { ...state, run, reset, cancel: reset };
}
