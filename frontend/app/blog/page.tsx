import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

function formatMonth(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-screen paper-grid-bg px-6 py-12">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back to search
        </Link>
        <h1 className="mt-10 font-serif text-6xl italic" style={{ color: 'var(--text-primary)' }}>
          Notes
        </h1>
        <hr className="my-8 border-dashed" style={{ borderColor: 'var(--border-default)' }} />

        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block rounded-lg px-1 py-2">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-3xl italic" style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </h2>
                <time className="shrink-0 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {formatMonth(post.date)}
                </time>
              </div>
              {post.excerpt && (
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {post.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
