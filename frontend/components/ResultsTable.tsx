'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { FicResult, PlatformFilter, StatusFilter, RatingFilter, WordCountFilter } from '@/lib/schema/types';
import PlatformBadge from './PlatformBadge';
import RatingBadge from './RatingBadge';
import ScoreBar from './ScoreBar';
import TagList from './TagList';
import TableToolbar from './TableToolbar';
import { formatWordCount } from '@/lib/utils/format';

interface ResultsTableProps {
  results: FicResult[];
  isRanked: boolean;
  isMobile?: boolean;
}

export default function ResultsTable({ results, isRanked, isMobile }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'matchScore', desc: true }]);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [wordCountFilter, setWordCountFilter] = useState<WordCountFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Unique tags from all results with counts, sorted by frequency
  const availableTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const r of results) {
      for (const t of r.tags) {
        freq.set(t, (freq.get(t) ?? 0) + 1);
      }
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [results]);

  // Word count range bounds
  const wordCountBounds: Record<WordCountFilter, [number, number]> = {
    all:        [0, Infinity],
    under50k:   [0, 49_999],
    '50k-150k': [50_000, 149_999],
    '150k-400k':[150_000, 399_999],
    over400k:   [400_000, Infinity],
  };

  // Client-side filter
  const filtered = useMemo(() => {
    const [wcMin, wcMax] = wordCountBounds[wordCountFilter];

    return results.filter((r) => {
      if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;
      if (r.wordCount < wcMin || r.wordCount > wcMax) return false;
      if (tagFilter.length > 0 && !tagFilter.every((sel) => r.tags.includes(sel))) return false;
      return true;
    });
  }, [results, platformFilter, statusFilter, ratingFilter, wordCountFilter, tagFilter]);

  // Sorted filtered results with rank
  const rankedFiltered = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const sortCol = sorting[0];
      if (!sortCol) return 0;
      const dir = sortCol.desc ? -1 : 1;

      if (sortCol.id === 'matchScore') {
        return ((b.matchScore ?? -1) - (a.matchScore ?? -1)) * (sortCol.desc ? 1 : -1);
      }
      if (sortCol.id === 'wordCount') {
        return (b.wordCount - a.wordCount) * (sortCol.desc ? 1 : -1);
      }
      if (sortCol.id === 'title') {
        return a.title.localeCompare(b.title) * dir;
      }
      if (sortCol.id === 'updatedAt') {
        return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * (sortCol.desc ? 1 : -1);
      }
      return 0;
    });
    return sorted.map((fic, i) => ({ ...fic, _rank: i + 1 }));
  }, [filtered, sorting]);

  const columns = useMemo<ColumnDef<FicResult & { _rank: number }>[]>(
    () => [
      {
        id: 'rank',
        header: '#',
        accessorKey: '_rank',
        size: 48,
        enableSorting: true,
        cell: ({ getValue, row }) => {
          const rank = getValue<number>();
          const isTop = rank <= 3;
          return (
            <span
              className="font-mono font-bold text-sm"
              style={{ color: isTop ? 'var(--accent)' : 'var(--text-primary)' }}
            >
              {isRanked ? rank : '—'}
            </span>
          );
        },
      },
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        minSize: 200,
        enableSorting: true,
        cell: ({ row }) => {
          const fic = row.original;
          return (
            <div>
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
                <p
                  className="text-xs mt-0.5 line-clamp-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {fic.summary.slice(0, 100)}{fic.summary.length > 100 ? '…' : ''}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'platform',
        header: 'Source',
        accessorKey: 'platform',
        size: 72,
        enableSorting: true,
        cell: ({ getValue }) => <PlatformBadge platform={getValue<'ao3' | 'ffn'>()} />,
      },
      {
        id: 'rating',
        header: 'Rating',
        accessorKey: 'rating',
        size: 56,
        enableSorting: true,
        cell: ({ getValue }) => <RatingBadge rating={getValue<'G' | 'T' | 'M' | 'E'>()} />,
      },
      {
        id: 'wordCount',
        header: 'Words',
        accessorKey: 'wordCount',
        size: 80,
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-right block" style={{ color: 'var(--text-secondary)' }}>
            {formatWordCount(getValue<number>())}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        size: 80,
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue<string>();
          const isComplete = status === 'complete';
          return (
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isComplete ? 'var(--status-complete)' : 'var(--status-wip)' }}
              />
              <span
                className="text-xs"
                style={{ color: isComplete ? 'var(--status-complete)' : 'var(--status-wip)' }}
              >
                {isComplete ? 'Complete' : 'WIP'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'tags',
        header: 'Tags',
        accessorKey: 'tags',
        size: 180,
        enableSorting: false,
        cell: ({ getValue }) => <TagList tags={getValue<string[]>()} limit={3} />,
      },
      {
        id: 'matchScore',
        header: 'Match',
        accessorKey: 'matchScore',
        size: 72,
        enableSorting: true,
        cell: ({ getValue }) => <ScoreBar score={getValue<number | null>()} />,
      },
      {
        id: 'matchReason',
        header: 'Why',
        accessorKey: 'matchReason',
        size: 180,
        enableSorting: false,
        cell: ({ getValue }) => {
          const reason = getValue<string | null>();
          if (!reason) {
            return <div className="h-3 w-full rounded shimmer-bar" />;
          }
          return (
            <p
              className="text-xs italic truncate"
              style={{ color: 'var(--text-secondary)' }}
              title={reason}
            >
              {reason}
            </p>
          );
        },
      },
    ],
    [isRanked]
  );

  const table = useReactTable({
    data: rankedFiltered,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualSorting: true, // We sort ourselves
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  if (results.length === 0) {
    return (
      <div className="rounded-xl border py-16 flex flex-col items-center gap-3" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-elevated)' }}>
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

  return (
    <div>
      <TableToolbar
        totalCount={filtered.length}
        platformFilter={platformFilter}
        statusFilter={statusFilter}
        ratingFilter={ratingFilter}
        wordCountFilter={wordCountFilter}
        tagFilter={tagFilter}
        availableTags={availableTags}
        onPlatformChange={setPlatformFilter}
        onStatusChange={setStatusFilter}
        onRatingChange={setRatingFilter}
        onWordCountChange={setWordCountFilter}
        onTagFilterChange={setTagFilter}
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
        {/* Scroll container */}
        <div
          ref={tableContainerRef}
          className="overflow-auto"
          style={{ maxHeight: '70vh' }}
        >
          <table className="w-full border-collapse text-sm" style={{ minWidth: '900px' }}>
            {/* Sticky header */}
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted();
                    const ariaSort: 'ascending' | 'descending' | 'none' =
                      isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none';
                    return (
                      <th
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          minWidth: header.column.columnDef.minSize,
                          color: 'var(--text-secondary)',
                          borderBottom: '1px solid var(--border-default)',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontWeight: 500,
                          fontSize: '12px',
                          userSelect: 'none',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                        aria-sort={ariaSort}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span style={{ color: isSorted ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                              {isSorted === 'asc' ? '↑' : isSorted === 'desc' ? '↓' : '↕'}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: paddingTop }} />
                </tr>
              )}

              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                const isEven = virtualRow.index % 2 === 0;

                return (
                  <tr
                    key={row.id}
                    onClick={() => window.open(row.original.url, '_blank', 'noopener,noreferrer')}
                    className="cursor-pointer transition-colors duration-100"
                    style={{
                      backgroundColor: isEven ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = isEven ? 'var(--bg-elevated)' : 'var(--bg-secondary)';
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid var(--border-subtle)',
                          verticalAlign: 'middle',
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: paddingBottom }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
