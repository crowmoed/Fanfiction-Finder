/**
 * FicDetailSkeleton — placeholder shaped like FicDetail, shown while the /fic/[id]
 * page resolves the fic from the local store.
 */
import { Skeleton } from "@/components/Skeleton";

export function FicDetailSkeleton() {
  return (
    <article className="stack" style={{ gap: "1.25rem" }} aria-busy="true" aria-label="Loading story">
      <header className="stack" style={{ gap: "0.5rem" }}>
        <Skeleton width="60%" height="1.8em" />
        <div className="row" style={{ gap: "1rem" }}>
          <Skeleton width="3rem" height="0.9em" />
          <Skeleton width="6rem" height="0.9em" />
          <Skeleton width="4rem" height="0.9em" />
        </div>
      </header>

      <div className="card stack" style={{ gap: "0.5rem" }}>
        <Skeleton width="8rem" height="0.9em" />
        <Skeleton width="90%" height="0.8em" />
      </div>

      <div className="stack" style={{ gap: "0.5rem" }}>
        <Skeleton width="6rem" height="0.9em" />
        <Skeleton width="100%" height="0.8em" />
        <Skeleton width="80%" height="0.8em" />
      </div>

      <div className="row" style={{ gap: "2rem" }}>
        <Skeleton width="4rem" height="1.6em" />
        <Skeleton width="4rem" height="1.6em" />
        <Skeleton width="4rem" height="1.6em" />
      </div>

      <div className="row" style={{ gap: "0.4rem" }}>
        <Skeleton width="4rem" height="1.2em" radius="999px" />
        <Skeleton width="6rem" height="1.2em" radius="999px" />
        <Skeleton width="3.5rem" height="1.2em" radius="999px" />
      </div>

      <Skeleton width="9rem" height="2em" />
    </article>
  );
}
