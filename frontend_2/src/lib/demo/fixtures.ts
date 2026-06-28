/**
 * fixtures.ts — canonical sample data for demos.
 *
 * These Fic objects cover the field permutations the design must handle:
 * a high score, a mid score, an *unranked* (null) score, missing optional
 * fields, long tag lists, and each platform. Keep them realistic so the demos
 * are a faithful preview of the live UI.
 */
import type { Fic, SearchParams, User } from "@/lib/contracts";

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
      category: ["M/M"],
      warnings: ["No Archive Warnings Apply"],
      language: "English",
      chapters: "32/32",
      complete: true,
      kudos: 21500,
      hits: 480200,
      bookmarks: 8900,
      comments: 4200,
      updated: "2025-11-02",
    },
    match_score: 97,
    match_reason: "Exact match: enemies-to-lovers slow burn, no MCD, Drarry.",
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
    match_reason: "Slow-burn tone matches, but lighter on the enemies angle.",
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
const NARUTO_FICS: Fic[] = [
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
      category: ["Gen"],
      warnings: ["Graphic Depictions Of Violence"],
      language: "English",
      chapters: "48/?",
      complete: false,
      kudos: 41200,
      hits: 990000,
      bookmarks: 15600,
      comments: 9100,
      updated: "2026-02-09",
    },
    match_score: 95,
    match_reason: "Time-travel fix-it with the Team 7 focus the query asked for.",
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
    match_reason: "Canon-divergence AU, lighter on the time-travel angle.",
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
      mature: false,
      complete: false,
      parts: 9,
      votes: 820,
      reads: 30500,
      comments: 240,
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
}

export const DEMO_SEARCHES: DemoSearch[] = [
  {
    params: { q: "drarry enemies to lovers slow burn no major character death", fandom: "Harry Potter", strict: false },
    fics: SAMPLE_FICS,
    followed: true,
  },
  {
    params: { q: "naruto time travel fix-it team 7 found family", fandom: "Naruto", strict: false },
    fics: NARUTO_FICS,
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
