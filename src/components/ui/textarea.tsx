import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      id,
      disabled,
      required,
      wrapperClassName,
      rows = 4,
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

        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            'w-full p-3 bg-paper text-ink text-sm border border-ink/20 rounded-none placeholder:text-ash/60 transition-colors',
            'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/20',
            'disabled:opacity-50 disabled:bg-bone/40 disabled:cursor-not-allowed',
            error && 'border-oxblood focus:border-oxblood focus:ring-oxblood/20',
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
