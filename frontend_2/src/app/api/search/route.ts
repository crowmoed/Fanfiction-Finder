import { NextRequest } from "next/server";

import {
  PIPELINE_STAGES,
  type Fic,
  type SearchStreamEvent,
  type SearchWithVariantsResponse,
} from "@/lib/contracts";
import { BackendCallError, backendFetch } from "@/lib/server/backend";
import { bearerFrom } from "@/lib/server/forward";

// The backend stores and returns platforms lowercased ("ao3" / "ffn" /
// "wattpad") because the currently-deployed old frontend depends on that exact
// form. THIS frontend's contract is the display casing ("AO3" / "FFN" /
// "Wattpad") — slice ordering, ficId prefixes, badges, and favicon links all
// key off it — so the proxy is the seam that canonicalizes. When the old
// frontend is retired, move this into the backend response and delete it here.
const PLATFORM_DISPLAY: Record<string, string> = {
  ao3: "AO3",
  ffn: "FFN",
  wattpad: "Wattpad",
};

function canonicalFic(fic: Fic): Fic {
  const display = PLATFORM_DISPLAY[fic.platform?.toLowerCase?.() ?? ""];
  return display && display !== fic.platform ? { ...fic, platform: display } : fic;
}

export const dynamic = "force-dynamic";
// The backend search runs a multi-stage LLM + vector pipeline and can take many
// seconds. Allow this route to run long.
export const maxDuration = 120;

/**
 * GET /api/search → an SSE stream.
 *
 * The backend's GET /search is a single slow request that returns Fic[]. We wrap
 * it in Server-Sent Events so the UI can show per-stage progress and the design
 * layer can choreograph the loading scene to pipeline events instead of a fake
 * spinner.
 *
 * Protocol (see lib/contracts SearchStreamEvent):
 *   data: { type: "stage", stage, status }   — repeated as the pipeline advances
 *   data: { type: "result", fics, count }     — terminal success
 *   data: { type: "error", message, ... }      — terminal failure
 *
 * The backend runs the whole pipeline (enhance → embed → retrieve → rank) in one
 * call and doesn't stream its own stage events, so this route marks all stages
 * active up front and all done when the real result arrives. There is NO
 * artificial pacing — the stream adds zero latency over the raw backend call;
 * the search resolves as fast as the backend responds. If the backend later
 * streams real per-stage events, only this file changes — the wire protocol the
 * client animates to stays identical.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const fandom = url.searchParams.get("fandom") ?? "";
  // No default cap — when the client doesn't ask for a limit, the backend
  // returns every ranked candidate and the user sifts the full ranked set.
  const limit = url.searchParams.get("limit");
  const strict = url.searchParams.get("strict") ?? "false";
  const includeVariants = url.searchParams.get("include_variants") === "true";
  const token = bearerFrom(req);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: SearchStreamEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      // Mark every stage active up front (the backend runs the whole pipeline
      // in one call, so they're genuinely all in flight), then mark them done
      // when the real result arrives. No artificial pacing — the stream adds
      // zero latency over the raw backend call.
      for (const stage of PIPELINE_STAGES) {
        send({ type: "stage", stage, status: "active", at: Date.now() });
      }

      // Abort the upstream call if the client disconnects.
      const upstreamController = new AbortController();
      const onAbort = () => upstreamController.abort();
      req.signal.addEventListener("abort", onAbort);

      const startedAt = Date.now();
      try {
        const backendQs = new URLSearchParams({ q, fandom, strict });
        if (limit) backendQs.set("limit", limit);
        if (includeVariants) backendQs.set("include_variants", "true");
        const res = await backendFetch(`/search?${backendQs.toString()}`, {
          token,
          timeoutMs: 115_000,
          signal: upstreamController.signal,
        });
        // Capture the correlation id before consuming the body, so a successful
        // search carries it for support debugging the same way errors do.
        const requestId = res.headers.get("x-request-id") ?? undefined;
        // Plain searches return a bare Fic[]; variant searches return
        // { results, variants }. Discriminate on the shape, not on our own
        // request flag, so a backend that ignores the flag degrades cleanly.
        const payload = (await res.json()) as Fic[] | SearchWithVariantsResponse;
        const fics = (Array.isArray(payload) ? payload : payload.results).map(canonicalFic);
        const variants = Array.isArray(payload)
          ? undefined
          : payload.variants?.map((v) => ({ ...v, fics: v.fics.map(canonicalFic) }));

        // Mark every stage done before delivering the result.
        for (const stage of PIPELINE_STAGES) {
          send({ type: "stage", stage, status: "done", at: Date.now() });
        }
        send({
          type: "result",
          fics,
          count: fics.length,
          elapsed_ms: Date.now() - startedAt,
          request_id: requestId,
          ...(variants ? { variants } : {}),
        });
      } catch (err) {
        if (err instanceof BackendCallError) {
          send({
            type: "error",
            message: err.detail,
            status: err.status,
            request_id: err.requestId,
            retryable: err.retryable,
          });
        } else if (err instanceof Error && err.name === "AbortError") {
          // Client went away — nothing to report.
        } else {
          send({
            type: "error",
            message: "Unexpected error while searching",
            retryable: true,
          });
        }
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
