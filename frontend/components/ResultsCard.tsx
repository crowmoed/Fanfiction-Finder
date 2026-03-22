'use client';

import type { FicResult } from '@/lib/schema/types';
import PlatformBadge from './PlatformBadge';
import RatingBadge from './RatingBadge';
import ScoreBar from './ScoreBar';
import TagList from './TagList';
import { formatWordCount } from '@/lib/utils/format';

interface ResultsCardProps {
  fic: FicResult;
  rank: number;
}

export default function ResultsCard({ fic, rank }: ResultsCardProps) {
  const isTopRank = rank <= 3;

  function handleClick() {
    window.open(fic.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <article
      onClick={handleClick}
      className="rounded-xl p-4 border transition-all duration-150 cursor-pointer animate-fade-slide-up"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-elevated)';
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={fic.platform} />
          <RatingBadge rating={fic.rating} />
          <span
            className="text-xs font-mono"
            style={{ color: isTopRank ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            #{rank}
          </span>
        </div>
        <ScoreBar score={fic.matchScore} />
      </div>

      {/* Title */}
      <h3
        className="font-semibold text-sm leading-snug mb-0.5 line-clamp-2"
        style={{ color: 'var(--text-primary)' }}
      >
        {fic.title}
      </h3>

      {/* Meta */}
      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        {formatWordCount(fic.wordCount)} words
        {' · '}
        <span style={{ color: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}>
          {fic.status === 'complete' ? 'Complete' : 'WIP'}
        </span>
      </p>

      {/* Match reason */}
      {fic.matchReason && (
        <p className="text-xs italic mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          &ldquo;{fic.matchReason}&rdquo;
        </p>
      )}

      {/* Tags */}
      <TagList tags={fic.tags} limit={3} />
    </article>
  );
}
