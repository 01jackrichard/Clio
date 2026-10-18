import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'subtle'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonVariantProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className = '',
}: ButtonVariantProps = {}) {
  const base =
    'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-2 focus-visible:outline-oxblood focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-ink text-paper hover:bg-oxblood hover:text-paper shadow-sm active:translate-y-px',
    secondary:
      'border border-ink text-ink bg-transparent hover:bg-ink hover:text-paper active:translate-y-px',
    outline:
      'border border-ink/20 text-ink bg-transparent hover:border-ink hover:bg-bone/40 active:translate-y-px',
    ghost:
      'bg-transparent text-ink hover:bg-bone/60 hover:text-oxblood active:translate-y-px',
    destructive:
      'bg-oxblood text-paper hover:bg-rose-950 active:translate-y-px',
    subtle:
      'bg-bone text-ink hover:bg-ink hover:text-paper active:translate-y-px',
    link:
      'text-ink underline-offset-4 hover:underline hover:text-oxblood p-0 h-auto cursor-pointer',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs tracking-tight gap-1.5',
    md: 'h-10 px-4 text-sm tracking-tight gap-2',
    lg: 'h-12 px-6 text-base tracking-tight gap-2.5',
    icon: 'h-10 w-10 p-0',
    'icon-sm': 'h-8 w-8 p-0',
  };

  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? 'true' : undefined}
        className={buttonVariants({ variant, size, className })}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
