'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  StorageUsageResult,
  calculateStorageResult,
} from '@/lib/services/storage-quota-service';
import { RadialGlowButton } from '@/components/ui/radial-glow-button';

interface PrivateStoragePanelProps {
  initialUsage?: StorageUsageResult;
  compact?: boolean;
  className?: string;
  showUpgradeButton?: boolean;
}

export function PrivateStoragePanel({
  initialUsage,
  compact = false,
  className,
  showUpgradeButton = true,
}: PrivateStoragePanelProps) {
  const [usage, setUsage] = useState<StorageUsageResult>(
    initialUsage || calculateStorageResult(0, 0)
  );

  useEffect(() => {
    let mounted = true;
    async function fetchUsage() {
      try {
        const res = await fetch('/api/user/storage');
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.usage) {
            setUsage(data.usage);
          }
        }
      } catch {
        // Silently retain fallback/initial usage
      }
    }

    if (!initialUsage) {
      fetchUsage();
    }
    return () => {
      mounted = false;
    };
  }, [initialUsage]);

  const {
    percentage,
    formattedUsed,
    formattedQuota,
    formattedRemaining,
    isWarning,
    isCritical,
    isExceeded,
    fileCount,
  } = usage;

  // Determine indicator colors
  const barColor = isExceeded
    ? 'bg-rose-900'
    : isCritical
    ? 'bg-rose-700'
    : isWarning
    ? 'bg-amber-700'
    : 'bg-oxblood';

  // Compact variant for /upload page
  if (compact) {
    return (
      <div
        className={cn(
          'p-3.5 bg-paper border text-left space-y-2 transition-colors',
          isExceeded
            ? 'border-rose-900/40 bg-rose-950/5'
            : isWarning
            ? 'border-amber-900/30 bg-amber-950/5'
            : 'border-ink/15',
          className
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-oxblood shrink-0" />
            <span className="font-medium text-ink">Private Storage Allowance</span>
          </div>
          <span className="meta-mono text-[11px] text-ash">
            {formattedRemaining} available of {formattedQuota}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-bone border border-ink/10 overflow-hidden rounded-xs"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Private storage quota progress"
        >
          <div
            className={cn('h-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(100, Math.max(1, percentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] meta-mono text-ash pt-0.5">
          <span>{formattedUsed} stored</span>
          <span>{percentage}% capacity</span>
        </div>

        {isExceeded && showUpgradeButton && (
          <div className="pt-2 border-t border-ink/10 flex items-center justify-between gap-3">
            <span className="text-[11px] text-rose-900 font-sans">
              Quota reached. Upgrade required for additional private uploads.
            </span>
            <Link href="/upgrade">
              <RadialGlowButton className="min-w-[120px] min-h-[34px] py-1.5 px-3 text-xs">
                Upgrade to Clio Plus ↗
              </RadialGlowButton>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Full editorial panel for /profile
  return (
    <div
      className={cn(
        'p-6 sm:p-7 bg-card border border-ink/20 shadow-xs space-y-6',
        isExceeded && 'border-rose-900/40 bg-rose-950/5',
        className
      )}
    >
      {/* Header with Title & Quota Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-paper border border-ink/15 text-oxblood shrink-0">
            <HardDrive className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-medium text-ink leading-tight">
              Private Storage
            </h3>
            <p className="meta-mono text-xs text-ash mt-0.5">
              Personal Repository · 50 GB Quota
            </p>
          </div>
        </div>

        {/* Dynamic status badge */}
        <div>
          {isExceeded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs meta-mono font-medium bg-rose-100 text-rose-950 border border-rose-300 rounded-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-800" />
              <span>Quota Reached (100%)</span>
            </span>
          ) : isCritical ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs meta-mono font-medium bg-rose-50 text-rose-900 border border-rose-200 rounded-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
              <span>Near Capacity ({percentage}%)</span>
            </span>
          ) : isWarning ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs meta-mono font-medium bg-amber-50 text-amber-900 border border-amber-200 rounded-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>Quota Notice ({percentage}%)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs meta-mono font-medium bg-bone text-ink border border-ink/15 rounded-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-oxblood" />
              <span>Standard Allocation</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Usage Figures */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-display text-2xl sm:text-3xl text-ink font-normal tracking-tight">
            <span>{formattedUsed}</span>
            <span className="text-ash font-sans text-base sm:text-lg font-light ml-2">
              used of {formattedQuota}
            </span>
          </div>

          <div className="meta-mono text-xs sm:text-sm text-oxblood font-semibold">
            {formattedRemaining} available
          </div>
        </div>

        {/* Restrained Progress Bar */}
        <div
          className="w-full h-2.5 bg-paper border border-ink/15 overflow-hidden rounded-xs"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Private storage quota"
        >
          <div
            className={cn('h-full transition-all duration-500', barColor)}
            style={{ width: `${Math.min(100, Math.max(0.5, percentage))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs meta-mono text-ash pt-1">
          <span>
            {fileCount} {fileCount === 1 ? 'private folio' : 'private folios'} catalogued
          </span>
          <span>{percentage}% utilized</span>
        </div>
      </div>

      {/* Contextual Advisory Warnings */}
      {isExceeded ? (
        <div className="p-3.5 bg-rose-100/60 border border-rose-300 rounded-xs text-xs text-rose-950 leading-relaxed space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-800 shrink-0" />
            <span>Private Storage Limit Reached</span>
          </p>
          <p>
            Your account has utilized all 50 GB of private storage. To upload new private documents or course packs, remove existing private folios or upgrade to Clio Plus.
          </p>
        </div>
      ) : isCritical ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xs text-xs text-rose-900 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <p>
            You are operating at <strong>{percentage}%</strong> capacity with only{' '}
            <strong>{formattedRemaining}</strong> remaining. We recommend preparing for Clio Plus or archiving unneeded files.
          </p>
        </div>
      ) : isWarning ? (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xs text-xs text-amber-900 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            You have utilized over 80% of your private storage allowance. Explore Clio Plus for expanded institutional storage tiers.
          </p>
        </div>
      ) : null}

      {/* Action Row: Upgrade CTA & Academic Notice */}
      <div className="pt-4 border-t border-ink/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 max-w-sm">
          <p className="text-xs text-ash leading-relaxed">
            Need expanded private archive capacity or institutional group folios?
          </p>
          <p className="meta-mono text-[10px] text-ash/80">
            Public library contributions never count against this quota.
          </p>
        </div>

        {showUpgradeButton && (
          <div className="shrink-0">
            <Link href="/upgrade" className="inline-block">
              <RadialGlowButton>Upgrade to Clio Plus ↗</RadialGlowButton>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default PrivateStoragePanel;
