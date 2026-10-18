import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      rightElement,
      id,
      disabled,
      required,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = error
      ? errorId
      : helperText
      ? helperId
      : undefined;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-mono uppercase tracking-wider text-ash font-medium"
          >
            {label}
            {required && <span className="text-oxblood ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-ash" aria-hidden="true">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              'w-full h-10 px-3.5 bg-paper text-ink text-sm border border-ink/20 rounded-none placeholder:text-ash/60 transition-colors',
              'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/20',
              'disabled:opacity-50 disabled:bg-bone/40 disabled:cursor-not-allowed',
              error && 'border-oxblood focus:border-oxblood focus:ring-oxblood/20',
              leftIcon && 'pl-10',
              (rightIcon || rightElement) && 'pr-11',
              className
            )}
            {...props}
          />

          {rightElement ? (
            <div className="absolute right-2.5 flex items-center text-ash z-10">
              {rightElement}
            </div>
          ) : rightIcon ? (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-ash" aria-hidden="true">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {error && (
          <p id={errorId} className="text-xs text-oxblood font-medium tracking-tight">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-ash leading-relaxed">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
