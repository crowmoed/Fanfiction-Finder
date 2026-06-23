import { NextRequest } from "next/server";

import {
  PIPELINE_STAGES,
  type Fic,
  type SearchStreamEvent,
} from "@/lib/contracts";
import { BackendCallError, backendFetch } from "@/lib/server/backend";
import { bearerFrom } from "@/lib/server/forward";

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
  const limit = url.searchParams.get("limit") ?? "20";
  const strict = url.searchParams.get("strict") ?? "false";
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
        const backendQs = new URLSearchParams({ q, fandom, limit, strict });
        const res = await backendFetch(`/search?${backendQs.toString()}`, {
          token,
          timeoutMs: 115_000,
          signal: upstreamController.signal,
        });
        const fics = (await res.json()) as Fic[];

        // Mark every stage done before delivering the result.
        for (const stage of PIPELINE_STAGES) {
          send({ type: "stage", stage, status: "done", at: Date.now() });
        }
        send({
          type: "result",
          fics,
          count: fics.length,
          elapsed_ms: Date.now() - startedAt,
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
