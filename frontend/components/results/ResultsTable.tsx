'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { SortField } from '@/lib/schema/types';
import type { RankedFic, Sort } from '@/hooks/useResultsFilters';
import PlatformBadge from '@/components/PlatformBadge';
import RatingBadge from '@/components/RatingBadge';
import ScoreBar from '@/components/ScoreBar';
import TagList from '@/components/TagList';
import { formatWordCount } from '@/lib/utils/format';

interface Column {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortId: SortField | null;
  align?: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { id: '_rank', label: '#', width: 48, sortId: 'matchScore' },
  { id: 'title', label: 'Title', minWidth: 180, sortId: 'title' },
  { id: 'description', label: 'Description', minWidth: 300, sortId: null },
  { id: 'platform', label: 'Source', width: 72, sortId: null },
  { id: 'rating', label: 'Rating', width: 64, sortId: null },
  { id: 'wordCount', label: 'Words', width: 84, sortId: 'wordCount', align: 'right' },
  { id: 'status', label: 'Status', width: 96, sortId: null },
  { id: 'tags', label: 'Tags', width: 180, sortId: null },
  { id: 'matchScore', label: 'Match', width: 80, sortId: 'matchScore' },
];

interface ResultsTableProps {
  rows: RankedFic[];
  isRanked: boolean;
  sort: Sort;
  onToggleSort: (id: SortField) => void;
}

export default function ResultsTable({ rows, isRanked, sort, onToggleSort }: ResultsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 96,
    overscan: 6,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? (virtualItems[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  return (
    <div
      ref={containerRef}
      className="scrollbar-translucent overflow-auto rounded-md border border-border-strong bg-surface shadow-offset"
      style={{ height: 'calc(100dvh - 220px)', overscrollBehavior: 'contain' }}
    >
      <table className="w-full border-collapse text-sm" style={{ minWidth: 1100 }}>
        <thead className="sticky top-0 z-10 bg-surface-2">
          <tr>
            {COLUMNS.map((col) => {
              const sortable = col.sortId !== null;
              const active = sortable && sort.id === col.sortId;
              const ariaSort = active ? (sort.desc ? 'descending' : 'ascending') : 'none';
              return (
                <th
                  key={col.id}
                  scope="col"
                  aria-sort={sortable ? ariaSort : undefined}
                  style={{ width: col.width, minWidth: col.minWidth, textAlign: col.align ?? 'left' }}
                  className="border-b border-border-strong px-3 py-2.5"
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => col.sortId && onToggleSort(col.sortId)}
                      className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-2 transition-colors duration-150 ease-out hover:text-ink"
                    >
                      {col.label}
                      <span className={active ? 'text-accent-text' : 'text-ink-3'}>
                        {active ? (sort.desc ? '↓' : '↑') : '↕'}
                      </span>
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{col.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden>
              <td colSpan={COLUMNS.length} style={{ height: paddingTop }} />
            </tr>
          )}

          {virtualItems.map((vRow) => {
            const fic = rows[vRow.index];
            const isTop3 = isRanked && fic._rank <= 3;

            return (
              <tr key={fic.id} className="group border-b border-border transition-colors duration-100 hover:bg-surface-2">
                <td className="px-3 py-2.5 align-middle">
                  {isRanked ? (
                    isTop3 ? (
                      <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border-strong bg-accent font-mono text-xs font-bold text-accent-ink">
                        {fic._rank}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-ink-3 tabular-nums">{fic._rank}</span>
                    )
                  ) : (
                    <span className="font-mono text-sm text-ink-3">—</span>
                  )}
                </td>

                <td className="px-3 py-2.5 align-middle" style={{ minWidth: 180 }}>
                  <a
                    href={fic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-serif text-base leading-snug text-ink underline-offset-2 hover:underline focus-visible:underline"
                  >
                    {fic.title}
                  </a>
                  <span className="mt-0.5 block truncate text-xs text-ink-3">by {fic.author || 'Unknown'}</span>
                </td>

                <td className="px-3 py-2.5 align-middle" style={{ minWidth: 300 }}>
                  <p className="line-clamp-3 text-xs leading-relaxed text-ink-2">{fic.summary || '—'}</p>
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <PlatformBadge platform={fic.platform} />
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <RatingBadge rating={fic.rating} />
                </td>

                <td className="px-3 py-2.5 text-right align-middle">
                  <span className="font-mono text-sm text-ink-2 tabular-nums">
                    {fic.wordCount > 0 ? formatWordCount(fic.wordCount) : '—'}
                  </span>
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs"
                    style={{ color: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}
                    />
                    {fic.status === 'complete' ? 'Complete' : 'WIP'}
                  </span>
                </td>

                <td className="px-3 py-2.5 align-middle" style={{ width: 180 }}>
                  <TagList tags={fic.tags} limit={3} />
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <ScoreBar score={fic.matchScore} />
                </td>
              </tr>
            );
          })}

          {paddingBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={COLUMNS.length} style={{ height: paddingBottom }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
