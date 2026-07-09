/**
 * HankoMark — the Ficwell seal, drawn (DESIGN.md · Iconography & brand).
 *
 * A carved vermilion hanko: hand-irregular squircle body with a knife-cut chip
 * on its left edge, a carved paper keyline frame, and a drawn slab-serif F.
 * Every path is hand-tuned vector — no <text>, so it renders identically on
 * every platform (the old mark's Georgia "F" didn't). The chip and the frame's
 * irregularity read at ≥48px and quietly disappear at favicon scale.
 *
 * The -4° stamp tilt is applied by the `.hanko` wrapper in-app; the favicon
 * (src/app/icon.svg, a hand-synced copy of these paths) sits straight because
 * crispness beats gesture at 16px. Change one, change both.
 */

/** Seal body: irregular squircle, chip carved out of the left edge. */
const SEAL_BODY =
  "M 12.8 2.9 C 19.2 2.2 29.4 2.2 35.6 2.8 C 40.6 3.3 44.7 7.0 45.2 12.0 " +
  "C 45.8 18.4 45.7 29.2 45.1 35.8 C 44.6 40.9 40.8 44.8 35.7 45.2 " +
  "C 29.2 45.8 18.9 45.7 12.4 45.1 C 7.4 44.6 3.4 40.7 2.9 35.6 " +
  "C 2.7 33.4 2.55 31.8 2.6 30.2 L 3.7 29.2 L 2.5 28.2 " +
  "C 2.4 22.8 2.5 17.6 2.9 12.4 C 3.4 7.2 7.6 3.4 12.8 2.9 Z";

/** Carved inner keyline, with its own hand irregularity. */
const SEAL_FRAME =
  "M 12.9 6.6 C 18.9 6.1 29.2 6.1 35.3 6.5 C 38.6 6.9 41.2 9.4 41.5 12.6 " +
  "C 42.0 18.6 41.9 29.1 41.4 35.2 C 41.1 38.5 38.7 41.0 35.4 41.3 " +
  "C 29.3 41.8 18.9 41.8 12.8 41.3 C 9.5 41.0 7.0 38.5 6.7 35.2 " +
  "C 6.2 29.1 6.2 18.7 6.7 12.7 C 7.0 9.4 9.6 7.0 12.9 6.6 Z";

/** Drawn slab-serif F, angular terminals like knife cuts. */
const SEAL_GLYPH =
  "M 15.6 12.5 L 33.8 12.5 L 33.8 18.4 L 31.0 16.9 L 22.6 16.9 L 22.6 23.0 " +
  "L 31.0 23.0 L 31.0 27.9 L 28.4 26.4 L 22.6 26.4 L 22.6 33.9 L 24.8 35.0 " +
  "L 24.8 36.5 L 15.2 36.5 L 15.2 35.0 L 17.4 33.9 L 17.4 15.0 L 15.6 13.9 Z";

export function HankoMark({ size }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      style={size === undefined ? { width: "100%", height: "100%" } : undefined}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d={SEAL_BODY} fill="var(--accent, #c03d2b)" />
      <path
        d={SEAL_FRAME}
        fill="none"
        stroke="var(--paper, #fbfaf7)"
        strokeWidth="1.9"
      />
      <g transform="translate(24 24.5) scale(0.84) translate(-24 -24.5)">
        <path d={SEAL_GLYPH} fill="var(--paper, #fbfaf7)" />
      </g>
    </svg>
  );
}
