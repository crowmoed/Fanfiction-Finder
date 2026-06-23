"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Fic } from "@/lib/contracts";
import { getFic } from "@/lib/results/ficStore";
import { FicDetail } from "@/components/FicDetail";

/**
 * /fic/[id] — the on-demand generated story page.
 *
 * Generated client-side from the indexed fic we already cached in the browser
 * when the user opened it (see ficStore). A real route — back-button, refresh,
 * and a dedicated URL all work — but local-only by design (not a shareable
 * public link). On a cold direct visit with nothing cached, we show a clear
 * fallback instead of an error.
 */
export default function FicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // null = not found in this browser; undefined = still resolving on mount.
  const [fic, setFic] = useState<Fic | null | undefined>(undefined);

  useEffect(() => {
    setFic(getFic(id));
  }, [id]);

  if (fic === undefined) {
    return <p className="muted">Loading…</p>;
  }

  if (fic === null) {
    return (
      <div className="stack" style={{ gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Story not available</h1>
        <p className="muted" style={{ margin: 0 }}>
          This page is generated from a story you opened in this browser. It
          isn&apos;t cached here — open it from your search results to view it.
        </p>
        <div>
          <Link href="/">← Back to search</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "1.5rem" }}>
      <div>
        <Link href="/" className="muted">
          ← Back
        </Link>
      </div>
      <FicDetail fic={fic} />
    </div>
  );
}
