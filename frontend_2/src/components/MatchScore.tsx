/**
 * MatchScore — renders a fic's LLM match score as "the seal" (DESIGN.md ·
 * REDESIGN-SPEC §1.5).
 *
 * The backend gives 0–100, or `null` when the ranker omitted the fic (NOT a
 * zero — the seal's unranked tier depends on this distinction). Tiers: >=85
 * vermilion stamp ("high"), >=60 inked outline ("mid"), else a bare faint
 * number ("low"); null renders as a bare "—" ("none"). Shape + weight + color
 * carry the tier, never color alone (F001/F071/F121/F141).
 *
 * Three real scale steps (REDESIGN-SPEC §1.5):
 * - `sm` (table cells): compact chip, tabular number, no "/100".
 * - `md` (cards, default): number 1rem/650, keeps a small "/100".
 * - `lg` (fic page + modal): 1.5rem/700 tabular number, a small-caps "match"
 *   caption, min 44px tall; unranked becomes a bordered "Unranked" chip
 *   (not a bare dash) so a detail surface never shows a lonely glyph.
 *
 * `compact` stays as a back-compat alias for `size="sm"` (ResultsTable). When
 * `animate` is set the seal stamps in on mount (the ONE expressive motion) —
 * callers gate it (fic/modal on score >= 60; results only the first high-tier
 * seal of a fresh set). Reduced-motion drops the transform (globals.css).
 */
"use client";

import { useCountUp } from "@/lib/client/motion";

type SealSize = "sm" | "md" | "lg";

export function MatchScore({
  score,
  size = "md",
  compact = false,
  animate = false,
}: {
  score: number | null;
  size?: SealSize;
  /** Back-compat alias for `size="sm"` (ResultsTable.tsx). */
  compact?: boolean;
  animate?: boolean;
}) {
  const s: SealSize = compact ? "sm" : size;
  // Defense-in-depth for the ONE-STAMP RULE (DESIGN.md · Motion): the stamp is
  // reserved for a real, ranked, mid-or-higher seal. Callers still decide WHICH
  // seal earns it (fic/modal: any score >= 60; results: only the first
  // high-tier seal of a fresh set) — this just guarantees the foundation
  // component can never pop an unearned (null/low) seal even if a future caller
  // forgets to gate. Reduced-motion drops the transform (globals.css §18).
  const shouldStamp = animate && score !== null && score >= 60;
  const stamp = shouldStamp ? " stamp-in" : "";
  // The seal's number ticks up 0→score while the stamp settles — one earned
  // moment enriched, not a second effect. Gated on the exact same flag as the
  // stamp; useCountUp returns the final value instantly under reduced motion.
  const shownScore = useCountUp(score ?? 0, {
    enabled: shouldStamp,
    duration: 300,
  });

  if (score === null) {
    // On detail surfaces the null seal is a designed chip, not a bare dash.
    if (s === "lg") {
      return (
        <span
          className="seal"
          data-tier="unranked"
          data-size="lg"
          title="Not ranked by the model"
        >
          Unranked
        </span>
      );
    }
    return (
      <span
        className={`seal${stamp}`}
        data-tier="none"
        data-size={s}
        title="Not ranked by the model"
      >
        —
      </span>
    );
  }

  const tier = score >= 85 ? "high" : score >= 60 ? "mid" : "low";
  return (
    <span
      className={`seal${stamp}`}
      data-tier={tier}
      data-size={s}
      title={`${score}/100 match`}
    >
      {s === "lg" && <span className="seal-cap">match</span>}
      <span className="seal-num">{shouldStamp ? shownScore : score}</span>
      {s === "md" && <span className="seal-den">/100</span>}
    </span>
  );
}
