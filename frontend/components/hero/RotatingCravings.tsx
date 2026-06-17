import { WordRotate } from '@/components/ui/word-rotate';

const CRAVINGS = [
  'found family',
  'slow burn',
  '100k+ words',
  'enemies to lovers',
  'hurt/comfort',
  'canon divergence',
  'no major character death',
  'time travel',
  'fix-it',
  'angst with a happy ending',
];

export function RotatingCravings() {
  return (
    <p className="mx-auto max-w-md text-base leading-relaxed text-ink-2">
      Describe the fic you want, like{' '}
      <WordRotate className="font-serif italic text-ink" duration={2400} words={CRAVINGS} />
      , and get a ranked list from AO3, FFN, and Wattpad.
    </p>
  );
}
