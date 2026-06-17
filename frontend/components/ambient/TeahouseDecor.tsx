'use client';

/**
 * Tea-house ambient decorations: trailing hanging plants draped from the top
 * corners of the page, and a hanging tea-cup shop sign. All CSS/SVG-drawn —
 * no images, no dependencies — and purely decorative (aria-hidden).
 */

/** A leaf shape used on every vine. */
function Leaf({ x, y, rot, alt }: { x: number; y: number; rot: number; alt: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path
        d="M0 0 C -7 -10, -7 -22, 0 -30 C 7 -22, 7 -10, 0 0 Z"
        fill={alt ? 'var(--accent)' : 'var(--accent-text)'}
        opacity="0.85"
      />
      <path d="M0 -2 L0 -26" stroke="var(--accent-text)" strokeWidth="1" opacity="0.5" />
    </g>
  );
}

/** A single trailing vine with leaves, drawn as an SVG that hangs downward. */
function Vine({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      width="150"
      height="320"
      viewBox="0 0 150 320"
      fill="none"
      aria-hidden
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <path
        d="M40 0 C 45 60, 30 100, 48 150 C 64 195, 40 240, 60 310"
        stroke="var(--accent-text)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M70 0 C 80 50, 95 90, 82 140 C 70 185, 92 220, 78 290"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {([
        [48, 40, -22],
        [36, 80, 18],
        [52, 125, -28],
        [42, 170, 22],
        [58, 215, -20],
        [50, 265, 16],
        [82, 55, 24],
        [90, 105, -18],
        [78, 160, 26],
        [86, 210, -22],
      ] as const).map(([x, y, rot], i) => (
        <Leaf key={i} x={x} y={y} rot={rot} alt={i % 2 === 0} />
      ))}
    </svg>
  );
}

/** Hanging plants draped from the top corners of the page. */
export function TeahouseCanopy() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-14 z-30 hidden md:block">
      <Vine className="absolute -top-2 left-0 opacity-90" />
      <Vine className="absolute -top-2 right-0 opacity-90" flip />
    </div>
  );
}

/** A hanging tea-cup sign, like the one over the shop door in the photo. */
export function HangingCupSign() {
  return (
    <span aria-hidden className="relative ml-1 hidden sm:inline-flex">
      {/* hook bracket */}
      <span className="mr-1 inline-block h-3 w-px bg-border-strong align-middle" />
      <span
        className="inline-flex items-center gap-1 rounded-sm border border-border-strong bg-accent-soft px-1.5 py-0.5 shadow-offset"
        style={{ transform: 'rotate(-3deg)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"
            stroke="var(--accent-text)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2" stroke="var(--accent-text)" strokeWidth="2" />
          <path
            d="M8 3c-.6 1 .6 2 0 3M12 3c-.6 1 .6 2 0 3"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}
