import { NextResponse } from "next/server";

import type { FandomsResponse } from "@/lib/contracts";
import { backendJson, errorToResponse } from "@/lib/server/backend";

// Fandom availability changes only when the indexer runs (manual, infrequent),
// so this is heavily cacheable — but caching happens at the FETCH level (Next's
// data cache, 5 min) plus a browser/CDN cache-control header, NOT by statically
// prerendering the route at build. force-dynamic keeps this a request-time proxy:
// a segment-level `revalidate` made Next bake the fandom list (and any build-time
// backend error) into the deployment, which 404'd/froze when the backend wasn't
// reachable during the build.
const REVALIDATE_SECONDS = 300;
export const dynamic = "force-dynamic";

// Plain proxy: GET /fandoms.
export async function GET() {
  try {
    const data = await backendJson<FandomsResponse>("/fandoms", {
      revalidate: REVALIDATE_SECONDS,
      retries: 2,
      dedupe: true,
    });
    return NextResponse.json(data, {
      headers: {
        "cache-control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const { status, body } = errorToResponse(err);
    return NextResponse.json(body, { status });
  }
}
