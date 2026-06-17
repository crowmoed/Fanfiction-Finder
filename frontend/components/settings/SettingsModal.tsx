'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  // The modal only ever mounts after a client-side click (SettingsButton keeps
  // it unrendered until then), so there's no SSR pass to guard against here —
  // but stay defensive in case it's ever rendered server-side.
  if (typeof document === 'undefined') return null;

  // Portal to document.body so the dialog escapes the header's sticky/blur
  // stacking context (and the layout's `relative z-10` wrapper) and overlays
  // the whole viewport.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in relative z-10 my-auto w-full max-w-[560px] rounded-md border border-border bg-surface shadow-soft outline-none"
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-serif text-2xl font-semibold text-ink">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-3 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink"
            aria-label="Close settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <SettingsContent onSignOut={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
