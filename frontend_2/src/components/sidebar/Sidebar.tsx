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

import { Icon } from "@/components/Icon";
import { HankoMark } from "@/components/HankoMark";
import { useSidebar } from "./SidebarProvider";
import { SidebarItem } from "./SidebarItem";
import { RecentsList } from "./RecentsList";
import { AccountButton } from "./AccountButton";
import "./sidebar.css";

const SHOW_DEV =
  process.env.NEXT_PUBLIC_ENABLE_DEMOS === "1" ||
  process.env.NODE_ENV !== "production";

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { collapsed, toggleCollapsed } = useSidebar();

  return (
    <aside className="sidebar" aria-label="Primary">
      {/* Cold-mount cascade: the rail settles in top→foot on first app load
          (the sidebar lives outside <main>, so it mounts once and doesn't
          replay on navigation or collapse). rise-in is reduced-motion-guarded. */}
      {/* Toggle leads the header so it sits above the icon column (left when
          expanded, centred when collapsed) — a consistent slot, no corner jump. */}
      <div
        className="sidebar-top rise-in"
        style={{ "--rise-delay": "0ms" } as React.CSSProperties}
      >
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          aria-keyshortcuts="Control+B Meta+B"
          title={`${collapsed ? "Expand" : "Collapse"} sidebar  (Ctrl / ⌘ B)`}
        >
          {/* Keyed by state + pop-in so the menu ⇄ chevron swap settles. */}
          <span className="pop-in" key={collapsed ? "c" : "e"} style={{ display: "inline-flex" }}>
            <Icon name={collapsed ? "menu" : "chevron-left"} size={16} />
          </span>
        </button>
        <Link href="/" className="sidebar-brand" title="Ficwell">
          <span className="hanko" aria-hidden="true">
            <HankoMark />
          </span>
          <span className="sidebar-label t-wordmark">Ficwell</span>
        </Link>
      </div>

      {/* CTA: never shows as "active" even on "/" — it's an action, not a tab. */}
      <div
        className="rise-in"
        style={{ "--rise-delay": "40ms" } as React.CSSProperties}
      >
        <SidebarItem href="/" variant="cta" icon="plus" label="New search" active={false} />
      </div>

      <nav
        className="sidebar-nav rise-in"
        aria-label="Sections"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
      >
        <SidebarItem href="/saved" icon="star" label="Saved" />
        <SidebarItem href="/history" icon="clock" label="History" />
        <SidebarItem href="/sponsor" icon="sparkle" label="Sponsor a fandom" />
      </nav>

      <div className="sidebar-scroll">
        <Suspense fallback={null}>
          <RecentsList />
        </Suspense>
      </div>

      <div
        className="sidebar-foot rise-in"
        style={{ "--rise-delay": "120ms" } as React.CSSProperties}
      >
        <AccountButton onOpenSettings={onOpenSettings} />
        {SHOW_DEV && (
          <SidebarItem href="/dev" variant="dev" icon="code" label="Dev / demos" />
        )}
      </div>
    </aside>
  );
}
