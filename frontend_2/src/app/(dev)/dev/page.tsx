import Link from "next/link";

/**
 * /demos — index of every demo. Each entry renders a real component in a real
 * state with no backend, so design work can be verified surface-by-surface and
 * state-by-state (including loading).
 */
const DEMOS: { href: string; title: string; blurb: string }[] = [
  {
    href: "/dev/seed",
    title: "Demo mode: full app on fake data",
    blurb:
      "Flip the whole real app onto fixtures with no backend: run brand-new searches that stream fake results, browse populated History / Saved / results / fic pages / board, all with a fake signed-in account. The complete, clickable product with zero backend.",
  },
  {
    href: "/dev/search",
    title: "Search flow & loading",
    blurb:
      "Drive the full SSE pipeline (enhance → embed → retrieve → rank) with simulated events: success, many results, empty, error, and a deliberately slow run.",
  },
  {
    href: "/dev/results",
    title: "Result states",
    blurb: "FicCard variants: high/mid/unranked scores, missing fields, every platform.",
  },
  {
    href: "/dev/fic",
    title: "On-demand story page",
    blurb:
      "The generated /fic/[id] detail page, built from indexed data with no backend. Inline previews + links into the real route.",
  },
  {
    href: "/dev/components",
    title: "Atoms",
    blurb: "MatchScore, tags, pipeline status frozen at each stage, error & empty cards.",
  },
  {
    href: "/dev/search-bar-structures.html",
    title: "Search bar structures (exploration)",
    blurb:
      "The eight structural search-composer skeletons from the 2026-07 exploration, all live: Header Rail, Unfold, Token Pill, Baseline (the one shipped as the home hero), Palette, Bloom, Sentence, Prompt. Static page; rebuild via design-explorations/search-bar/build.mjs.",
  },
  {
    href: "/dev/skeletons",
    title: "Skeleton loaders",
    blurb:
      "Every loading placeholder: primitive, results (table + cards), and the story detail skeleton.",
  },
];

export default function DemosIndex() {
  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="page-head">
        <h1>Demos</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every surface and state, backend-free. The loading demo runs the real
          loading components against simulated SSE pipeline events.
        </p>
      </header>
      <ul className="stack" style={{ gap: "0.75rem", margin: 0, padding: 0, listStyle: "none" }}>
        {DEMOS.map((d) => (
          <li key={d.href} className="card stack" style={{ gap: "0.25rem" }}>
            <Link href={d.href} className="link" style={{ fontWeight: 600 }}>
              {d.title}
            </Link>
            <span className="muted">{d.blurb}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
