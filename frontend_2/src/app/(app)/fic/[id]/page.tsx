"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Fic } from "@/lib/contracts";
import { getFic } from "@/lib/results/ficStore";
import { FicDetail } from "@/components/FicDetail";
import { FicDetailSkeleton } from "@/components/FicDetailSkeleton";
import { Icon } from "@/components/Icon";
import "@/components/fic-detail.css";

/**
 * /fic/[id] — the on-demand generated story page.
 *
 * Generated client-side from the indexed fic we already cached in the browser
 * when the user opened it (see ficStore). A real route — back-button, refresh,
 * and a dedicated URL all work — but local-only by design (not a shareable
 * public link). On a cold direct visit with nothing cached, we show a clear
 * fallback instead of an error.
 *
 * Back link: no store currently records which search a fic was opened from
 * (ficStore keys by fic id only; searchRegistry keys by query, not by fic) —
 * so "Back to {query}" isn't knowable yet, and this renders plain "Back". It
 * uses router.back() rather than a hardcoded link to "/" so it actually
 * returns to wherever the reader came from (results, board, saved, a card's
 * quick view), falling back to home only when there's no history to unwind
 * (a fic opened directly in a new tab).
 */
export default function FicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  // null = not found in this browser; undefined = still resolving on mount.
  const [fic, setFic] = useState<Fic | null | undefined>(undefined);

  useEffect(() => {
    setFic(getFic(id));
  }, [id]);

  // Reflect the opened story in the tab title (client page — no static metadata).
  useEffect(() => {
    if (fic) document.title = `${fic.title} · Ficwell`;
  }, [fic]);

  if (fic === undefined) {
    return (
      <div className="page-wide">
        <FicDetailSkeleton />
      </div>
    );
  }

  if (fic === null) {
    return (
      <div className="empty-state rise-in">
        <span className="empty-state-icon">
          <Icon name="book" size={22} />
        </span>
        <h1 className="empty-state-title">Story not available</h1>
        <p>
          This page is generated from a story you opened in this browser. It
          isn&apos;t cached here, so open it from your search results to view it.
        </p>
        <div className="empty-state-actions">
          <Link href="/" className="btn btn-primary">
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  return (
    // The wrapper does a quiet overall fade (fade-in) while FicDetail owns its
    // OWN top-to-bottom rise-in cascade (masthead → rule → summary → tags →
    // ledger) — so the page settles top-down instead of popping as one block,
    // and the two don't compound into a double-rise. FicDetail is reused
    // verbatim by the quick-view modal (which plays its own enter-pop), so the
    // cascade lives in FicDetail, not here. Reduced-motion drops both to a plain
    // fade (globals.css §18/§19).
    <div className="page-wide stack fade-in" style={{ gap: "1.5rem" }}>
      <div className="rise-in" style={{ "--rise-delay": "0ms" } as React.CSSProperties}>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="linklike muted fic-back-link"
        >
          <Icon name="chevron-left" size={13} />
          Back
        </button>
      </div>
      <FicDetail fic={fic} />
    </div>
  );
}
