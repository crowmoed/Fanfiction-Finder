'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface GlareCardProps {
  children: ReactNode;
  className?: string;
}

export function GlareCard({ children, className }: GlareCardProps) {
  const [pos, setPos] = useState({ x: 30, y: 20 });

  return (
    <div
      className={cn('relative h-full overflow-hidden rounded-lg border bg-[var(--bg-elevated)]', className)}
      style={{
        borderColor: 'var(--border-ink)',
        boxShadow: 'var(--shadow-md)',
        '--glare-x': `${pos.x}%`,
        '--glare-y': `${pos.y}%`,
      } as CSSProperties}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPos({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 hover:opacity-100"
        style={{
          background:
            'linear-gradient(115deg, transparent 0%, rgba(200,156,91,0.12) 30%, rgba(255,255,255,0.34) 47%, rgba(196,84,71,0.16) 58%, transparent 78%), radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(217,119,87,0.18), transparent 32%)',
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
