'use client';

import { useState } from 'react';

interface QuickFilter {
  label: string;
  query: string;
}

const FILTERS: QuickFilter[] = [
  { label: 'Slow Burn', query: 'slow burn romance with gradual relationship development' },
  { label: 'Fix-It', query: 'fix-it fic where the ending goes differently' },
  { label: 'Complete Only', query: 'completed fics, no works in progress' },
  { label: '100k+ Words', query: 'long epic fic over 100k words' },
  { label: 'Enemies to Lovers', query: 'enemies to lovers trope' },
  { label: 'Time Travel', query: 'time travel fic where characters go back to change events' },
  { label: 'Hurt/Comfort', query: 'hurt/comfort with emotional healing' },
  { label: 'Angst', query: 'angsty emotional fic' },
  { label: 'Fluff', query: 'fluffy feel-good fic' },
  { label: 'AU', query: 'alternate universe AU' },
];

interface QuickFiltersProps {
  onSelectionChange: (selectedQueries: string[]) => void;
}

export default function QuickFilters({ onSelectionChange }: QuickFiltersProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(filter: QuickFilter) {
    const next = new Set(selected);
    if (next.has(filter.label)) {
      next.delete(filter.label);
    } else {
      next.add(filter.label);
    }
    setSelected(next);
    onSelectionChange(
      FILTERS.filter((f) => next.has(f.label)).map((f) => f.query)
    );
  }

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {FILTERS.map((filter) => {
        const isSelected = selected.has(filter.label);
        return (
          <button
            key={filter.label}
            onClick={() => toggle(filter)}
            className="shrink-0 flex flex-col items-start px-3 py-2 rounded-md transition-all duration-150 text-left"
            style={{
              backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
              color: isSelected ? 'white' : 'var(--text-secondary)',
              maxWidth: '160px',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }
            }}
          >
            <span className="text-sm font-mono font-medium leading-snug">{filter.label}</span>
            <span
              className="text-xs leading-snug mt-0.5 line-clamp-2"
              style={{ opacity: isSelected ? 0.8 : 0.6 }}
            >
              {filter.query}
            </span>
          </button>
        );
      })}
    </div>
  );
}
