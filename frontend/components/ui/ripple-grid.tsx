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
}

// Pull an "r,g,b" triplet out of any rgb()/rgba() string so we can rebuild it
// with per-segment alpha for the distance-based constellation fade.
function parseRgb(color: string): [number, number, number] {
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return [92, 138, 58]; // fallback: --accent #5C8A3A
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

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

    const seedNodes = () => {
      // Keep density low: ~gridSize nodes per a 1920×1080 area, scaled to fit.
      const area = width * height;
      const count = Math.max(24, Math.round((gridSize * area) / (1920 * 1080)));
      nodes = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        return {
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
          radius: 1.2 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
        };
      });
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
      }
    };

    // Draw a flowing, curved edge instead of a straight line. The control point
    // sits at the midpoint pushed perpendicular to the segment by two things:
    //  - a slow sine wave (unique per edge via `phase`) so the line undulates,
    //  - the perpendicular component of the endpoints' velocity, so physics
    //    motion whips the line as nodes move.
    // Draw a single small leaf (teardrop) at (lx, ly), pointing along angle
    // `ang`, scaled by `s`, filled with the given alpha.
    const drawLeaf = (lx: number, ly: number, ang: number, s: number, alpha: number, dark: boolean) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.beginPath();
      // teardrop: tip away from the stem, rounded belly
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.7, -s * 0.5, s * 1.6, 0);
      ctx.quadraticCurveTo(s * 0.7, s * 0.5, 0, 0);
      ctx.fillStyle = `rgba(${dark ? rgbDark : rgb}, ${alpha})`;
      ctx.fill();
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
      alpha: number
    ) => {
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len;
      const py = dx / len;

      const wave = Math.sin(time * 0.85 + phase) * Math.min(len * 0.16, 20);
      const vel = (vx * px + vy * py) * 1.4;
      const offset = wave + vel;

      const mx = (ax + bx) / 2 + px * offset;
      const my = (ay + by) / 2 + py * offset;

      // Stem.
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();

      // Leaves spaced well apart along the stem so each reads as a distinct
      // leaf, not a clump. Fewer, larger leaves with clear gaps between them.
      const leafCount = Math.min(5, Math.max(2, Math.round(len / 55)));
      const leafSize = Math.min(22, 12 + len * 0.05);
      for (let k = 1; k <= leafCount; k += 1) {
        const t = k / (leafCount + 1);
        const mt = 1 - t;
        // point on the quadratic Bézier
        const bxp = mt * mt * ax + 2 * mt * t * mx + t * t * bx;
        const byp = mt * mt * ay + 2 * mt * t * my + t * t * by;
        // tangent (derivative) for leaf orientation
        const tx = 2 * mt * (mx - ax) + 2 * t * (bx - mx);
        const ty = 2 * mt * (my - ay) + 2 * t * (by - my);
        const tang = Math.atan2(ty, tx);
        // alternate sides; angle the leaf out from the stem
        const side = k % 2 === 0 ? 1 : -1;
        const leafAng = tang + side * 1.05 + Math.sin(time * 0.7 + phase + k) * 0.1;
        drawLeaf(bxp, byp, leafAng, leafSize, alpha * 0.9, k % 2 === 0);
      }
    };

    const draw = () => {
      update();
      time += 0.011;

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
            alpha
          );
        }
      }

      // (1) mouse as a node: wire the cursor to anything within range.
      if (mouse.active) {
        for (const node of nodes) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= connectDist) continue;
          const alpha = 1 - dist / connectDist;
          ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
          drawFlowEdge(mouse.x, mouse.y, node.x, node.y, node.phase, node.vx, node.vy, alpha);
        }
      }

      // Nodes are simple dots where the vines meet — a small filled circle with
      // a soft glow.
      ctx.shadowColor = `rgba(${rgb}, 0.5)`;
      ctx.shadowBlur = glowIntensity * 0.5;
      ctx.fillStyle = `rgba(${rgb}, 0.95)`;
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

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
