'use client';

import { useEffect, useRef, useState } from 'react';

interface NumberTickerProps {
  value: number;
  duration?: number;
  className?: string;
}

export function NumberTicker({ value, duration = 1200, className }: NumberTickerProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const tick = (time: number) => {
      startRef.current ??= time;
      const progress = Math.min(1, (time - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
