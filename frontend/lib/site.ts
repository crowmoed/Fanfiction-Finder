/**
 * Single source of truth for site-wide facts that were previously hardcoded in
 * multiple components (the indexed-fic count lived in both StatsTicker and the
 * loading pipeline, and could drift). Update here, everywhere follows.
 */
export const SITE = {
  /** Total fics in the pre-built index. Update on re-index. */
  ficsIndexed: 341_051,

  /** Fandoms with collected data — mirrors backend/data/fandoms.py. */
  fandoms: [
    'Harry Potter',
    'Percy Jackson',
    'Naruto',
    'One Piece',
    'Attack on Titan',
    'My Hero Academia',
    'Hunter x Hunter',
    'Kamisama Kiss',
    'Doctor Who',
    'Genshin Impact',
    'NCT',
    'Heated Rivalry',
    'K-Pop Demon Hunters',
    'Stranger Things',
  ],

  platforms: ['AO3', 'FFN', 'Wattpad'] as const,
} as const;
