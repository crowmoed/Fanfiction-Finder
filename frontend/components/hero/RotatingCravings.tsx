import { WordRotate } from '@/components/ui/word-rotate';

const CRAVINGS = [
  'found family',
  'slow burn',
  '100k+ words',
  'enemies to lovers',
  'hurt comfort',
  'canon divergence',
  'no MCD',
  'time travel',
  'fix-it',
  'angst with happy ending',
];

export function RotatingCravings() {
  return (
    <p className="mx-auto max-w-md text-base" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      Describe the fic you&apos;re craving -{' '}
      <WordRotate
        className="font-serif italic"
        style={{ color: 'var(--text-primary)' }}
        duration={2400}
        words={CRAVINGS}
      />
      {' '}- and I&apos;ll dig through AO3, FFN, and Wattpad to find it.
    </p>
  );
}
