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
      <header className="stack" style={{ gap: "0.25rem" }}>
        <h1 style={{ margin: 0 }}>Skeleton loaders</h1>
        <p className="muted" style={{ margin: 0 }}>
          Content-shaped placeholders shown while data loads. Same components used
          on the results, story, account, and search surfaces.
        </p>
      </header>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Primitive</h2>
        <div className="stack" style={{ gap: "0.5rem", maxWidth: "20rem" }}>
          <Skeleton width="100%" height="1em" />
          <Skeleton width="80%" height="1em" />
          <Skeleton width="60%" height="1em" />
          <Skeleton width="6rem" height="1.5em" radius="999px" />
        </div>
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Results — table</h2>
        <ResultsTableSkeleton rows={5} />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Results — cards</h2>
        <ResultsCardsSkeleton count={3} />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>History / reading log</h2>
        <HistoryListSkeleton rows={3} />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Story detail</h2>
        <FicDetailSkeleton />
      </section>
    </div>
  );
}
