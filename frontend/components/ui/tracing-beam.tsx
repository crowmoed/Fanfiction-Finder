import type { ReactNode } from 'react';

export function TracingBeam({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 hidden w-px md:block"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--aurora-1), var(--aurora-2), transparent)',
        }}
      />
      <div className="md:pl-8">{children}</div>
    </div>
  );
}
