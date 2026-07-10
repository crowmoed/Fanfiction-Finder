import { NextRequest, NextResponse } from "next/server";

import { backendJson, errorToResponse } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

// POST /api/sponsor → backend POST /checkout.
//
// Starts a one-time "sponsor a fandom" Stripe Checkout. Anonymous: no login and
// no Bearer token — Stripe collects the buyer's email itself. Returns { url }.
export async function POST(req: NextRequest) {
  let fandom_name: unknown;
  let notes: unknown;
  try {
    ({ fandom_name, notes } = await req.json());
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof fandom_name !== "string" || !fandom_name.trim()) {
    return NextResponse.json({ detail: "Fandom name is required." }, { status: 400 });
  }

  try {
    const data = await backendJson<{ url: string }>("/checkout", {
      method: "POST",
      json: { fandom_name, notes: typeof notes === "string" ? notes : "" },
    });
    return NextResponse.json(data);
  } catch (err) {
    // Sanitize: Stripe error text can leak library internals into `detail`.
    const { status, body } = errorToResponse(err, { sanitize: true });
    return NextResponse.json(body, { status });
  }
}
