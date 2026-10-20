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
        waveAmplitude={0.64}
        waveSpeed={4.8}
        waveFrequency={0.95}
        waveWidth={5.0}
        waveMaxHeight={0.68}
        waveJitter={0.015}
        gridSize={52}
        vignette={false}
        autoAnimate={true}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6 md:px-8 py-10 pointer-events-none select-none">
          {/* Eyebrow: Personal Greeting or Institutional Salutation */}
          <div className="mb-3 sm:mb-4">
            <h1
              className="font-display font-light text-ink/90 tracking-[-0.015em] text-center"
              style={{ fontSize: 'clamp(1.35rem, 2vw, 2rem)' }}
            >
              {greeting}
            </h1>
          </div>

          {/* MorphText: Academic cycle DISCOVER -> LEARN -> CONTRIBUTE -> PRESERVE */}
          <MorphText
            words={['DISCOVER', 'LEARN', 'CONTRIBUTE', 'PRESERVE']}
            interval={3000}
            fontSize="clamp(2.5rem, 6vw, 4.25rem)"
            className="my-1 sm:my-2"
            textClassName="text-ink font-display font-medium tracking-tight"
          />

          {/* Supporting Editorial Sentence */}
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-ash max-w-xl mx-auto leading-relaxed text-balance">
            Find useful academic resources, save what matters, and share what you learn.
          </p>

          {/* Role-Based Archive Metrics Strip */}
          <div className="mt-8 sm:mt-10 w-full max-w-4xl pointer-events-auto">
            {isAuthenticated && metrics ? (
              isAdmin ? (
                /* Admin: Personal metrics + Authoritative global archive metrics */
                <div
                  className="grid grid-cols-2 md:grid-cols-5 border border-[#E5DFD5] bg-paper/85 backdrop-blur-[2px] divide-x divide-y md:divide-y-0 divide-[#E5DFD5] text-left max-w-5xl mx-auto"
                  aria-label="Archival metrics"
                >
                  <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      01 — MY CONTRIBUTIONS
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.myContributions}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      02 — SAVED FOLIOS
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.savedFolios}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 sm:px-5 sm:py-4 col-span-2 md:col-span-1">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      03 — PRIVATE STORAGE
                    </span>
                    <span className="mt-1.5 block font-display text-2xl sm:text-3xl text-ink font-normal tracking-tight whitespace-nowrap">
                      {metrics.privateStorageFormatted || '0.0 / 50 GB'}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-[0.14em] font-medium">
                      04 — ARCHIVE RESOURCES
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.archiveResources ?? 0}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-[0.14em] font-medium">
                      05 — CONTRIBUTORS
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.contributors ?? 0}
                    </span>
                  </div>
                </div>
              ) : (
                /* Normal User: 3 personal metrics — thin #E5DFD5 hairlines, large numerals, editorial index style */
                <div
                  className="grid grid-cols-1 sm:grid-cols-3 max-w-2xl mx-auto border border-[#E5DFD5] bg-paper/85 backdrop-blur-[2px] divide-y sm:divide-y-0 sm:divide-x divide-[#E5DFD5] text-left"
                  aria-label="Personal contribution metrics"
                >
                  <div className="px-5 py-3.5 sm:px-6 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      01 — MY CONTRIBUTIONS
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.myContributions}
                    </span>
                  </div>

                  <div className="px-5 py-3.5 sm:px-6 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      02 — SAVED FOLIOS
                    </span>
                    <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                      {metrics.savedFolios}
                    </span>
                  </div>

                  <div className="px-5 py-3.5 sm:px-6 sm:py-4">
                    <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                      03 — PRIVATE STORAGE
                    </span>
                    <span className="mt-1.5 block font-display text-2xl sm:text-3xl text-ink font-normal tracking-tight whitespace-nowrap">
                      {metrics.privateStorageFormatted || '0.0 / 50 GB'}
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* Guest / Public Scholar Strip */
              <div
                className="grid grid-cols-1 sm:grid-cols-2 max-w-lg mx-auto border border-[#E5DFD5] bg-paper/85 backdrop-blur-[2px] divide-y sm:divide-y-0 sm:divide-x divide-[#E5DFD5] text-left"
                aria-label="Public catalogue overview"
              >
                <div className="px-6 py-3.5 sm:px-8 sm:py-4">
                  <span className="block meta-mono text-[10px] sm:text-[11px] text-ash uppercase tracking-[0.14em] font-medium">
                    01 — PRESERVED RESOURCES
                  </span>
                  <span className="mt-1.5 block font-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
                    {totalPreserved !== undefined ? totalPreserved : 'Indexed'}
                  </span>
                </div>

                <div className="px-6 py-3.5 sm:px-8 sm:py-4 flex flex-col justify-between">
                  <span className="block meta-mono text-[10px] sm:text-[11px] text-oxblood uppercase tracking-[0.14em] font-medium">
                    02 — SCHOLAR FOLIO
                  </span>
                  <Link
                    href="/auth/login?redirectTo=/documents"
                    prefetch={true}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-ink hover:text-oxblood transition-colors"
                  >
                    <span>Sign in to save & contribute</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-oxblood" />
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
