'use client';

import { useEffect, useRef } from 'react';
import SettingsContent from './SettingsContent';

interface SettingsModalProps {
  onClose: () => void;
}

/** Centered settings popup (Claude-style), replacing the standalone settings page. */
export default function SettingsModal({ onClose }: SettingsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus the panel on open + lock body scroll while open.
  useEffect(() => {
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity duration-250"
        style={{ backgroundColor: 'rgba(28, 25, 23, 0.3)' }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 my-auto w-full max-w-[560px] rounded-xl shadow-lg outline-none"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          animation: 'scaleIn 200ms ease-out',
        }}
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <h1 className="font-serif italic text-2xl text-text-primary">Settings</h1>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors duration-150"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <SettingsContent onSignOut={onClose} />
        </div>
      </div>
    </div>
  );
}
