'use client';

interface PlatformBadgeProps {
  platform: 'ao3' | 'ffn';
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  if (platform === 'ao3') {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium"
        style={{ color: 'var(--ao3-red)', backgroundColor: 'var(--ao3-red-bg)' }}
        aria-label="Archive of Our Own"
      >
        AO3
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium"
      style={{ color: 'var(--ffn-blue)', backgroundColor: 'var(--ffn-blue-bg)' }}
      aria-label="FanFiction.net"
    >
      FFN
    </span>
  );
}
