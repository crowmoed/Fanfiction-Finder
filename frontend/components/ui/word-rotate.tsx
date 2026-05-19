'use client';

import { useEffect, useState, type CSSProperties } from 'react';

interface WordRotateProps {
  words: string[];
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

export function WordRotate({ words, duration = 2400, className, style }: WordRotateProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const out = window.setTimeout(() => setPhase('out'), duration - 320);
    const swap = window.setTimeout(() => {
      setIndex((current) => (current + 1) % words.length);
      setPhase('in');
    }, duration);

    return () => {
      window.clearTimeout(out);
      window.clearTimeout(swap);
    };
  }, [duration, index, words.length]);

  const transform =
    phase === 'in' ? 'translateY(0)' : 'translateY(-8px)';
  const opacity = phase === 'in' ? 1 : 0;
  const filter = phase === 'in' ? 'blur(0)' : 'blur(2px)';

  return (
    <span
      className={className}
      style={{
        ...style,
        display: 'inline-block',
        transform,
        opacity,
        filter,
        transition: 'opacity 320ms ease, transform 320ms ease, filter 320ms ease',
        willChange: 'transform, opacity, filter',
      }}
    >
      {words[index]}
    </span>
  );
}
