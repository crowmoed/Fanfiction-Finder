import type { ReactNode } from 'react';

interface BoxRevealProps {
  children: ReactNode;
  className?: string;
}

export function BoxReveal({ children, className = '' }: BoxRevealProps) {
  return (
    <span className={`relative inline-block overflow-hidden ${className}`}>
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="absolute inset-0 z-20"
        style={{ backgroundColor: 'var(--accent-alt-light)', animation: 'boxReveal 700ms ease-out forwards' }}
      />
    </span>
  );
}
