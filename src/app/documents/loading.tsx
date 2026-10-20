import React from 'react';
import { Container } from '@/components/ui/container';

export default function DocumentsLoading() {
  return (
    <div className="bg-paper min-h-screen animate-pulse">
      {/* Editorial Welcome Strip Skeleton */}
      <section className="relative overflow-hidden border-b border-[#E5DFD5] bg-[#F2EFE9] pt-8 sm:pt-14 pb-10 sm:pb-16">
        <Container className="relative z-10 max-w-7xl">
          <div className="max-w-3xl space-y-4">
            {/* Greeting skeleton */}
            <div className="h-7 w-64 bg-bone/70 rounded-xs" />
            {/* Hero MorphText title skeleton */}
            <div className="h-12 sm:h-16 w-3/4 max-w-lg bg-bone rounded-xs" />
            {/* Thesis subtitle skeleton */}
            <div className="h-4 sm:h-5 w-full max-w-xl bg-bone/60 rounded-xs" />
          </div>

          {/* Editorial museum index stats skeleton */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#E5DFD5]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {[0, 1].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-32 bg-bone/80 rounded-xs" />
                  <div className="h-8 sm:h-10 w-16 bg-bone rounded-xs" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Discovery Filters & Cards Skeleton */}
      <div className="py-6 sm:py-10">
        <Container className="space-y-6">
          {/* Institution Explorer Bar */}
          <div className="h-14 bg-card border border-ink/10 rounded-none" />

          {/* Mode Selector & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="h-10 w-72 bg-bone/60 rounded-none" />
            <div className="h-10 w-48 bg-bone/60 rounded-none" />
          </div>

          {/* Document Folio Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-card border border-ink/10 p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 bg-bone/70" />
                    <div className="h-4 w-12 bg-bone/60" />
                  </div>
                  <div className="h-6 w-5/6 bg-bone" />
                  <div className="h-4 w-full bg-bone/50" />
                  <div className="h-4 w-2/3 bg-bone/50" />
                </div>
                <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
                  <div className="h-3 w-28 bg-bone/60" />
                  <div className="h-3 w-16 bg-bone/60" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
