import { NumberTicker } from '@/components/ui/number-ticker';

export function StatsTicker() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
      <span><NumberTicker value={341051} /> fics indexed</span>
    </div>
  );
}
