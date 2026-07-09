"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  restoreSearch,
  unsaveSearch,
  useSavedSearches,
  type SavedSearch,
} from "@/lib/results/savedSearches";
import { resultsHref } from "@/lib/results/searchUrl";
import { absoluteDateTime, relativeTime } from "@/lib/client/relativeTime";
import { useToast } from "@/components/Toast";
import { useCountUp } from "@/lib/client/motion";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import "./register.css";

/**
 * Followed-searches register: a page-wide ledger, not a card floating in a
 * void (REDESIGN-SPEC §6.3). Owns its own page head (kicker + display title +
 * folio count + rule) because the folio needs the live client store — a
 * server-rendered head would show a stale or empty count on first paint.
 */
export function SavedPanel({ onNavigate }: { onNavigate?: () => void }) {
  const saved = useSavedSearches();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = mounted ? saved.length : null;
  // The folio count ticks up once the store resolves (0→N). Reduced motion /
  // repeat renders show the final number immediately (useCountUp handles it).
  const shownCount = useCountUp(count ?? 0, { enabled: mounted, duration: 400 });

  return (
    <div className="stack page-wide" style={{ gap: "1.5rem" }}>
      {/* Register head cascades in top→bottom on page load. */}
      <div className="register-head">
        <span
          className="eyebrow rise-in"
          style={{ "--rise-delay": "0ms" } as React.CSSProperties}
        >
          Followed searches
        </span>
        <h1
          className="t-display-title t-display-title--page rise-in"
          style={{ "--rise-delay": "40ms" } as React.CSSProperties}
        >
          Your saved searches
        </h1>
        <p
          className="register-folio rise-in"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          {count === null ? (
            <Skeleton width="5rem" height="0.9em" />
          ) : (
            `${shownCount} followed search${count === 1 ? "" : "es"}`
          )}
        </p>
        <hr
          className="rule-strong rule-draw"
          style={{ "--rise-delay": "120ms" } as React.CSSProperties}
        />
      </div>

      {!mounted ? (
        <SavedListSkeleton rows={4} />
      ) : saved.length === 0 ? (
        <div className="empty-state rise-in">
          <span className="empty-state-icon">
            <Icon name="star" size={22} />
          </span>
          <h2 className="empty-state-title">Follow a search to track it</h2>
          <p>
            Run a search and choose “Follow search”. Ficwell will flag new
            results the next time you check back.
          </p>
        </div>
      ) : (
        <ul className="ledger">
          {saved.map((s, i) => (
            <SavedRow key={s.key} index={i} saved={s} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedRow({
  index,
  saved,
  onNavigate,
}: {
  index: number;
  saved: SavedSearch;
  onNavigate?: () => void;
}) {
  const toast = useToast();
  const hasNew = saved.newIds.length > 0;
  // Stamp the badge in only on the transition into "has new" — not on every
  // mount (a page revisit where it was already flagged shouldn't re-animate).
  const prevHasNew = useRef(hasNew);
  const justArrived = hasNew && !prevHasNew.current;
  useEffect(() => {
    prevHasNew.current = hasNew;
  }, [hasNew]);

  // Unfollow stays a visible button (a single action behind a kebab menu is a
  // discoverability regression) but is reversible: `restoreSearch` puts the
  // exact same record back — badge, follow date, seen-ids and all — rather than
  // re-saving fresh, and the toast's Undo action calls it (REDESIGN-SPEC §6.3).
  const unfollow = () => {
    unsaveSearch(saved.params);
    toast(`Stopped following “${saved.params.q}”.`, "info", {
      label: "Undo",
      onClick: () => restoreSearch(saved),
    });
  };

  return (
    // Staggered ledger entrance (matches History): rows settle in on load, keyed
    // by stable key so Unfollow never replays the survivors. Reduced motion ->
    // plain fade (globals.css §18).
    <li
      className="ledger-row ledger-row--4col rise-in"
      style={{ "--rise-delay": `${Math.min(index, 8) * 30}ms` } as React.CSSProperties}
    >
      <div className="ledger-cell ledger-cell--query">
        <Link
          href={resultsHref(saved.params)}
          onClick={onNavigate}
          className="ledger-query-link"
        >
          {saved.params.q}
        </Link>
        {hasNew ? (
          <span className={`badge-new${justArrived ? " stamp-in" : ""}`}>
            {saved.newIds.length} new
          </span>
        ) : (
          <span className="ledger-cell--meta">No new results</span>
        )}
      </div>
      <div className="ledger-meta-line">
        <span className="ledger-cell ledger-cell--fandom">
          {saved.params.fandom}
          {saved.params.strict && " · strict"}
        </span>
        <span className="ledger-cell ledger-cell--when">
          <time
            dateTime={new Date(saved.lastCheckedAt).toISOString()}
            title={absoluteDateTime(saved.lastCheckedAt)}
          >
            {relativeTime(saved.lastCheckedAt)}
          </time>
        </span>
      </div>
      <div className="ledger-cell ledger-cell--actions">
        <button className="btn-sm btn-danger-ghost" onClick={unfollow}>
          Unfollow
        </button>
      </div>
    </li>
  );
}

/** Placeholder mirroring the ledger's row silhouette (F195). */
function SavedListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="ledger" aria-busy="true" aria-label="Loading followed searches">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="ledger-row ledger-row--4col rise-in"
          style={{ "--rise-delay": `${i * 30}ms` } as React.CSSProperties}
        >
          <div className="ledger-cell ledger-cell--query">
            <Skeleton width="14rem" height="1em" />
          </div>
          <div className="ledger-cell">
            <Skeleton width="6rem" height="0.8em" />
          </div>
          <div className="ledger-cell ledger-cell--when">
            <Skeleton width="3rem" height="0.8em" />
          </div>
          <div className="ledger-cell ledger-cell--actions">
            <Skeleton width="4.5rem" height="1.6em" radius="var(--r-sm)" />
          </div>
        </li>
      ))}
    </ul>
  );
}
