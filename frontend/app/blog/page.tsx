import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';

function formatMonth(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <main className="min-h-[100dvh] px-6 py-12">
      <section className="mx-auto max-w-prose">
        <Link href="/" className="font-mono text-sm text-ink-2 transition-colors hover:text-ink">
          ← Back to search
        </Link>
        <h1 className="mt-8 font-serif text-4xl font-semibold tracking-[-0.02em] text-ink">Notes</h1>
        <hr className="my-8 border-border" />

        <div className="flex flex-col divide-y divide-border">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block py-5">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl text-ink underline-offset-2 group-hover:underline">
                  {post.title}
                </h2>
                <time className="shrink-0 font-mono text-xs text-ink-3">{formatMonth(post.date)}</time>
              </div>
              {post.excerpt && <p className="mt-2 text-sm text-ink-2">{post.excerpt}</p>}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
