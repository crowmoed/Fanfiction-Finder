"use client";

/**
 * Sidebar — the app rail (claude.ai-style): brand + collapse toggle, a New search
 * CTA, Saved / History nav, a scrollable Recent list, and the account control +
 * dev link pinned at the bottom.
 *
 * The collapse toggle is the only control: press → collapses to an icon rail and
 * stays; press again → expands and stays. No hover behaviour. Toggles via the
 * button or Ctrl/⌘+B; state is persisted by SidebarProvider.
 */
import { Suspense } from "react";
import Link from "next/link";

import { useSidebar } from "./SidebarProvider";
import { SidebarItem } from "./SidebarItem";
import { RecentsList } from "./RecentsList";
import { AccountButton } from "./AccountButton";

const SHOW_DEV =
  process.env.NEXT_PUBLIC_ENABLE_DEMOS === "1" ||
  process.env.NODE_ENV !== "production";

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside className="sidebar" aria-label="Primary">
      {/* Toggle leads the header so it sits above the icon column (left when
          expanded, centred when collapsed) — a consistent slot, no corner jump. */}
      <div className="sidebar-top">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          aria-keyshortcuts="Control+B Meta+B"
          title={`${collapsed ? "Expand" : "Collapse"} sidebar  (Ctrl / ⌘ B)`}
        >
          {collapsed ? "☰" : "‹"}
        </button>
        <Link href="/" className="sidebar-brand" title="FicFinder">
          <span className="sidebar-label">FicFinder</span>
        </Link>
      </div>

      {/* CTA: never shows as "active" even on "/" — it's an action, not a tab. */}
      <SidebarItem href="/" variant="cta" icon="＋" label="New search" active={false} />

      <nav className="sidebar-nav" aria-label="Sections">
        <SidebarItem href="/saved" icon="★" label="Saved" />
        <SidebarItem href="/history" icon="↺" label="History" />
      </nav>

      <div className="sidebar-scroll">
        <Suspense fallback={null}>
          <RecentsList />
        </Suspense>
      </div>

      <div className="sidebar-foot">
        <AccountButton onOpenSettings={onOpenSettings} />
        {SHOW_DEV && (
          <SidebarItem href="/dev" variant="dev" icon="⌗" label="Dev / demos" />
        )}
      </div>
    </aside>
  );
}
