import type { RankedFic } from '@/hooks/useResultsFilters';
import { FicCard } from '@/components/results/FicCard';

interface ResultsBrowseProps {
  rows: RankedFic[];
}

/**
 * Calm browse grid. The top result spans two columns as subtle emphasis; the
 * rest flow in an even responsive grid. No glare/magic/3D-tilt cards — reading
 * cards that share the same filtered rows as the table.
 */
export function ResultsBrowse({ rows }: ResultsBrowseProps) {
  if (rows.length === 0) return null;

  const [top, ...rest] = rows;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-2">
        <FicCard fic={top} rank={top._rank} featured />
      </div>
      {rest.map((fic) => (
        <FicCard key={fic.id} fic={fic} rank={fic._rank} />
      ))}
    </div>
  );
}
