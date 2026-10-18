'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { SetupWarningBanner } from '@/components/setup-warning-banner';

interface NavigationWrapperProps {
  supabaseConfigured: boolean;
  r2Configured?: boolean;
  missingServerKeys?: string[];
}

export function NavigationWrapper({
  supabaseConfigured,
  missingServerKeys = [],
}: NavigationWrapperProps) {
  const pathname = usePathname();

  // The Liquid Sculpture Hero owns the navigation on the landing page exclusively.
  // Never render the shared navbar or setup banner above the hero on the root path.
  if (!pathname || pathname === '/') {
    return null;
  }

  return (
    <>
      <SetupWarningBanner
        supabaseConfigured={supabaseConfigured}
        missingServerKeys={missingServerKeys}
      />
      <Navbar />
    </>
  );
}

