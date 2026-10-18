import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'main' | 'header';
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ as: Component = 'div', className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('container-editorial', className)}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';

export interface PageHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode;
  eyebrowNumber?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  metadata?: React.ReactNode;
  borderBottom?: boolean;
}

export function PageHeader({
  eyebrow,
  eyebrowNumber,
  title,
  description,
  action,
  metadata,
  borderBottom = true,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'py-10 sm:py-14',
        borderBottom && 'border-b border-ink/15',
        className
      )}
      {...props}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-3xl space-y-3">
          {(eyebrow || eyebrowNumber) && (
            <div className="flex items-center gap-2.5 meta-mono text-ash">
              {eyebrowNumber && (
                <span className="text-oxblood font-semibold tracking-wider">
                  {eyebrowNumber}
                </span>
              )}
              {eyebrowNumber && eyebrow && (
                <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
              )}
              {eyebrow && <span className="label-eyebrow text-ink">{eyebrow}</span>}
            </div>
          )}

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight font-medium leading-[1.08]">
            {title}
          </h1>

          {description && (
            <p className="font-display italic text-base sm:text-lg text-ash leading-relaxed max-w-2xl">
              {description}
            </p>
          )}

          {metadata && (
            <div className="pt-1 flex items-center gap-3 meta-mono text-ash">
              {metadata}
            </div>
          )}
        </div>

        {action && <div className="shrink-0 flex items-center gap-3">{action}</div>}
      </div>
    </div>
  );
}
