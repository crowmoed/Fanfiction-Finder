"use client";

/**
 * SidebarProvider — the single owner of sidebar UI state, so the shell chrome
 * and the sidebar tree read one source instead of prop-drilling booleans:
 *
 * - `collapsed` (desktop rail): persisted to localStorage; hydration is
 *   deferred to an effect to avoid an SSR mismatch, and kept in sync across tabs.
 * - `mobileOpen` (≤720px drawer, claude.ai-style): the sidebar is off-canvas
 *   behind a hamburger; never persisted, force-closed when the viewport leaves
 *   mobile, and body scroll locks while it's open.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { subscribeToStorageKey } from "@/lib/client/localStore";

const COLLAPSE_KEY = "ficfinder.sidebar.collapsed";

interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  /** True while the viewport is ≤720px (SSR/first paint: false). */
  isMobile: boolean;
  /** Mobile drawer visibility. Always false on desktop. */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within <SidebarProvider>");
  return ctx;
}

function persist(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  } catch {
    /* storage disabled — keep in-memory only */
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track the drawer breakpoint; leaving mobile always closes the drawer so a
  // resize never strands an invisible open-drawer state (scroll lock included).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileOpen(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Body scroll lock while the drawer is open (restores the previous value).
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const hydrate = () => {
      try {
        setCollapsedState(localStorage.getItem(COLLAPSE_KEY) === "1");
      } catch {
        /* ignore */
      }
    };
    hydrate();
    // Keep the rail in sync if another tab toggles it.
    return subscribeToStorageKey(COLLAPSE_KEY, hydrate);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    persist(value);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((c) => {
      const next = !c;
      persist(next);
      return next;
    });
  }, []);

  // Ctrl/Cmd+B toggles the rail (VS Code convention). Ignored while typing so it
  // never steals the shortcut from an input/textarea/contenteditable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "b" && e.key !== "B") return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const value = useMemo<SidebarContextValue>(
    () => ({
      collapsed,
      toggleCollapsed,
      setCollapsed,
      isMobile,
      mobileOpen,
      openMobile,
      closeMobile,
    }),
    [collapsed, toggleCollapsed, setCollapsed, isMobile, mobileOpen, openMobile, closeMobile]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
