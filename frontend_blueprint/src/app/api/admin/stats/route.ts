import { NextResponse } from "next/server";

import { backendJson, errorToResponse } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

// GET /admin/stats — proxied with the server-held ADMIN_API_TOKEN (never sent to
// the browser). If the backend has ADMIN_API_TOKEN set, it's required; if not,
// the header is harmless.
export async function GET() {
  try {
    const adminToken = process.env.ADMIN_API_TOKEN;
    const data = await backendJson<Record<string, unknown>>("/admin/stats", {
      headers: adminToken ? { "x-admin-token": adminToken } : undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
