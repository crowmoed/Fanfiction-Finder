"use client";

/**
 * demoMode.ts — a guarded, client-side "demo mode" that makes the WHOLE real app
 * run on fake data with no backend.
 *
 * When on, the three backend touchpoints short-circuit to fixtures:
 *   - search   (searchRegistry) → a simulated pipeline + query-tailored results,
 *   - fandoms  (useFandoms)     → a fixed fake fandom list,
 *   - auth     (auth.tsx)       → a fake signed-in user.
 * Because a demo search still runs the real completion side effects (cache,
 * history, saved, fic store), one search populates every downstream surface —
 * /results restores, /history, /saved, /fic/[id], and the board all just work.
 *
 * SAFETY: the flag is inert in production unless demos are explicitly enabled
 * (same gate as the /dev tree), so a stray localStorage key can never make a
 * real deployment serve fake data.
 */
import {
  ALL_FANDOMS,
  type Fic,
  type FandomOption,
  type SearchParams,
  type SearchVariant,
} from "@/lib/contracts";
import { SAMPLE_FICS, NARUTO_FICS, MANY_FICS } from "@/lib/demo/fixtures";

const FLAG_KEY = "ficfinder.demo";

/** Demos are usable in dev, or in a build that opted in via NEXT_PUBLIC_ENABLE_DEMOS. */
const DEMOS_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ENABLE_DEMOS === "1";

/** True when the app should serve fake data. Guarded so it's inert in prod. */
export function isDemoMode(): boolean {
  if (!DEMOS_ENABLED || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setDemoMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(FLAG_KEY, "1");
    else window.localStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

/** The local stores the demo launcher seeds — cleared together on exit. */
const SEEDED_STORE_KEYS = [
  "ficfinder.history",
  "ficfinder.results",
  "ficfinder.fics",
  "ficfinder.saved",
];

/**
 * Leave demo mode: drop the flag + the seeded stores, then HARD-navigate to `to`.
 *
 * The full page load is required, not cosmetic. Each store module (history,
 * resultsCache, ficStore, savedSearches) and the search-op registry keep a
 * module-level in-memory cache that a same-tab `localStorage.removeItem` does NOT
 * invalidate — the `storage` event only fires in *other* tabs. Without the
 * reload, the "real" app would keep serving the seeded fake data from those live
 * caches for the rest of the SPA session. A fresh document load rebuilds every
 * cache from the now-empty storage.
 */
export function exitDemoMode(to = "/"): void {
  if (typeof window === "undefined") return;
  setDemoMode(false);
  try {
    for (const k of SEEDED_STORE_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  window.location.href = to;
}

/** Subscribe to demo-mode toggles (same tab via notify, other tabs via storage). */
export function subscribeDemoMode(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === FLAG_KEY || e.key === null) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

// ─── Fake fandoms ─────────────────────────────────────────────────────────────

const FAKE_FANDOMS: FandomOption[] = [
  { name: ALL_FANDOMS, collected: true },
  { name: "Harry Potter", collected: true },
  { name: "Naruto", collected: true },
  { name: "My Hero Academia", collected: true },
  { name: "Genshin Impact", collected: true },
  { name: "The Untamed", collected: false },
];

export function fakeFandoms(): FandomOption[] {
  return FAKE_FANDOMS;
}

// ─── Fake search ──────────────────────────────────────────────────────────────

// A distinct, deduped pool to draw results from. MANY_FICS adds volume for
// cross-fandom searches; the two rich sets carry full metadata.
const POOL: Fic[] = dedupeByUrl([...SAMPLE_FICS, ...NARUTO_FICS, ...MANY_FICS]);

function dedupeByUrl(fics: Fic[]): Fic[] {
  const seen = new Set<string>();
  const out: Fic[] = [];
  for (const f of fics) {
    if (seen.has(f.url)) continue;
    seen.add(f.url);
    out.push(f);
  }
  return out;
}

/** Tiny deterministic string hash (djb2) so a query yields stable results. */
function seedOf(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return h >>> 0;
}

/** Deterministic 0..1 PRNG (mulberry32) seeded per query. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthesize a plausible, query-tailored result set for ANY query. Filters the
 * pool to the requested fandom when it matches (falling back to the whole pool),
 * then assigns descending match scores seeded by the query — so results look
 * ranked and stay stable across re-runs, without ever mutating the fixtures.
 */
export function fakeSearchFics(params: SearchParams): Fic[] {
  const seed = seedOf(`${params.q}::${params.fandom}`);
  const next = rng(seed);

  const wantFandom = params.fandom && params.fandom !== ALL_FANDOMS ? params.fandom : null;
  let base = wantFandom
    ? POOL.filter((f) => (f.fandom ?? "").toLowerCase() === wantFandom.toLowerCase())
    : POOL;
  if (base.length === 0) base = POOL; // never return an empty demo for a real query

  // Shuffle deterministically, then take a plausible count.
  const shuffled = [...base].sort(() => next() - 0.5);
  const count = Math.max(3, Math.min(shuffled.length, wantFandom ? shuffled.length : 10));

  return shuffled.slice(0, count).map((fic, i) => {
    // Descending scores with a couple of trailing unranked rows, like the ranker.
    const unranked = i >= count - 2 && next() > 0.5;
    const score = unranked ? null : Math.max(41, 98 - i * 6 - Math.floor(next() * 4));
    return {
      ...fic,
      match_score: score,
      // The live ranker returns score only — demo data mirrors that honestly
      // instead of fabricating a "reason" the product can't actually produce.
      match_reason: null,
    };
  });
}

/** Query-echoing HyDE-style rewrites, for the board's includeVariants path. */
export function fakeVariants(params: SearchParams, fics: Fic[]): SearchVariant[] {
  const half = Math.max(2, Math.ceil(fics.length / 2));
  return [
    { key: "raw", label: params.q, fics },
    {
      key: "hyde-1",
      label: `A long, plot-driven take on ${params.q}, faithful to the tags and canon.`,
      fics: fics.slice(0, half),
    },
    {
      key: "hyde-2",
      label: `An unusual, character-first angle on ${params.q}: quieter, lower stakes.`,
      fics: [...fics].reverse().slice(0, half),
    },
    {
      key: "hyde-3",
      label: `Atmosphere over plot: the mood and feeling of ${params.q}.`,
      fics: fics.filter((_, i) => i % 2 === 0),
    },
  ];
}
