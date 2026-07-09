"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearHistory, removeHistory, useSearchHistory } from "@/lib/client/history";
import { hasCachedResults } from "@/lib/results/resultsCache";
import { resultsHref } from "@/lib/results/searchUrl";
import { absoluteDateTime, relativeTime } from "@/lib/client/relativeTime";
import { useToast } from "@/components/Toast";
import { useCountUp, useLeave } from "@/lib/client/motion";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { Menu, MenuItem } from "@/components/sidebar/Menu";
import "./register.css";

/**
 * Reading-log register: a page-wide ledger, not a card floating in a void
 * (REDESIGN-SPEC §6.3). Owns its own page head (kicker + display title + folio
 * count + rule) because the folio needs the live client store — a
 * server-rendered head would show a stale or empty count on first paint.
 */
export function HistoryPanel({ onNavigate }: { onNavigate?: () => void }) {
  const history = useSearchHistory();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Derived during render (not via an effect that forces a second paint). The
  // localStorage read is SSR-safe (returns false on the server); this value is
  // only rendered in the mounted/client branch below, so there's no mismatch.
  const cachedKeys = useMemo(() => {
    const next = new Set<string>();
    for (const h of history) {
      if (hasCachedResults({ q: h.q, fandom: h.fandom, strict: h.strict })) {
        next.add(h.id);
      }
    }
    return next;
  }, [history]);

  const onClear = () => {
    // Irreversible bulk wipe — confirm first (mirrors the care given to the
    // per-row destructive "Remove" action).
    if (window.confirm("Clear your entire search history? This can't be undone.")) {
      clearHistory();
    }
  };

  const count = mounted ? history.length : null;
  const shownCount = useCountUp(count ?? 0, { enabled: mounted, duration: 400 });

  return (
    <div className="stack page-wide" style={{ gap: "1.5rem" }}>
      {/* Register head cascades in top→bottom on page load. */}
      <div className="register-head">
        <span
          className="eyebrow rise-in"
          style={{ "--rise-delay": "0ms" } as React.CSSProperties}
        >
          Search history
        </span>
        <h1
          className="t-display-title t-display-title--page rise-in"
          style={{ "--rise-delay": "40ms" } as React.CSSProperties}
        >
          Your reading log
        </h1>
        <p
          className="register-folio rise-in"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          {count === null ? (
            <Skeleton width="5rem" height="0.9em" />
          ) : (
            <>
              {shownCount} search{count === 1 ? "" : "es"}
              {count > 0 && (
                <>
                  {" · "}
                  <button className="folio-action" onClick={onClear}>
                    Clear log
                  </button>
                </>
              )}
            </>
          )}
        </p>
        <hr
          className="rule-strong rule-draw"
          style={{ "--rise-delay": "120ms" } as React.CSSProperties}
        />
      </div>

      {!mounted ? (
        <HistoryListSkeleton rows={4} />
      ) : history.length === 0 ? (
        <div className="empty-state rise-in">
          <span className="empty-state-icon">
            <Icon name="clock" size={22} />
          </span>
          <h2 className="empty-state-title">No searches yet</h2>
          <p>Searches you run show up here, stored only in this browser.</p>
        </div>
      ) : (
        <ul className="ledger">
          {history.map((h, i) => {
            const cached = cachedKeys.has(h.id);
            return (
              <HistoryRow
                key={h.id}
                index={i}
                q={h.q}
                fandom={h.fandom}
                strict={h.strict}
                resultCount={h.resultCount}
                cached={cached}
                at={h.at}
                href={resultsHref(h)}
                onNavigate={onNavigate}
                onRemove={() => removeHistory(h.id)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}

function HistoryRow({
  index,
  q,
  fandom,
  strict,
  resultCount,
  cached,
  at,
  href,
  onNavigate,
  onRemove,
}: {
  index: number;
  q: string;
  fandom: string;
  strict: boolean;
  resultCount: number | null;
  cached: boolean;
  at: number;
  href: string;
  onNavigate?: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const rowRef = useRef<HTMLLIElement>(null);
  const toast = useToast();
  // Remove plays a brief exit (mirrors Toast/Modal) before the row leaves the
  // store, instead of vanishing instantly. Reduced motion removes immediately.
  const { leaving, startLeave } = useLeave(onRemove);

  const copyLink = async () => {
    try {
      const url = new URL(href, window.location.origin).toString();
      await navigator.clipboard?.writeText(url);
      toast("Link copied to clipboard.");
    } catch {
      toast("Couldn't copy the link.", "error");
    }
  };

  return (
    // Staggered ledger entrance: rows settle in on the skeleton -> content swap
    // (and on each visit to this page). Rows are keyed by stable id, so removing
    // one never replays the survivors; the stagger caps at ~8 rows. Reduced
    // motion collapses .rise-in to a plain fade (globals.css §18).
    <li
      className={`ledger-row rise-in${leaving ? " ledger-row--leaving" : ""}`}
      ref={rowRef}
      style={{ "--rise-delay": `${Math.min(index, 8) * 30}ms` } as React.CSSProperties}
    >
      <div className="ledger-cell ledger-cell--query">
        <Link href={href} onClick={onNavigate} className="ledger-query-link">
          {q}
        </Link>
        <span className="ledger-cell--meta">
          {cached ? "opens instantly" : "re-runs on open"}
        </span>
      </div>
      <div className="ledger-meta-line">
        <span className="ledger-cell ledger-cell--fandom">
          {fandom}
          {strict && " · strict"}
        </span>
        <span className="ledger-cell ledger-cell--meta">
          {resultCount != null ? `${resultCount} results` : "—"}
        </span>
        <span className="ledger-cell ledger-cell--when">
          <time dateTime={new Date(at).toISOString()} title={absoluteDateTime(at)}>
            {relativeTime(at)}
          </time>
        </span>
      </div>
      <div className="ledger-cell ledger-cell--actions">
        <Menu
          label={`Actions for search: ${q}`}
          placement="bottom-end"
          triggerClassName="icon-btn"
          trigger={<Icon name="dots" size={16} />}
        >
          <MenuItem onSelect={() => router.push(href)}>Open</MenuItem>
          <MenuItem onSelect={copyLink}>Copy link</MenuItem>
          <MenuItem danger onSelect={startLeave}>
            Remove
          </MenuItem>
        </Menu>
      </div>
    </li>
  );
}

/** Placeholder mirroring the ledger's row silhouette (F195). */
function HistoryListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="ledger" aria-busy="true" aria-label="Loading search history">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="ledger-row rise-in"
          style={{ "--rise-delay": `${i * 30}ms` } as React.CSSProperties}
        >
          <div className="ledger-cell ledger-cell--query">
            <Skeleton width="14rem" height="1em" />
          </div>
          <div className="ledger-cell">
            <Skeleton width="6rem" height="0.8em" />
          </div>
          <div className="ledger-cell">
            <Skeleton width="4rem" height="0.8em" />
          </div>
          <div className="ledger-cell ledger-cell--when">
            <Skeleton width="3rem" height="0.8em" />
          </div>
          <div className="ledger-cell ledger-cell--actions">
            <Skeleton width="1.6rem" height="1.6rem" radius="var(--r-sm)" />
          </div>
        </li>
      ))}
    </ul>
  );
}
