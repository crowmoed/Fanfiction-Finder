'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreBarProps {
  score: number | null;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#65A30D';
  return '#84A98C';
}

export default function ScoreBar({ score }: ScoreBarProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (score === null) return;
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, [score]);

  if (score === null) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-10 rounded-full bg-bg-secondary shimmer-bar" />
        <span className="font-mono text-xs text-text-tertiary">—</span>
      </div>
    );
  }

  const color = getScoreColor(score);
  const pct = `${score}%`;

  return (
    <div className="flex items-center gap-1.5" ref={ref}>
      <div className="relative h-1.5 w-12 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: animated ? pct : '0%',
            backgroundColor: color,
          }}
        />
      </div>
      <span className="font-mono text-xs font-medium" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
