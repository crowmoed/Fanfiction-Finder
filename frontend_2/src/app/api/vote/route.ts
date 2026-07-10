import { NextRequest, NextResponse } from "next/server";

import type { VoteState } from "@/lib/contracts";
import { backendJson, errorToResponse } from "@/lib/server/backend";
import { bearerFrom, forwardAuthed } from "@/lib/server/forward";

export const dynamic = "force-dynamic";

// GET /api/vote → backend GET /vote.
// Optional auth: forward the token if present so the response carries the
// caller's own vote; anonymous callers still get the ballot + tallies.
export async function GET(req: NextRequest) {
  const token = bearerFrom(req);
  try {
    const data = await backendJson<VoteState>("/vote", { token });
    return NextResponse.json(data);
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}

// POST /api/vote → backend POST /vote. Sign-in required (forwardAuthed 401s
// without a Bearer token) — voting is the one place login is mandatory.
export async function POST(req: NextRequest) {
  let fandom: unknown;
  try {
    ({ fandom } = await req.json());
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof fandom !== "string" || !fandom) {
    return NextResponse.json({ detail: "fandom is required" }, { status: 400 });
  }
  return forwardAuthed<VoteState>(req, "/vote", { method: "POST", json: { fandom } });
}
