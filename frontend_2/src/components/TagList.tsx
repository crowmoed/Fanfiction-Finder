/**
 * TagList — renders a fic's tags with a cap, so a heavily-tagged work (AO3 fics
 * routinely carry 40-50 freeform tags) doesn't blow out card/page height. The
 * first `limit` show inline; the rest collapse into a native <details> "+N more"
 * (no JS, keyboard-accessible, works in a Server Component). Tags are query-
 * highlighted via the surrounding HighlightProvider.
 */
import { Highlight } from "@/components/Highlight";

export function TagList({ tags, limit = 12 }: { tags: string[]; limit?: number }) {
  if (tags.length === 0) return null;
  const head = tags.slice(0, limit);
  const rest = tags.slice(limit);

  return (
    <div className="taglist">
      {head.map((t, i) => (
        // Tags settle in with a short per-item stagger (capped so a 40-tag fic
        // doesn't trail for seconds). rise-in is opacity+translateY and already
        // reduced-motion-guarded (globals.css §18).
        <span
          key={t}
          className="tag rise-in"
          style={{ animationDelay: `${Math.min(i, 9) * 12}ms` }}
        >
          <Highlight text={t} />
        </span>
      ))}
      {rest.length > 0 && (
        <details className="tag-more">
          <summary>+{rest.length} more</summary>
          <span className="taglist">
            {rest.map((t) => (
              <span key={t} className="tag">
                <Highlight text={t} />
              </span>
            ))}
          </span>
        </details>
      )}
    </div>
  );
}
