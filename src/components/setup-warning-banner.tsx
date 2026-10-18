'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle, ChevronRight, X, Key, Database, ShieldCheck } from 'lucide-react';
import { config } from '@/lib/config';

interface SetupWarningBannerProps {
  supabaseConfigured: boolean;
  r2Configured?: boolean;
  missingServerKeys?: string[];
}

export function SetupWarningBanner({
  supabaseConfigured,
  missingServerKeys = [],
}: SetupWarningBannerProps) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Never render on the landing page
  if (!pathname || pathname === '/' || dismissed) return null;

  const isDomainRestricted = config.auth.registrationMode === 'domain_restricted';
  const hasDomains = config.auth.allowedDomains.length > 0;
  const showDomainWarning = isDomainRestricted && !hasDomains;

  const hasConfigIssues = !supabaseConfigured || showDomainWarning;

  if (!hasConfigIssues) return null;

  return (
    <aside className="bg-bone border-b border-ink/20 text-ink text-xs py-2.5">
      <div className="container-editorial flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-oxblood shrink-0" />
          <span className="text-xs">
            <strong className="font-semibold text-ink">System Configuration Notice:</strong>{' '}
            {!supabaseConfigured && 'Supabase database pending. '}
            {missingServerKeys.length > 0 && `(Keys: ${missingServerKeys.join(', ')}) `}
            {showDomainWarning && 'Domain restriction active without allowed domains. '}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="link-underline meta-mono text-ink flex items-center gap-1 cursor-pointer"
          >
            <span>{detailsOpen ? 'Hide' : 'Setup Guide'}</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${detailsOpen ? 'rotate-90' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="text-ash hover:text-ink p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {detailsOpen && (
        <div className="container-editorial mt-3 pt-3 border-t border-ink/15 text-xs space-y-2">
          <p className="font-display italic text-sm text-ink">
            Configure local credentials in <code className="meta-mono bg-paper px-1 py-0.5 border border-ink/20">.env.local</code>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="bg-paper p-3 border border-ink/15">
              <div className="flex items-center gap-1.5 font-medium mb-1 text-ink">
                <Database className="w-3.5 h-3.5 text-oxblood" />
                <span className="meta-mono">01. Supabase PostgreSQL</span>
              </div>
              <p className="text-ash text-[11px] leading-relaxed">
                Add <code className="bg-bone px-1 py-0.2 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-bone px-1 py-0.2 rounded font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>.
              </p>
            </div>

            <div className="bg-paper p-3 border border-ink/15">
              <div className="flex items-center gap-1.5 font-medium mb-1 text-ink">
                <Key className="w-3.5 h-3.5 text-oxblood" />
                <span className="meta-mono">02. Google Drive Repository</span>
              </div>
              <p className="text-ash text-[11px] leading-relaxed">
                PDFs are stored in your central Google Drive institutional repository and embedded directly in-app.
              </p>
            </div>

            <div className="bg-paper p-3 border border-ink/15">
              <div className="flex items-center gap-1.5 font-medium mb-1 text-ink">
                <ShieldCheck className="w-3.5 h-3.5 text-oxblood" />
                <span className="meta-mono">03. Admission Policy</span>
              </div>
              <p className="text-ash text-[11px] leading-relaxed">
                Set <code className="bg-bone px-1 py-0.2 rounded font-mono">NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=yourcollege.edu</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

