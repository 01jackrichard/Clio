import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options,
      children,
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
          <select
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(
              'w-full h-9 pl-3 pr-8 bg-paper text-ink text-xs border border-ink/20 rounded-none transition-colors appearance-none cursor-pointer',
              'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/20',
              'disabled:opacity-50 disabled:bg-bone/40 disabled:cursor-not-allowed',
              error && 'border-oxblood focus:border-oxblood',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDown
            className="absolute right-2.5 h-3.5 w-3.5 text-ash pointer-events-none"
            aria-hidden="true"
          />
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

Select.displayName = 'Select';
