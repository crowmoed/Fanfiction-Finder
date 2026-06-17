'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  PlatformFilter,
  StatusFilter,
  RatingFilter,
  WordCountFilter,
  KudosFilter,
} from '@/lib/schema/types';

interface TableToolbarProps {
  totalCount: number;
  activeFilterCount: number;
  platformFilter: PlatformFilter;
  statusFilter: StatusFilter;
  ratingFilter: RatingFilter;
  wordCountFilter: WordCountFilter;
  kudosFilter: KudosFilter;
  tagFilter: string[];
  availableTags: { tag: string; count: number }[];
  onPlatformChange: (v: PlatformFilter) => void;
  onStatusChange: (v: StatusFilter) => void;
  onRatingChange: (v: RatingFilter) => void;
  onWordCountChange: (v: WordCountFilter) => void;
  onKudosChange: (v: KudosFilter) => void;
  onTagFilterChange: (v: string[]) => void;
  onClearAll: () => void;
}

const selectClass =
  'rounded-sm border border-border bg-surface px-2 py-1 text-sm text-ink-2 outline-none transition-colors duration-150 ease-out focus-visible:border-accent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-ink-2">
      <span className="text-ink-3">{label}</span>
      {children}
    </label>
  );
}

export default function TableToolbar({
  totalCount,
  activeFilterCount,
  platformFilter,
  statusFilter,
  ratingFilter,
  wordCountFilter,
  kudosFilter,
  tagFilter,
  availableTags,
  onPlatformChange,
  onStatusChange,
  onRatingChange,
  onWordCountChange,
  onKudosChange,
  onTagFilterChange,
  onClearAll,
}: TableToolbarProps) {
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tagOpen) return;
    function handler(e: PointerEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setTagOpen(false);
        setTagSearch('');
      }
    }
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [tagOpen]);

  const visibleTags = availableTags.filter(
    ({ tag }) =>
      !tagFilter.includes(tag) &&
      (!tagSearch.trim() || tag.toLowerCase().includes(tagSearch.toLowerCase())),
  );

  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-medium text-ink-2 tabular-nums">
            {totalCount} result{totalCount !== 1 ? 's' : ''}
          </span>
          {activeFilterCount > 0 && (
            <>
              <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent-text">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-ink-3 underline-offset-2 transition-colors duration-150 ease-out hover:text-ink hover:underline"
              >
                Clear all
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Field label="Platform">
            <select value={platformFilter} onChange={(e) => onPlatformChange(e.target.value as PlatformFilter)} className={selectClass}>
              <option value="all">All</option>
              <option value="ao3">AO3</option>
              <option value="ffn">FFN</option>
              <option value="wattpad">Wattpad</option>
            </select>
          </Field>
          <Field label="Status">
            <select value={statusFilter} onChange={(e) => onStatusChange(e.target.value as StatusFilter)} className={selectClass}>
              <option value="all">All</option>
              <option value="complete">Complete</option>
              <option value="in-progress">In Progress</option>
            </select>
          </Field>
          <Field label="Rating">
            <select value={ratingFilter} onChange={(e) => onRatingChange(e.target.value as RatingFilter)} className={selectClass}>
              <option value="all">All</option>
              <option value="G">G/K</option>
              <option value="T">T</option>
              <option value="M">M</option>
              <option value="E">E</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Field label="Words">
          <select value={wordCountFilter} onChange={(e) => onWordCountChange(e.target.value as WordCountFilter)} className={selectClass}>
            <option value="all">Any length</option>
            <option value="10k+">10k+ words</option>
            <option value="20k+">20k+ words</option>
            <option value="40k+">40k+ words</option>
            <option value="75k+">75k+ words</option>
            <option value="100k+">100k+ words</option>
            <option value="200k+">200k+ words</option>
            <option value="400k+">400k+ words</option>
          </select>
        </Field>
        <Field label="Kudos/Favs">
          <select value={kudosFilter} onChange={(e) => onKudosChange(e.target.value as KudosFilter)} className={selectClass}>
            <option value="all">Any</option>
            <option value="100+">100+</option>
            <option value="500+">500+</option>
            <option value="1k+">1k+</option>
            <option value="5k+">5k+</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 text-sm text-ink-3">Tags</span>

        {tagFilter.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-sm bg-accent-soft px-2 py-0.5 font-mono text-xs text-accent-text"
          >
            {t}
            <button
              type="button"
              onClick={() => onTagFilterChange(tagFilter.filter((x) => x !== t))}
              aria-label={`Remove tag filter ${t}`}
              className="transition-opacity hover:opacity-70"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}

        <div className="relative" ref={tagRef}>
          <button
            type="button"
            onClick={() => setTagOpen((v) => !v)}
            aria-expanded={tagOpen}
            className="flex items-center gap-1 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-ink-3 transition-colors duration-150 ease-out hover:text-ink-2"
          >
            {tagFilter.length === 0 ? 'Any tag' : '+ tag'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {tagOpen && (
            <div className="absolute left-0 top-full z-[50] mt-1 w-72 rounded-md border border-border bg-surface p-3 shadow-soft">
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags…"
                autoFocus
                className="mb-2 w-full rounded-sm border border-border bg-surface-2 px-2 py-1.5 text-sm text-ink outline-none placeholder:text-ink-3 focus-visible:border-accent"
              />
              {visibleTags.length === 0 ? (
                <p className="py-2 text-center text-xs text-ink-3">No tags found</p>
              ) : (
                <div className="scrollbar-translucent flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                  {visibleTags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        onTagFilterChange([...tagFilter, tag]);
                        setTagOpen(false);
                        setTagSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-0.5 font-mono text-xs text-ink-2 transition-colors duration-150 ease-out hover:bg-accent-soft hover:text-accent-text"
                    >
                      {tag}
                      <span className="rounded-sm bg-bg px-1 text-ink-3 tabular-nums">{count}</span>
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
