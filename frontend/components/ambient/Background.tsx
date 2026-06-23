'use client';

import { NodeNetwork } from './NodeNetwork';

/**
 * The global page background: a clean interactive node constellation (Pearcrypt
 * style — smooth links) on the near-black canvas, three platform hues (AO3 red /
 * FFN blue / Wattpad orange, no purple), with a soft center scrim so hero text
 * stays legible. Fixed behind all content, never intercepts pointer events. Dims
 * while results are showing (.app-bg + [data-view] rule in globals.css).
 */
export function Background() {
  return (
    <div aria-hidden className="app-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <NodeNetwork />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 40%, color-mix(in srgb, var(--bg) 50%, transparent) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
