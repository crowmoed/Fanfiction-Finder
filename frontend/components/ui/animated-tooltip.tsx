import type { ReactNode } from 'react';

interface AnimatedTooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function AnimatedTooltip({ content, children }: AnimatedTooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-mono opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ borderColor: 'var(--text-primary)', color: 'var(--text-primary)' }}
      >
        {content}
      </span>
    </span>
  );
}
