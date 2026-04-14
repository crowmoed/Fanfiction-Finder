'use client';

interface AccountBadgeProps {
  tier: 'free' | 'paid';
  searchesUsed: number;
  searchesMax: number;
}

export default function AccountBadge({ tier, searchesUsed, searchesMax }: AccountBadgeProps) {
  if (tier === 'paid') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono bg-accent-light text-accent border"
        style={{ borderColor: 'rgba(13,148,136,0.15)' }}
      >
        <span aria-hidden="true">✓</span>
        <span>unlimited</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-bg-secondary border border-border-default">
      <span className="font-mono text-text-primary">
        {searchesUsed}/{searchesMax}
      </span>
      <span className="text-text-tertiary">this week</span>
    </span>
  );
}
