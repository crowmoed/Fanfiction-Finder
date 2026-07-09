/**
 * meta.ts — platform-agnostic accessors over a Fic's per-platform `meta` blob.
 *
 * The backend returns rich, genuinely useful per-fic metadata (author, content
 * rating, chapter count, completion status, last-updated date, and native
 * engagement stats) in `Fic.meta`, but the shape differs by platform — AO3 has
 * kudos/bookmarks, FFN has favs/follows/reviews, Wattpad has votes/reads. These
 * helpers flatten that union into one normalized surface so cards, the detail
 * page, and facets can read "the author" or "is it complete?" without switching
 * on `meta.type` everywhere.
 *
 * Everything is null-tolerant: `meta` is null for legacy rows indexed before the
 * column existed, and any individual field may be missing from a partial scrape.
 * Accessors return null rather than throwing, so the UI just renders a dash.
 *
 * Dependency-free (only the contract types) so it stays testable and reusable.
 */
import type { Fic, FicMeta } from "@/lib/contracts";

/** The author/translator, normalized across platforms. */
export function ficAuthor(fic: Fic): string | null {
  return fic.meta?.author ?? null;
}

/**
 * The content rating, normalized to a short canonical bucket so a single set of
 * facet chips works across platforms. AO3 spells out "Teen And Up Audiences",
 * FFN uses "T", Wattpad only flags `mature` — we fold all three into the AO3-
 * style G / T / M / E vocabulary (plus "Not Rated" when unknown).
 */
export type RatingBucket = "G" | "T" | "M" | "E" | "Not Rated";

export function ficRating(fic: Fic): RatingBucket | null {
  const m = fic.meta;
  if (!m) return null;

  if (m.type === "wattpad") {
    // Wattpad exposes only a mature flag, not a graded rating.
    if (m.mature == null) return null;
    return m.mature ? "M" : "G";
  }

  const raw = m.rating?.trim().toLowerCase();
  if (!raw) return null;
  // AO3: "General Audiences", "Teen And Up Audiences", "Mature", "Explicit",
  //      "Not Rated". FFN: "K", "K+", "T", "M".
  if (raw.startsWith("explicit")) return "E";
  if (raw.startsWith("mature") || raw === "m") return "M";
  if (raw.startsWith("teen") || raw === "t") return "T";
  if (raw.startsWith("general") || raw === "k" || raw === "k+") return "G";
  if (raw.startsWith("not rated")) return "Not Rated";
  return "Not Rated";
}

/** Completion status, normalized. null = unknown (not indexed). */
export function ficComplete(fic: Fic): boolean | null {
  return fic.meta?.complete ?? null;
}

/**
 * Human-readable chapter count. AO3 stores "5/12" (posted/total), FFN/Wattpad a
 * bare integer (chapters / parts). Always carries its unit — a naked "14"
 * sitting between a rating badge and a word count reads as nothing. Returns
 * null when not indexed.
 */
export function ficChapters(fic: Fic): string | null {
  const m = fic.meta;
  if (!m) return null;
  if (m.type === "ao3") return m.chapters == null ? null : `${m.chapters} chapters`;
  if (m.type === "ffn") return m.chapters == null ? null : `${m.chapters} chapters`;
  if (m.type === "wattpad") return m.parts == null ? null : `${m.parts} parts`;
  return null;
}

/** Last-updated date string as the source site showed it. */
export function ficUpdated(fic: Fic): string | null {
  return fic.meta?.updated ?? null;
}

/** The language, where the platform reports it (all three carry `language`). */
export function ficLanguage(fic: Fic): string | null {
  return fic.meta?.language ?? null;
}

/** One labeled platform-native stat, for the "native stats" strip. */
export interface NativeStat {
  label: string;
  value: number;
}

/**
 * Platform-native engagement stats that the flat `kudos`/`hits` columns don't
 * cover — bookmarks/comments on AO3, favs/follows/reviews on FFN, votes/reads on
 * Wattpad. Returns only the stats that are actually present, so the UI can hide
 * the strip entirely when there's nothing extra to show.
 */
export function ficNativeStats(meta: FicMeta | null): NativeStat[] {
  if (!meta) return [];
  const out: NativeStat[] = [];
  const push = (label: string, value: number | null | undefined) => {
    if (value != null) out.push({ label, value });
  };

  if (meta.type === "ao3") {
    push("bookmarks", meta.bookmarks);
    push("comments", meta.comments);
  } else if (meta.type === "ffn") {
    push("favs", meta.favs);
    push("follows", meta.follows);
    push("reviews", meta.reviews);
  } else if (meta.type === "wattpad") {
    push("votes", meta.votes);
    push("reads", meta.reads);
    push("comments", meta.comments);
  }
  return out;
}
