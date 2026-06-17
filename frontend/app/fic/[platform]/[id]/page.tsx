import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { FicResult } from '@/lib/schema/types';
import { formatWordCount } from '@/lib/utils/format';
import PlatformBadge from '@/components/PlatformBadge';
import RatingBadge from '@/components/RatingBadge';

export const dynamic = 'force-dynamic';

async function getFic(platform: string, id: string): Promise<FicResult | null> {
  const headerList = await headers();
  const host = headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') ?? 'http';
  if (!host) return null;

  const response = await fetch(
    `${proto}://${host}/api/fic/${encodeURIComponent(platform)}/${encodeURIComponent(id)}`,
    { cache: 'no-store' },
  );
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
    <main className="min-h-[100dvh] px-6 py-10">
      <article className="mx-auto max-w-prose">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-mono text-sm text-ink-2 transition-colors hover:text-ink"
        >
          ← Back to results
        </Link>

        <header className="mt-8">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={fic.platform} />
            <RatingBadge rating={fic.rating} />
            <span
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: fic.status === 'complete' ? 'var(--status-complete)' : 'var(--status-wip)' }}
              />
              {fic.status === 'complete' ? 'Complete' : 'In progress'}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-[-0.02em] text-balance text-ink">
            {fic.title}
          </h1>
          <p className="mt-3 font-mono text-sm text-ink-3">
            by {fic.author || 'Unknown author'}
            <span className="tabular-nums"> · {formatWordCount(fic.wordCount)} words</span>
            {kudos ? <span className="tabular-nums"> · {formatWordCount(kudos)} kudos</span> : null}
          </p>
        </header>

        {fic.tags.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {fic.tags.map((tag) => (
                <span key={tag} className="rounded-sm bg-surface-2 px-2.5 py-1 text-sm text-ink-2">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-3">Summary</h2>
          <p className="text-lg leading-relaxed text-ink-2">{fic.summary || 'No summary available.'}</p>
        </section>

        <section className="mt-8 rounded-md border border-border bg-surface p-5">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-3">Why this matched</h2>
          <p className="leading-relaxed text-ink-2">
            This fic matched on themes of{' '}
            {topTags.length > 0 ? topTags.join(', ') : 'tone, structure, and reader intent'}.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={fic.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors duration-150 ease-out hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
          >
            Read on {fic.platform.toUpperCase()} →
          </a>
          <Link
            href={`/?q=${similarQuery}`}
            className="inline-flex items-center rounded-md border border-border-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-surface-2"
          >
            Find similar fics
          </Link>
        </div>
      </article>
    </main>
  );
}
