'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
}

export function MagicCard({ children, className }: MagicCardProps) {
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  return (
    <div
      className={cn('relative h-full overflow-hidden rounded-lg border bg-[var(--bg-elevated)]', className)}
      style={{
        borderColor: 'var(--border-ink)',
        boxShadow: 'var(--shadow-sm)',
        '--spot-x': `${spot.x}%`,
        '--spot-y': `${spot.y}%`,
      } as CSSProperties}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setSpot({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at var(--spot-x) var(--spot-y), rgba(217,119,87,0.18), transparent 34%)',
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
