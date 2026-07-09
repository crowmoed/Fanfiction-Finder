import { Skeleton } from "@/components/Skeleton";
import {
  HistoryListSkeleton,
  ResultsCardsSkeleton,
  ResultsTableSkeleton,
} from "@/components/ResultsSkeleton";
import { FicDetailSkeleton } from "@/components/FicDetailSkeleton";

/**
 * /demos/skeletons — every skeleton loader in one place, so the design layer can
 * style the shimmer + shapes in isolation. These are the exact components shown
 * during loading on the live surfaces.
 */
export default function SkeletonsDemo() {
  return (
    <div className="stack" style={{ gap: "2rem" }}>
      <header className="page-head">
        <h1>Skeleton loaders</h1>
        <p className="muted" style={{ margin: 0 }}>
          Content-shaped placeholders shown while data loads. Same components used
          on the results, story, account, and search surfaces.
        </p>
      </header>

      <section className="stack">
        <h3>Primitive</h3>
        <div className="stack" style={{ gap: "0.5rem", maxWidth: "20rem" }}>
          <Skeleton width="100%" height="1em" />
          <Skeleton width="80%" height="1em" />
          <Skeleton width="60%" height="1em" />
          <Skeleton width="6rem" height="1.5em" radius="999px" />
        </div>
      </section>

      <section className="stack">
        <h3>Results table</h3>
        <ResultsTableSkeleton rows={5} />
      </section>

      <section className="stack">
        <h3>Results cards</h3>
        <ResultsCardsSkeleton count={3} />
      </section>

      <section className="stack">
        <h3>History / reading log</h3>
        <HistoryListSkeleton rows={3} />
      </section>

      <section className="stack">
        <h3>Story detail</h3>
        <FicDetailSkeleton />
      </section>
    </div>
  );
}
