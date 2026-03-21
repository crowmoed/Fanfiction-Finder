'use client';

import { useState, useRef } from 'react';
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

  async function doExport(format: 'xlsx' | 'csv') {
    setShowDropdown(false);
    setIsExporting(true);
    try {
      const { exportResults } = await import('@/lib/utils/export');
      await exportResults(results, query, format);
      setToast(`Exported ${results.length} results`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="relative inline-flex" ref={dropdownRef}>
        <button
          onClick={() => doExport('xlsx')}
          disabled={isExporting || results.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-l-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            if (!isExporting) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
          }}
          aria-label="Export search results as spreadsheet"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1v9M5 7l3 3 3-3M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export Results
        </button>

        <button
          onClick={() => setShowDropdown((v) => !v)}
          disabled={results.length === 0}
          className="inline-flex items-center px-2 py-2 rounded-r-lg border-l text-sm transition-all duration-150 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-default)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-secondary)';
          }}
          aria-label="More export options"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showDropdown && (
          <div
            className="absolute bottom-full mb-1 left-0 z-20 rounded-lg shadow-md border py-1 min-w-[140px]"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
          >
            <button
              onClick={() => doExport('xlsx')}
              className="w-full px-4 py-2 text-sm text-left transition-colors duration-150"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            >
              Export as .xlsx
            </button>
            <button
              onClick={() => doExport('csv')}
              className="w-full px-4 py-2 text-sm text-left transition-colors duration-150"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            >
              Export as .csv
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
