'use client';

import { useEffect, useState } from 'react';
import RippleGrid from '@/components/ui/ripple-grid';

export function GravityGridBackground() {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (reducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.95 }}>
      <RippleGrid
        gridColor="rgba(92, 138, 58, 0.9)"
        gridSize={70}
        gridThickness={1.4}
        fadeDistance={2.5}
        vignetteStrength={0.9}
        glowIntensity={10}
        opacity={0.85}
        mouseInteraction
        mouseInteractionRadius={0.95}
        // Node layout: 'scatter' (organic, active) | 'even' (tidy spread) |
        // 'patch' (dense "vine patches" — the busy thicket look). Swap to taste.
        distribution="scatter"
      />
    </div>
  );
}
