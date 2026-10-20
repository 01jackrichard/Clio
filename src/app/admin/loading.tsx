import React from 'react';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';

export default function AdminLoading() {
  return (
    <Container className="py-8 sm:py-12 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-6 border-b border-ink/10">
        <div className="h-3 w-36 bg-bone/80" />
        <div className="h-8 sm:h-10 w-72 bg-bone" />
        <div className="h-4 w-96 max-w-full bg-bone/60" />
      </div>

      {/* Top 4 Metrics Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} variant="paper" className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-bone/70" />
              <div className="h-4 w-4 bg-bone/50" />
            </div>
            <div className="h-8 sm:h-9 w-16 bg-bone" />
            <div className="h-3 w-28 bg-bone/50" />
          </Card>
        ))}
      </div>

      {/* Secondary 2 Storage Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <Card key={i} variant="paper" className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 bg-bone/70" />
              <div className="h-4 w-4 bg-bone/50" />
            </div>
            <div className="h-8 w-24 bg-bone" />
            <div className="h-3 w-32 bg-bone/50" />
          </Card>
        ))}
      </div>

      {/* Cloud & Storage Architecture Cards Skeleton */}
      <div className="space-y-4 pt-4">
        <div className="h-3 w-48 bg-bone/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="default" className="p-5 space-y-3">
              <div className="h-3 w-28 bg-bone/70" />
              <div className="h-5 w-40 bg-bone" />
              <div className="h-12 w-full bg-bone/50" />
            </Card>
          ))}
        </div>
      </div>

      {/* Governance Workspaces Directory Skeleton */}
      <div className="space-y-4 pt-4">
        <div className="h-3 w-40 bg-bone/70" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <Card key={i} variant="default" className="p-6 space-y-4">
              <div className="w-10 h-10 rounded-xs bg-bone" />
              <div className="h-6 w-36 bg-bone" />
              <div className="h-12 w-full bg-bone/50" />
              <div className="pt-4 border-t border-ink/10 h-4 w-32 bg-bone/60" />
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
