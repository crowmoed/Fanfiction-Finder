"use client";

/**
 * SidebarSearches — recent searches listed directly in the sidebar, claude.ai
 * style (where recent chats live). Reads the local history store; each row links
 * to that search's /results URL (restored from cache instantly when available).
 * Replaces the old History popup.
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSearchHistory } from "@/lib/client/history";
import { resultsHref } from "@/lib/results/searchUrl";

// How many recent searches to show in the sidebar shortcut. The full log is
// behind the History button.
const SIDEBAR_LIMIT = 12;

export function SidebarSearches() {
  const history = useSearchHistory();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeQ = pathname === "/results" ? params.get("q") : null;

  if (history.length === 0) {
    return (
      <div className="sidebar-searches">
        <div className="sidebar-section-label sidebar-label">Recent</div>
        <p className="muted sidebar-label" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}>
          No searches yet.
        </p>
      </div>
    );
  }

  return (
    <div className="sidebar-searches">
      <div className="sidebar-section-label sidebar-label">Recent</div>
      <ul className="sidebar-search-list">
        {history.slice(0, SIDEBAR_LIMIT).map((h) => (
          <li key={h.id}>
            <Link
              href={resultsHref(h)}
              className="sidebar-search-item"
              title={`${h.q} · ${h.fandom}`}
              aria-current={activeQ === h.q ? "page" : undefined}
            >
              <span className="sidebar-label truncate">{h.q}</span>
            </Link>
          </li>
        ))}
      </ul>
      {history.length > SIDEBAR_LIMIT && (
        <Link href="/history" className="sidebar-viewall sidebar-label">
          View all {history.length}
        </Link>
      )}
    </div>
  );
}
