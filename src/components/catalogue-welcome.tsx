'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { WaveGridBackground } from '@/components/ui/wave-grid-background';
import { MorphText } from '@/components/ui/morph-text';
import type { CatalogueAuthStats } from '@/lib/services/catalogue-stats-service';
import { resolveDisplayName } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

interface CatalogueWelcomeProps {
  displayName?: string | null;
  initialStats?: CatalogueAuthStats | null;
  totalPreserved?: number;
}

export function CatalogueWelcome({
  displayName: initialDisplayName,
  initialStats,
  totalPreserved,
}: CatalogueWelcomeProps) {
  const [stats, setStats] = useState<CatalogueAuthStats | null>(initialStats ?? null);
  const [resolvedName, setResolvedName] = useState<string | null>(() => {
    return initialStats?.displayName || resolveDisplayName(initialDisplayName);
  });

  // Client hydration check: re-fetch from authoritative API if server didn't supply stats
  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const res = await fetch('/api/user/catalogue-stats');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.stats && isMounted) {
          setStats(data.stats);
          if (data.stats.displayName) {
            setResolvedName(data.stats.displayName);
          }
        }
      } catch {
        // Fallback silently to initialStats
      }
    }

    if (!initialStats) {
      loadStats();
    }

    return () => {
      isMounted = false;
    };
  }, [initialStats]);

  const isAuthenticated = stats?.isAuthenticated ?? !!resolvedName;
  const isAdmin = stats?.role === 'admin';
  const metrics = stats?.metrics;

  const greeting = isAuthenticated
    ? `Welcome back, ${resolvedName || 'Scholar'}.`
    : 'Preserved Scholarship · Academic Archive';

  return (
    <section
      aria-label="Catalogue welcome folio"
      className="relative w-full border-b border-ink/15 bg-paper overflow-hidden"
    >
      <WaveGridBackground
        className="w-full min-h-[380px] sm:min-h-[420px] md:min-h-[460px]"
        colorBase="#F2EFE9"
        colorHigh="#7A1F1D"
        colorHighlight="#E5DFD5"
        colorShadow="#D8CFC4"
        waveAmplitude={0.52}
        waveSpeed={4.6}
        waveFrequency={0.95}
        waveWidth={4.4}
        waveMaxHeight={0.58}
        waveJitter={0.015}
        gridSize={52}
        vignette={false}
        autoAnimate={true}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6 md:px-8 py-10 pointer-events-none select-none">
          {/* Eyebrow: Personal Greeting or Institutional Salutation */}
          <div className="mb-2 sm:mb-3">
            <h1 className="meta-mono text-xs sm:text-[13px] text-oxblood uppercase tracking-widest font-medium">
              {greeting}
            </h1>
          </div>

          {/* MorphText: Academic cycle DISCOVER -> LEARN -> CONTRIBUTE -> PRESERVE */}
          <MorphText
            words={['DISCOVER', 'LEARN', 'CONTRIBUTE', 'PRESERVE']}
            interval={3000}
            fontSize="clamp(2.1rem, 5.2vw, 3.8rem)"
            className="my-1 sm:my-2"
            textClassName="text-ink font-display font-medium tracking-tight"
          />

          {/* Supporting Editorial Sentence */}
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-ash max-w-xl mx-auto leading-relaxed text-balance">
            Find useful academic resources, save what matters, and share what you learn.
          </p>

          {/* Role-Based Archive Metrics Strip */}
          <div className="mt-7 sm:mt-9 w-full max-w-3xl pointer-events-auto">
            {isAuthenticated && metrics ? (
              isAdmin ? (
                /* Admin: 4 authoritatively calculated metrics */
                <div
                  className="grid grid-cols-2 md:grid-cols-4 border border-ink/15 bg-paper/90 backdrop-blur-sm divide-x divide-y md:divide-y-0 divide-ink/15 shadow-sm text-left"
                  aria-label="Archival metrics"
                >
                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-wider">
                      01 — My Contributions
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.myContributions}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-wider">
                      02 — Saved Folios
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.savedFolios}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-wider font-medium">
                      03 — Archive Resources
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.archiveResources ?? 0}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-wider font-medium">
                      04 — Contributors
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.contributors ?? 0}
                    </span>
                  </div>
                </div>
              ) : (
                /* Normal User: Personal metrics only — never leaks admin or global metrics */
                <div
                  className="grid grid-cols-2 max-w-md mx-auto border border-ink/15 bg-paper/90 backdrop-blur-sm divide-x divide-ink/15 shadow-sm text-left"
                  aria-label="Personal contribution metrics"
                >
                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-wider">
                      01 — My Contributions
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.myContributions}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-wider">
                      02 — Saved Folios
                    </span>
                    <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                      {metrics.savedFolios}
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* Guest / Public Scholar Strip */
              <div
                className="grid grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto border border-ink/15 bg-paper/90 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-ink/15 shadow-sm text-left"
                aria-label="Public catalogue overview"
              >
                <div className="p-3.5 sm:p-4">
                  <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-wider">
                    01 — Preserved Resources
                  </span>
                  <span className="mt-1 block font-display text-xl sm:text-2xl text-ink font-normal">
                    {totalPreserved !== undefined ? totalPreserved : 'Indexed'}
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 flex flex-col justify-between">
                  <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-wider font-medium">
                    02 — Scholar Folio
                  </span>
                  <Link
                    href="/auth/login?redirectTo=/documents"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-oxblood transition-colors"
                  >
                    <span>Sign in to save & contribute</span>
                    <ArrowUpRight className="w-3 h-3 text-oxblood" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </WaveGridBackground>
    </section>
  );
}

export default CatalogueWelcome;
