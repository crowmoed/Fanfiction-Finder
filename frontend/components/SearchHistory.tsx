'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchHistoryEntry, FicResult } from '@/lib/schema/types';
import { formatRelativeTime } from '@/lib/utils/format';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSearch: (prompt: string, fandom: string, cached?: FicResult[], shareId?: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function SearchHistory({ history, onSearch, onClear, onClose }: SearchHistoryProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-[70] flex w-80 flex-col border-l border-border bg-surface shadow-soft outline-none"
        role="dialog"
        aria-label="Search history"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-lg font-semibold text-ink">Search history</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-3 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
            aria-label="Close history panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="scrollbar-translucent flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-ink-3" aria-hidden>
                <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M22 22l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-ink-3">No searches yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      onSearch(entry.prompt, entry.fandom, entry.cachedResults, entry.shareId);
                      onClose();
                    }}
                    className="w-full px-5 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-surface-2"
                  >
                    <p className="truncate text-sm font-medium text-ink" title={entry.prompt}>
                      {entry.prompt}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {entry.fandom} · AO3 {entry.ao3Count} · FFN {entry.ffnCount}
                      {entry.wattpadCount > 0 ? ` · WP ${entry.wattpadCount}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-3">{formatRelativeTime(entry.timestamp)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {history.length > 0 && (
          <div className="shrink-0 border-t border-border px-5 py-4">
            {confirmClear ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-2">Clear all history?</span>
                <button
                  onClick={() => {
                    onClear();
                    setConfirmClear(false);
                  }}
                  className="text-sm font-medium text-danger transition-opacity hover:opacity-70"
                >
                  Clear
                </button>
                <button onClick={() => setConfirmClear(false)} className="text-sm text-ink-3 hover:text-ink">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-sm text-ink-3 transition-colors duration-150 ease-out hover:text-ink"
              >
                Clear all history
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
