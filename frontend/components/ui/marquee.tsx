import type { ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  pauseOnHover?: boolean;
  speed?: number;
}

export function Marquee({ children, className = '', pauseOnHover = false, speed = 20 }: MarqueeProps) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className={pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}
        style={{
          display: 'flex',
          width: 'max-content',
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
        <div className="flex items-center">{children}</div>
        <div className="flex items-center" aria-hidden>{children}</div>
      </div>
    </div>
  );
}
