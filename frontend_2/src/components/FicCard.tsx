/**
 * FicCard — one search result, rendered with all the fields the design will
 * arrange. Skeleton: a plain card with semantic structure and every data point
 * visible, so the design layer has the full data surface to work from.
 */
import Link from "next/link";

import type { Fic } from "@/lib/contracts";
import { ficId } from "@/lib/results/ficId";
import { MatchScore } from "@/components/MatchScore";
import { QuickViewButton } from "@/components/QuickViewButton";
import { Highlight } from "@/components/Highlight";

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

export function FicCard({ fic }: { fic: Fic }) {
  return (
    <article className="card stack" style={{ gap: "0.5rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>
          <Link href={`/fic/${ficId(fic)}`}>
            <Highlight text={fic.title} />
          </Link>
        </h3>
        <span className="row" style={{ gap: "0.5rem" }}>
          <QuickViewButton fic={fic} />
          <MatchScore score={fic.match_score} />
        </span>
      </div>

      <div className="row muted" style={{ gap: "1rem" }}>
        <span>{fic.platform}</span>
        {fic.fandom && <span>{fic.fandom}</span>}
        <span>words: {fmt(fic.word_count)}</span>
        <span>kudos: {fmt(fic.kudos)}</span>
        <span>hits: {fmt(fic.hits)}</span>
      </div>

      {fic.summary && (
        <p style={{ margin: 0 }}>
          <Highlight text={fic.summary} />
        </p>
      )}

      {fic.match_reason && (
        <p className="muted" style={{ margin: 0, fontStyle: "italic" }}>
          Why: {fic.match_reason}
        </p>
      )}

      {fic.tags.length > 0 && (
        <div>
          {fic.tags.map((t) => (
            <span key={t} className="tag">
              <Highlight text={t} />
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
