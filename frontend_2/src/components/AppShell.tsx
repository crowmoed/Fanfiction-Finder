"use client";

/**
 * AppShell — the real product chrome, styled after the claude.ai web app: a slim
 * collapsible left sidebar + a content canvas. Sidebar state lives in
 * SidebarProvider; the sidebar itself is composed from src/components/sidebar/*.
 *
 * Saved and History are full pages; Settings opens a tabbed dialog (owned here so
 * the sidebar's account menu can trigger it). Shareable content (/, /results,
 * /fic) renders in {children}.
 */
import { useState } from "react";

import { SidebarProvider, useSidebar } from "@/components/sidebar/SidebarProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
      {/* Skip link — first focusable element, so keyboard/screen-reader users can
          jump past the sidebar straight to the content. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />

      <main id="main-content" className="app-main">
        {children}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
