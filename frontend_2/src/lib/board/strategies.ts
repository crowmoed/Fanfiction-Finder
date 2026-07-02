/**
 * board/strategies.ts — the registry of node split strategies.
 *
 * Each strategy turns one search (`SearchResultGroup`) into one-or-more table
 * nodes (`NodePart[]`). This is the swap point the board is designed around:
 *   - combined     → one table, everything ranked together.
 *   - by-platform  → one table per source database (AO3 / FFN / Wattpad).
 *   - by-variant   → one table per rewritten HyDE prompt we vectorize with.
 * Register a new function here and it shows up in the board's strategy switcher —
 * no other code changes.
 */
import type { Fic } from "@/lib/contracts";
import type { BadgeTone, NodePart, SplitStrategy } from "./types";

const score = (f: Fic): number => f.match_score ?? -1;

function platformTone(platform: string): BadgeTone {
  const p = platform.toLowerCase();
  if (p.startsWith("ao3") || p.includes("archive")) return "ao3";
  if (p === "ffn" || p.includes("fanfiction")) return "ffn";
  if (p.includes("wattpad")) return "wattpad";
  return "all";
}

const combined: SplitStrategy = {
  id: "combined",
  label: "Combined",
  description: "One table with every result, ranked together.",
  split: (g): NodePart[] => [
    {
      partKey: "all",
      title:
        g.params.fandom && g.params.fandom !== "All Fandoms"
          ? g.params.fandom
          : "All results",
      subtitle: g.params.q,
      badge: { label: `${g.fics.length} fics`, tone: "all" },
      fics: g.fics,
    },
  ],
};

const byPlatform: SplitStrategy = {
  id: "by-platform",
  label: "By platform",
  description: "One table per source database — AO3, FFN, Wattpad.",
  split: (g): NodePart[] => {
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
      subtitle: g.params.q,
      badge: { label: `${buckets.get(platform)!.length}`, tone: platformTone(platform) },
      fics: buckets.get(platform)!,
    }));
  },
};

// The 3 rewritten prompts the enhancer produces (HyDE). Real per-variant lists
// need the backend to expose query_enhancer.semantic_descriptions retrieval
// before RRF fusion; until then, synthesize a visibly-different demo split from
// the merged set so the strategy is exercisable end-to-end.
const VARIANT_LENSES: { key: string; label: string; sort: (a: Fic, b: Fic) => number }[] = [
  { key: "literal", label: "Prompt 1 · literal phrasing", sort: (a, b) => score(b) - score(a) },
  { key: "thematic", label: "Prompt 2 · thematic expansion", sort: (a, b) => (b.kudos ?? 0) - (a.kudos ?? 0) },
  { key: "vibes", label: "Prompt 3 · tone / vibes", sort: (a, b) => (b.hits ?? 0) - (a.hits ?? 0) },
];

const byVariant: SplitStrategy = {
  id: "by-variant",
  label: "By rewritten prompt",
  description: "One table per HyDE query rewrite — how each expanded prompt ranks the shelf.",
  split: (g): NodePart[] => {
    if (g.variants?.length) {
      return g.variants.map((v) => ({
        partKey: `variant:${v.key}`,
        title: v.label,
        subtitle: g.params.q,
        badge: { label: `${v.fics.length}`, tone: "variant" },
        fics: v.fics,
      }));
    }
    return VARIANT_LENSES.map((lens) => ({
      partKey: `variant:${lens.key}`,
      title: lens.label,
      subtitle: g.params.q,
      badge: { label: `${g.fics.length}`, tone: "variant" },
      fics: [...g.fics].sort(lens.sort),
    }));
  },
};

export const STRATEGIES: SplitStrategy[] = [byPlatform, byVariant, combined];

export const DEFAULT_STRATEGY_ID = byPlatform.id;

export function getStrategy(id: string): SplitStrategy {
  return STRATEGIES.find((s) => s.id === id) ?? byPlatform;
}
