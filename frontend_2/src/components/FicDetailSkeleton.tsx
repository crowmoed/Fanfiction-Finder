/**
 * FicDetailSkeleton — placeholder shaped like the new FicDetail masthead +
 * two-column layout, shown while the /fic/[id] page resolves the fic from the
 * local store (REDESIGN-SPEC §5, §7.2).
 *
 * Mirrors: title bar + seal-sized box, byline, identity row under a hairline,
 * a masthead-closing rule, then the >=1200px split — reading column (summary
 * lines + ~8 tag pills) beside a stats ledger (label/value rows) + CTA — so
 * loading->loaded doesn't visibly grow or reflow the page (F156).
 */
import { Skeleton } from "@/components/Skeleton";
import "./fic-detail.css";

export function FicDetailSkeleton() {
  return (
    <article className="stack" style={{ gap: "1.5rem" }} aria-busy="true" aria-label="Loading story">
      <header className="fic-skel-masthead">
        <div className="fic-skel-titlerow">
          <Skeleton width="55%" height="2.4em" />
          <Skeleton width="4.5rem" height="44px" radius="6px" />
        </div>
        <Skeleton width="9rem" height="0.95em" style={{ marginTop: "0.3rem" }} />
        <div className="fic-skel-identity">
          <Skeleton width="3.25rem" height="1.1em" radius="4px" />
          <Skeleton width="6rem" height="1.1em" />
          <Skeleton width="2.5rem" height="1.1em" radius="4px" />
          <Skeleton width="4.5rem" height="1.1em" radius="4px" />
        </div>
      </header>
      <hr className="rule-strong" />

      <div className="fic-page-grid">
        <div className="fic-page-body stack" style={{ gap: "1.5rem" }}>
          <div className="stack" style={{ gap: "0.5rem" }}>
            <Skeleton width="5rem" height="1.1em" />
            <Skeleton width="100%" height="0.85em" />
            <Skeleton width="100%" height="0.85em" />
            <Skeleton width="70%" height="0.85em" />
          </div>

          <div className="stack" style={{ gap: "0.5rem" }}>
            <Skeleton width="3rem" height="1.1em" />
            <div className="fic-skel-tags">
              <Skeleton width="4.5rem" height="1.2em" radius="999px" />
              <Skeleton width="6rem" height="1.2em" radius="999px" />
              <Skeleton width="3.5rem" height="1.2em" radius="999px" />
              <Skeleton width="5.5rem" height="1.2em" radius="999px" />
              <Skeleton width="4rem" height="1.2em" radius="999px" />
              <Skeleton width="7rem" height="1.2em" radius="999px" />
              <Skeleton width="3.75rem" height="1.2em" radius="999px" />
              <Skeleton width="5rem" height="1.2em" radius="999px" />
              {/* The "+N more" disclosure pill — narrower, so its shape reads
                  as distinct from the tag pills before it (F156). */}
              <Skeleton width="2.75rem" height="1.2em" radius="999px" />
            </div>
          </div>
        </div>

        <div className="fic-page-sidecar">
          <div className="stack" style={{ gap: "0.5rem" }}>
            <Skeleton width="3rem" height="1.1em" />
            <div className="fic-skel-stats">
              <div className="fic-skel-stat-row">
                <Skeleton width="3rem" height="0.7em" />
                <Skeleton width="2.5rem" height="1em" />
              </div>
              <div className="fic-skel-stat-row">
                <Skeleton width="3rem" height="0.7em" />
                <Skeleton width="2.5rem" height="1.2em" />
              </div>
              <div className="fic-skel-stat-row">
                <Skeleton width="2rem" height="0.7em" />
                <Skeleton width="2.5rem" height="1em" />
              </div>
            </div>
          </div>
          <Skeleton width="100%" height="2.75rem" radius="6px" style={{ marginTop: "0.5rem" }} />
        </div>
      </div>
    </article>
  );
}
