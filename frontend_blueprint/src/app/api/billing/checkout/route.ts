import { NextRequest } from "next/server";

import { forwardAuthed } from "@/lib/server/forward";

export const dynamic = "force-dynamic";

// POST /auth/checkout — create a Stripe Checkout session, returns { url }.
export async function POST(req: NextRequest) {
  return forwardAuthed<{ url: string }>(req, "/auth/checkout", { method: "POST" });
}
