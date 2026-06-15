'use client';

import { useEffect, useRef } from 'react';

interface RippleGridProps {
  /** Base color of nodes and edges (any CSS rgb/rgba string). */
  gridColor?: string;
  /** Approximate number of nodes at 1920×1080; scales with viewport area. */
  gridSize?: number;
  gridThickness?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseInteractionRadius?: number;
  fadeDistance?: number;
  vignetteStrength?: number;
  rippleIntensity?: number;
  glowIntensity?: number;
  enableRainbow?: boolean;
}

interface Node {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
  /** Per-node phase so each edge's flowing wave is unique. */
  phase: number;
  /** Growth (0→1) of the vine reaching from the cursor to this node. Eases up
   *  while the node is in range, eases back down when out — so vines slowly
   *  grow out and connect instead of snapping on. */
  grow: number;
  /** Index into FLOWERS for a blooming node, or -1 for a plain leaf-bud.
   *  Assigned uniquely per screen so no two visible flowers repeat. */
  flower: number;
  /** Whether its stem leaves are tea (elliptical) or pothos (heart) shaped. */
  leafKind: 'tea' | 'pothos';
}

// Pull an "r,g,b" triplet out of any rgb()/rgba() string so we can rebuild it
// with per-segment alpha for the distance-based constellation fade.
function parseRgb(color: string): [number, number, number] {
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return [92, 138, 58]; // fallback: --accent #5C8A3A
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/* ------------------------------------------------------------------ *
 *  Twenty unique tea-shop flowers.
 *  Each is a real flower used in tea / a tea garden (researched), drawn
 *  with its own silhouette and authentic colors. A node picks one unique
 *  index, so no two visible blooms repeat.
 * ------------------------------------------------------------------ */
type Ctx = CanvasRenderingContext2D;

const EDGE = '120, 95, 60'; // soft warm outline for pale petals

// One rounded petal of length s along +x, in the given "r,g,b" color.
function petal(ctx: Ctx, ang: number, s: number, a: number, fill: string, belly = 0.5) {
  ctx.save();
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.55, -s * belly, s * 1.5, 0);
  ctx.quadraticCurveTo(s * 0.55, s * belly, 0, 0);
  ctx.fillStyle = `rgba(${fill}, ${a})`;
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.strokeStyle = `rgba(${EDGE}, ${a * 0.45})`;
  ctx.stroke();
  ctx.restore();
}

// A filled disc center.
function disc(ctx: Ctx, r: number, a: number, fill: string) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${fill}, ${a})`;
  ctx.fill();
}

// A radial ring of `n` petals.
function ring(ctx: Ctx, n: number, spin: number, s: number, a: number, fill: string, belly = 0.5, off = 0) {
  for (let p = 0; p < n; p += 1) petal(ctx, spin + ((p + off) / n) * Math.PI * 2, s, a, fill, belly);
}

// A thin spike of stacked buds along +y (for lavender etc.).
function spike(ctx: Ctx, s: number, a: number, fill: string) {
  for (let i = 0; i < 5; i += 1) {
    const yy = -s * (0.4 + i * 0.5);
    const rr = s * (0.5 - i * 0.06);
    ctx.beginPath();
    ctx.ellipse(0, yy, rr, rr * 1.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${fill}, ${a})`;
    ctx.fill();
  }
}

