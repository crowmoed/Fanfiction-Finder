'use client';

import { useEffect, useRef, useState } from 'react';
import type { SearchHistoryEntry, FicResult } from '@/lib/schema/types';
import { formatRelativeTime } from '@/lib/utils/format';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSearch: (prompt: string, fandom: string, cached?: FicResult[]) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function SearchHistory({ history, onSearch, onClear, onClose }: SearchHistoryProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Trap focus + close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus panel on open
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-250"
        style={{ backgroundColor: 'rgba(28, 25, 23, 0.3)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 w-80 flex flex-col shadow-lg outline-none"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border-default)',
          animation: 'slideInRight 250ms ease-out',
        }}
        role="dialog"
        aria-label="Search History"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Search History
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            aria-label="Close history panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--text-tertiary)' }}>
                <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M22 22l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No searches yet</p>
            </div>
          ) : (
            <ul>
              {history.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      onSearch(entry.prompt, entry.fandom, entry.cachedResults);
                      onClose();
                    }}
                    className="w-full text-left px-5 py-3.5 border-b transition-colors duration-150"
                    style={{ borderColor: 'var(--border-subtle)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                  >
                    <div className="flex items-start gap-2">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="mt-0.5 shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                          title={entry.prompt}
                        >
                          {entry.prompt.length > 60 ? entry.prompt.slice(0, 60) + '…' : entry.prompt}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {entry.fandom} · AO3: {entry.ao3Count} · FFN: {entry.ffnCount}{entry.wattpadCount > 0 ? ` · Wattpad: ${entry.wattpadCount}` : ''}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {formatRelativeTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div
            className="px-5 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--border-default)' }}
          >
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Are you sure?</span>
                <button
                  onClick={() => { onClear(); setConfirmClear(false); }}
                  className="text-sm font-medium text-red-500 transition-opacity hover:opacity-70"
                >
                  Clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="text-sm transition-opacity"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-sm transition-colors duration-150"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
              >
                Clear All History
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
