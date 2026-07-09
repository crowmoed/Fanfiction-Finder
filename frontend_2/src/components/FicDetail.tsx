/**
 * FicDetail — the on-demand generated story page body ("the title page",
 * REDESIGN-SPEC §5).
 *
 * Rendered from the indexed Fic we already hold in the browser (no backend, no
 * live scraping). A masthead (display title, seal, byline, identity) closed by
 * .rule-strong, then a two-column body at >=1200px: the reading column
 * (summary + tags) alongside a sticky sidecar (stats ledger + Read CTA). The
 * modal reuses every block minus the sidecar split (its own header already
 * carries the title + seal, so `hideTitle` skips the masthead's title row and
 * folds the ledger + CTA back into the linear stack).
 */
import type { Fic, Platform } from "@/lib/contracts";
import {
  ficAuthor,
  ficChapters,
  ficComplete,
  ficLanguage,
  ficNativeStats,
  ficRating,
  ficUpdated,
} from "@/lib/results/meta";
import { MatchScore } from "@/components/MatchScore";
import { Highlight } from "@/components/Highlight";
import { TagList } from "@/components/TagList";
import { PlatformLogo, platformName } from "@/components/PlatformLogo";
import { Icon } from "@/components/Icon";
import "./fic-detail.css";

/** Ledger value cell: real numbers render bold + tabular; missing data recedes
 *  as a muted dash instead of matching the visual weight of real data
 *  (F144) — same convention the results table already uses for null stats. */
function LedgerValue({ n }: { n: number | null | undefined }) {
  if (n == null) {
    return (
      <span className="fic-ledger-value num">
        <span className="null-dash">—</span>
      </span>
    );
  }
  return <span className="fic-ledger-value num">{n.toLocaleString()}</span>;
}

/** data-tone for the platform badge — same AO3/FFN/Wattpad bucketing the board
 *  strategies use, kept local since this is presentation-only. */
function platformTone(platform: Platform): "ao3" | "ffn" | "wattpad" | undefined {
  const p = platform.toLowerCase();
  if (p.startsWith("ao3") || p.includes("archive")) return "ao3";
  if (p === "ffn" || p.includes("fanfiction")) return "ffn";
  if (p.includes("wattpad")) return "wattpad";
  return undefined;
}

/** The stats ledger: .eyebrow label column + tabular value column, hairline
 *  rules between rows. Kudos is the one number the whole pipeline exists to
 *  earn trust in, so it gets --ink-strong and one size up (REDESIGN-SPEC
 *  §5.2). Shared between the page sidecar and the modal's stacked body. */
function StatsLedger({ fic }: { fic: Fic }) {
  const nativeStats = ficNativeStats(fic.meta);
  return (
    <div className="fic-ledger">
      <div className="fic-ledger-row">
        <span className="eyebrow fic-ledger-label">Words</span>
        <LedgerValue n={fic.word_count} />
      </div>
      <div className="fic-ledger-row fic-ledger-row--kudos">
        <span className="eyebrow fic-ledger-label">Kudos</span>
        <LedgerValue n={fic.kudos} />
      </div>
      <div className="fic-ledger-row">
        <span className="eyebrow fic-ledger-label">Hits</span>
        <LedgerValue n={fic.hits} />
      </div>
      {/* Platform-native stats (favs/follows/votes/reads/…) that the flat
          kudos/hits rows don't cover. Same ledger, same eyebrow label as the
          fixed rows above — one column, one treatment (F151). */}
      {nativeStats.map((s) => (
        <div key={s.label} className="fic-ledger-row">
          <span className="eyebrow fic-ledger-label">{s.label}</span>
          <LedgerValue n={s.value} />
        </div>
      ))}
    </div>
  );
}

/** The Read CTA — .btn-lg here and in the modal only (REDESIGN-SPEC §5.3). */
function ReadCta({ fic }: { fic: Fic }) {
  return (
    <a
      href={fic.url}
      target="_blank"
      rel="noreferrer"
      className="button-link btn-primary btn-lg"
    >
      <PlatformLogo platform={fic.platform} size={16} decorative />
      Read on {platformName(fic.platform)}
      <Icon name="arrow-up-right" size={13} />
    </a>
  );
}

