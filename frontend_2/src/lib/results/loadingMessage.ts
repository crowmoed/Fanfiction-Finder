/**
 * loadingMessage.ts — adaptive, duration-aware loading copy.
 *
 * Search runs an LLM + vector pipeline whose latency varies a lot (a big fandom
 * + cold model can take many seconds). A static spinner makes a slow run feel
 * broken. Instead we pick reassurance copy from how long we've been waiting and
 * which stage is active — so a long wait reads as "still working, here's why",
 * not "stuck".
 *
 * Pure + dependency-free. The thresholds and copy live here so the loading UI
 * (and the design layer) can adjust messaging without touching timing logic.
 */
import type { PipelineStageId } from "@/lib/contracts";

export interface LoadingMessage {
  /** Short reassurance line shown under the pipeline. */
  text: string;
  /** Coarse tone bucket, for the design layer to style/animate differently. */
  tone: "normal" | "patient" | "reassure";
}

/** Per-stage hint used once a wait runs long, to explain what's taking time. */
const STAGE_HINT: Record<PipelineStageId, string> = {
  enhance: "Interpreting what you're after",
  embed: "Reading across the shelves",
  retrieve: "Gathering candidates from AO3, FFN, and Wattpad",
  rank: "Weighing each match against your request",
};

/**
 * Pick the loading message for the current elapsed time + active stage.
 *  < 2.5s  → normal, neutral copy
 *  < 6s    → patient, "still working" + stage context
 *  ≥ 6s    → reassure, "good searches can take a moment" + stage context
 */
export function loadingMessage(
  elapsedMs: number,
  activeStage: PipelineStageId | null
): LoadingMessage {
  const hint = activeStage ? STAGE_HINT[activeStage] : "Working through the archive";

  if (elapsedMs < 2500) {
    return { text: hint + "…", tone: "normal" };
  }
  if (elapsedMs < 6000) {
    return { text: `Still working: ${hint.toLowerCase()}…`, tone: "patient" };
  }
  return {
    text: `Good matches are worth the wait. ${hint}…`,
    tone: "reassure",
  };
}
