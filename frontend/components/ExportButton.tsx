'use client';

import { useEffect, useRef, useState } from 'react';
import type { FicResult } from '@/lib/schema/types';
import Toast from './Toast';

interface ExportButtonProps {
  results: FicResult[];
  query: string;
}

export default function ExportButton({ results, query }: ExportButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const onDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [showDropdown]);

  async function doExport(format: 'xlsx' | 'csv') {
    setShowDropdown(false);
    setIsExporting(true);
    try {
      const { exportResults } = await import('@/lib/utils/export');
      await exportResults(results, query, format);
      setToast(`Exported ${results.length} results as .${format}`);
    } finally {
      setIsExporting(false);
    }
  }

  const itemClass =
    'w-full px-4 py-2 text-left text-sm text-ink transition-colors duration-150 ease-out hover:bg-surface-2';

  return (
    <>
      <div className="relative inline-flex" ref={dropdownRef}>
        <button
          onClick={() => doExport('xlsx')}
          disabled={isExporting || results.length === 0}
          className="inline-flex items-center gap-2 rounded-l-md border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:bg-surface-2 disabled:opacity-50"
          aria-label="Export search results as spreadsheet"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 1v9M5 7l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isExporting ? 'Exporting…' : 'Export results'}
        </button>

        <button
          onClick={() => setShowDropdown((v) => !v)}
          disabled={results.length === 0}
          aria-haspopup="menu"
          aria-expanded={showDropdown}
          className="inline-flex items-center rounded-r-md border border-l-0 border-border-strong bg-surface px-2 py-2 text-sm text-ink-2 transition-colors duration-150 ease-out hover:bg-surface-2 disabled:opacity-50"
          aria-label="More export options"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute bottom-full left-0 z-[50] mb-1 min-w-[150px] rounded-md border border-border bg-surface py-1 shadow-soft">
            <button onClick={() => doExport('xlsx')} className={itemClass}>
              Export as .xlsx
            </button>
            <button onClick={() => doExport('csv')} className={itemClass}>
              Export as .csv
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
