type Rating = 'G' | 'T' | 'M' | 'E';

interface RatingBadgeProps {
  rating: Rating;
}

const RATING: Record<Rating, { cls: string; label: string }> = {
  G: { cls: 'text-rating-g bg-rating-g-bg', label: 'General Audiences' },
  T: { cls: 'text-rating-t bg-rating-t-bg', label: 'Teen And Up Audiences' },
  M: { cls: 'text-rating-m bg-rating-m-bg', label: 'Mature' },
  E: { cls: 'text-rating-e bg-rating-e-bg', label: 'Explicit' },
};

export default function RatingBadge({ rating }: RatingBadgeProps) {
  const r = RATING[rating] ?? RATING.T;
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-semibold ${r.cls}`}
      title={r.label}
      aria-label={`Rating: ${r.label}`}
    >
      {rating}
    </span>
  );
}
