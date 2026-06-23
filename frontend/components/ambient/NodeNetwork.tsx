'use client';

import { useEffect, useRef } from 'react';

/**
 * Constellation background, Pearcrypt-style: nodes joined by thin smooth lines
 * that brighten with proximity. Nodes are a bit larger and drift slowly (gentle
 * velocity, bouncing off the edges). Three platform hues (AO3 red / FFN blue /
 * Wattpad orange, no purple) read from the live --sp-* tokens.
 *
 * The cursor is a purely visual node — it draws links to nearby nodes but exerts
 * no force on them. Canvas is pointer-events-none; reduced-motion = static frame.
 */

const CONFIG = {
  density: 1 / 15000, // nodes per px²
  minNodes: 24,
  maxNodes: 64,
  linkDist: 150, // node↔node connect radius
  mouseDist: 220, // cursor link radius
  nodeR: 3, // node dot radius (larger)
  drift: 0.22, // max drift speed (px/frame)
  linkAlpha: 0.5,
  mouseAlpha: 0.9,
};

type RGB = [number, number, number];
type Node = { x: number; y: number; vx: number; vy: number; ci: number };

function hexToRgb(hex: string): RGB {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
}

export function NodeNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let palette: RGB[] = [[255, 255, 255]];
    const mouse = { x: -9999, y: -9999, active: false };

    const readPalette = () => {
      const s = getComputedStyle(document.documentElement);
      const cols = ['--sp-red', '--sp-blue', '--sp-orange']
        .map((n) => s.getPropertyValue(n).trim())
        .filter(Boolean)
        .map(hexToRgb);
      palette = cols.length ? cols : [[255, 255, 255]];
    };

    const rndV = () => (Math.random() - 0.5) * CONFIG.drift * 2;

    const build = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(CONFIG.minNodes, Math.min(CONFIG.maxNodes, Math.round(w * h * CONFIG.density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: rndV(),
        vy: rndV(),
        ci: Math.floor(Math.random() * palette.length),
      }));
    };

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x <= 0) {
          n.x = 0;
          n.vx = Math.abs(n.vx);
        } else if (n.x >= w) {
          n.x = w;
          n.vx = -Math.abs(n.vx);
        }
        if (n.y <= 0) {
          n.y = 0;
          n.vy = Math.abs(n.vy);
        } else if (n.y >= h) {
          n.y = h;
          n.vy = -Math.abs(n.vy);
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      // node ↔ node links — single hue, brighter when closer
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < CONFIG.linkDist * CONFIG.linkDist) {
            const t = 1 - Math.sqrt(d2) / CONFIG.linkDist;
            const c = palette[a.ci % palette.length];
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(t * CONFIG.linkAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // cursor ↔ node links — visual only (no force)
      if (mouse.active) {
        for (const n of nodes) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < CONFIG.mouseDist * CONFIG.mouseDist) {
            const t = 1 - Math.sqrt(d2) / CONFIG.mouseDist;
            const c = palette[n.ci % palette.length];
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(t * CONFIG.mouseAlpha).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        }
      }

      // nodes — round dots
      for (const n of nodes) {
        const c = palette[n.ci % palette.length];
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.92)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, CONFIG.nodeR, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    let lastT = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const view = document.documentElement.getAttribute('data-view');
      if (view && view !== 'empty') return; // pause while reading results
      if (t - lastT < 33) return; // ~30fps cap
      lastT = t;
      step();
      draw();
    };

    readPalette();
    build();
    draw();
    if (!reduce) raf = requestAnimationFrame(frame);

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };
    const onResize = () => {
      build();
      if (reduce) draw();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);
    const obs = new MutationObserver(() => {
      readPalette();
      if (reduce) draw();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
      obs.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0" />;
}
