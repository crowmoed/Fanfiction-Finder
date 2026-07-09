/**
 * FicCard — one search result. Fiction voice (serif) for title/summary, tool
 * voice (sans) for chrome and data (DESIGN.md · Component language).
 */
import Link from "next/link";

import type { Fic } from "@/lib/contracts";
import { ficId } from "@/lib/results/ficId";
import {
  ficAuthor,
  ficChapters,
  ficComplete,
  ficRating,
  ficUpdated,
} from "@/lib/results/meta";
import { MatchScore } from "@/components/MatchScore";
import { QuickViewButton } from "@/components/QuickViewButton";
import { Highlight } from "@/components/Highlight";
import { TagList } from "@/components/TagList";

function fmt(n: number | null | undefined): React.ReactNode {
  if (n === null || n === undefined) return <span className="null-dash">—</span>;
  return n.toLocaleString();
}

const PLATFORM_TONE: Record<string, string> = {
  AO3: "ao3",
  FFN: "ffn",
  Wattpad: "wattpad",
};

export function FicCard({
  fic,
  animate = false,
}: {
  fic: Fic;
  /** Stamp-in the seal on mount — set by ResultsView for the ONE fic that
   *  earns it (the first high-tier seal of a fresh result set). */
  animate?: boolean;
}) {
  const author = ficAuthor(fic);
  const rating = ficRating(fic);
  const complete = ficComplete(fic);
  const chapters = ficChapters(fic);
  const updated = ficUpdated(fic);
  const tone = PLATFORM_TONE[fic.platform];

  return (
    <article className="fic-card">
      {/* Seal top-right, weighted equal to the title (REDESIGN-SPEC §3.5): the
          match score anchors the row the way it anchors the fic-detail
          masthead, not a minor aside in the metadata strip below. */}
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <Link href={`/fic/${ficId(fic)}`} className="title-link fic-title">
          <Highlight text={fic.title} />
        </Link>
        <span className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
          <QuickViewButton fic={fic} />
          <MatchScore score={fic.match_score} size="md" animate={animate} />
        </span>
      </div>

      {author && <p className="fic-byline" style={{ margin: 0 }}>by {author}</p>}

      {/* Identity facts on one line; the stat numbers on a quieter second line
          — never nine dot-joined facts in a single strip. */}
      <ul className="meta-list">
        <li>
          <span className="badge" data-tone={tone}>
            {fic.platform}
          </span>
        </li>
        {fic.fandom && <li>{fic.fandom}</li>}
        {rating && (
          <li>
            <span className="badge badge-rating" data-rating={rating}>
              {rating}
            </span>
          </li>
        )}
        {complete != null && (
          <li>
            <span className="badge badge-status" data-state={complete ? "complete" : "wip"}>
              {complete ? "Complete" : "In progress"}
            </span>
          </li>
        )}
        {chapters && <li>{chapters}</li>}
      </ul>
      <ul className="meta-list meta-list--stats">
        <li>
          <span className="num">{fmt(fic.word_count)}</span>{" "}
          <span className="muted">words</span>
        </li>
        <li>
          <span className="num">{fmt(fic.kudos)}</span> <span className="muted">kudos</span>
        </li>
        <li>
          <span className="num">{fmt(fic.hits)}</span> <span className="muted">hits</span>
        </li>
        {updated && <li>updated {updated}</li>}
      </ul>

      {fic.summary && (
        <p className="fic-summary">
          <Highlight text={fic.summary} />
        </p>
      )}

      <TagList tags={fic.tags} />
    </article>
  );
}
