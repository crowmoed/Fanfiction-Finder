'use client';

import { useEffect, useState } from 'react';

export type ResultsView = 'browse' | 'table';

interface ViewToggleProps {
  value: ResultsView;
  onChange: (view: ResultsView) => void;
}

const STORAGE_KEY = 'semanticArchive.resultsView';

export function usePersistedResultsView() {
  const [view, setViewState] = useState<ResultsView>('browse');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // migrate the old 'bento' value
    if (saved === 'table') setViewState('table');
    else if (saved === 'browse' || saved === 'bento') setViewState('browse');
  }, []);

  const setView = (next: ResultsView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return [view, setView] as const;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-0.5" role="group" aria-label="Results layout">
      <ToggleButton active={value === 'browse'} onClick={() => onChange('browse')} label="Browse cards">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="8.5" y="1.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="1.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <rect x="8.5" y="8.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        Browse
      </ToggleButton>
      <ToggleButton active={value === 'table'} onClick={() => onChange('table')} label="Table view">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1.5" y="2.5" width="13" height="2" rx="1" fill="currentColor" />
          <rect x="1.5" y="7" width="13" height="2" rx="1" fill="currentColor" />
          <rect x="1.5" y="11.5" width="13" height="2" rx="1" fill="currentColor" />
        </svg>
        Table
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs transition-colors duration-150 ease-out ${
        active ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}
