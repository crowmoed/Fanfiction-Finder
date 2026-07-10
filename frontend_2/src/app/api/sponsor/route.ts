import { NextRequest, NextResponse } from "next/server";

import { backendJson, errorToResponse } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

// POST /api/sponsor → backend POST /request.
//
// Free "request a fandom": records the request and emails the operator. Anonymous,
// no payment, no login. Returns { ok }.
export async function POST(req: NextRequest) {
  let fandom_name: unknown;
  let notes: unknown;
  let email: unknown;
  try {
    ({ fandom_name, notes, email } = await req.json());
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof fandom_name !== "string" || !fandom_name.trim()) {
    return NextResponse.json({ detail: "Fandom name is required." }, { status: 400 });
  }

  try {
    const data = await backendJson<{ ok: boolean }>("/request", {
      method: "POST",
      json: {
        fandom_name,
        notes: typeof notes === "string" ? notes : "",
        email: typeof email === "string" ? email : "",
      },
    });
    return NextResponse.json(data);
  } catch (err) {
    // Sanitize: don't leak backend/library internals to the browser.
    const { status, body } = errorToResponse(err, { sanitize: true });
    return NextResponse.json(body, { status });
  }
}
