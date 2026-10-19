'use client';

import React, { useEffect, useState } from 'react';
import { WaveGridBackground } from '@/components/ui/wave-grid-background';
import { createClient } from '@/lib/supabase/client';
import { resolveDisplayName, formatWelcomeGreeting } from '@/lib/utils';

interface CatalogueWelcomeProps {
  displayName?: string | null;
}

export function CatalogueWelcome({ displayName: initialDisplayName }: CatalogueWelcomeProps) {
  const [resolvedName, setResolvedName] = useState<string | null>(() => {
    return resolveDisplayName(initialDisplayName);
  });

  // Client-side hydration verification: ensure browser session profile data
  // (e.g. from Google OAuth metadata or Supabase profiles table) is applied
  useEffect(() => {
    let isMounted = true;

    async function checkClientUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle();

        const actualName = resolveDisplayName(
          profile?.display_name,
          user.user_metadata,
          user.email
        );

        if (actualName && isMounted) {
          setResolvedName(actualName);
        }
      } catch {
        // Fallback gracefully without throwing
      }
    }

    checkClientUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const greeting = formatWelcomeGreeting(resolvedName);

  return (
    <section
      aria-label="Welcome section"
      className="relative w-full border-b border-ink/15 bg-[#F2EFE9] overflow-hidden"
    >
      <WaveGridBackground
        className="w-full h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px]"
        colorBase="#F2EFE9"
        colorHigh="#7A1F1D"
        colorHighlight="#E5DFD5"
        colorShadow="#D8CFC4"
        waveAmplitude={0.34}
        waveSpeed={4.2}
        waveFrequency={1.05}
        waveWidth={3.8}
        waveMaxHeight={0.38}
        waveJitter={0.015}
        gridSize={52}
        vignette={false}
        autoAnimate={true}
      >
        {/* Single primary element: oversized, centered, editorial Fraunces greeting */}
        <div className="absolute inset-0 flex items-center justify-center text-center px-4 sm:px-6 md:px-8 pointer-events-none">
          <h1 className="font-display font-normal text-[#121110] tracking-tight leading-[1.08] select-none text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5rem] max-w-4xl text-balance">
            {greeting}
          </h1>
        </div>
      </WaveGridBackground>
    </section>
  );
}

export default CatalogueWelcome;
