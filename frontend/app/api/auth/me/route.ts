import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {};
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const backendRes = await fetch(`${BACKEND_URL}/auth/me`, { headers });

  const data = await backendRes.text();

  return new Response(data, {
    status: backendRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
