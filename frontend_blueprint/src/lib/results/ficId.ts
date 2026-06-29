/**
 * ficId.ts — derive a stable, URL-safe id for a fic from its source URL.
 *
 * The id is deterministic (same fic → same id, always), so a fic always maps to
 * the same /fic/[id] route. It encodes the platform as a readable prefix and a
 * short hash of the canonical URL. Dependency-free so it runs on server + client.
 */
import type { Fic, Platform } from "@/lib/contracts";

const PLATFORM_PREFIX: Record<string, string> = {
  AO3: "ao3",
  FFN: "ffn",
  Wattpad: "wp",
};

/** Small, stable, non-crypto hash (djb2) → base36. Fine for id slugs. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  // >>> 0 forces unsigned 32-bit.
  return (h >>> 0).toString(36);
}

function prefixFor(platform: Platform): string {
  return PLATFORM_PREFIX[platform] ?? "fic";
}

/** Deterministic id for a fic, e.g. "ao3-9f3a2b". */
export function ficId(fic: Pick<Fic, "platform" | "url">): string {
  return `${prefixFor(fic.platform)}-${hash(fic.url.trim())}`;
}
