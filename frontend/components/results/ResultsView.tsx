'use client';

import type { FicResult } from '@/lib/schema/types';
import { useResultsFilters } from '@/hooks/useResultsFilters';
import { useIsMobile } from '@/hooks/useMediaQuery';
import TableToolbar from '@/components/TableToolbar';
import ResultsTable from '@/components/results/ResultsTable';
import { ResultsBrowse } from '@/components/results/ResultsBrowse';
import { ViewToggle, usePersistedResultsView } from '@/components/results/ViewToggle';

interface ResultsViewProps {
  results: FicResult[];
  isRanked: boolean;
}

export function ResultsView({ results, isRanked }: ResultsViewProps) {
  const { rows, availableTags, activeFilterCount, sort, toggleSort, clearAll, filters, setters } =
    useResultsFilters(results);
  const [view, setView] = usePersistedResultsView();
  const isMobile = useIsMobile();

  // The dense table is unusable on phones; force the card view there regardless
  // of the saved preference. Desktop honors the toggle.
  const effectiveView = isMobile ? 'browse' : view;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <TableToolbar
            totalCount={rows.length}
            activeFilterCount={activeFilterCount}
            platformFilter={filters.platformFilter}
            statusFilter={filters.statusFilter}
            ratingFilter={filters.ratingFilter}
            wordCountFilter={filters.wordCountFilter}
            kudosFilter={filters.kudosFilter}
            tagFilter={filters.tagFilter}
            availableTags={availableTags}
            onPlatformChange={setters.setPlatformFilter}
            onStatusChange={setters.setStatusFilter}
            onRatingChange={setters.setRatingFilter}
            onWordCountChange={setters.setWordCountFilter}
            onKudosChange={setters.setKudosFilter}
            onTagFilterChange={setters.setTagFilter}
            onClearAll={clearAll}
          />
        </div>
        {!isMobile && (
          <div className="shrink-0">
            <ViewToggle value={view} onChange={setView} />
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyFiltered />
      ) : effectiveView === 'table' ? (
        <ResultsTable rows={rows} isRanked={isRanked} sort={sort} onToggleSort={toggleSort} />
      ) : (
        <ResultsBrowse rows={rows} />
      )}
    </div>
  );
}

function EmptyFiltered() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-border-strong bg-surface px-6 py-16 text-center shadow-offset">
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="text-ink-3" aria-hidden>
        <circle cx="22" cy="22" r="16" stroke="currentColor" strokeWidth="1.8" />
        <path d="M34 34l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <p className="font-serif text-lg text-ink">No fics match these filters</p>
      <p className="max-w-sm text-sm text-ink-2">Try clearing a filter or two, or broadening your search.</p>
    </div>
  );
}
