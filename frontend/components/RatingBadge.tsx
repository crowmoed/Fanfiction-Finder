'use client';

type Rating = 'G' | 'T' | 'M' | 'E';

interface RatingBadgeProps {
  rating: Rating;
}

const RATING_STYLES: Record<Rating, { bg: string; text: string; label: string }> = {
  G: { bg: '#dcfce7', text: '#15803d', label: 'General Audiences' },
  T: { bg: '#fef9c3', text: '#a16207', label: 'Teen And Up Audiences' },
  M: { bg: '#ffedd5', text: '#c2410c', label: 'Mature' },
  E: { bg: '#fee2e2', text: '#b91c1c', label: 'Explicit' },
};

export default function RatingBadge({ rating }: RatingBadgeProps) {
  const style = RATING_STYLES[rating] ?? RATING_STYLES['T'];

  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
      title={style.label}
      aria-label={style.label}
    >
      {rating}
    </span>
  );
}
