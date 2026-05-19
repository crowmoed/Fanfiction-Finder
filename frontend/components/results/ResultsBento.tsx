import type { FicResult } from '@/lib/schema/types';
import { FicCard } from '@/components/results/FicCard';
import { GlareCard } from '@/components/ui/glare-card';
import { MagicCard } from '@/components/ui/magic-card';
import { cn } from '@/lib/cn';

interface ResultsBentoProps {
  results: FicResult[];
}

export function ResultsBento({ results }: ResultsBentoProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {results.map((fic, index) => {
        const rank = index + 1;
        const className = cardSpan(rank);
        const content = <FicCard fic={fic} rank={rank} />;
        return rank <= 3 ? (
          <GlareCard key={fic.id} className={className}>{content}</GlareCard>
        ) : (
          <MagicCard key={fic.id} className={className}>{content}</MagicCard>
        );
      })}
    </div>
  );
}

function cardSpan(rank: number) {
  if (rank === 1) return cn('md:col-span-6 md:row-span-2 min-h-[360px]');
  if (rank <= 3) return cn('md:col-span-3 md:row-span-2 min-h-[360px]');
  if (rank <= 9) return cn('md:col-span-4 min-h-[280px]');
  return cn('md:col-span-3 min-h-[250px]');
}
