/**
 * FicDetail — the on-demand generated story page body.
 *
 * Rendered from the indexed Fic we already hold in the browser (no backend, no
 * live scraping). Shows the full metadata, the match score + reasoning, tags,
 * stats, and a prominent link out to the real work on its source platform.
 * Presentational; the design layer restyles it (this is the "book portal").
 */
import type { Fic } from "@/lib/contracts";
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
import { PlatformLogo, platformName } from "@/components/PlatformLogo";

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString();
}

export function FicDetail({ fic }: { fic: Fic }) {
  const author = ficAuthor(fic);
  const rating = ficRating(fic);
  const complete = ficComplete(fic);
  const chapters = ficChapters(fic);
  const updated = ficUpdated(fic);
  const language = ficLanguage(fic);
  const nativeStats = ficNativeStats(fic.meta);

  return (
    <article className="stack" style={{ gap: "1.25rem" }}>
      <header className="stack" style={{ gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>
          <Highlight text={fic.title} />
        </h1>
        {author && <p className="muted" style={{ margin: 0 }}>by {author}</p>}
        <div className="row muted" style={{ gap: "1rem", flexWrap: "wrap" }}>
          <span>{fic.platform}</span>
          {fic.fandom && <span>{fic.fandom}</span>}
          {rating && <span>Rated {rating}</span>}
          {complete != null && (
            <span>{complete ? "Complete" : "In progress"}</span>
          )}
          {chapters && <span>{chapters}</span>}
          {language && <span>{language}</span>}
          {updated && <span>Updated {updated}</span>}
          <MatchScore score={fic.match_score} />
        </div>
      </header>

      {fic.match_reason && (
        <section className="card stack" style={{ gap: "0.3rem" }}>
          <strong>Why this matched</strong>
          <p style={{ margin: 0 }}>{fic.match_reason}</p>
        </section>
      )}

      <section className="stack" style={{ gap: "0.4rem" }}>
        <strong>Summary</strong>
        <p style={{ margin: 0 }}>
          {fic.summary ? (
            <Highlight text={fic.summary} />
          ) : (
            <span className="muted">No summary indexed.</span>
          )}
        </p>
      </section>

      <section className="row" style={{ gap: "2rem", flexWrap: "wrap" }}>
        <div className="stack" style={{ gap: "0.1rem" }}>
          <span className="muted">Words</span>
          <strong>{fmt(fic.word_count)}</strong>
        </div>
        <div className="stack" style={{ gap: "0.1rem" }}>
          <span className="muted">Kudos</span>
          <strong>{fmt(fic.kudos)}</strong>
        </div>
        <div className="stack" style={{ gap: "0.1rem" }}>
          <span className="muted">Hits</span>
          <strong>{fmt(fic.hits)}</strong>
        </div>
        {/* Platform-native stats (favs/follows/votes/reads/…) that the flat
            kudos/hits columns don't cover. */}
        {nativeStats.map((s) => (
          <div key={s.label} className="stack" style={{ gap: "0.1rem" }}>
            <span className="muted">{s.label}</span>
            <strong>{fmt(s.value)}</strong>
          </div>
        ))}
      </section>

      {fic.tags.length > 0 && (
        <section className="stack" style={{ gap: "0.4rem" }}>
          <strong>Tags</strong>
          <div>
            {fic.tags.map((t) => (
              <span key={t} className="tag">
                <Highlight text={t} />
              </span>
            ))}
          </div>
        </section>
      )}

      <section>
        <a href={fic.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          <button className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
            <PlatformLogo platform={fic.platform} size={18} />
            Read on {platformName(fic.platform)} →
          </button>
        </a>
      </section>
    </article>
  );
}
