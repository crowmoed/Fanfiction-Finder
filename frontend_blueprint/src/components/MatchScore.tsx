/**
 * MatchScore — renders a fic's LLM match score.
 *
 * The backend gives 0–100, or `null` when the ranker omitted the fic (NOT a
 * zero — an important distinction the design's "glowing lantern seal" relies on).
 * Skeleton render only; design replaces the visual.
 */
export function MatchScore({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="muted" title="Not ranked by the model">
        — unranked
      </span>
    );
  }
  return (
    <span title={`Match score: ${score}/100`}>
      <strong>{score}</strong>
      <span className="muted">/100</span>
    </span>
  );
}
