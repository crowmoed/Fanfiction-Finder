'use client';

import type { FicResult } from '@/lib/schema/types';
import PlatformBadge from '@/components/PlatformBadge';
import RatingBadge from '@/components/RatingBadge';
import { formatWordCount } from '@/lib/utils/format';

interface FicCardProps {
  fic: FicResult;
  rank: number;
  featured?: boolean;
}

/** Calm match indicator: a small tinted pill, no animation, contrast-verified. */
function MatchPill({ match }: { match: number | null }) {
  if (match == null) return null;
  const high = match >= 80;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
        high ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent-text'
      }`}
    >
      {match}% match
    </span>
  );
}

export function FicCard({ fic, rank, featured = false }: FicCardProps) {
  const tags = fic.tags ?? [];
  const shownTags = tags.slice(0, featured ? 6 : 4);
  const overflow = Math.max(0, tags.length - shownTags.length);
  const match = fic.matchScore == null ? null : Math.round(fic.matchScore);
  const kudos = fic.stats.kudos ?? fic.stats.favs;

  return (
    <a
      href={fic.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-md border border-border bg-surface p-4 text-left transition-[border-color,box-shadow] duration-150 ease-out hover:border-border-strong hover:shadow-soft focus-visible:border-border-strong"
      aria-label={`Open ${fic.title} on ${fic.platform}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-3 tabular-nums">#{rank}</span>
          <PlatformBadge platform={fic.platform} />
          <RatingBadge rating={fic.rating} />
        </div>
        <MatchPill match={match} />
      </div>

      <h3
        className={`font-serif leading-tight text-ink underline-offset-2 group-hover:underline ${
          featured ? 'text-2xl' : 'line-clamp-2 text-xl'
        }`}
      >
        {fic.title}
      </h3>
      <p className="mt-1 text-xs text-ink-3">by {fic.author || 'Unknown'}</p>

      <p className={`mt-3 flex-1 text-sm leading-relaxed text-ink-2 ${featured ? 'line-clamp-5' : 'line-clamp-3'}`}>
        {fic.summary || 'No summary available.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {shownTags.map((tag) => (
          <span key={tag} className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
            {tag}
          </span>
        ))}
        {overflow > 0 && (
          <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">+{overflow}</span>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3 font-mono text-[11px] text-ink-3">
        <span className="tabular-nums">{formatWordCount(fic.wordCount)} words</span>
        {kudos ? <span className="tabular-nums"> · {formatWordCount(kudos)} kudos</span> : null}
        <span> · {fic.status === 'complete' ? 'complete' : 'in progress'}</span>
      </div>
    </a>
  );
}
