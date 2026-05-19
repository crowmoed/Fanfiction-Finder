import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt?: string;
}

export async function getAllPosts(): Promise<BlogPostMeta[]> {
  const files = await fs.readdir(BLOG_DIR);
  const posts = await Promise.all(
    files.filter((file) => file.endsWith('.mdx')).map(async (file) => {
      const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ''),
        title: data.title,
        date: data.date,
        tags: data.tags ?? [],
        excerpt: content.split('\n').find((line) => line.trim() && !line.startsWith('#'))?.trim(),
      };
    }),
  );
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPostSource(slug: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(BLOG_DIR, `${slug}.mdx`), 'utf-8');
  } catch {
    return null;
  }
}
