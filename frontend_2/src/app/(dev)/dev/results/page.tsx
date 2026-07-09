"use client";

import { SAMPLE_FICS } from "@/lib/demo/fixtures";
import { FicCard } from "@/components/FicCard";
import { HighlightProvider } from "@/components/Highlight";

const DEMO_QUERY = "enemies to lovers slow burn drarry";

export default function ResultsDemo() {
  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="page-head">
        <h1>Result states</h1>
        <p className="muted" style={{ margin: 0 }}>
          One FicCard per field permutation the design must handle.
        </p>
      </header>

      <section className="stack">
        <h3>High score, full fields</h3>
        <FicCard fic={SAMPLE_FICS[0]} />
      </section>

      <section className="stack">
        <h3>Mid score</h3>
        <FicCard fic={SAMPLE_FICS[1]} />
      </section>

      <section className="stack">
        <h3>Unranked (null score) + missing optional fields</h3>
        <FicCard fic={SAMPLE_FICS[2]} />
      </section>

      <section className="stack">
        <h3>Match highlighting for “{DEMO_QUERY}”</h3>
        <p className="muted" style={{ margin: 0 }}>
          Query terms are highlighted where they appear in title / summary / tags
          (client-side; the backend ranker returns only a score, so this is honest
          term overlap, not a fabricated rationale).
        </p>
        <HighlightProvider query={DEMO_QUERY}>
          <FicCard fic={SAMPLE_FICS[0]} />
        </HighlightProvider>
      </section>
    </div>
  );
}
