import { Marquee } from '@/components/ui/marquee';
import { SITE } from '@/lib/site';

export function FandomMarquee() {
  return (
    <Marquee className="py-4 [--gap:0px]" pauseOnHover speed={108}>
      {SITE.fandoms.map((name) => (
        <span key={name} className="mx-5 font-sans text-sm text-ink-3">
          {name}
        </span>
      ))}
    </Marquee>
  );
}
