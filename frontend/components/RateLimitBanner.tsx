'use client';

interface RateLimitBannerProps {
  searchesUsed: number;
  searchesMax: number;
  onUpgrade: () => void;
}

export default function RateLimitBanner({ searchesUsed, searchesMax, onUpgrade }: RateLimitBannerProps) {
  return (
    <div className="mx-auto max-w-[640px] w-full flex items-center gap-4 px-4 py-3 bg-bg-secondary border border-border-default rounded-lg shadow-sm">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">
          {searchesUsed}/{searchesMax} free searches used this week
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          Resets every Monday. Each search costs me real money in AI and cloud fees — unlimited is $5/mo if you want more.
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover"
      >
        Upgrade
      </button>
    </div>
  );
}
