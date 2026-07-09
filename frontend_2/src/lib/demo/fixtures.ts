/**
 * fixtures.ts — canonical sample data for demos.
 *
 * These Fic objects cover the field permutations the design must handle:
 * a high score, a mid score, an *unranked* (null) score, missing optional
 * fields, long tag lists, and each platform. Keep them realistic so the demos
 * are a faithful preview of the live UI.
 */
import type { Fic, SearchParams, SearchVariant, User } from "@/lib/contracts";

export const SAMPLE_FICS: Fic[] = [
  {
    title: "The Slow Burn at the End of the World",
    url: "https://archiveofourown.org/works/00000001",
    platform: "AO3",
    fandom: "Harry Potter",
    summary:
      "Enemies to lovers, set across seven winters. Draco keeps a list of every reason he hates Harry Potter. The list keeps getting shorter.",
    tags: ["Slow Burn", "Enemies to Lovers", "Drarry", "No Major Character Death", "Pining"],
    word_count: 184320,
    kudos: 21500,
    hits: 480200,
    meta: {
      type: "ao3",
      author: "saltandstarlight",
      rating: "Mature",
      categories: ["M/M"],
      warnings: ["No Archive Warnings Apply"],
      fandoms: ["Harry Potter - J. K. Rowling"],
      relationships: ["Harry Potter/Draco Malfoy"],
      characters: ["Harry Potter", "Draco Malfoy"],
      freeforms: ["Slow Burn", "Enemies to Lovers", "Pining", "No Major Character Death"],
      language: "English",
      chapters: "32/32",
      complete: true,
      kudos: 21500,
      hits: 480200,
      bookmarks: 8900,
      comments: 4200,
      published: "2024-12-15",
      updated: "2025-11-02",
      series: [],
      collections: [],
    },
    match_score: 97,
    match_reason: null,
  },
  {
    title: "Cartography of Small Disasters",
    url: "https://www.fanfiction.net/s/00000002",
    platform: "FFN",
    fandom: "Harry Potter",
    summary:
      "A quieter story about learning to share a kitchen. Lower stakes, higher feelings.",
    tags: ["Domestic", "Fluff", "Post-War"],
    word_count: 42100,
    kudos: 3100,
    hits: 88000,
    meta: {
      type: "ffn",
      author: "quietshelves",
      rating: "T",
      genres: ["Romance", "Family"],
      characters: ["Harry P.", "Draco M."],
      language: "English",
      chapters: 14,
      complete: false,
      favs: 3100,
      follows: 4800,
      reviews: 610,
      updated: "2026-01-18",
      published: "2025-08-30",
    },
    match_score: 71,
    match_reason: null,
  },
  {
    title: "Untitled Draft (work in progress)",
    url: "https://www.wattpad.com/story/00000003",
    platform: "Wattpad",
    fandom: "Harry Potter",
    summary: null,
    tags: [],
    word_count: null,
    kudos: null,
    hits: 1200,
    // Legacy row indexed before the meta column existed — exercises the null-meta path.
    meta: null,
    match_score: null, // unranked — omitted by the LLM ranker
    match_reason: null,
  },
];

export const MANY_FICS: Fic[] = Array.from({ length: 12 }, (_, i) => ({
  ...SAMPLE_FICS[i % SAMPLE_FICS.length],
  title: `${SAMPLE_FICS[i % SAMPLE_FICS.length].title} (#${i + 1})`,
  url: `https://example.org/works/${1000 + i}`,
  match_score: i % 4 === 3 ? null : Math.max(40, 99 - i * 5),
}));

