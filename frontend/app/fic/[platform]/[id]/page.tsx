import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { FicResult } from '@/lib/schema/types';
import { formatWordCount } from '@/lib/utils/format';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { BoxReveal } from '@/components/ui/box-reveal';
import { TracingBeam } from '@/components/ui/tracing-beam';

export const dynamic = 'force-dynamic';

async function getFic(platform: string, id: string): Promise<FicResult | null> {
  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
  if (!host) return null;

  const response = await fetch(`${proto}://${host}/api/fic/${encodeURIComponent(platform)}/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return response.json();
}

export default async function FicDetailPage({
  params,
}: {
  params: Promise<{ platform: string; id: string }>;
}) {
  const { platform, id } = await params;
  const fic = await getFic(platform, id);
  if (!fic) notFound();

  const topTags = fic.tags.slice(0, 3);
  const kudos = fic.stats.kudos ?? fic.stats.favs;
  const similarQuery = encodeURIComponent(topTags.join(', '));

  return (
    <main className="min-h-screen paper-grid-bg px-6 py-10">
      <TracingBeam>
        <article className="mx-auto max-w-3xl">
          <Link href="/" className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            ← Back to results
          </Link>

          <div className="mt-10">
            <PlatformChip platform={fic.platform} />
            <h1 className="mt-5 font-serif text-5xl italic leading-tight" style={{ color: 'var(--text-primary)' }}>
              {fic.title}
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              by {fic.author || 'Unknown Author'} · {formatWordCount(fic.wordCount)} words
              {kudos ? ` · ${formatWordCount(kudos)} kudos` : ''} · {fic.status === 'complete' ? 'complete' : 'in progress'}
            </p>
          </div>

          <section className="mt-10">
            <h2 className="font-serif text-3xl italic"><BoxReveal>Tags</BoxReveal></h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {fic.tags.map((tag) => (
                <span key={tag} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-3xl italic"><BoxReveal>Summary</BoxReveal></h2>
            <p className="mt-4 text-lg leading-8" style={{ color: 'var(--text-secondary)' }}>
              {fic.summary || 'No summary available.'}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-3xl italic"><BoxReveal>Why this matched your query</BoxReveal></h2>
            <p className="mt-4 text-lg leading-8" style={{ color: 'var(--text-secondary)' }}>
              This fic matched on themes of {topTags.length > 0 ? topTags.join(', ') : 'tone, structure, and reader intent'}.
            </p>
          </section>

          <div className="mt-10 flex flex-wrap gap-3">
            <ShimmerButton href={fic.url} target="_blank" rel="noopener noreferrer">
              Read on {fic.platform.toUpperCase()} →
            </ShimmerButton>
            <Link
              href={`/?q=${similarQuery}`}
              className="inline-flex items-center rounded-md border px-4 py-2 font-mono text-sm indie-press"
              style={{ borderColor: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              Find similar fics
            </Link>
          </div>
        </article>
      </TracingBeam>
    </main>
  );
}

function PlatformChip({ platform }: { platform: FicResult['platform'] }) {
  const styles = {
    ao3: { label: 'AO3', color: 'var(--ao3-red)', bg: 'var(--ao3-red-bg)' },
    ffn: { label: 'FFN', color: 'var(--ffn-blue)', bg: 'var(--ffn-blue-bg)' },
    wattpad: { label: 'Wattpad', color: 'var(--wattpad-orange)', bg: 'var(--wattpad-orange-bg)' },
  }[platform];

  return (
    <span className="rounded px-2 py-1 font-mono text-[11px] uppercase" style={{ color: styles.color, backgroundColor: styles.bg, border: '1px solid currentColor' }}>
      {styles.label}
    </span>
  );
}
