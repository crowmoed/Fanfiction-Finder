'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InteractiveHoverButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  iconOnly?: boolean;
}

export function InteractiveHoverButton({ children, className, iconOnly = false, ...props }: InteractiveHoverButtonProps) {
  return (
    <button
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-md border border-[var(--text-primary)] bg-[var(--accent)] font-mono font-medium text-[var(--bg-elevated)] shadow-sm indie-press disabled:cursor-not-allowed disabled:opacity-50',
        iconOnly ? 'h-10 w-10 p-0' : 'px-4 py-2 text-sm',
        className
      )}
      {...props}
    >
      <span className={iconOnly ? 'sr-only' : ''}>{children}</span>
      <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5">
        →
      </span>
    </button>
  );
}
