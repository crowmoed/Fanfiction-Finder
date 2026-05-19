import { Marquee } from '@/components/ui/marquee';

// TODO(cristiano): wire to /admin/stats fandom list once available
const FANDOMS_PLACEHOLDER = [
  'Harry Potter', 'Marvel', 'BTS', 'Naruto', 'Genshin Impact',
  'My Hero Academia', 'Sherlock', 'Supernatural', 'Star Wars',
  'Avatar: The Last Airbender', 'Stranger Things', 'Doctor Who',
  'Good Omens', 'The Witcher', 'Percy Jackson', 'DCU', 'One Piece',
  'Teen Wolf', 'The Untamed', 'Haikyuu!!', 'Voltron', 'Merlin',
  'Dragon Age', 'Mass Effect', 'Final Fantasy', 'Stardew Valley',
  'Hannibal', 'The Magnus Archives', 'Critical Role', 'Yuri!!! on Ice',
  'Lord of the Rings', 'The Hobbit', 'Twilight', 'Skyrim', 'Undertale',
  'Minecraft', 'The Last of Us', 'Arcane', 'Overwatch', 'Sailor Moon',
  'Buffy', 'Gilmore Girls', 'Our Flag Means Death', '911', 'Star Trek',
  'The X-Files', 'Batman', 'Daredevil', 'House MD', 'Succession',
];

export function FandomMarquee() {
  return (
    <Marquee className="py-4" pauseOnHover speed={58}>
      {FANDOMS_PLACEHOLDER.map((name) => (
        <span key={name} className="mx-6 font-sans text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {name}
        </span>
      ))}
    </Marquee>
  );
}
