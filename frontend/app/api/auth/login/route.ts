import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log('[API/auth/login] Received login request, id_token present:', !!body.id_token, 'id_token length:', body.id_token?.length ?? 0);
  console.log('[API/auth/login] Forwarding to:', `${BACKEND_URL}/auth/login`);

  try {
    const backendRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await backendRes.text();
    console.log('[API/auth/login] Backend response:', backendRes.status, backendRes.statusText);
    console.log('[API/auth/login] Backend body (first 200 chars):', data.slice(0, 200));

    return new Response(data, {
      status: backendRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API/auth/login] Fetch to backend failed:', err);
    return new Response(JSON.stringify({ error: 'Backend unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
