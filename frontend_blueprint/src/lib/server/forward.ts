import "server-only";

import { NextRequest, NextResponse } from "next/server";

import type { BackendError } from "@/lib/contracts";
import { backendJson, errorToResponse } from "@/lib/server/backend";

/** Pull the raw Bearer token off an incoming request (or null). */
export function bearerFrom(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

/**
 * Forward an authenticated GET/POST to the backend, passing the caller's Bearer
 * token through, and relay the JSON response (or normalized error). This keeps
 * every authed proxy route to a couple of lines.
 */
export async function forwardAuthed<T>(
  req: NextRequest,
  path: string,
  init: { method?: "GET" | "POST"; json?: unknown } = {}
): Promise<NextResponse> {
  const token = bearerFrom(req);
  if (!token) {
    const body: BackendError = { detail: "Missing or malformed Authorization header" };
    return NextResponse.json(body, { status: 401 });
  }
  const method = init.method ?? "GET";
  try {
    const data = await backendJson<T>(path, {
      method,
      json: init.json,
      token,
      // Retry only idempotent GETs (e.g. /auth/me). Never retry POSTs (billing).
      retries: method === "GET" ? 2 : 0,
    });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
