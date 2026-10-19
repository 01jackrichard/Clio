'use client';

import React from 'react';
import { Download, Laptop, Smartphone, Check } from 'lucide-react';
import { usePwa } from './pwa-context';
import { cn } from '@/lib/utils';

interface PwaInstallButtonProps {
  variant?: 'dropdown' | 'drawer' | 'footer' | 'pill';
  className?: string;
  onAction?: () => void;
}

export function PwaInstallButton({
  variant = 'dropdown',
  className,
  onAction,
}: PwaInstallButtonProps) {
  const { isInstalled, promptInstall, isIOS } = usePwa();

  const handleClick = async () => {
    if (onAction) onAction();
    await promptInstall();
  };

  if (isInstalled) {
    if (variant === 'dropdown') {
      return (
        <div className="flex items-center gap-2.5 px-4 py-2 text-xs text-emerald-800 bg-emerald-50/50 font-medium cursor-default">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed</span>
        </div>
      );
    }
    return null;
  }

  if (variant === 'dropdown') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-2.5 px-4 py-2 text-xs text-ink/80 hover:bg-bone hover:text-ink transition-colors text-left cursor-pointer focus-visible:bg-bone focus-visible:text-ink focus-visible:outline-none',
          className
        )}
      >
        {isIOS ? (
          <Smartphone className="w-3.5 h-3.5 text-oxblood" />
        ) : (
          <Laptop className="w-3.5 h-3.5 text-oxblood" />
        )}
        <span>Install Clio App</span>
      </button>
    );
  }

  if (variant === 'drawer') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'min-h-[44px] w-full flex items-center gap-2.5 py-2 text-sm font-medium border-b border-ink/10 text-ink hover:text-oxblood transition-colors text-left cursor-pointer',
          className
        )}
      >
        <Download className="w-4 h-4 text-oxblood" />
        <span>Install Clio App</span>
      </button>
    );
  }

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs text-ash hover:text-oxblood transition-colors cursor-pointer font-mono tracking-tight',
          className
        )}
      >
        <Download className="w-3 h-3 text-oxblood" />
        <span>Install Desktop / Mobile App</span>
      </button>
    );
  }

  // Pill variant
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ink/20 bg-card text-ink hover:border-oxblood hover:text-oxblood transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood',
        className
      )}
    >
      <Download className="w-3.5 h-3.5 text-oxblood" />
      <span>Install App</span>
    </button>
  );
}
