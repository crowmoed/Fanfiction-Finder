'use client';

import { useEffect, useState } from 'react';

export type ResultsView = 'bento' | 'table';

interface ViewToggleProps {
  value: ResultsView;
  onChange: (view: ResultsView) => void;
}

export function usePersistedResultsView() {
  const [view, setViewState] = useState<ResultsView>('bento');

  useEffect(() => {
    const saved = window.localStorage.getItem('semanticArchive.resultsView');
    if (saved === 'bento' || saved === 'table') setViewState(saved);
  }, []);

  const setView = (next: ResultsView) => {
    setViewState(next);
    window.localStorage.setItem('semanticArchive.resultsView', next);
  };

  return [view, setView] as const;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-full border bg-[var(--bg-elevated)] p-1 shadow-sm" style={{ borderColor: 'var(--text-primary)' }}>
      <ToggleButton active={value === 'bento'} onClick={() => onChange('bento')}>
        ░░ Bento
      </ToggleButton>
      <ToggleButton active={value === 'table'} onClick={() => onChange('table')}>
        ▦ Table
      </ToggleButton>
    </div>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 font-mono text-xs"
      style={{
        backgroundColor: active ? 'var(--text-primary)' : 'transparent',
        color: active ? 'var(--bg-elevated)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
