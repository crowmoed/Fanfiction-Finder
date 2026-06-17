'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreBarProps {
  score: number | null;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--score-high)';
  if (score >= 50) return 'var(--score-mid)';
  return 'var(--score-low)';
}

export default function ScoreBar({ score }: ScoreBarProps) {
  const [filled, setFilled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (score === null) return;
    const id = window.setTimeout(() => setFilled(true), 40);
    return () => window.clearTimeout(id);
  }, [score]);

  if (score === null) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="skeleton h-1.5 w-10 rounded-full" />
        <span className="font-mono text-xs text-ink-3">—</span>
      </div>
    );
  }

  const color = scoreColor(score);

  return (
    <div ref={ref} className="flex items-center gap-1.5">
      <div className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: filled ? `${score}%` : '0%', backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs font-medium tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
