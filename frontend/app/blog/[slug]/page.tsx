import matter from 'gray-matter';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostSource } from '@/lib/blog';

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const source = await getPostSource(slug);
  if (!source) notFound();

  const { data, content } = matter(source);
  const lines = content.trim().split('\n');

  return (
    <main className="min-h-[100dvh] px-6 py-12">
      <article className="mx-auto max-w-prose">
        <Link href="/blog" className="font-mono text-sm text-ink-2 transition-colors hover:text-ink">
          ← Notes
        </Link>
        {data.date && (
          <div className="mt-8 font-mono text-xs uppercase tracking-wider text-ink-3">{data.date}</div>
        )}
        <div className="mt-5 space-y-5">{lines.map((line, index) => renderMdxLine(line, index))}</div>
      </article>
    </main>
  );
}

function renderMdxLine(line: string, index: number) {
  if (!line.trim()) return null;
  if (line.startsWith('# ')) {
    return (
      <h1
        key={index}
        className="font-serif text-4xl font-semibold leading-tight tracking-[-0.02em] text-balance text-ink"
      >
        {line.replace(/^# /, '')}
      </h1>
    );
  }
  if (line.startsWith('## ')) {
    return (
      <h2 key={index} className="mt-8 font-serif text-2xl font-semibold leading-tight text-ink">
        {line.replace(/^## /, '')}
      </h2>
    );
  }
  return (
    <p key={index} className="text-lg leading-relaxed text-ink-2">
      {line}
    </p>
  );
}
