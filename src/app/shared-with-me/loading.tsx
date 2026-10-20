import React from 'react';
import { Container } from '@/components/ui/container';

export default function SharedWithMeLoading() {
  return (
    <div className="bg-paper min-h-screen py-8 sm:py-12 animate-pulse">
      <Container className="space-y-8">
        {/* Editorial Page Header Skeleton */}
        <div className="space-y-2 pb-6 border-b border-ink/10">
          <div className="h-3 w-32 bg-bone/80" />
          <div className="h-8 sm:h-10 w-56 bg-bone" />
          <div className="h-4 w-96 max-w-full bg-bone/60" />
        </div>

        {/* Shared items Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-60 bg-card border border-ink/10 p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 bg-bone/70" />
                  <div className="h-4 w-16 bg-bone/60" />
                </div>
                <div className="h-6 w-4/5 bg-bone" />
                <div className="h-4 w-full bg-bone/50" />
              </div>
              <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
                <div className="h-3 w-32 bg-bone/60" />
                <div className="h-3 w-20 bg-bone/60" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
