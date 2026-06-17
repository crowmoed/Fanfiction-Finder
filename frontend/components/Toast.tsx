'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(id);
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-up fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-md border border-border-strong bg-surface px-4 py-2.5 text-sm text-ink shadow-soft"
    >
      {message}
    </div>
  );
}
