/**
 * ResultsSkeleton — content-shaped placeholders for the results surface, in both
 * layouts. Mirrors ResultsTable / FicCard structure so the loading state has the
 * same silhouette as the real content (no layout shift when results arrive).
 */
import { COLUMNS } from "@/lib/results/columns";
import { Skeleton } from "@/components/Skeleton";

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

export function ResultsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ overflowX: "auto" }} aria-busy="true" aria-label="Loading results">
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.9rem" }}>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.id}
                style={{
                  textAlign: col.numeric ? "right" : "left",
                  borderBottom: "2px solid var(--border)",
                  padding: "0.4rem 0.5rem",
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ borderBottom: "1px solid var(--border)" }}>
              {COLUMNS.map((col) => (
                <td key={col.id} style={{ padding: "0.55rem 0.5rem" }}>
                  <Skeleton
                    width={col.id === "summary" ? "12rem" : col.numeric ? "3rem" : "70%"}
                    height="0.8em"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} className="card stack" style={{ gap: "0.6rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <Skeleton width="55%" height="1.1em" />
            <Skeleton width="3rem" height="1.1em" />
          </div>
          <div className="row" style={{ gap: "1rem" }}>
            <Skeleton width="3rem" height="0.8em" />
            <Skeleton width="5rem" height="0.8em" />
            <Skeleton width="4rem" height="0.8em" />
          </div>
          <Skeleton width="100%" height="0.8em" />
          <Skeleton width="85%" height="0.8em" />
          <div className="row" style={{ gap: "0.4rem" }}>
            <Skeleton width="4rem" height="1.2em" radius="999px" />
            <Skeleton width="5rem" height="1.2em" radius="999px" />
            <Skeleton width="3.5rem" height="1.2em" radius="999px" />
          </div>
        </article>
      ))}
    </div>
  );
}
