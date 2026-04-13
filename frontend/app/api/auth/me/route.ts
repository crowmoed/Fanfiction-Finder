import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get('Authorization');
  console.log('[API/auth/me] Authorization header present:', !!authHeader);

  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  console.log('[API/auth/me] Forwarding to:', `${BACKEND_URL}/auth/me`);

  try {
    const backendRes = await fetch(`${BACKEND_URL}/auth/me`, { headers });

    const data = await backendRes.text();
    console.log('[API/auth/me] Backend response:', backendRes.status, backendRes.statusText);
    console.log('[API/auth/me] Backend body (first 200 chars):', data.slice(0, 200));

    return new Response(data, {
      status: backendRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API/auth/me] Fetch to backend failed:', err);
    return new Response(JSON.stringify({ error: 'Backend unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
