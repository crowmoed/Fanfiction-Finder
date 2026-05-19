import type { ReactNode } from 'react';

interface ShineBorderProps {
  children: ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color: string[];
  className?: string;
}

export function ShineBorder({
  children,
  borderRadius = 16,
  borderWidth = 1.5,
  duration = 14,
  color,
  className = '',
}: ShineBorderProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        borderRadius,
        padding: borderWidth,
        background: `linear-gradient(135deg, ${color.join(', ')}, ${color[0]})`,
        backgroundSize: '300% 300%',
        animation: `shine ${duration}s linear infinite`,
      }}
    >
      <div style={{ borderRadius: Math.max(0, borderRadius - borderWidth) }}>
        {children}
      </div>
    </div>
  );
}
