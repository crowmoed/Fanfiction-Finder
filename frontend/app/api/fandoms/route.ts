import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/fandoms`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`Backend ${resp.status}`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ fandoms: [] });
  }
}