// Each flower: (ctx already translated to center; size, spin, alpha).
const FLOWERS: ((ctx: Ctx, s: number, spin: number, a: number) => void)[] = [
  // 0 Tea (Camellia sinensis): 7 cream petals, yellow stamen
  (c, s, sp, a) => { ring(c, 7, sp, s, a, '247,242,225'); disc(c, s * 0.42, a, '232,184,60'); },
  // 1 Pink camellia: two offset rings, pink over cream
  (c, s, sp, a) => { ring(c, 6, sp, s * 1.15, a, '232,150,170'); ring(c, 6, sp, s * 0.8, a, '247,242,225', 0.5, 0.5); disc(c, s * 0.32, a, '232,184,60'); },
  // 2 Jasmine: 5 white star petals
  (c, s, sp, a) => { ring(c, 5, sp, s * 1.05, a, '250,248,240', 0.42); disc(c, s * 0.26, a, '232,200,90'); },
  // 3 Chamomile daisy: 11 thin white petals, orange disc
  (c, s, sp, a) => { ring(c, 11, sp, s * 0.95, a, '250,248,240', 0.3); disc(c, s * 0.5, a, '226,150,40'); },
  // 4 Hibiscus: 5 broad crimson petals + central column
  (c, s, sp, a) => { ring(c, 5, sp, s * 1.3, a, '198,46,52', 0.72); disc(c, s * 0.3, a, '120,20,28'); c.save(); c.rotate(sp); c.fillStyle = `rgba(236,200,70,${a})`; c.fillRect(-s * 0.06, -s * 0.1, s * 0.12, s * 1.1); c.restore(); },
  // 5 Rose: tight pink spiral of layered petals
  (c, s, sp, a) => { for (let r = 3; r >= 1; r -= 1) ring(c, 5, sp + r * 0.4, s * (0.5 + r * 0.22), a, r % 2 ? '214,82,110' : '230,120,140', 0.6, r * 0.18); disc(c, s * 0.22, a, '170,40,70'); },
  // 6 Lavender: purple flower spike
  (c, s, sp, a) => { c.save(); c.rotate(sp * 0.1); spike(c, s, a, '150,110,200'); c.restore(); },
  // 7 Chrysanthemum: many thin golden petals, two rings
  (c, s, sp, a) => { ring(c, 14, sp, s * 1.2, a, '236,178,40', 0.22); ring(c, 14, sp + 0.22, s * 0.85, a, '244,206,86', 0.22); disc(c, s * 0.28, a, '180,120,20'); },
  // 8 Osmanthus: tiny 4-petal apricot clusters around center
  (c, s, sp, a) => { for (let k = 0; k < 4; k += 1) { c.save(); c.rotate(sp + (k / 4) * Math.PI * 2); c.translate(s * 0.7, 0); ring(c, 4, 0, s * 0.4, a, '240,180,90', 0.5); c.restore(); } disc(c, s * 0.22, a, '210,140,50'); },
  // 9 Butterfly pea: deep blue winged flower
  (c, s, sp, a) => { c.save(); c.rotate(sp); petal(c, 0, s * 1.5, a, '44,70,180', 0.85); petal(c, Math.PI, s * 0.9, a, '70,100,210', 0.7); disc(c, s * 0.34, a, '236,210,80'); c.restore(); },
  // 10 Calendula: double orange marigold rows
  (c, s, sp, a) => { ring(c, 12, sp, s * 1.1, a, '238,130,30', 0.3); ring(c, 12, sp + 0.26, s * 0.78, a, '246,170,60', 0.3); disc(c, s * 0.3, a, '170,80,16'); },
  // 11 Cornflower: fringed blue star
  (c, s, sp, a) => { ring(c, 8, sp, s * 1.15, a, '74,108,206', 0.32); ring(c, 8, sp + 0.4, s * 0.7, a, '120,150,230', 0.3); disc(c, s * 0.2, a, '40,60,120'); },
  // 12 Elderflower: umbel of tiny white dots
  (c, s, sp, a) => { for (let k = 0; k < 7; k += 1) { const an = sp + (k / 7) * Math.PI * 2; const rx = Math.cos(an) * s * 0.85, ry = Math.sin(an) * s * 0.85; c.beginPath(); c.arc(rx, ry, s * 0.26, 0, Math.PI * 2); c.fillStyle = `rgba(250,248,238,${a})`; c.fill(); } disc(c, s * 0.3, a, '236,224,150'); },
  // 13 Honeysuckle: paired cream/yellow trumpets
  (c, s, sp, a) => { c.save(); c.rotate(sp); for (const dir of [-1, 1]) { c.save(); c.rotate(dir * 0.5); petal(c, 0, s * 1.6, a, '250,244,210', 0.34); c.restore(); } disc(c, s * 0.2, a, '236,196,80'); c.restore(); },
  // 14 Safflower: shaggy orange-red puff
  (c, s, sp, a) => { ring(c, 16, sp, s * 1.1, a, '226,86,30', 0.18); ring(c, 16, sp + 0.2, s * 0.9, a, '244,120,40', 0.18); disc(c, s * 0.24, a, '180,50,16'); },
  // 15 Linden: pale yellow-green cluster with a bract
  (c, s, sp, a) => { c.save(); c.rotate(sp); c.fillStyle = `rgba(206,214,150,${a * 0.8})`; c.beginPath(); c.ellipse(0, -s * 0.2, s * 0.4, s * 1.4, 0.3, 0, Math.PI * 2); c.fill(); c.restore(); ring(c, 5, sp, s * 0.7, a, '236,236,180', 0.4); disc(c, s * 0.2, a, '200,180,90'); },
  // 16 Marigold: dense gold-orange ruffled bloom
  (c, s, sp, a) => { for (let r = 3; r >= 1; r -= 1) ring(c, 10, sp + r * 0.3, s * (0.5 + r * 0.2), a, r % 2 ? '232,140,24' : '244,176,40', 0.34, r * 0.12); disc(c, s * 0.2, a, '170,90,16'); },
  // 17 Globe amaranth: round magenta clover-ball
  (c, s, sp, a) => { for (let k = 0; k < 12; k += 1) { const an = sp + (k / 12) * Math.PI * 2; const rr = s * 0.55; c.beginPath(); c.arc(Math.cos(an) * rr, Math.sin(an) * rr, s * 0.34, 0, Math.PI * 2); c.fillStyle = `rgba(196,60,150,${a})`; c.fill(); } disc(c, s * 0.6, a, '214,96,170'); },
  // 18 Lily: 6 white recurved petals with a freckled throat
  (c, s, sp, a) => { ring(c, 6, sp, s * 1.45, a, '250,248,242', 0.4); disc(c, s * 0.26, a, '236,170,70'); c.save(); c.rotate(sp); c.fillStyle = `rgba(190,70,40,${a})`; for (let k = 0; k < 6; k += 1) { c.beginPath(); c.arc(s * (0.3 + (k % 3) * 0.12), (k < 3 ? -1 : 1) * s * 0.12, s * 0.05, 0, Math.PI * 2); c.fill(); } c.restore(); },
  // 19 Plum blossom: 5 round pink-white petals (classic tea-house motif)
  (c, s, sp, a) => { ring(c, 5, sp, s * 1.0, a, '244,206,216', 0.9); disc(c, s * 0.2, a, '198,80,110'); for (let k = 0; k < 5; k += 1) { const an = sp + (k / 5) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(an) * s * 0.34, Math.sin(an) * s * 0.34, s * 0.05, 0, Math.PI * 2); c.fillStyle = `rgba(236,184,60,${a})`; c.fill(); } },
];

