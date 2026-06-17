'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'sa-theme';

/** Read the theme the no-flash script already resolved onto <html>. */
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  const apply = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, []);

  // Follow the OS only while the user hasn't made an explicit choice.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (stored === 'light' || stored === 'dark') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [apply]);

  const toggle = useCallback(() => apply(theme === 'dark' ? 'light' : 'dark'), [apply, theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Inline script that resolves the theme BEFORE first paint to avoid a flash.
 * Rendered in <head> via dangerouslySetInnerHTML.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
