import Link from "next/link";

/**
 * /demos — index of every demo. Each entry renders a real component in a real
 * state with no backend, so design work can be verified surface-by-surface and
 * state-by-state (including loading).
 */
const DEMOS: { href: string; title: string; blurb: string }[] = [
  {
    href: "/dev/seed",
    title: "Seed demo data",
    blurb:
      "Populate the real app with fake searches + a fake signed-in account (no backend), then open the app to preview the populated sidebar, modals, and results.",
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
    blurb: "FicCard variants — high/mid/unranked scores, missing fields, every platform.",
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
    href: "/dev/skeletons",
    title: "Skeleton loaders",
    blurb:
      "Every loading placeholder — primitive, results (table + cards), and the story detail skeleton.",
  },
];

export default function DemosIndex() {
  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>Demos</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every surface and state, backend-free. The loading demo runs the real
          loading components against simulated SSE pipeline events.
        </p>
      </header>
      <ul className="stack" style={{ gap: "0.75rem", margin: 0, padding: 0, listStyle: "none" }}>
        {DEMOS.map((d) => (
          <li key={d.href} className="card stack" style={{ gap: "0.25rem" }}>
            <Link href={d.href}>
              <strong>{d.title}</strong>
            </Link>
            <span className="muted">{d.blurb}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
