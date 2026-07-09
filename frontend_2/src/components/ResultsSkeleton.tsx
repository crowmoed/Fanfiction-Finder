/**
 * ResultsSkeleton — content-shaped placeholders for the results surface, in both
 * layouts. Mirrors ResultsTable / FicCard's real markup (same table/card classes)
 * so the loading state has the same silhouette as the real content — a fill, not
 * a re-skin, when data arrives (F127/F214).
 */
import { COLUMNS } from "@/lib/results/columns";
import { Skeleton } from "@/components/Skeleton";
import "./results.css";

/** Ghost of the query-as-headline (REDESIGN-SPEC §7.2): a kicker-width bar, a
 *  wide display-quote-width bar, and the rule beneath — mirrors ResultsHead's
 *  real shape so the loading state has the same silhouette. Standalone
 *  galleries (e.g. /dev/skeletons) want this; /results itself renders the
 *  REAL ResultsHead above its skeleton (it already has the query text), so
 *  this stays optional rather than doubling up. */
export function ResultsHeadSkeleton() {
  return (
    <div className="results-head" aria-hidden="true">
      <Skeleton width="4rem" height="0.6875rem" />
      <Skeleton width="14rem" height="0.6875rem" style={{ marginTop: "0.4rem" }} />
      <Skeleton
        width="60%"
        height="2.25rem"
        style={{ marginTop: "0.5rem" }}
        radius="var(--r-xs)"
      />
      <hr className="rule-strong" style={{ marginTop: "0.75rem", opacity: 0.5 }} />
    </div>
  );
}

/** Placeholder for the reading-log / history list (rows of a query + meta). */
export function HistoryListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul
      className="stack"
      style={{ gap: "0.5rem", margin: 0, padding: 0, listStyle: "none" }}
      aria-busy="true"
      aria-label="Loading history"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="card row" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: "0.35rem" }}>
            <Skeleton width="14rem" height="1em" />
            <Skeleton width="9rem" height="0.8em" />
          </div>
          <Skeleton width="8rem" height="0.8em" />
        </li>
      ))}
    </ul>
  );
}

// Rough per-column skeleton-bar widths so the loading grid roughly mirrors the
// eventual content width per column (wide under Summary, narrow under Score) —
// avoids every cell popping to a different width the instant data lands (F214).
const SKELETON_BAR_WIDTH: Record<string, string> = {
  match_score: "1.6rem",
  title: "85%",
  platform: "3rem",
  fandom: "70%",
  word_count: "3rem",
  kudos: "2.75rem",
  hits: "3rem",
  tags: "90%",
  summary: "95%",
  url: "3.5rem",
};

export function ResultsTableSkeleton({
  rows = 6,
  withHead = true,
}: {
  rows?: number;
  /** Include the ResultsHeadSkeleton ghost above the table. Off on /results
   *  itself, which already renders the real (non-skeleton) ResultsHead —
   *  the query text is known even while the result rows are still loading. */
  withHead?: boolean;
}) {
  return (
    <div className="stack" style={{ gap: "0.9rem" }}>
      {withHead && <ResultsHeadSkeleton />}
      <div className="rt-scroll" aria-busy="true" aria-label="Loading results">
        <table className="xl-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.id} className={col.numeric ? "xl-num" : ""}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr
                key={r}
                className="rise-in"
                style={{ "--rise-delay": `${Math.min(r, 6) * 25}ms` } as React.CSSProperties}
              >
                {COLUMNS.map((col) => (
                  <td key={col.id} className={col.numeric ? "xl-num" : ""}>
                    <Skeleton
                      width={SKELETON_BAR_WIDTH[col.id] ?? "70%"}
                      height="0.85em"
                      style={col.numeric ? { marginLeft: "auto" } : undefined}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResultsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="fic-card rise-in"
          style={{ "--rise-delay": `${Math.min(i, 4) * 30}ms` } as React.CSSProperties}
        >
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <Skeleton width="55%" height="1.2em" />
            <div className="row" style={{ gap: "0.4rem", flexWrap: "nowrap" }}>
              <Skeleton width="2rem" height="2rem" radius="var(--r-sm)" />
              <Skeleton width="2.75rem" height="1.4em" radius="var(--r-xs)" />
            </div>
          </div>
          <Skeleton width="10rem" height="0.85em" />
          <div className="row" style={{ gap: "0.6rem" }}>
            <Skeleton width="3.5rem" height="1.1em" radius="var(--r-xs)" />
            <Skeleton width="4.5rem" height="0.85em" />
            <Skeleton width="3rem" height="1.1em" radius="var(--r-xs)" />
            <Skeleton width="4rem" height="0.85em" />
          </div>
          <Skeleton width="100%" height="0.9em" />
          <Skeleton width="88%" height="0.9em" />
          <div className="row" style={{ gap: "0.4rem" }}>
            <Skeleton width="4rem" height="1.3em" radius="var(--r-pill)" />
            <Skeleton width="5rem" height="1.3em" radius="var(--r-pill)" />
            <Skeleton width="3.5rem" height="1.3em" radius="var(--r-pill)" />
          </div>
        </article>
      ))}
    </div>
  );
}
