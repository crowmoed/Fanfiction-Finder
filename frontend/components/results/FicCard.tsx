'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { FicResult } from '@/lib/schema/types';
import { formatWordCount } from '@/lib/utils/format';

interface FicCardProps {
  fic: FicResult;
  rank: number;
}

export function FicCard({ fic, rank }: FicCardProps) {
  const tags = fic.tags ?? [];
  const shownTags = tags.slice(0, 4);
  const overflow = Math.max(0, tags.length - shownTags.length);
  const match = fic.matchScore == null ? null : Math.round(fic.matchScore);
  const kudos = fic.stats.kudos ?? fic.stats.favs;

  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    const check = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fic.summary]);

  return (
    <a
      href={fic.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block h-full p-4 text-left"
      aria-label={`Open ${fic.title} on ${fic.platform}`}
    >
      <article className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <PlatformChip platform={fic.platform} />
          <MatchChip rank={rank} match={match} />
        </div>

        <h3 className="line-clamp-2 font-serif text-[22px] italic leading-tight group-hover:underline" style={{ color: 'var(--text-primary)', textUnderlineOffset: 3 }}>
          {fic.title}
        </h3>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {shownTags.map((tag) => (
            <span key={tag} className="rounded-full border px-2 py-1 text-[11px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              {tag}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-full border px-2 py-1 text-[11px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}>
              +{overflow}
            </span>
          )}
        </div>

        <div className="relative mt-4 flex-1 overflow-hidden">
          <p ref={summaryRef} className="line-clamp-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            {fic.summary || 'No summary available.'}
          </p>
          {isTruncated && (
            <span className="mt-1 inline-block text-sm" style={{ color: 'var(--accent)' }}>read more →</span>
          )}
        </div>

        <div className="mt-5 border-t border-dashed pt-3 font-mono text-[12px]" style={{ borderColor: 'var(--border-default)', color: 'var(--text-tertiary)' }}>
          {formatWordCount(fic.wordCount)} words · {kudos ? `${formatWordCount(kudos)} kudos · ` : ''}{fic.status === 'complete' ? 'complete' : 'in progress'}
        </div>
      </article>
    </a>
  );
}

function MatchChip({ rank, match }: { rank: number; match: number | null }) {
  if (match == null) {
    return (
      <span
        className="rounded-full border px-2 py-1 font-mono text-[11px]"
        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
      >
        #{rank}
      </span>
    );
  }

  if (match >= 85) {
    return (
      <span
        className="relative inline-flex items-center overflow-hidden rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide"
        style={{
          color: '#F3F7E8',
          backgroundColor: '#5C8A3A',
          boxShadow: [
            // outer glassy rim — deep jade refraction + bright caustic halo
            '0 0 0 1px rgba(38, 64, 24, 0.9)',
            '0 0 0 2px rgba(204, 224, 160, 0.4)',
            '0 1px 3px rgba(38, 64, 24, 0.55)',
            // inner glass: top highlight + bottom shadow
            'inset 0 1px 0.5px rgba(255,255,255,0.75)',
            'inset 0 -1px 0.5px rgba(0,0,0,0.35)',
            'inset 0 0 0 1px rgba(255,255,255,0.12)',
          ].join(', '),
          textShadow: '0 1px 1px rgba(0,0,0,0.45)',
        }}
      >
        {/* faceted highlight — runs along the top edge like polished glass */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 60%, transparent 100%)',
          }}
        />
        {/* refraction glow — bright jade crescent at the bottom */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(204, 224, 160, 0.9), transparent)',
            filter: 'blur(0.5px)',
          }}
        />
        {/* travelling shine */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.6) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
            animation: 'emeraldShine 4.5s ease-in-out infinite',
            mixBlendMode: 'overlay',
          }}
        />
        <span className="relative">◆ MATCH {match}%</span>
      </span>
    );
  }

  const tier =
    match >= 70
      ? { color: 'var(--accent-hover)', bg: 'var(--accent-light)', border: 'var(--accent)' }
      : { color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', border: 'var(--border-default)' };

  return (
    <span
      className="rounded-full border px-2 py-1 font-mono text-[11px] font-semibold"
      style={{ color: tier.color, backgroundColor: tier.bg, borderColor: tier.border }}
    >
      MATCH {match}%
    </span>
  );
}

function PlatformChip({ platform }: { platform: FicResult['platform'] }) {
  const styles = {
    ao3: { label: 'AO3', color: 'var(--ao3-red)', bg: 'var(--ao3-red-bg)' },
    ffn: { label: 'FFN', color: 'var(--ffn-blue)', bg: 'var(--ffn-blue-bg)' },
    wattpad: { label: 'Wattpad', color: 'var(--wattpad-orange)', bg: 'var(--wattpad-orange-bg)' },
  }[platform];

  return (
    <span className="rounded px-2 py-1 font-mono text-[11px] uppercase" style={{ color: styles.color, backgroundColor: styles.bg, border: '1px solid currentColor' }}>
      {styles.label}
    </span>
  );
}
