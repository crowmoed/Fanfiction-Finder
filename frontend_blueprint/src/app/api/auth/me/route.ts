import { NextRequest } from "next/server";

import type { User } from "@/lib/contracts";
import { forwardAuthed } from "@/lib/server/forward";

export const dynamic = "force-dynamic";

// GET /auth/me — current user profile (tier, usage). Bearer required.
export async function GET(req: NextRequest) {
  return forwardAuthed<User>(req, "/auth/me");
}
