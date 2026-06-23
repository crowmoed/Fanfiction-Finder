/**
 * highlight.ts — client-side query-term highlighting.
 *
 * IMPORTANT (grounded in the backend): the ranker returns only a numeric score
 * per fic — NO list of matched terms and NO reasoning (match_reason is declared
 * in the schema but never populated by the live search path). So we can't show
 * the *semantic* signal the LLM used; instead we honestly highlight where the
 * user's own query words appear in a fic's title / summary / tags. That's a
 * truthful "here's where your words show up", not a fabricated match rationale.
 *
 * Dependency-free so it runs anywhere and stays testable.
 */

// Small English stopword set — words too common to be useful as highlights.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has",
  "he", "her", "him", "his", "i", "in", "is", "it", "its", "of", "on", "or",
  "she", "that", "the", "their", "them", "they", "this", "to", "was", "were",
  "who", "with", "you", "your", "no", "not", "fic", "fanfic", "story", "looking",
]);

/** Extract meaningful, de-duped, lowercased terms from a free-text query. */
export function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of query.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    const term = raw.trim();
    if (term.length < 2 || STOPWORDS.has(term) || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

export interface Segment {
  text: string;
  match: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split `text` into matched / unmatched segments against the given terms.
 * Matches are whole-word, case-insensitive, with a trailing-char allowance so
 * "burn" highlights inside "burns" / "burning". Returns the original text as a
 * single unmatched segment when there are no terms or no matches.
 */
export function highlightSegments(text: string, terms: string[]): Segment[] {
  if (!text || terms.length === 0) return [{ text, match: false }];
  // Longest-first so multi-word/longer terms win over substrings.
  const alts = [...terms].sort((a, b) => b.length - a.length).map(escapeRegExp);
  // \p{L}* trailing allows simple inflections; word-boundary-ish leading.
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${alts.join("|")})\\p{L}*`, "giu");

  const segments: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start), match: false });
    segments.push({ text: m[0], match: true });
    last = start + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments.length ? segments : [{ text, match: false }];
}

/** True if any term matches anywhere in the text (cheap pre-check). */
export function hasMatch(text: string, terms: string[]): boolean {
  return highlightSegments(text, terms).some((s) => s.match);
}