// A second, visually-distinct result set so the two fake searches differ.
export const NARUTO_FICS: Fic[] = [
  {
    title: "Ash and Cinder",
    url: "https://archiveofourown.org/works/00010001",
    platform: "AO3",
    fandom: "Naruto",
    summary:
      "A time-travel fix-it where Kakashi wakes up the morning of the bell test with thirty years of regrets and one chance to do better.",
    tags: ["Time Travel", "Fix-It", "Team 7", "Found Family", "Slow Burn"],
    word_count: 256000,
    kudos: 41200,
    hits: 990000,
    meta: {
      type: "ao3",
      author: "greywolfprose",
      rating: "Teen And Up Audiences",
      categories: ["Gen"],
      warnings: ["Graphic Depictions Of Violence"],
      fandoms: ["Naruto"],
      relationships: ["Team 7 & Team 7"],
      characters: ["Kakashi Hatake", "Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno"],
      freeforms: ["Time Travel", "Fix-It", "Found Family"],
      language: "English",
      chapters: "48/?",
      complete: false,
      kudos: 41200,
      hits: 990000,
      bookmarks: 15600,
      comments: 9100,
      published: "2025-05-01",
      updated: "2026-02-09",
      series: ["The Second Chance Cycle (1 of 2)"],
      collections: [],
    },
    match_score: 95,
    match_reason: null,
  },
  {
    title: "The Weight of Water",
    url: "https://www.fanfiction.net/s/00010002",
    platform: "FFN",
    fandom: "Naruto",
    summary: "Haku lives. A small change, a very different war.",
    tags: ["Canon Divergence", "Angst", "Politics"],
    word_count: 88000,
    kudos: 6400,
    hits: 150000,
    meta: {
      type: "ffn",
      author: "tidewright",
      rating: "M",
      genres: ["Drama", "Angst"],
      characters: ["Haku", "Zabuza M."],
      language: "English",
      chapters: 22,
      complete: true,
      favs: 6400,
      follows: 5900,
      reviews: 1400,
      updated: "2025-12-01",
      published: "2024-06-14",
    },
    match_score: 78,
    match_reason: null,
  },
  {
    title: "stray sparks",
    url: "https://www.wattpad.com/story/00010003",
    platform: "Wattpad",
    fandom: "Naruto",
    summary: "Short ficlets. Mostly soft. Updated whenever.",
    tags: ["Drabble", "Fluff"],
    word_count: 12400,
    kudos: 820,
    hits: 30500,
    meta: {
      type: "wattpad",
      author: "softemberwrites",
      author_username: "softemberwrites",
      author_followers: 3400,
      mature: false,
      complete: false,
      parts: 9,
      votes: 820,
      reads: 30500,
      comments: 240,
      cover: "https://picsum.photos/seed/stray-sparks/128/192",
      language: "English",
      published: "2025-10-02",
      updated: "2026-03-21",
    },
    match_score: 52,
    match_reason: null,
  },
];

/** A fake saved/recent search: its params + the result set it "returned". */
export interface DemoSearch {
  params: SearchParams;
  fics: Fic[];
  /** Whether this one should also be a followed (saved) search. */
  followed?: boolean;
  /** Pre-fusion per-variant lists, shaped exactly like the live pipeline's
   *  (GET /search?include_variants=true), so the board's "by rewritten prompt"
   *  strategy exercises its REAL path on seeded data too. */
  variants?: SearchVariant[];
}

export const DEMO_SEARCHES: DemoSearch[] = [
  {
    params: { q: "drarry enemies to lovers slow burn no major character death", fandom: "Harry Potter", strict: false },
    fics: SAMPLE_FICS,
    followed: true,
    variants: [
      {
        key: "raw",
        label: "drarry enemies to lovers slow burn no major character death",
        fics: SAMPLE_FICS,
      },
      {
        key: "hyde-1",
        label:
          "A long enemies-to-lovers Draco/Harry story where years of rivalry thaw into something neither of them names for a very long time, and nobody important dies.",
        fics: [SAMPLE_FICS[0], SAMPLE_FICS[1]],
      },
      {
        key: "hyde-2",
        label:
          "An unusual angle: the quiet domestic aftermath of the war, two former enemies negotiating shared spaces, routines, and truces one kitchen at a time.",
        fics: [SAMPLE_FICS[1], SAMPLE_FICS[0], SAMPLE_FICS[2]],
      },
      {
        key: "hyde-3",
        label:
          "Atmosphere over plot: wintry pining, letters never sent, the ache of watching someone across a crowded room for seven years.",
        fics: [SAMPLE_FICS[0], SAMPLE_FICS[2]],
      },
    ],
  },
  {
    params: { q: "naruto time travel fix-it team 7 found family", fandom: "Naruto", strict: false },
    fics: NARUTO_FICS,
    variants: [
      {
        key: "raw",
        label: "naruto time travel fix-it team 7 found family",
        fics: NARUTO_FICS,
      },
      {
        key: "hyde-1",
        label:
          "A veteran shinobi is thrown back to the start of canon and quietly rewrites every mistake, rebuilding Team 7 into the family it should have been.",
        fics: [NARUTO_FICS[0], NARUTO_FICS[1]],
      },
      {
        key: "hyde-2",
        label:
          "A niche take: one small canon divergence in the Land of Waves ripples outward into a completely different war.",
        fics: [NARUTO_FICS[1], NARUTO_FICS[0]],
      },
      {
        key: "hyde-3",
        label:
          "Tone-first: soft, low-stakes vignettes about found family between missions, warmth over plot.",
        fics: [NARUTO_FICS[2], NARUTO_FICS[0]],
      },
    ],
  },
];

/** A fake signed-in user for previewing the authenticated UI (no backend). */
export const DEMO_USER: User = {
  id: "demo-user-1",
  email: "demo.reader@example.com",
  tier: "paid",
  searches_used: 7,
  week_start: "2026-06-15",
  created_at: "2026-01-04T12:00:00.000Z",
  stripe_customer_id: "cus_demo123",
};
