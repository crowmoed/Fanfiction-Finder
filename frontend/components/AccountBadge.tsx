'use client';

import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import { ShimmerButton } from '@/components/ui/shimmer-button';

interface AccountBadgeProps {
  tier: 'free' | 'paid';
  searchesUsed: number;
  searchesMax: number;
  onUpgrade?: () => void;
}

export default function AccountBadge({ tier, searchesUsed, searchesMax, onUpgrade }: AccountBadgeProps) {
  if (tier === 'paid') {
    return (
      <AnimatedTooltip content="Paid: unlimited searches.">
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--accent-alt-light)',
            color: 'var(--text-primary)',
            border: '1.5px solid var(--text-primary)',
            borderRadius: '3px',
            transform: 'rotate(-1deg)',
          }}
        >
          <span aria-hidden="true">★</span>
          <span>unlimited</span>
        </span>
      </AnimatedTooltip>
    );
  }

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <AnimatedTooltip content="Free: 2 searches/day.">
        <span
          tabIndex={0}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1.5px solid var(--text-primary)',
            borderRadius: '3px',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>
            {searchesUsed}/{searchesMax}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>/ day</span>
        </span>
      </AnimatedTooltip>
      {onUpgrade && (
        <ShimmerButton onClick={onUpgrade} className="px-3 py-1 text-[11px]">
          Go unlimited
        </ShimmerButton>
      )}
    </div>
  );
}
