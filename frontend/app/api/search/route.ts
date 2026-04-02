import { NextRequest } from 'next/server';
import type { FicResult } from '@/lib/schema/types';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';
console.log('[DEBUG] BACKEND_URL:', BACKEND_URL);
// Backend Fic type (from backend/data/schema.py)
interface BackendFic {
  title: string;
  url: string;
  platform: string;
  summary?: string | null;
  tags: string[];
  word_count?: number | null;
  kudos?: number | null;
  hits?: number | null;
  match_score?: number | null;
  match_reason?: string | null;
}

function mapToFicResult(fic: BackendFic): FicResult {
  const platform = (fic.platform === 'ao3' || fic.platform === 'ffn') ? fic.platform : 'ao3';
  return {
    id: fic.url,
    platform,
    title: fic.title,
    // Backend doesn't return author — shown as Unknown
    author: 'Unknown Author',
    url: fic.url,
    authorUrl: fic.url,
    // Backend doesn't return rating — defaulting to T
    rating: 'T',
    wordCount: fic.word_count ?? 0,
    // Backend doesn't return chapters
    chapters: '?',
    // Backend doesn't return status
    status: 'complete',
    tags: fic.tags ?? [],
    summary: fic.summary ?? '',
    stats: {
      kudos: fic.kudos ?? undefined,
      hits: fic.hits ?? undefined,
    },
    matchScore: fic.match_score ?? null,
    // Backend doesn't return updated date
    updatedAt: new Date().toISOString(),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  const { prompt, fandom } = await req.json();

  if (!prompt || !fandom) {
    return new Response(JSON.stringify({ error: 'prompt and fandom are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  async function send(data: object) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }

  // Run pipeline asynchronously — non-blocking
  (async () => {
    const startTime = Date.now();

    try {
      // Stage 1: Tag mapping
      await send({ type: 'status', step: 'tag-map', status: 'active' });
      await delay(200);
      await send({ type: 'status', step: 'tag-map', status: 'complete' });

      // Stage 2: LLM parse — skipped (tag mapper handles it)
      await send({ type: 'status', step: 'llm-parse', status: 'skipped' });

      // Stage 3: AO3 + FFN fetch (concurrent in backend)
      await send({ type: 'status', step: 'ao3-fetch', status: 'active' });
      await send({ type: 'status', step: 'ffn-fetch', status: 'active' });

      // Call the Python backend
      console.log(`[API/search] prompt="${prompt}" fandom="${fandom}"`);
      const backendResp = await fetch(
        `${BACKEND_URL}/search?q=${encodeURIComponent(prompt)}&fandom=${encodeURIComponent(fandom)}&limit=100`,
        { signal: AbortSignal.timeout(60_000) }
      );

      if (!backendResp.ok) {
        const detail = await backendResp.text().catch(() => backendResp.statusText);
        throw new Error(`Backend error ${backendResp.status}: ${detail}`);
      }

      const fics: BackendFic[] = await backendResp.json();
      const ficResults = fics.map(mapToFicResult);

      const ao3Results = ficResults.filter((r) => r.platform === 'ao3');
      const ffnResults = ficResults.filter((r) => r.platform === 'ffn');

      await send({ type: 'status', step: 'ao3-fetch', status: 'complete' });
      await send({ type: 'status', step: 'ffn-fetch', status: 'complete' });

      // Send unranked results immediately by platform
      if (ao3Results.length > 0) {
        await send({ type: 'results', platform: 'ao3', results: ao3Results });
      }
      if (ffnResults.length > 0) {
        await send({ type: 'results', platform: 'ffn', results: ffnResults });
      }

      // Stage 4: Ranking (already done by backend's AI ranker)
      await send({ type: 'status', step: 'ranking', status: 'active' });
      await delay(300);

      const ranked = [...ficResults].sort(
        (a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1)
      );

      await send({ type: 'status', step: 'ranking', status: 'complete' });
      await send({ type: 'ranked', results: ranked });
      await send({ type: 'done', totalMs: Date.now() - startTime });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      console.error('[FicFinder Search]', message);
      await send({ type: 'error', message });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
