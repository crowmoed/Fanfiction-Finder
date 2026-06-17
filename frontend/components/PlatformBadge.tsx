interface PlatformBadgeProps {
  platform: 'ao3' | 'ffn' | 'wattpad';
}

const PLATFORMS = {
  ao3: { label: 'AO3', cls: 'text-ao3 bg-ao3-bg', aria: 'Archive of Our Own' },
  ffn: { label: 'FFN', cls: 'text-ffn bg-ffn-bg', aria: 'FanFiction.net' },
  wattpad: { label: 'WP', cls: 'text-wattpad bg-wattpad-bg', aria: 'Wattpad' },
} as const;

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  const p = PLATFORMS[platform];
  return (
    <span
      className={`inline-flex items-center rounded-sm border border-current px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wider ${p.cls}`}
      aria-label={p.aria}
    >
      {p.label}
    </span>
  );
}