export default function RippleGrid({
  gridColor = 'rgba(201, 98, 30, 0.55)',
  gridSize = 90,
  gridThickness = 1,
  opacity = 0.6,
  mouseInteraction = true,
  mouseInteractionRadius = 0.8,
  fadeDistance = 2.5,
  vignetteStrength = 1.2,
  glowIntensity = 6,
}: RippleGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [r, g, b] = parseRgb(gridColor);
    const rgb = `${r}, ${g}, ${b}`;
    // A darker, deeper-green variant for leaf variety (pine vs. the jade stem).
    const dr = Math.round(r * 0.62);
    const dg = Math.round(g * 0.7);
    const db = Math.round(b * 0.55);
    const rgbDark = `${dr}, ${dg}, ${db}`;

    // Flower palette (researched tea-shop blooms):
    //  - tea (Camellia sinensis): 7 creamy-white petals, bright yellow stamens
    //  - jasmine: small white star flower
    //  - chamomile: white daisy petals around an orange-yellow disc
    const HALO = '232, 184, 60'; // warm glow behind a bloom

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let time = 0;

    // Distance under which two points get wired together. Scales with the
    // viewport so density feels consistent across screen sizes.
    let connectDist = 150;

    const mouse = { x: -9999, y: -9999, down: false, active: false };

    // Blue-noise (Poisson-disc) point placement via Bridson's algorithm. Points
    // are kept at least `minDist` apart, so they're spread evenly instead of
    // clumping into pools the way pure random placement does. A background grid
    // makes the neighbour check O(1).
    const poissonPoints = (minDist: number, target: number) => {
      const cell = minDist / Math.SQRT2;
      const cols = Math.max(1, Math.ceil(width / cell));
      const rows = Math.max(1, Math.ceil(height / cell));
      const grid: ({ x: number; y: number } | null)[] = new Array(cols * rows).fill(null);
      const pts: { x: number; y: number }[] = [];
      const active: { x: number; y: number }[] = [];

      const gi = (x: number, y: number) => Math.floor(y / cell) * cols + Math.floor(x / cell);
      const fits = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return false;
        const cx = Math.floor(x / cell);
        const cy = Math.floor(y / cell);
        for (let yy = Math.max(0, cy - 2); yy <= Math.min(rows - 1, cy + 2); yy += 1) {
          for (let xx = Math.max(0, cx - 2); xx <= Math.min(cols - 1, cx + 2); xx += 1) {
            const p = grid[yy * cols + xx];
            if (p && (p.x - x) ** 2 + (p.y - y) ** 2 < minDist * minDist) return false;
          }
        }
        return true;
      };
      const add = (x: number, y: number) => {
        const p = { x, y };
        pts.push(p);
        active.push(p);
        grid[gi(x, y)] = p;
      };

      add(Math.random() * width, Math.random() * height);
      while (active.length && pts.length < target) {
        const ai = Math.floor(Math.random() * active.length);
        const a = active[ai];
        let placed = false;
        for (let k = 0; k < 25; k += 1) {
          const ang = Math.random() * Math.PI * 2;
          const rad = minDist * (1 + Math.random()); // between minDist and 2·minDist
          const nx = a.x + Math.cos(ang) * rad;
          const ny = a.y + Math.sin(ang) * rad;
          if (fits(nx, ny)) {
            add(nx, ny);
            placed = true;
            break;
          }
        }
        if (!placed) active.splice(ai, 1);
      }
      return pts;
    };

    const seedNodes = () => {
      // Target roughly ~gridSize nodes per 1920×1080, scaled to fit.
      const area = width * height;
      const target = Math.max(24, Math.round((gridSize * area) / (1920 * 1080)));

      // Spread points evenly. minDist a bit over half of connectDist guarantees
      // each point has neighbours within connectDist (blue-noise points sit
      // between minDist and ~2·minDist apart) — so no clumps and no solo nodes.
      const minDist = connectDist * 0.55;
      let pts = poissonPoints(minDist, target);

      // Connectivity guarantee: drop any point with no neighbour in range. With
      // the spacing above this is rare, but it removes the odd lonely flower.
      pts = pts.filter((p) =>
        pts.some((q) => q !== p && (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < connectDist * connectDist)
      );

      const count = pts.length;

      // Hand a UNIQUE flower index to a subset of nodes (no on-screen repeats).
      const order = pts.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const bloomCount = Math.min(FLOWERS.length, Math.round(count * 0.32));
      const deck = Array.from({ length: FLOWERS.length }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const flowerOf = new Map<number, number>();
      for (let b = 0; b < bloomCount; b += 1) flowerOf.set(order[b], deck[b]);

      nodes = pts.map((p, i) => ({
        x: p.x,
        y: p.y,
        originX: p.x,
        originY: p.y,
        vx: 0,
        vy: 0,
        radius: 1.2 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        grow: 0,
        flower: flowerOf.has(i) ? (flowerOf.get(i) as number) : -1,
        leafKind: Math.random() < 0.7 ? ('tea' as const) : ('pothos' as const),
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      connectDist = Math.min(width, height) * 0.16 * mouseInteractionRadius;
      seedNodes();
    };

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
    };

    const onPointerLeave = () => {
      mouse.active = false;
      mouse.down = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      mouse.active = true;
      mouse.down = true;
    };

    const onPointerUp = () => {
      mouse.down = false;
    };

    const update = () => {
      const spring = 0.012; // restoring force toward spawn origin
      const damping = 0.92; // velocity decay so motion settles
      const repelRadius = connectDist * 1.4;
      const repelRadiusSq = repelRadius * repelRadius;

      for (const node of nodes) {
        // (2) spring back toward the spawn point
        node.vx += (node.originX - node.x) * spring;
        node.vy += (node.originY - node.y) * spring;

        // (3) hold-to-repel: while the button is down, push nodes away from
        // the cursor with a strength that falls off with distance.
        if (mouse.down && mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < repelRadiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / repelRadius) * 6;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        }

        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;

        // Ease the cursor→node vine growth: grow OUT slowly when in range,
        // retract a touch faster when out of range.
        let target = 0;
        if (mouse.active) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          if (dx * dx + dy * dy < connectDist * connectDist) target = 1;
        }
        const rate = target > node.grow ? 0.045 : 0.08;
        node.grow += (target - node.grow) * rate;
      }
    };

    // Draw a flowing, curved edge instead of a straight line. The control point
    // sits at the midpoint pushed perpendicular to the segment by two things:
    //  - a slow sine wave (unique per edge via `phase`) so the line undulates,
    //  - the perpendicular component of the endpoints' velocity, so physics
    //    motion whips the line as nodes move.
    // Draw a single leaf at (lx, ly), pointing along `ang`, scaled by `s`.
    // `kind` picks the silhouette: 'tea' is a narrow glossy lance (Camellia
    // sinensis), 'pothos' is a broader heart — so the foliage isn't all one
    // plant. `petal` mode reuses the shape as a flower petal in a custom color.
    const drawLeaf = (
      lx: number,
      ly: number,
      ang: number,
      s: number,
      alpha: number,
      dark: boolean,
      kind: 'tea' | 'pothos' = 'tea'
    ) => {
      if (s <= 0.5) return;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      if (kind === 'pothos') {
        // broad heart-ish leaf
        ctx.quadraticCurveTo(s * 1.0, -s * 0.95, s * 1.7, 0);
        ctx.quadraticCurveTo(s * 1.0, s * 0.95, 0, 0);
      } else {
        // narrow pointed tea leaf (lance/ellipse)
        ctx.quadraticCurveTo(s * 0.6, -s * 0.5, s * 2.0, 0);
        ctx.quadraticCurveTo(s * 0.6, s * 0.5, 0, 0);
      }
      ctx.fillStyle = `rgba(${dark ? rgbDark : rgb}, ${alpha})`;
      ctx.fill();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(${rgbDark}, ${alpha})`;
      ctx.stroke();
      // center vein
      ctx.beginPath();
      ctx.moveTo(s * 0.2, 0);
      ctx.lineTo(s * (kind === 'pothos' ? 1.3 : 1.6), 0);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${rgbDark}, ${alpha * 0.7})`;
      ctx.stroke();
      ctx.restore();
    };

    // Each edge is a flowing VINE: the curve is the stem, with little leaves
    // sprouting along it, alternating sides. The control point sways from:
    //  - a slow sine wave (unique per edge via `phase`) so the vine undulates,
    //  - the perpendicular component of the endpoints' velocity, so physics
    //    motion whips the vine as nodes move.
    const drawFlowEdge = (
      ax: number,
      ay: number,
      bx: number,
      by: number,
      phase: number,
      vx: number,
      vy: number,
      alpha: number,
      grow = 1,
      leafKind: 'tea' | 'pothos' = 'tea'
    ) => {
      if (grow <= 0.02) return;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len;
      const py = dx / len;

      const wave = Math.sin(time * 1.8 + phase) * Math.min(len * 0.2, 26);
      const vel = (vx * px + vy * py) * 2.6;
      const offset = wave + vel;

      const mx = (ax + bx) / 2 + px * offset;
      const my = (ay + by) / 2 + py * offset;

      // De Casteljau split of the quadratic at t=grow so a growing vine reaches
      // only partway out, with the correct curved tip.
      const g = grow;
      const cx1 = ax + (mx - ax) * g;
      const cy1 = ay + (my - ay) * g;
      const mxg = mx + (bx - mx) * g;
      const myg = my + (by - my) * g;
      const ex = cx1 + (mxg - cx1) * g; // grown endpoint
      const ey = cy1 + (myg - cy1) * g;

      // Cartoonish stem: a dark outline pass under a bright fill pass.
      ctx.lineCap = 'round';
      ctx.save();
      ctx.lineWidth = gridThickness + 2.2;
      ctx.strokeStyle = `rgba(${rgbDark}, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(cx1, cy1, ex, ey);
      ctx.stroke();
      ctx.lineWidth = gridThickness;
      ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
      ctx.stroke();
      ctx.restore();

      // Leaves along the grown portion. A leaf scales in as the vine reaches it
      // (its size ramps up over the last bit of growth) so leaves pop out as the
      // vine grows — cartoonish, not all at once.
      const leafCount = Math.min(4, Math.max(1, Math.round(len / 55)));
      const leafSize = Math.min(11, 6 + len * 0.03);
      for (let k = 1; k <= leafCount; k += 1) {
        const t = k / (leafCount + 1);
        if (t > grow) break; // not grown out to this leaf yet
        const reveal = Math.min(1, (grow - t) / 0.12); // pop-in near the tip
        const mt = 1 - t;
        const bxp = mt * mt * ax + 2 * mt * t * mx + t * t * bx;
        const byp = mt * mt * ay + 2 * mt * t * my + t * t * by;
        const tx = 2 * mt * (mx - ax) + 2 * t * (bx - mx);
        const ty = 2 * mt * (my - ay) + 2 * t * (by - my);
        const tang = Math.atan2(ty, tx);
        const side = k % 2 === 0 ? 1 : -1;
        // exaggerated wobble for a lively, cartoonish flutter
        const leafAng = tang + side * 1.0 + Math.sin(time * 2.4 + phase + k) * 0.28;
        drawLeaf(bxp, byp, leafAng, leafSize * reveal, alpha, k % 2 === 0, leafKind);
      }
    };

    const draw = () => {
      update();
      time += 0.016;

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;
      ctx.lineWidth = gridThickness;

      // Edges between node pairs within range — alpha scales with closeness.
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= connectDist) continue;
          const alpha = (1 - dist / connectDist) * 0.95;
          ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
          drawFlowEdge(
            a.x,
            a.y,
            b.x,
            b.y,
            a.phase + b.phase,
            (a.vx + b.vx) * 0.5,
            (a.vy + b.vy) * 0.5,
            alpha,
            1,
            a.leafKind
          );
        }
      }

      // (1) mouse as a node: vines slowly grow OUT from the cursor to nearby
      // nodes (and retract when the cursor leaves) via each node's eased `grow`.
      for (const node of nodes) {
        if (node.grow <= 0.02) continue;
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        // alpha follows both closeness and how grown the vine is
        const closeness = Math.max(0, 1 - dist / (connectDist * 1.2));
        const alpha = closeness * node.grow;
        if (alpha <= 0.02) continue;
        drawFlowEdge(mouse.x, mouse.y, node.x, node.y, node.phase, node.vx, node.vy, alpha, node.grow, node.leafKind);
      }

      // Nodes where the vines meet: flowering nodes open into one of 20 unique
      // tea-shop blooms (no repeats on screen); the rest are small leaf-buds.
      // Blooms breathe gently so they feel alive.
      for (const node of nodes) {
        const spin = node.phase + time * 0.2;
        const breathe = 1 + Math.sin(time * 1.2 + node.phase) * 0.06;
        if (node.flower < 0) {
          // small sprout: a couple of tiny leaves + a green center
          const s = node.radius * 1.6 + 1.5;
          drawLeaf(node.x, node.y, spin, s, 0.9, false, node.leafKind);
          drawLeaf(node.x, node.y, spin + Math.PI, s, 0.9, true, node.leafKind);
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgbDark}, 1)`;
          ctx.fill();
        } else {
          const size = (node.radius * 2.8 + 5) * breathe;
          // soft warm halo behind the bloom
          ctx.shadowColor = `rgba(${HALO}, 0.45)`;
          ctx.shadowBlur = glowIntensity * 0.7;
          ctx.save();
          ctx.translate(node.x, node.y);
          FLOWERS[node.flower](ctx, size, spin, 1);
          ctx.restore();
          ctx.shadowBlur = 0;
        }
      }

      // Vignette fading toward the page background so the field reads as ambient.
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) / fadeDistance,
        width / 2,
        height / 2,
        Math.max(width, height) / vignetteStrength
      );
      gradient.addColorStop(0, 'rgba(234,230,207,0)');
      gradient.addColorStop(1, 'rgba(234,230,207,0.4)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    if (mouseInteraction) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerleave', onPointerLeave);
      window.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
    }
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [
    fadeDistance,
    glowIntensity,
    gridColor,
    gridSize,
    gridThickness,
    mouseInteraction,
    mouseInteractionRadius,
    opacity,
    vignetteStrength,
  ]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />;
}
