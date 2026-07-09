"use client";

/**
 * RecentsList — recent searches in the sidebar (claude.ai "recent chats"). Reads
 * the local history + pins stores. When not filtering it shows a Pinned section
 * followed by time-grouped recents (Today / Yesterday / …); typing in the filter
 * collapses to a flat match list. Shows a hydration skeleton first (stores are
 * client-only) and a teaching empty state before any searches exist.
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useSearchHistory, type HistoryEntry } from "@/lib/client/history";
import { pinKey, usePins } from "@/lib/client/sidebarPins";
import { groupByTime } from "@/lib/results/timeGroups";
import { resultsHref } from "@/lib/results/searchUrl";
import { Icon } from "@/components/Icon";
import { SidebarRow } from "./SidebarRow";

// Show the filter box only once the list is long enough to warrant scanning.
const FILTER_THRESHOLD = 8;

function Section({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sidebar-group">
      <div className="sidebar-section-label sidebar-label">{label}</div>
      <ul className="sidebar-search-list">{children}</ul>
    </div>
  );
}

export function RecentsList() {
  const history = useSearchHistory();
  const pins = usePins();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");
  // One-shot entrance: the recents block rises in ONCE, on the skeleton ->
  // populated swap. Deliberately a single container fade+rise, not a per-row
  // stagger — a per-row entrance would replay on every filter keystroke, pin
  // toggle, or route-highlight re-render (rows reconcile through changing
  // Section wrappers). animatedOnce flips true right after the first populated
  // render, so later updates never re-animate. Reduced motion -> plain fade
  // (globals.css §18).
  const animatedOnce = useRef(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted) animatedOnce.current = true;
  }, [mounted]);
  const animateIn = mounted && !animatedOnce.current;

  const activeKey =
    pathname === "/results"
      ? pinKey(
          params.get("q") ?? "",
          params.get("fandom") ?? "",
          params.get("strict") ?? "false"
        )
      : null;

  const isPinnedEntry = (h: HistoryEntry) => pinKey(h.q, h.fandom, h.strict) in pins;
  const row = (h: HistoryEntry) => (
    <SidebarRow
      key={h.id}
      entry={h}
      href={resultsHref(h)}
      active={pinKey(h.q, h.fandom, h.strict) === activeKey}
      pinned={isPinnedEntry(h)}
    />
  );

  // Server + first client render show the skeleton so the markup matches until
  // localStorage is readable (avoids a hydration flash of "no searches yet").
  if (!mounted) {
    return (
      <div className="sidebar-searches">
        <div className="sidebar-section-label sidebar-label">Recent</div>
        <div className="sidebar-recents-skeleton" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="skeleton sidebar-recent-skel" />
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="sidebar-searches">
        <div className="sidebar-section-label sidebar-label">Recent</div>
        <p className="sidebar-recents-empty sidebar-label">
          Searches you run show up here for quick access.
        </p>
      </div>
    );
  }

  const query = filter.trim().toLowerCase();
  const showFilter = history.length >= FILTER_THRESHOLD;

  // Filtering: flat list across all history, grouping/pinned set aside.
  if (query) {
    const matches = history.filter(
      (h) =>
        h.q.toLowerCase().includes(query) ||
        h.fandom.toLowerCase().includes(query)
    );
    return (
      <div className="sidebar-searches">
        <FilterBox value={filter} onChange={setFilter} />
        {matches.length > 0 ? (
          <Section label={`${matches.length} match${matches.length === 1 ? "" : "es"}`}>
            {matches.map(row)}
          </Section>
        ) : (
          <p className="sidebar-recents-nomatch sidebar-label">No matches.</p>
        )}
      </div>
    );
  }

  const pinned = history.filter(isPinnedEntry);
  const pinnedIds = new Set(pinned.map((h) => h.id));
  const rest = history.filter((h) => !pinnedIds.has(h.id));
  const groups = groupByTime(rest, Date.now());

  return (
    <div className={`sidebar-searches${animateIn ? " rise-in" : ""}`}>
      {showFilter && <FilterBox value={filter} onChange={setFilter} />}
      {pinned.length > 0 && (
        <Section
          label={
            <span className="sidebar-section-label-icon">
              <Icon name="pin" size={11} /> Pinned
            </span>
          }
        >
          {pinned.map(row)}
        </Section>
      )}
      {groups.map((g) => (
        <Section key={g.label} label={g.label}>
          {g.entries.map(row)}
        </Section>
      ))}
    </div>
  );
}

function FilterBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="search"
      className="sidebar-filter"
      placeholder="Filter searches…"
      aria-label="Filter recent searches"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
