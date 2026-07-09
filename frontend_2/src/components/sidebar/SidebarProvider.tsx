"use client";

/**
 * SidebarProvider — the single owner of sidebar UI state (the collapse flag), so
 * the shell chrome and the sidebar tree read one source instead of prop-drilling
 * a boolean. Collapse is persisted to localStorage; hydration is deferred to an
 * effect to avoid an SSR mismatch, and kept in sync across tabs.
 *
 * (There is no mobile-drawer state: narrow screens collapse the sidebar into a
 * static top strip purely via CSS — see the max-width media query in globals.css.)
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
    () => ({ collapsed, toggleCollapsed, setCollapsed }),
    [collapsed, toggleCollapsed, setCollapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
