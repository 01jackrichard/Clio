'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, BookOpen, Archive } from 'lucide-react';
import { DocumentRecord } from '@/types/database';
import { DocumentCard } from '@/components/document-card';
import { Card } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

interface FavoritesListProps {
  initialFavorites: DocumentRecord[];
}

export function FavoritesList({ initialFavorites }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<DocumentRecord[]>(initialFavorites);

  const handleFavoriteChange = (docId: string, isFav: boolean) => {
    // When a document is un-bookmarked from the favorites page, immediately remove it without full page reload
    if (!isFav) {
      setFavorites((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  if (favorites.length === 0) {
    return (
      <Card variant="paper" className="p-12 sm:p-16 text-center border-dashed border-ink/20 space-y-4">
        <div className="w-14 h-14 rounded-full bg-bone border border-ink/15 flex items-center justify-center mx-auto text-ash">
          <Bookmark className="w-6 h-6 text-oxblood" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="font-display text-xl sm:text-2xl font-medium text-ink tracking-tight">
            Personal Study Archive is Empty
          </h3>
          <p className="font-sans text-xs sm:text-sm text-ash leading-relaxed">
            You have not pinned any study materials yet. Click the bookmark ribbon on any document in the catalogue to save it here for quick access during semester exams.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/documents"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span>Browse Academic Catalogue</span>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Count Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ink/10 meta-mono text-xs text-ash">
        <span className="flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5 text-oxblood" />
          <span>
            {favorites.length} saved {favorites.length === 1 ? 'folio' : 'folios'} in study collection
          </span>
        </span>
        <span>Instant Sync</span>
      </div>

      {/* Grid of Canonical Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((doc, idx) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            index={idx + 1}
            initiallyFavorited={true}
            onFavoriteChange={(isFav) => handleFavoriteChange(doc.id, isFav)}
          />
        ))}
      </div>
    </div>
  );
}
