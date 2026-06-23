"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { clearHistory, useSearchHistory } from "@/lib/client/history";
import { hasCachedResults } from "@/lib/results/resultsCache";
import { HistoryListSkeleton } from "@/components/ResultsSkeleton";

function resultsHref(h: { q: string; fandom: string; strict: boolean }): string {
  return `/results?${new URLSearchParams({
    q: h.q,
    fandom: h.fandom,
    strict: String(h.strict),
  }).toString()}`;
}

/** Reading-log panel (shown in the History modal). */
export function HistoryPanel({ onNavigate }: { onNavigate?: () => void }) {
  const history = useSearchHistory();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [cachedKeys, setCachedKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set<string>();
    for (const h of history) {
      if (hasCachedResults({ q: h.q, fandom: h.fandom, strict: h.strict })) {
        next.add(h.id);
      }
    }
    setCachedKeys(next);
  }, [history]);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      {mounted && history.length > 0 && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button onClick={clearHistory}>Clear log</button>
        </div>
      )}

      {!mounted ? (
        <HistoryListSkeleton rows={4} />
      ) : history.length === 0 ? (
        <p className="muted">No searches yet. Your search history lives only in this browser.</p>
      ) : (
        <ul className="stack" style={{ gap: "0.5rem", margin: 0, padding: 0, listStyle: "none" }}>
          {history.map((h) => {
            const cached = cachedKeys.has(h.id);
            return (
              <li key={h.id} className="card row" style={{ justifyContent: "space-between" }}>
                <div className="stack" style={{ gap: "0.2rem" }}>
                  <Link href={resultsHref(h)} onClick={onNavigate}>
                    <strong>{h.q}</strong>
                  </Link>
                  <span className="muted">
                    {h.fandom}
                    {h.strict ? " · strict" : ""}
                    {h.resultCount != null ? ` · ${h.resultCount} results` : ""}
                    {" · "}
                    {cached ? "saved — opens instantly" : "re-runs on open"}
                  </span>
                </div>
                <span className="muted">{new Date(h.at).toLocaleDateString()}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
