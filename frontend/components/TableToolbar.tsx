'use client';

import type { PlatformFilter, StatusFilter, RatingFilter } from '@/lib/schema/types';

interface TableToolbarProps {
  totalCount: number;
  platformFilter: PlatformFilter;
  statusFilter: StatusFilter;
  ratingFilter: RatingFilter;
  onPlatformChange: (v: PlatformFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
  onRatingChange: (v: RatingFilter) => void;
  isMobile?: boolean;
  viewMode?: 'table' | 'card';
  onViewModeChange?: (v: 'table' | 'card') => void;
}

const selectStyle = {
  color: 'var(--text-secondary)',
  backgroundColor: 'var(--bg-elevated)',
  borderColor: 'var(--border-default)',
};

export default function TableToolbar({
  totalCount,
  platformFilter,
  statusFilter,
  ratingFilter,
  onPlatformChange,
  onStatusChange,
  onRatingChange,
  isMobile,
  viewMode,
  onViewModeChange,
}: TableToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {totalCount} result{totalCount !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Platform filter */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Platform:
          <select
            value={platformFilter}
            onChange={(e) => onPlatformChange(e.target.value as PlatformFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="ao3">AO3 Only</option>
            <option value="ffn">FFN Only</option>
          </select>
        </label>

        {/* Status filter */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Status:
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="complete">Complete</option>
            <option value="in-progress">In Progress</option>
          </select>
        </label>

        {/* Rating filter */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Rating:
          <select
            value={ratingFilter}
            onChange={(e) => onRatingChange(e.target.value as RatingFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="G">G/K</option>
            <option value="T">T</option>
            <option value="M">M</option>
            <option value="E">E</option>
          </select>
        </label>

        {/* View mode toggle — mobile only */}
        {isMobile && onViewModeChange && (
          <div className="flex items-center border rounded-md overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => onViewModeChange('table')}
              className="p-1.5 transition-colors duration-150"
              style={{
                backgroundColor: viewMode === 'table' ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
              title="Table view"
              aria-label="Table view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" />
                <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" />
                <rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
            <button
              onClick={() => onViewModeChange('card')}
              className="p-1.5 transition-colors duration-150"
              style={{
                backgroundColor: viewMode === 'card' ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                color: viewMode === 'card' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
              title="Card view"
              aria-label="Card view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" />
                <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
