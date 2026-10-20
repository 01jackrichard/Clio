import React from 'react';
import { Container } from '@/components/ui/container';

export default function DocumentDetailLoading() {
  return (
    <div className="bg-paper min-h-screen py-8 sm:py-12 animate-pulse">
      <Container className="space-y-8">
        {/* Navigation Breadcrumb Skeleton */}
        <div className="flex items-center justify-between border-b border-ink/15 pb-4">
          <div className="h-4 w-36 bg-bone/70" />
          <div className="h-4 w-28 bg-bone/50 hidden sm:block" />
        </div>

        {/* Main Document Folio Header Card Skeleton */}
        <div className="bg-card border border-ink/15 p-6 sm:p-10 space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-6 w-20 bg-bone" />
                <div className="h-6 w-28 bg-bone/60" />
                <div className="h-6 w-32 bg-bone/40" />
              </div>
              <div className="h-9 sm:h-12 w-4/5 bg-bone" />
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="h-4 w-32 bg-bone/60" />
                <div className="h-4 w-24 bg-bone/50" />
                <div className="h-4 w-36 bg-bone/50" />
              </div>
            </div>
            <div className="h-10 w-36 bg-bone/80 shrink-0" />
          </div>
        </div>

        {/* Reader Frame Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="h-6 w-48 bg-bone" />
            <div className="h-4 w-40 bg-bone/50 hidden sm:block" />
          </div>
          <div className="w-full h-[680px] sm:h-[780px] bg-card border border-ink/20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-ink/20 border-t-ink/60 animate-spin" />
            <div className="h-4 w-32 bg-bone/70" />
          </div>
        </div>
      </Container>
    </div>
  );
}
