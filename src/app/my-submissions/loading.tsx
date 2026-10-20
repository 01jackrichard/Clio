import React from 'react';
import { Container } from '@/components/ui/container';

export default function MySubmissionsLoading() {
  return (
    <Container className="py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Editorial Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-ink/10">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-bone/80" />
          <div className="h-8 sm:h-10 w-64 bg-bone" />
          <div className="h-4 w-96 max-w-full bg-bone/60" />
        </div>
        <div className="h-10 w-44 bg-bone" />
      </div>

      {/* Status Filter Tabs Skeleton */}
      <div className="flex gap-2 border-b border-ink/10 pb-3">
        {[80, 96, 90, 84].map((width, i) => (
          <div key={i} className="h-8 bg-bone/60" style={{ width: `${width}px` }} />
        ))}
      </div>

      {/* Submissions List Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-card border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-bone/80" />
                <div className="h-4 w-16 bg-bone/60" />
              </div>
              <div className="h-5 w-3/4 max-w-md bg-bone" />
              <div className="h-3.5 w-1/2 max-w-sm bg-bone/60" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 bg-bone/60" />
              <div className="h-8 w-8 bg-bone/60" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
