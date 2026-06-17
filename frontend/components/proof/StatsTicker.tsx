import { NumberTicker } from '@/components/ui/number-ticker';
import { SITE } from '@/lib/site';

export function StatsTicker() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 font-mono text-xs text-ink-3">
      <NumberTicker value={SITE.ficsIndexed} className="text-ink-2" />
      <span>fics indexed across AO3, FFN &amp; Wattpad</span>
    </div>
  );
}
