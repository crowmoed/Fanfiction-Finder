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
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ opacity: 0.62 }}>
      <RippleGrid
        gridColor="rgba(0, 0, 0, 0.42)"
        gridSize={40}
        gridThickness={0.9}
        rippleIntensity={0}
        fadeDistance={2.5}
        vignetteStrength={0.2}
        glowIntensity={0}
        opacity={0.55}
        mouseInteraction
        mouseInteractionRadius={1.0}
        enableRainbow={false}
      />
    </div>
  );
}
