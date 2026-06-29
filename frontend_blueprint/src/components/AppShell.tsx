"use client";

/**
 * AppShell — the real product chrome, styled after the claude.ai web app: a slim
 * collapsible left sidebar + a content canvas.
 *
 * Sidebar (claude.ai layout): New search, Saved, History, then a scrollable list
 * of recent searches (like claude.ai's recent chats), and a Settings button
 * pinned at the bottom. Saved and History are full pages; Settings opens a
 * tabbed dialog. Shareable content (/, /results, /fic) renders in {children}.
 */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

import { SidebarSearches } from "@/components/SidebarSearches";
import { SettingsModal } from "@/components/SettingsModal";

const SHOW_DEV =
  process.env.NEXT_PUBLIC_ENABLE_DEMOS === "1" ||
  process.env.NODE_ENV !== "production";

const COLLAPSE_KEY = "ficfinder.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
      {/* Skip link — first focusable element, so keyboard/screen-reader users can
          jump past the sidebar straight to the content. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link href="/" className="sidebar-brand">
            <span className="sidebar-label">FicFinder</span>
          </Link>
          <button
            className="sidebar-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "☰" : "‹"}
          </button>
        </div>

        <Link className="sidebar-cta" href="/" title="New search">
          <span className="sidebar-ic" aria-hidden>
            ＋
          </span>
          <span className="sidebar-label">New search</span>
        </Link>

        <nav className="sidebar-nav">
          <Link className="sidebar-link" href="/saved" title="Saved">
            <span className="sidebar-ic" aria-hidden>
              ★
            </span>
            <span className="sidebar-label">Saved</span>
          </Link>
          <Link className="sidebar-link" href="/history" title="History">
            <span className="sidebar-ic" aria-hidden>
              ↺
            </span>
            <span className="sidebar-label">History</span>
          </Link>
        </nav>

        {/* Recent searches live in the sidebar (claude.ai-style) as a shortcut;
            the History button opens the full /history page. */}
        <div className="sidebar-scroll">
          <Suspense fallback={null}>
            <SidebarSearches />
          </Suspense>
        </div>

        <div className="sidebar-foot">
          <button
            className="sidebar-link"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <span className="sidebar-ic" aria-hidden>
              ⚙
            </span>
            <span className="sidebar-label">Settings</span>
          </button>
          {SHOW_DEV && (
            <Link href="/dev" className="sidebar-dev">
              <span className="sidebar-ic" aria-hidden>
                ⌗
              </span>
              <span className="sidebar-label">Dev / demos</span>
            </Link>
          )}
        </div>
      </aside>

      <main id="main-content" className="app-main">
        {children}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
