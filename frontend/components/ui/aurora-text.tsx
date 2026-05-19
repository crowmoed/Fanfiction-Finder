import type { CSSProperties, ReactNode } from 'react';

interface AuroraTextProps {
  children: ReactNode;
  colors: string[];
  className?: string;
  style?: CSSProperties;
}

export function AuroraText({ children, colors, className, style }: AuroraTextProps) {
  const palindrome = [...colors, ...[...colors].reverse().slice(1)];
  const gradient = `linear-gradient(110deg, ${palindrome.join(', ')})`;

  return (
    <span
      className={className}
      style={{
        ...style,
        backgroundImage: gradient,
        backgroundSize: '220% 100%',
        color: colors[0],
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'aurora 12s ease-in-out infinite alternate',
      }}
    >
      {children}
    </span>
  );
}
