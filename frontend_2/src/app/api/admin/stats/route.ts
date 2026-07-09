import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { backendJson, errorToResponse } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

/** Constant-time string compare (avoids leaking the token via timing). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// GET /admin/stats — an operator-only proxy of internal DB stats.
//
// This route forwards a server-held ADMIN_API_TOKEN to the backend, so it must
// NOT be open to the browser: previously any anonymous visitor who hit this URL
// got internal ops data. It now requires the caller to present the same operator
// token (x-admin-token header, or a Bearer token). Unauthorized callers get a
// 404 — not a 403 — so the endpoint's existence isn't even confirmed. When no
// ADMIN_API_TOKEN is configured there's nothing to authorize against, so it's
// treated as not found.
export async function GET(req: NextRequest) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const notFound = () => NextResponse.json({ detail: "Not found" }, { status: 404 });

  if (!adminToken) return notFound();

  const bearer = req.headers.get("authorization");
  const presented =
    req.headers.get("x-admin-token") ??
    (bearer?.startsWith("Bearer ") ? bearer.slice("Bearer ".length).trim() : null);

  if (!presented || !safeEqual(presented, adminToken)) return notFound();

  try {
    const data = await backendJson<Record<string, unknown>>("/admin/stats", {
      headers: { "x-admin-token": adminToken },
    });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = errorToResponse(err, { sanitize: true });
    return NextResponse.json(body, { status });
  }
}
