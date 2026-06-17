'use client';

import { useMemo, useState } from 'react';
import type {
  FicResult,
  PlatformFilter,
  StatusFilter,
  RatingFilter,
  WordCountFilter,
  KudosFilter,
  SortField,
} from '@/lib/schema/types';

const WORD_COUNT_MIN: Record<WordCountFilter, number> = {
  all: 0, '10k+': 10_000, '20k+': 20_000, '40k+': 40_000,
  '75k+': 75_000, '100k+': 100_000, '200k+': 200_000, '400k+': 400_000,
};

const KUDOS_MIN: Record<KudosFilter, number> = {
  all: 0, '100+': 100, '500+': 500, '1k+': 1_000, '5k+': 5_000,
};

export interface Sort {
  id: SortField;
  desc: boolean;
}

export type RankedFic = FicResult & { _rank: number };

/**
 * Single source of truth for results filtering + sorting. Both the table and the
 * browse/card views consume this so they always show the same rows in the same
 * order, driven by one shared TableToolbar. Lifting this out of ResultsTable is
 * what lets the two views stay in sync.
 */
export function useResultsFilters(results: FicResult[]) {
  const [sort, setSort] = useState<Sort>({ id: 'matchScore', desc: true });
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [wordCountFilter, setWordCountFilter] = useState<WordCountFilter>('all');
  const [kudosFilter, setKudosFilter] = useState<KudosFilter>('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);

  const availableTags = useMemo(() => {
    const freq = new Map<string, number>();
    for (const r of results) {
      for (const t of r.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [results]);

  const rows = useMemo<RankedFic[]>(() => {
    const wcMin = WORD_COUNT_MIN[wordCountFilter];
    const minKudos = KUDOS_MIN[kudosFilter];

    const filtered = results.filter((r) => {
      if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (ratingFilter !== 'all' && r.rating !== ratingFilter) return false;
      if (r.wordCount < wcMin) return false;
      if (minKudos > 0 && (r.stats.kudos ?? r.stats.favs ?? 0) < minKudos) return false;
      if (tagFilter.length > 0 && !tagFilter.every((t) => r.tags.includes(t))) return false;
      return true;
    });

    const d = sort.desc ? 1 : -1;
    filtered.sort((a, b) => {
      switch (sort.id) {
        case 'matchScore': return ((b.matchScore ?? -1) - (a.matchScore ?? -1)) * d;
        case 'wordCount': return (b.wordCount - a.wordCount) * d;
        case 'title': return a.title.localeCompare(b.title) * (sort.desc ? -1 : 1);
        case 'updatedAt': return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * d;
        default: return 0;
      }
    });

    return filtered.map((fic, i) => ({ ...fic, _rank: i + 1 }));
  }, [results, platformFilter, statusFilter, ratingFilter, wordCountFilter, kudosFilter, tagFilter, sort]);

  const activeFilterCount = [
    platformFilter !== 'all',
    statusFilter !== 'all',
    ratingFilter !== 'all',
    wordCountFilter !== 'all',
    kudosFilter !== 'all',
    tagFilter.length > 0,
  ].filter(Boolean).length;

  function toggleSort(id: SortField) {
    setSort((prev) => (prev.id === id ? { id, desc: !prev.desc } : { id, desc: true }));
  }

  function clearAll() {
    setPlatformFilter('all');
    setStatusFilter('all');
    setRatingFilter('all');
    setWordCountFilter('all');
    setKudosFilter('all');
    setTagFilter([]);
  }

  return {
    rows,
    availableTags,
    activeFilterCount,
    sort,
    toggleSort,
    setSort,
    clearAll,
    filters: { platformFilter, statusFilter, ratingFilter, wordCountFilter, kudosFilter, tagFilter },
    setters: {
      setPlatformFilter, setStatusFilter, setRatingFilter,
      setWordCountFilter, setKudosFilter, setTagFilter,
    },
  };
}
