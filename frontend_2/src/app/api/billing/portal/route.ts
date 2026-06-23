import { NextRequest } from "next/server";

import { forwardAuthed } from "@/lib/server/forward";

export const dynamic = "force-dynamic";

// POST /auth/billing-portal — create a Stripe Billing Portal session, returns { url }.
export async function POST(req: NextRequest) {
  return forwardAuthed<{ url: string }>(req, "/auth/billing-portal", {
    method: "POST",
  });
}
