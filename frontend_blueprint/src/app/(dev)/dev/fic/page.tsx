"use client";

import Link from "next/link";

import { SAMPLE_FICS } from "@/lib/demo/fixtures";
import { ficId } from "@/lib/results/ficId";
import { saveFics } from "@/lib/results/ficStore";
import { FicDetail } from "@/components/FicDetail";

/**
 * /demos/fic — preview the on-demand story page.
 *
 * Renders FicDetail inline for each sample fic (so the design can be styled
 * here), and links into the real /fic/[id] route. Saving the fixtures into the
 * local store first makes those routes resolve.
 */
export default function FicDemo() {
  // Make the real routes work when clicked.
  if (typeof window !== "undefined") saveFics(SAMPLE_FICS);

  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>On-demand story page</h1>
        <p className="muted" style={{ margin: 0 }}>
          Clicking a result opens a generated page built from the indexed data
          (no backend, no live scraping). Inline previews below; the links open
          the real /fic/[id] route.
        </p>
      </header>

      <section className="stack">
        <strong>Open the real route:</strong>
        <ul className="stack" style={{ gap: "0.3rem", margin: 0, paddingLeft: "1.2rem" }}>
          {SAMPLE_FICS.map((fic) => (
            <li key={fic.url}>
              <Link href={`/fic/${ficId(fic)}`}>
                {fic.title} ({fic.platform})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {SAMPLE_FICS.map((fic) => (
        <section key={fic.url} className="card">
          <FicDetail fic={fic} />
        </section>
      ))}
    </div>
  );
}
