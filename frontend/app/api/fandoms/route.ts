import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000';

export async function GET() {
  const resp = await fetch(`${BACKEND_URL}/fandoms`, { cache: 'no-store' });
  const data = await resp.json();
  return NextResponse.json(data);
}
