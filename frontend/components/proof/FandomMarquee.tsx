import { Marquee } from '@/components/ui/marquee';

// Indexed fandoms — mirrors backend/data/fandoms.py
const FANDOMS = [
  'Harry Potter',
  'Percy Jackson',
  'Naruto',
  'One Piece',
  'Attack on Titan',
  'My Hero Academia',
  'Hunter x Hunter',
  'Kamisama Kiss',
  'Doctor Who',
  'Genshin Impact',
  'NCT',
  'Heated Rivalry',
  'K-Pop Demon Hunters',
  'Stranger Things',
];

export function FandomMarquee() {
  return (
    <Marquee className="py-4" pauseOnHover speed={108}>
      {FANDOMS.map((name) => (
        <span key={name} className="mx-6 font-sans text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {name}
        </span>
      ))}
    </Marquee>
  );
}
