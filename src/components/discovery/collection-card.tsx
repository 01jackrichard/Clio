'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowUpRight, Lock, BookOpen } from 'lucide-react';
import { CollectionRecord } from '@/types/database';

interface CollectionCardProps {
  collection: CollectionRecord;
  layout?: 'grid' | 'list';
  index?: number;
}

export function CollectionCard({
  collection,
  layout = 'grid',
  index = 1,
}: CollectionCardProps) {
  const formattedIndex = index < 10 ? `0${index}` : `${index}`;
  const docCount = collection.document_count ?? 0;

  if (layout === 'list') {
    return (
      <article className="group relative bg-card border border-ink/15 hover:border-ink transition-colors duration-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Information */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 meta-mono text-ash text-xs">
            <span className="text-oxblood font-semibold">COL Nº {formattedIndex}</span>
            <span className="h-px w-4 bg-ink/20" aria-hidden="true" />
            <span className="inline-flex items-center gap-1 text-ink font-medium">
              <Layers className="w-3.5 h-3.5 text-oxblood" />
              <span>Curated Collection</span>
            </span>
            <span className="text-ink/20" aria-hidden="true">•</span>
            <span className="px-1.5 py-0.2 bg-bone border border-ink/20 text-oxblood font-semibold text-[10px]">
              {docCount} {docCount === 1 ? 'Folio' : 'Folios'}
            </span>
            {collection.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-oxblood font-semibold">
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </span>
            )}
          </div>

          <Link href={`/collections/${collection.slug || collection.id}`} className="block group/link">
            <h3 className="font-display text-lg sm:text-xl font-medium text-ink group-hover/link:text-oxblood transition-colors truncate">
              {collection.title}
            </h3>
          </Link>

          {collection.description && (
            <p className="text-xs text-ash line-clamp-1 leading-relaxed">
              {collection.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 meta-mono text-[11px] text-ash">
            {collection.department && <span>{collection.department}</span>}
            {collection.semester && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span>{collection.semester}</span>
              </>
            )}
            {collection.regulation && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span>Reg. {collection.regulation}</span>
              </>
            )}
            {collection.owner_name && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span>Curated by {collection.owner_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2 sm:self-center shrink-0">
          <Link
            href={`/collections/${collection.slug || collection.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-paper border border-ink/20 group-hover:border-ink text-xs meta-mono text-ink group-hover:text-oxblood transition-colors font-medium"
          >
            <span>Inspect Pack</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </article>
    );
  }

  // Grid layout (balanced card with multi-layer aesthetic)
  return (
    <article className="group relative flex flex-col justify-between p-6 bg-card border border-ink/15 hover:border-ink transition-colors duration-300 relative before:absolute before:inset-0 before:-top-1.5 before:-right-1.5 before:border before:border-ink/10 before:-z-10 before:bg-paper">
      <div>
        {/* Top Metadata Line */}
        <div className="flex items-center justify-between meta-mono text-ash mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-oxblood font-semibold">COL Nº {formattedIndex}</span>
            <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
            <span className="inline-flex items-center gap-1 text-ink font-medium">
              <Layers className="w-3.5 h-3.5 text-oxblood" />
              <span>Course Pack</span>
            </span>
            {collection.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-oxblood font-semibold">
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 bg-bone border border-ink/20 text-oxblood font-semibold text-[11px]">
              {docCount} {docCount === 1 ? 'Folio' : 'Folios'}
            </span>
          </div>
        </div>

        {/* Title */}
        <Link href={`/collections/${collection.slug || collection.id}`} className="block group/link mb-2">
          <h3 className="font-display text-xl sm:text-2xl leading-tight tracking-[-0.02em] text-ink group-hover/link:text-oxblood transition-colors">
            {collection.title}
          </h3>
        </Link>

        {/* Supporting Taxonomy */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {collection.department && (
            <span className="px-1.5 py-0.5 font-mono text-[11px] bg-bone text-ink border border-ink/20">
              {collection.department}
            </span>
          )}
          {collection.semester && (
            <span className="font-display italic text-sm text-ash">
              {collection.semester}
            </span>
          )}
          {collection.regulation && (
            <span className="meta-mono text-xs text-ash">
              (Reg. {collection.regulation})
            </span>
          )}
        </div>

        {/* Description */}
        {collection.description && (
          <p className="text-xs text-ash line-clamp-2 leading-relaxed mb-4">
            {collection.description}
          </p>
        )}
      </div>

      {/* Bottom Strip */}
      <div className="pt-4 border-t border-ink/10 flex items-center justify-between text-xs meta-mono text-ash">
        <div className="flex items-center gap-1.5 truncate max-w-[200px]">
          <BookOpen className="w-3.5 h-3.5 text-oxblood shrink-0" />
          <span className="truncate">
            {collection.owner_name ? `Curated by ${collection.owner_name}` : 'Academic Pack'}
          </span>
        </div>

        <Link
          href={`/collections/${collection.slug || collection.id}`}
          className="flex h-8 w-8 items-center justify-center border border-ink/30 group-hover:bg-ink group-hover:text-paper transition-colors duration-300"
          title="Inspect Collection"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
