'use client';

import { useState, useRef, useEffect } from 'react';
import type {
  PlatformFilter,
  StatusFilter,
  RatingFilter,
  WordCountFilter,
  ChapterFilter,
  UpdatedFilter,
  KudosFilter,
} from '@/lib/schema/types';

interface TableToolbarProps {
  totalCount: number;
  platformFilter: PlatformFilter;
  statusFilter: StatusFilter;
  ratingFilter: RatingFilter;
  wordCountFilter: WordCountFilter;
  chapterFilter: ChapterFilter;
  updatedFilter: UpdatedFilter;
  kudosFilter: KudosFilter;
  tagFilter: string[];
  availableTags: { tag: string; count: number }[];
  onPlatformChange: (v: PlatformFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
  onRatingChange: (v: RatingFilter) => void;
  onWordCountChange: (v: WordCountFilter) => void;
  onChapterChange: (v: ChapterFilter) => void;
  onUpdatedChange: (v: UpdatedFilter) => void;
  onKudosChange: (v: KudosFilter) => void;
  onTagFilterChange: (v: string[]) => void;
  onClearAll: () => void;
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
  wordCountFilter,
  chapterFilter,
  updatedFilter,
  kudosFilter,
  tagFilter,
  availableTags,
  onPlatformChange,
  onStatusChange,
  onRatingChange,
  onWordCountChange,
  onChapterChange,
  onUpdatedChange,
  onKudosChange,
  onTagFilterChange,
  onClearAll,
  isMobile,
  viewMode,
  onViewModeChange,
}: TableToolbarProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagOpen(false);
        setTagSearch('');
      }
    }
    if (tagOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tagOpen]);

  const visibleTags = availableTags.filter(
    ({ tag }) =>
      !tagFilter.includes(tag) &&
      (!tagSearch.trim() || tag.toLowerCase().includes(tagSearch.toLowerCase()))
  );

  const activeFilterCount = [
    platformFilter !== 'all',
    statusFilter !== 'all',
    ratingFilter !== 'all',
    wordCountFilter !== 'all',
    chapterFilter !== 'all',
    updatedFilter !== 'all',
    kudosFilter !== 'all',
    tagFilter.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2 mb-3">
      {/* Row 1: count + primary filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {totalCount} result{totalCount !== 1 ? 's' : ''}
          </span>
          {activeFilterCount > 0 && (
            <>
              <span
                className="px-1.5 py-0.5 rounded-md text-xs font-mono"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs hover:underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Clear all
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Platform */}
          <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Platform:
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value as PlatformFilter)}
              className="border rounded-md px-2 py-1 text-sm focus:outline-none"
              style={selectStyle}
            >
              <option value="all">All</option>
              <option value="ao3">AO3</option>
              <option value="ffn">FFN</option>
            </select>
          </label>

          {/* Status */}
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

          {/* Rating */}
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
                type="button"
                onClick={() => onViewModeChange('table')}
                className="p-1.5 transition-colors duration-150"
                style={{
                  backgroundColor: viewMode === 'table' ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                  color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                aria-label="Table view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('card')}
                className="p-1.5 transition-colors duration-150"
                style={{
                  backgroundColor: viewMode === 'card' ? 'var(--bg-secondary)' : 'var(--bg-elevated)',
                  color: viewMode === 'card' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
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

      {/* Row 2: word count + chapters + updated + kudos */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Word count */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Words:
          <select
            value={wordCountFilter}
            onChange={(e) => onWordCountChange(e.target.value as WordCountFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">Any length</option>
            <option value="under10k">Short (&lt; 10k)</option>
            <option value="10k-50k">Medium (10k – 50k)</option>
            <option value="50k-150k">Long (50k – 150k)</option>
            <option value="150k-400k">Very Long (150k – 400k)</option>
            <option value="over400k">Epic (400k+)</option>
          </select>
        </label>

        {/* Chapters */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Chapters:
          <select
            value={chapterFilter}
            onChange={(e) => onChapterChange(e.target.value as ChapterFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">Any</option>
            <option value="oneshot">One-shot</option>
            <option value="multi">Multi-chapter</option>
          </select>
        </label>

        {/* Last updated */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Updated:
          <select
            value={updatedFilter}
            onChange={(e) => onUpdatedChange(e.target.value as UpdatedFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">Any time</option>
            <option value="1yr">Last year</option>
            <option value="2yr">Last 2 years</option>
            <option value="5yr">Last 5 years</option>
          </select>
        </label>

        {/* Kudos / popularity */}
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Kudos/Favs:
          <select
            value={kudosFilter}
            onChange={(e) => onKudosChange(e.target.value as KudosFilter)}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
            style={selectStyle}
          >
            <option value="all">Any</option>
            <option value="100+">100+</option>
            <option value="500+">500+</option>
            <option value="1k+">1k+</option>
            <option value="5k+">5k+</option>
          </select>
        </label>
      </div>

      {/* Row 3: tag chip picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex items-center gap-1.5 flex-wrap" ref={tagRef}>
          <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>Tags:</span>

          {/* Active tag chips */}
          {tagFilter.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {t}
              <button
                type="button"
                onClick={() => onTagFilterChange(tagFilter.filter((x) => x !== t))}
                aria-label={`Remove tag ${t}`}
                className="hover:opacity-70"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}

          {/* Add tag button */}
          <button
            type="button"
            onClick={() => setTagOpen((v) => !v)}
            className="border rounded-md px-2 py-1 text-sm flex items-center gap-1"
            style={{ ...selectStyle, color: 'var(--text-tertiary)' }}
          >
            {tagFilter.length === 0 ? 'Any tag' : '+ tag'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown */}
          {tagOpen && (
            <div
              className="absolute z-20 mt-1 rounded-xl border shadow-md p-3 w-72"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-default)',
                boxShadow: 'var(--shadow-md)',
                top: '100%',
                left: 0,
              }}
            >
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags…"
                autoFocus
                className="w-full border rounded-lg px-2 py-1.5 text-sm mb-2 focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
              {visibleTags.length === 0 ? (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>No tags found</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {visibleTags.map(({ tag, count }: { tag: string; count: number }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onTagFilterChange([...tagFilter, tag]);
                        setTagOpen(false);
                        setTagSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono transition-colors duration-100"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
                      }}
                    >
                      {tag}
                      <span
                        className="rounded px-1"
                        style={{
                          backgroundColor: 'var(--bg-hover)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
