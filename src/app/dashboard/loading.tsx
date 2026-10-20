import React from 'react';
import { Container } from '@/components/ui/container';

export default function DashboardLoading() {
  return (
    <Container className="py-8 sm:py-12 space-y-8 animate-pulse">
      <div className="space-y-2 pb-6 border-b border-ink/10">
        <div className="h-3 w-32 bg-bone/80" />
        <div className="h-8 sm:h-10 w-64 bg-bone" />
        <div className="h-4 w-96 max-w-full bg-bone/60" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 bg-card border border-ink/10 p-5 space-y-3">
            <div className="h-4 w-28 bg-bone/70" />
            <div className="h-8 w-16 bg-bone" />
          </div>
        ))}
      </div>
    </Container>
  );
}
