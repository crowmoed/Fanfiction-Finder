'use client';

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
];

interface QuickFiltersProps {
  onSelect: (query: string) => void;
}

export default function QuickFilters({ onSelect }: QuickFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {FILTERS.map((filter) => (
        <button
          key={filter.label}
          onClick={() => onSelect(filter.query)}
          className="shrink-0 px-3 py-1.5 rounded-md text-sm font-mono transition-all duration-150 whitespace-nowrap"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
