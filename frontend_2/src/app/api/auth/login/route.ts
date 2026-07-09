import { NextRequest, NextResponse } from "next/server";

import type { LoginResponse } from "@/lib/contracts";
import { backendJson, errorToResponse } from "@/lib/server/backend";

export const dynamic = "force-dynamic";

// Exchange a Google ID token for a FicFinder JWT. The browser obtains the
// id_token via Google Identity Services, posts it here, and we forward it to the
// backend's /auth/login. We return the { token, user } as-is; the client stores
// the token (see useAuth) and sends it as a Bearer on subsequent calls.
export async function POST(req: NextRequest) {
  let id_token: unknown;
  try {
    ({ id_token } = await req.json());
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof id_token !== "string" || !id_token) {
    return NextResponse.json({ detail: "id_token is required" }, { status: 400 });
  }

  try {
    const data = await backendJson<LoginResponse>("/auth/login", {
      method: "POST",
      json: { id_token },
    });
    return NextResponse.json(data);
  } catch (err) {
    // Sanitize: the backend interpolates raw Google/JWT library exception text
    // into `detail` on auth failures — don't relay that to the browser.
    const { status, body } = errorToResponse(err, { sanitize: true });
    return NextResponse.json(body, { status });
  }
}
