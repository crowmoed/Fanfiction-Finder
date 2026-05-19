import matter from 'gray-matter';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostSource } from '@/lib/blog';
import { BoxReveal } from '@/components/ui/box-reveal';
import { TracingBeam } from '@/components/ui/tracing-beam';

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
    <main className="min-h-screen paper-grid-bg px-6 py-12">
      <TracingBeam>
        <article className="mx-auto max-w-3xl">
          <Link href="/blog" className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            ← Notes
          </Link>
          <div className="mt-10 font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            {data.date}
          </div>
          <div className="mt-6 space-y-6">
            {lines.map((line, index) => renderMdxLine(line, index))}
          </div>
        </article>
      </TracingBeam>
    </main>
  );
}

function renderMdxLine(line: string, index: number) {
  if (!line.trim()) return null;
  if (line.startsWith('# ')) {
    return (
      <h1 key={index} className="font-serif text-6xl italic leading-tight" style={{ color: 'var(--text-primary)' }}>
        {line.replace(/^# /, '')}
      </h1>
    );
  }
  if (line.startsWith('## ')) {
    return (
      <h2 key={index} className="font-serif text-4xl italic" style={{ color: 'var(--text-primary)' }}>
        <BoxReveal>{line.replace(/^## /, '')}</BoxReveal>
      </h2>
    );
  }
  return (
    <p key={index} className="text-lg leading-8" style={{ color: 'var(--text-secondary)' }}>
      {line}
    </p>
  );
}
