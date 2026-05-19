import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export function ShimmerButton({ children, className, href, style: styleProp, ...props }: ShimmerButtonProps) {
  const classNames = cn(
    'relative inline-flex items-center justify-center overflow-hidden rounded-md border border-[var(--text-primary)] px-4 py-2 font-mono text-sm font-medium',
    'text-[var(--bg-elevated)] shadow-sm indie-press disabled:cursor-not-allowed disabled:opacity-50',
    className
  );
  const style: CSSProperties = {
    backgroundColor: 'var(--accent)',
    backgroundImage: 'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255,255,255,0.34) 45%, transparent 55%, transparent 100%)',
    backgroundSize: '220% 100%',
    animation: 'shimmer 2.5s linear infinite',
    ...styleProp,
  };

  if (href) {
    return <a href={href} className={classNames} style={style} target={props.target} rel={props.rel}>{children}</a>;
  }

  return <button className={classNames} style={style} disabled={props.disabled} onClick={props.onClick}>{children}</button>;
}