export function FicDetail({
  fic,
  hideTitle = false,
}: {
  fic: Fic;
  /** Skip the masthead's title row when the container already shows the title
   *  (FicModal's own header), to avoid announcing/rendering it twice. Also
   *  switches the body from the two-column page grid to a single stack, since
   *  the modal has no room (or need) for a sticky sidecar. */
  hideTitle?: boolean;
}) {
  const author = ficAuthor(fic);
  const rating = ficRating(fic);
  const complete = ficComplete(fic);
  const chapters = ficChapters(fic);
  const updated = ficUpdated(fic);
  const language = ficLanguage(fic);
  // The seal is the product's one loud element: lg + the stamp-in motion for
  // anything the model was confident about, so opening a strong match is
  // itself a small moment (REDESIGN-SPEC §1.5/§5.1).
  const seal = <MatchScore score={fic.match_score} size="lg" animate={(fic.match_score ?? 0) >= 60} />;

  const summary = (
    <section
      className="stack rise-in"
      style={{ gap: "0.4rem", "--rise-delay": "120ms" } as React.CSSProperties}
    >
      <h3>Summary</h3>
      {fic.summary ? (
        <p className="prose fic-summary-block">
          <Highlight text={fic.summary} />
        </p>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          No summary indexed.
        </p>
      )}
    </section>
  );

  const tags = fic.tags.length > 0 && (
    <section
      className="stack rise-in"
      style={{ gap: "0.5rem", "--rise-delay": "160ms" } as React.CSSProperties}
    >
      <h3>Tags</h3>
      <TagList tags={fic.tags} limit={20} />
    </section>
  );

  const ledger = (
    <section
      className="stack rise-in"
      style={{ gap: "0.5rem", "--rise-delay": "200ms" } as React.CSSProperties}
    >
      <h3>Stats</h3>
      <StatsLedger fic={fic} />
    </section>
  );

  return (
    <article className="stack" style={{ gap: "1.5rem" }}>
      <header
        className="fic-masthead rise-in"
        style={{ "--rise-delay": "0ms" } as React.CSSProperties}
      >
        {!hideTitle && (
          <div className="fic-masthead-titlerow">
            <h1 className="t-display-title">
              <Highlight text={fic.title} />
            </h1>
            {seal}
          </div>
        )}
        {author && <p className="fic-byline--masthead">by {author}</p>}
        <div className="fic-masthead-identity">
          <ul className="meta-list">
            {/* In the quick-view modal the header already shows the title +
                seal (FicModal), so the identity line doesn't repeat either. */}
            <li>
              <span className="badge" data-tone={platformTone(fic.platform)}>
                {fic.platform}
              </span>
            </li>
            {fic.fandom && <li>{fic.fandom}</li>}
            {rating &&
              (rating === "Not Rated" ? (
                // No tone for an unknown rating — .badge-rating has no base
                // (untoned) style, only G/T/M/E variants, so this reads as
                // plain metadata rather than a broken/colorless badge.
                <li>Not Rated</li>
              ) : (
                <li>
                  <span className="badge-rating" data-rating={rating}>
                    {rating}
                  </span>
                </li>
              ))}
            {complete != null && (
              <li>
                <span
                  className="badge-status"
                  data-state={complete ? "complete" : "wip"}
                >
                  {complete ? "Complete" : "In progress"}
                </span>
              </li>
            )}
          </ul>
          {(language || chapters || updated) && (
            <ul className="meta-list meta-list--stats">
              {language && <li>{language}</li>}
              {chapters && <li>{chapters}</li>}
              {updated && <li>Updated {updated}</li>}
            </ul>
          )}
        </div>
      </header>
      {!hideTitle && (
        <hr
          className="rule-strong rule-draw"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        />
      )}

      {hideTitle ? (
        // Modal: every block minus the sidecar split — summary, tags, ledger,
        // and the CTA all stack in reading order (REDESIGN-SPEC §5.5).
        <>
          {summary}
          {tags}
          {ledger}
          <ReadCta fic={fic} />
        </>
      ) : (
        <div className="fic-page-grid">
          <div className="fic-page-body stack" style={{ gap: "1.5rem" }}>
            {summary}
            {tags}
          </div>
          <div className="fic-page-sidecar">
            {ledger}
            <div className="fic-ledger-cta">
              <ReadCta fic={fic} />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
