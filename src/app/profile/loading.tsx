import React from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <Container className="py-8 sm:py-12 space-y-10 animate-pulse">
      {/* Editorial Page Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-ink/10">
        <div className="h-3 w-32 bg-bone/80" />
        <div className="h-8 sm:h-10 w-56 bg-bone" />
        <div className="h-4 w-96 max-w-full bg-bone/60" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column Skeleton */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="paper" className="p-6 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-bone mx-auto" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-bone mx-auto" />
              <div className="h-4 w-44 bg-bone/60 mx-auto" />
            </div>
            <div className="pt-4 border-t border-ink/10 flex justify-center gap-2">
              <div className="h-6 w-20 bg-bone/70" />
              <div className="h-6 w-20 bg-bone/70" />
            </div>
          </Card>
        </div>

        {/* Right Column Skeleton */}
        <div className="lg:col-span-8 space-y-6">
          <Card variant="paper" className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2 border-b border-ink/10 pb-4">
              <div className="h-5 w-40 bg-bone" />
              <div className="h-4 w-72 bg-bone/60" />
            </div>
            <div className="space-y-4">
              <div className="h-10 w-full bg-bone/50" />
              <div className="h-10 w-full bg-bone/50" />
              <div className="h-10 w-full bg-bone/50" />
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}
