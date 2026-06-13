import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

// Server-side only — never exposed to the browser. Forwarded as X-Admin-Token so the
// backend's optional admin gate (ADMIN_API_TOKEN) is satisfied. When unset, no header
// is sent and the backend stays in its open-by-default mode, so nothing breaks.
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN ?? '';

export async function GET() {
  try {
    const headers: Record<string, string> = {};
    if (ADMIN_API_TOKEN) headers['X-Admin-Token'] = ADMIN_API_TOKEN;
    const resp = await fetch(`${BACKEND_URL}/admin/stats`, { cache: 'no-store', headers });
    if (!resp.ok) throw new Error(`Backend returned ${resp.status}`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
