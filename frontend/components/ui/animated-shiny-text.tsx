import type { ReactNode } from 'react';

interface AnimatedShinyTextProps {
  children: ReactNode;
  shimmerWidth?: number;
  className?: string;
}

export function AnimatedShinyText({ children, shimmerWidth = 80, className = '' }: AnimatedShinyTextProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        backgroundImage: `linear-gradient(110deg, currentColor 0%, currentColor 35%, rgba(255,255,255,0.85) 50%, currentColor ${50 + shimmerWidth / 5}%, currentColor 100%)`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmer 2.5s linear infinite',
      }}
    >
      {children}
    </span>
  );
}
