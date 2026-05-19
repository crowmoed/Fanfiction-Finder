import { NextRequest } from 'next/server';
import type { FicResult } from '@/lib/schema/types';
import { MOCK_RESULTS } from '@/lib/mock-data';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

function fallbackFic(platform: FicResult['platform'], id: string): FicResult {
  const decodedId = decodeURIComponent(id);
  return (
    MOCK_RESULTS.find((fic) => fic.platform === platform && (fic.id === decodedId || fic.url === decodedId)) ??
    {
      ...MOCK_RESULTS[0],
      id: decodedId,
      platform,
      url: decodedId.startsWith('http') ? decodedId : MOCK_RESULTS[0].url,
    }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string; id: string }> },
) {
  const { platform, id } = await params;
  const normalizedPlatform = platform === 'ffn' || platform === 'wattpad' ? platform : 'ao3';
  const authHeader = req.headers.get('Authorization');

  try {
    const response = await fetch(`${BACKEND_URL}/fic/${encodeURIComponent(normalizedPlatform)}/${encodeURIComponent(id)}`, {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      return Response.json(await response.json());
    }
  } catch {
    // Cristiano will add the backend endpoint; mock keeps the page renderable now.
  }

  return Response.json(fallbackFic(normalizedPlatform, id));
}
