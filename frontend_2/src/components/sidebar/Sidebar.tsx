"use client";

/**
 * Sidebar — the app rail (claude.ai-style): brand + collapse toggle, a New search
 * CTA, Saved / History nav, a scrollable Recent list, and the account control +
 * dev link pinned at the bottom.
 *
 * Desktop: the collapse toggle is the only control — press → collapses to an
 * icon rail and stays; press again → expands and stays. Toggles via the button
 * or Ctrl/⌘+B; state is persisted by SidebarProvider.
 *
 * ≤720px: the rail becomes an off-canvas drawer behind a hamburger topbar
 * (claude.ai mobile pattern) — the SAME aside slides in over a scrim, full
 * desktop layout inside (labels, recents, foot). Scrim tap, Esc, and any
 * navigation close it; while closed the drawer is `inert` so it can't be
 * tabbed into off-screen.
 */
import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Sidebar({
  onOpenSettings,
  onOpenAbout,
}: {
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}) {
  const { collapsed, toggleCollapsed, isMobile, mobileOpen, openMobile, closeMobile } =
    useSidebar();
  const pathname = usePathname();
  const burgerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  // Any navigation closes the drawer (links inside it change the pathname).
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  // Open: move focus into the drawer and arm Esc-to-close. Close: hand focus
  // back to the hamburger (the effect cleanup covers every close path).
  useEffect(() => {
    if (!mobileOpen) return;
    // Snapshot the hamburger node now — the cleanup may run after React has
    // already swapped refs (react-hooks/exhaustive-deps ref-in-cleanup rule).
    const burger = burgerRef.current;
    asideRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      burger?.focus();
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {/* Mobile topbar (hidden ≥721px): hamburger + brand + new search. */}
      <div className="mobile-topbar" inert={mobileOpen ? true : undefined}>
        <button
          ref={burgerRef}
          type="button"
          className="mobile-topbar-btn"
          onClick={openMobile}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
        >
          <Icon name="menu" size={18} />
        </button>
        <Link href="/" className="sidebar-brand" title="Ficwell">
          <span className="hanko" aria-hidden="true">
            <HankoMark />
          </span>
          <span className="t-wordmark">Ficwell</span>
        </Link>
        <Link
          href="/"
          className="mobile-topbar-btn mobile-topbar-new"
          aria-label="New search"
          title="New search"
        >
          <Icon name="plus" size={18} />
        </Link>
      </div>

      {/* Scrim (mobile only): always mounted so opacity transitions both ways. */}
      <div
        className={`sidebar-scrim${mobileOpen ? " is-open" : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        id="app-sidebar"
        ref={asideRef}
        className={`sidebar${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="Primary"
        // Off-canvas on mobile: unreachable for keyboard/AT until opened.
        inert={isMobile && !mobileOpen ? true : undefined}
      >
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
      </nav>

      <div className="sidebar-scroll">
        <Suspense fallback={null}>
          <RecentsList />
        </Suspense>
      </div>

      {/* Foot: a quiet utility register (small, muted `util` rows), then the
          account row sharing a line with the "?" — About opens from there, the
          first-run guide never comes back. */}
      <div
        className="sidebar-foot rise-in"
        style={{ "--rise-delay": "120ms" } as React.CSSProperties}
      >
        {/* One entry for the combined vote + request page. */}
        <SidebarItem
          href="/sponsor"
          variant="util"
          icon="sparkle"
          label="Add a fandom"
        />
        {SHOW_DEV && (
          <SidebarItem href="/dev" variant="dev" icon="code" label="Dev / demos" />
        )}
        <div className="sidebar-foot-row">
          <AccountButton onOpenSettings={onOpenSettings} />
          <button
            type="button"
            className="sidebar-help"
            onClick={onOpenAbout}
            aria-label="About Ficwell"
            title="About Ficwell"
          >
            <Icon name="help" size={15} />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
