'use client';

import { useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type {
  FicResult,
  PlatformFilter,
  StatusFilter,
  RatingFilter,
  WordCountFilter,
  UpdatedFilter,
  KudosFilter,
} from '@/lib/schema/types';
import PlatformBadge from './PlatformBadge';
import RatingBadge from './RatingBadge';
import ScoreBar from './ScoreBar';
import TagList from './TagList';
import TableToolbar from './TableToolbar';
import { formatWordCount } from '@/lib/utils/format';

// Outside component — never re-created
const WORD_COUNT_MIN: Record<WordCountFilter, number> = {
  all: 0, '10k+': 10_000, '20k+': 20_000, '40k+': 40_000,
  '75k+': 75_000, '100k+': 100_000, '200k+': 200_000, '400k+': 400_000,
};

const KUDOS_MIN: Record<KudosFilter, number> = {
  all: 0, '100+': 100, '500+': 500, '1k+': 1_000, '5k+': 5_000,
};

type SortId = 'matchScore' | 'wordCount' | 'title' | 'updatedAt';
interface Sort { id: SortId; desc: boolean }

const COLUMNS = [
  { id: '_rank',       label: '#',      width: 48,  minWidth: undefined, sortId: 'matchScore' as SortId, sortable: true  },
  { id: 'title',       label: 'Title',  width: undefined, minWidth: 200, sortId: 'title'      as SortId, sortable: true  },
  { id: 'platform',    label: 'Source', width: 72,  minWidth: undefined, sortId: null,                   sortable: false },
  { id: 'rating',      label: 'Rating', width: 56,  minWidth: undefined, sortId: null,                   sortable: false },
  { id: 'wordCount',   label: 'Words',  width: 80,  minWidth: undefined, sortId: 'wordCount'  as SortId, sortable: true  },
  { id: 'status',      label: 'Status', width: 80,  minWidth: undefined, sortId: null,                   sortable: false },
  { id: 'tags',        label: 'Tags',   width: 180, minWidth: undefined, sortId: null,                   sortable: false },
  { id: 'matchScore',  label: 'Match',  width: 72,  minWidth: undefined, sortId: 'matchScore' as SortId, sortable: true  },
  { id: 'matchReason', label: 'Why',    width: 180, minWidth: undefined, sortId: null,                   sortable: false },
];

interface ResultsTableProps {
  results: FicResult[];
  isRanked: boolean;
  isMobile?: boolean;
}

type Row = FicResult & { _rank: number };

export default function ResultsTable({ results, isRanked, isMobile }: ResultsTableProps) {
  const [sort, setSort] = useState<Sort>({ id: 'matchScore', desc: true });
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [wordCountFilter, setWordCountFilter] = useState<WordCountFilter>('all');
  const [updatedFilter, setUpdatedFilter] = useState<UpdatedFilter>('all');
  const [kudosFilter, setKudosFilter] = useState<KudosFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const r of results) {
      for (const t of r.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [results]);

  // Filter + sort in one pass
  const rows = useMemo<Row[]>(() => {
    const wcMin = WORD_COUNT_MIN[wordCountFilter];
    const minKudos = KUDOS_MIN[kudosFilter];

    let cutoffDate: Date | null = null;
    if (updatedFilter !== 'all') {
      cutoffDate = new Date();
      if (updatedFilter === '1yr') cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      else if (updatedFilter === '2yr') cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
      else if (updatedFilter === '5yr') cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
    }

    const filtered = results.filter((r) => {
      if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;
      if (r.wordCount < wcMin) return false;
      if (cutoffDate && new Date(r.updatedAt) < cutoffDate) return false;
      if (minKudos > 0 && (r.stats.kudos ?? r.stats.favs ?? 0) < minKudos) return false;
      if (tagFilter.length > 0 && !tagFilter.every((t) => r.tags.includes(t))) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const d = sort.desc ? -1 : 1;
      switch (sort.id) {
        case 'matchScore': return ((b.matchScore ?? -1) - (a.matchScore ?? -1)) * (sort.desc ? 1 : -1);
        case 'wordCount':  return (b.wordCount - a.wordCount) * (sort.desc ? 1 : -1);
        case 'title':      return a.title.localeCompare(b.title) * d;
        case 'updatedAt':  return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * (sort.desc ? 1 : -1);
      }
    });

    return filtered.map((fic, i) => ({ ...fic, _rank: i + 1 }));
  }, [results, platformFilter, statusFilter, ratingFilter, wordCountFilter, updatedFilter, kudosFilter, tagFilter, sort]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  function toggleSort(id: SortId) {
    setSort((prev) => prev.id === id ? { id, desc: !prev.desc } : { id, desc: true });
  }

  if (results.length === 0) {
    return (
      <div className="rounded-xl border py-16 flex flex-col items-center gap-3"
        style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ color: 'var(--text-tertiary)' }}>
          <circle cx="22" cy="22" r="16" stroke="currentColor" strokeWidth="2" />
          <path d="M34 34l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 15v7M22 26v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          No fics found. Try broadening your search or tweaking your prompt.
        </p>
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom = virtualItems.length > 0
    ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
    : 0;

  return (
    <div>
      {/* CSS hover — no JS handlers needed */}
      <style>{`.fic-row:hover { background-color: var(--bg-hover) !important; }`}</style>

      <TableToolbar
        totalCount={rows.length}
        platformFilter={platformFilter}
        statusFilter={statusFilter}
        ratingFilter={ratingFilter}
        wordCountFilter={wordCountFilter}
        updatedFilter={updatedFilter}
        kudosFilter={kudosFilter}
        tagFilter={tagFilter}
        availableTags={availableTags}
        onPlatformChange={setPlatformFilter}
        onStatusChange={setStatusFilter}
        onRatingChange={setRatingFilter}
        onWordCountChange={setWordCountFilter}
        onUpdatedChange={setUpdatedFilter}
        onKudosChange={setKudosFilter}
        onTagFilterChange={setTagFilter}
        onClearAll={() => {
          setPlatformFilter('all');
          setStatusFilter('all');
          setRatingFilter('all');
          setWordCountFilter('all');
          setUpdatedFilter('all');
          setKudosFilter('all');
          setTagFilter([]);
        }}
        isMobile={isMobile}
      />

      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ maxHeight: '70vh' }}
        >
          <table className="w-full border-collapse text-sm" style={{ minWidth: '900px' }}>
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                {COLUMNS.map((col) => {
                  const active = col.sortable && sort.id === (col.sortId ?? col.id);
                  return (
                    <th
                      key={col.id}
                      style={{
                        width: col.width,
                        minWidth: col.minWidth,
                        color: 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-default)',
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 500,
                        fontSize: '12px',
                        userSelect: 'none',
                        cursor: col.sortable ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => col.sortable && col.sortId && toggleSort(col.sortId)}
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <span style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                            {active ? (sort.desc ? '↓' : '↑') : '↕'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}

              {virtualItems.map((vRow) => {
                const fic = rows[vRow.index];
                const isEven = vRow.index % 2 === 0;
                const isTop3 = fic._rank <= 3;

                return (
                  <tr
                    key={fic.id}
                    className="fic-row cursor-pointer"
                    onClick={() => window.open(fic.url, '_blank', 'noopener,noreferrer')}
                    style={{
                      backgroundColor: isEven ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                    }}
                  >
                    {/* # */}
                    <td style={TD}>
                      <span className="font-mono font-bold text-sm"
                        style={{ color: isTop3 ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {isRanked ? fic._rank : '—'}
                      </span>
                    </td>

                    {/* Title */}
                    <td style={{ ...TD, minWidth: 200 }}>
                      <a
                        href={fic.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-sm leading-snug hover:underline block"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {fic.title}
                      </a>
                      {fic.summary && (
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>
                          {fic.summary.length > 100 ? fic.summary.slice(0, 100) + '…' : fic.summary}
                        </p>
                      )}
                    </td>

                    {/* Platform */}
                    <td style={{ ...TD, width: 72 }}>
                      <PlatformBadge platform={fic.platform} />
                    </td>

                    {/* Rating */}
                    <td style={{ ...TD, width: 56 }}>
                      <RatingBadge rating={fic.rating} />
                    </td>

                    {/* Words */}
                    <td style={{ ...TD, width: 80 }}>
                      <span className="font-mono text-sm text-right block" style={{ color: 'var(--text-secondary)' }}>
                        {formatWordCount(fic.wordCount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ ...TD, width: 80 }}>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }} />
                        <span className="text-xs"
                          style={{ color: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}>
                          {fic.status === 'complete' ? 'Complete' : 'WIP'}
                        </span>
                      </div>
                    </td>

                    {/* Tags */}
                    <td style={{ ...TD, width: 180 }}>
                      <TagList tags={fic.tags} limit={3} />
                    </td>

                    {/* Match score */}
                    <td style={{ ...TD, width: 72 }}>
                      <ScoreBar score={fic.matchScore} />
                    </td>

                    {/* Why */}
                    <td style={{ ...TD, width: 180 }}>
                      {fic.matchReason ? (
                        <p className="text-xs italic truncate" style={{ color: 'var(--text-secondary)' }}
                          title={fic.matchReason}>
                          {fic.matchReason}
                        </p>
                      ) : (
                        <div className="h-3 w-full rounded shimmer-bar" />
                      )}
                    </td>
                  </tr>
                );
              })}

              {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const TD: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-subtle)',
  verticalAlign: 'middle',
};
