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
import { useRouter } from "next/navigation";

import { SidebarSearches } from "@/components/SidebarSearches";
import { SettingsModal } from "@/components/SettingsModal";

const SHOW_DEV =
  process.env.NEXT_PUBLIC_ENABLE_DEMOS === "1" ||
  process.env.NODE_ENV !== "production";

const COLLAPSE_KEY = "ficfinder.sidebar.collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

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

        <button
          className="sidebar-cta"
          onClick={() => router.push("/")}
          title="New search"
        >
          <span className="sidebar-ic" aria-hidden>
            ＋
          </span>
          <span className="sidebar-label">New search</span>
        </button>

        <nav className="sidebar-nav">
          <button className="sidebar-link" onClick={() => router.push("/saved")} title="Saved">
            <span className="sidebar-ic" aria-hidden>
              ★
            </span>
            <span className="sidebar-label">Saved</span>
          </button>
          <button className="sidebar-link" onClick={() => router.push("/history")} title="History">
            <span className="sidebar-ic" aria-hidden>
              ↺
            </span>
            <span className="sidebar-label">History</span>
          </button>
        </nav>

        {/* Recent searches live in the sidebar (claude.ai-style) as a shortcut;
            the History button opens the full /history page. */}
        <div className="sidebar-scroll">
          <Suspense fallback={null}>
            <SidebarSearches onViewAll={() => router.push("/history")} />
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

      <main className="app-main">{children}</main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
