/**
 * board/strategies.ts — the registry of node split strategies.
 *
 * Each strategy turns one search (`SearchResultGroup`) into one-or-more table
 * nodes (`NodePart[]`). This is the swap point the board is designed around:
 *   - combined     → one table, everything ranked together.
 *   - by-platform  → one table per source database (AO3 / FFN / Wattpad).
 *   - by-variant   → one table per query variant the pipeline retrieved with
 *                    (the raw query + each HyDE rewrite), straight from the
 *                    backend's pre-fusion lists in `group.variants`.
 * Register a new function here and it shows up in the board's strategy switcher —
 * no other code changes.
 *
 * Parts never repeat the search query: the /results page header already names
 * the search; a part's title only says what the SLICE is.
 */
import type { Fic } from "@/lib/contracts";
import type { BadgeTone, NodePart, SplitStrategy } from "./types";

function platformTone(platform: string): BadgeTone {
  const p = platform.toLowerCase();
  if (p.startsWith("ao3") || p.includes("archive")) return "ao3";
  if (p === "ffn" || p.includes("fanfiction")) return "ffn";
  if (p.includes("wattpad")) return "wattpad";
  return "all";
}

/** A live search can legitimately return zero fics. Emit one placeholder part
 *  so the slice's empty state renders instead of the search silently producing
 *  no table at all. Keyed per strategy so switching between two empty strategies
 *  is a structural change (fresh layout), not a stale-position carry-over. */
function emptyPart(strategyId: string, tone: BadgeTone): NodePart[] {
  return [
    {
      partKey: `${strategyId}:empty`,
      title: "No results",
      badge: { label: "0", tone },
      fics: [],
    },
  ];
}

const combined: SplitStrategy = {
  id: "combined",
  label: "Combined",
  description: "One table with every result, ranked together.",
  split: (g): NodePart[] => [
    {
      partKey: "all",
      title: "All results",
      badge: { label: `${g.fics.length} fics`, tone: "all" },
      fics: g.fics,
    },
  ],
};

const byPlatform: SplitStrategy = {
  id: "by-platform",
  label: "By platform",
  description: "One table per source database: AO3, FFN, Wattpad.",
  split: (g): NodePart[] => {
    if (g.fics.length === 0) return emptyPart("by-platform", "all");
    const order = ["AO3", "FFN", "Wattpad"];
    const buckets = new Map<string, Fic[]>();
    for (const fic of g.fics) {
      const arr = buckets.get(fic.platform);
      if (arr) arr.push(fic);
      else buckets.set(fic.platform, [fic]);
    }
    const keys = [...buckets.keys()].sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return keys.map((platform) => ({
      partKey: `platform:${platform}`,
      title: platform,
      badge: { label: `${buckets.get(platform)!.length}`, tone: platformTone(platform) },
      fics: buckets.get(platform)!,
    }));
  },
};

const byVariant: SplitStrategy = {
  id: "by-variant",
  label: "By prompt",
  description:
    "One table per query variant the pipeline retrieved with: your query, plus each rewritten prompt.",
  split: (g): NodePart[] => {
    // Real pre-fusion lists (live /results searches request them, and seeded
    // demos carry them). Zero total results collapses to one placeholder.
    if (g.variants?.length) {
      if (g.variants.every((v) => v.fics.length === 0)) return emptyPart("by-variant", "variant");
      let rewrite = 0;
      return g.variants.map((v) => {
        const isRaw = v.key === "raw";
        if (!isRaw) rewrite += 1;
        return {
          partKey: `variant:${v.key}`,
          title: isRaw ? "Your query, verbatim" : `Rewrite ${rewrite}`,
          // The full rewritten prompt; the raw list's prompt IS the query the
          // /results page header already shows, so it carries no detail line.
          detail: isRaw ? undefined : v.label,
          badge: { label: `${v.fics.length}`, tone: "variant" },
          fics: v.fics,
        };
      });
    }
    // No per-variant data on this group (e.g. restored from a cache entry saved
    // before variants were stored). Show the merged list honestly instead of
    // fabricating a split.
    return [
      {
        partKey: "no-variants",
        title: "Per-prompt view unavailable",
        detail:
          "This search was loaded without per-prompt data. Re-run it (Refresh above) to fetch one table per rewritten prompt.",
        badge: { label: `${g.fics.length}`, tone: "variant" },
        fics: g.fics,
      },
    ];
  },
};

export const STRATEGIES: SplitStrategy[] = [byPlatform, byVariant, combined];

export const DEFAULT_STRATEGY_ID = byPlatform.id;

export function getStrategy(id: string): SplitStrategy {
  return STRATEGIES.find((s) => s.id === id) ?? byPlatform;
}
