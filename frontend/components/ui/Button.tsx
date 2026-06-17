'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] motion-reduce:active:scale-100';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover hover:text-accent-ink',
  secondary: 'border border-border-strong bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
