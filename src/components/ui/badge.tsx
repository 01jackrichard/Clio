import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'neutral'
  | 'oxblood'
  | 'solid-oxblood'
  | 'ink'
  | 'outline'
  | 'paper'
  | 'success'
  | 'warning';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider select-none shrink-0 transition-colors';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-bone text-ash border border-ink/15',
    neutral: 'bg-bone text-ash border border-ink/15',
    oxblood: 'bg-oxblood/10 text-oxblood border border-oxblood/20 font-medium',
    'solid-oxblood': 'bg-oxblood text-paper border border-oxblood font-medium',
    ink: 'bg-ink text-paper border border-ink font-medium',
    outline: 'bg-transparent text-ink border border-ink/30',
    paper: 'bg-paper text-ink border border-ink/20',
    success: 'bg-emerald-950/10 text-emerald-900 border border-emerald-900/25',
    warning: 'bg-amber-950/10 text-amber-900 border border-amber-900/25',
  };

  const sizes: Record<BadgeSize, string> = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-none',
    md: 'text-[11px] px-2.5 py-1 leading-none',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-ash',
    neutral: 'bg-ash',
    oxblood: 'bg-oxblood',
    'solid-oxblood': 'bg-paper',
    ink: 'bg-paper',
    outline: 'bg-ink',
    paper: 'bg-oxblood',
    success: 'bg-emerald-700',
    warning: 'bg-amber-700',
  };

  return (
    <span
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
