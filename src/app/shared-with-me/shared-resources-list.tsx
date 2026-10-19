'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  User,
  Share2,
  Building2,
} from 'lucide-react';
import { SharedWithMeItem } from '@/lib/services/sharing-service';
import { formatDate, formatBytes } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { buttonVariants } from '@/components/ui/button';

interface SharedResourcesListProps {
  initialItems: SharedWithMeItem[];
}

export function SharedResourcesList({ initialItems }: SharedResourcesListProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'document' | 'collection'>('all');

  const counts = useMemo(() => {
    return {
      all: initialItems.length,
      documents: initialItems.filter((i) => i.resourceType === 'document').length,
      collections: initialItems.filter((i) => i.resourceType === 'collection').length,
    };
  }, [initialItems]);

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      // Type filter
      if (filterType !== 'all' && item.resourceType !== filterType) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q) || false;
        const ownerMatch = item.ownerName.toLowerCase().includes(q);
        const subjectMatch = item.subject?.toLowerCase().includes(q) || false;
        const deptMatch = item.department?.toLowerCase().includes(q) || false;
        return titleMatch || descMatch || ownerMatch || subjectMatch || deptMatch;
      }

      return true;
    });
  }, [initialItems, filterType, search]);

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-ink/10 pb-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ash absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title, subject, or author..."
            className="pl-9 text-xs bg-paper border-ink/20"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'all'}
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs meta-mono border transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-ink text-paper border-ink font-semibold'
                : 'bg-card text-ink border-ink/15 hover:border-ink/40'
            }`}
          >
            All Resources ({counts.all})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'document'}
            onClick={() => setFilterType('document')}
            className={`px-3 py-1.5 text-xs meta-mono border transition-colors cursor-pointer ${
              filterType === 'document'
                ? 'bg-ink text-paper border-ink font-semibold'
                : 'bg-card text-ink border-ink/15 hover:border-ink/40'
            }`}
          >
            Folios ({counts.documents})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filterType === 'collection'}
            onClick={() => setFilterType('collection')}
            className={`px-3 py-1.5 text-xs meta-mono border transition-colors cursor-pointer ${
              filterType === 'collection'
                ? 'bg-ink text-paper border-ink font-semibold'
                : 'bg-card text-ink border-ink/15 hover:border-ink/40'
            }`}
          >
            Course Packs ({counts.collections})
          </button>
        </div>
      </div>

      {/* Grid of Shared Resources */}
      {filteredItems.length === 0 ? (
        <Card className="p-12 sm:p-16 text-center bg-card border-ink/15 space-y-4">
          <div className="w-12 h-12 bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center mx-auto">
            <Share2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-display text-xl sm:text-2xl font-medium text-ink">
              {search.trim() ? 'No Matching Shared Folios' : 'No Shared Materials Yet'}
            </h3>
            <p className="text-xs sm:text-sm text-ash leading-relaxed font-sans">
              {search.trim()
                ? `No shared resources matched “${search}”. Try clearing your search or switching filter categories.`
                : 'When fellow scholars or instructors share private lecture folios or course packs with you, opening their invitation link grants persistent access and indexes the material right here.'}
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/documents"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              <span>Explore Public Catalogue</span>
              <ArrowUpRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-6 sm:p-7 bg-card border-ink/15 hover:border-oxblood/40 transition-colors flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3.5">
                {/* Header row with badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.resourceType === 'document' ? 'oxblood' : 'neutral'}
                      size="sm"
                      dot
                    >
                      {item.resourceType === 'document' ? 'Protected Folio' : 'Course Pack'}
                    </Badge>
                    {item.subjectCode && (
                      <span className="px-2 py-0.5 font-mono text-[11px] font-semibold bg-bone text-ink border border-ink/20">
                        {item.subjectCode}
                      </span>
                    )}
                  </div>

                  <span className="meta-mono text-[10px] text-ash">
                    Granted {formatDate(item.grantedAt)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-xl sm:text-2xl font-medium text-ink tracking-tight leading-snug">
                  <Link
                    href={
                      item.resourceType === 'document'
                        ? `/documents/${item.resourceId}`
                        : `/collections/${item.slug || item.resourceId}`
                    }
                    className="hover:text-oxblood transition-colors"
                  >
                    {item.title}
                  </Link>
                </h3>

                {/* Description snippet */}
                {item.description && (
                  <p className="font-sans text-xs sm:text-sm text-ash line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {/* Academic Metadata Strip */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 meta-mono text-[11px] text-ash pt-1">
                  {item.department && (
                    <div className="flex items-center gap-1 text-ink/90">
                      <Building2 className="w-3 h-3 text-ash shrink-0" />
                      <span>{item.department}</span>
                    </div>
                  )}

                  {item.semester && (
                    <>
                      <span className="text-ink/20">•</span>
                      <span>{item.semester}</span>
                    </>
                  )}

                  {item.fileSize && item.fileSize > 0 && (
                    <>
                      <span className="text-ink/20">•</span>
                      <span>{formatBytes(item.fileSize)}</span>
                    </>
                  )}

                  {item.documentCount !== undefined && (
                    <>
                      <span className="text-ink/20">•</span>
                      <span>
                        {item.documentCount}{' '}
                        {item.documentCount === 1 ? 'folio' : 'folios'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer Row: Sharing user and direct access CTA */}
              <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-ash">
                  <User className="w-3.5 h-3.5 text-oxblood shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">
                    Shared by <strong className="text-ink font-medium">{item.ownerName}</strong>
                  </span>
                </div>

                <Link
                  href={
                    item.resourceType === 'document'
                      ? `/documents/${item.resourceId}`
                      : `/collections/${item.slug || item.resourceId}`
                  }
                  className={buttonVariants({
                    variant: 'primary',
                    size: 'sm',
                    className: 'gap-1.5 shrink-0 text-xs',
                  })}
                >
                  <span>Open {item.resourceType === 'document' ? 'Reader' : 'Pack'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
