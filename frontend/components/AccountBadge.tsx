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
    );
  }

  return (
    <span
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
      <span style={{ color: 'var(--text-tertiary)' }}>/ wk</span>
    </span>
  );
}
