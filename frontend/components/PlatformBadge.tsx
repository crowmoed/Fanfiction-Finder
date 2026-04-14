'use client';

interface PlatformBadgeProps {
  platform: 'ao3' | 'ffn' | 'wattpad';
}

const STAMP: React.CSSProperties = {
  border: '1.5px solid currentColor',
  borderRadius: '3px',
  letterSpacing: '0.08em',
  padding: '1px 6px',
  fontWeight: 600,
  transform: 'rotate(-1.5deg)',
};

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (platform === 'ao3') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-mono uppercase"
        style={{ ...STAMP, color: 'var(--ao3-red)', backgroundColor: 'var(--ao3-red-bg)' }}
        aria-label="Archive of Our Own"
      >
        AO3
      </span>
    );
  }

  if (platform === 'wattpad') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-mono uppercase"
        style={{ ...STAMP, color: 'var(--wattpad-orange)', backgroundColor: 'var(--wattpad-orange-bg)' }}
        aria-label="Wattpad"
      >
        WP
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center text-[11px] font-mono uppercase"
      style={{ ...STAMP, color: 'var(--ffn-blue)', backgroundColor: 'var(--ffn-blue-bg)' }}
      aria-label="FanFiction.net"
    >
      FFN
    </span>
  );
}
