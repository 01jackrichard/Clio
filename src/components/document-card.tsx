'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Bookmark,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { DocumentRecord } from '@/types/database';
import { formatBytes, getMaterialTypeBadge } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DocumentCardProps {
  document: DocumentRecord;
  index?: number;
  initiallyFavorited?: boolean;
  onFavoriteChange?: (isFav: boolean) => void;
}

export function DocumentCard({
  document,
  index = 1,
  initiallyFavorited = false,
  onFavoriteChange,
}: DocumentCardProps) {
  const [isFavorited, setIsFavorited] = useState(initiallyFavorited);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const materialBadge = getMaterialTypeBadge(document.material_type);
  const formattedIndex = index < 10 ? `0${index}` : `${index}`;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/favorite`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.isFavorited);
        onFavoriteChange?.(data.isFavorited);
      }
    } catch {
      // Ignored
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloadLoading) return;

    setDownloadLoading(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/download`);
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl && typeof window !== 'undefined') {
          const a = window.document.createElement('a');
          a.href = data.downloadUrl;
          a.download = data.filename || document.original_filename;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to download document');
      }
    } catch {
      alert('An error occurred while preparing your download.');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <article className="group relative flex flex-col justify-between p-6 bg-card border border-ink/15 hover:border-ink transition-colors duration-300">
      <div>
        {/* Top Editorial Metadata Line */}
        <div className="flex items-center justify-between meta-mono text-ash mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-oxblood font-semibold">Nº {formattedIndex}</span>
            <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
            <span className="text-ink font-medium">{materialBadge.label}</span>
          </div>
          <span>{document.semester}</span>
        </div>

        {/* Document Title in Fraunces */}
        <Link href={`/documents/${document.id}`} className="block group/link mb-2">
          <h3 className="font-display text-xl sm:text-2xl leading-tight tracking-[-0.02em] text-ink group-hover/link:text-oxblood transition-colors">
            {document.title}
          </h3>
        </Link>

        {/* Italic Subject & Module Accent */}
        <p className="font-display italic text-sm sm:text-base text-ash leading-snug mb-4">
          {document.subject}
          {document.unit && <span className="text-ink/80 not-italic ml-1 font-sans text-xs">({document.unit})</span>}
        </p>

        {/* Optional Description */}
        {document.description && (
          <p className="text-xs text-ash line-clamp-2 leading-relaxed mb-4">
            {document.description}
          </p>
        )}

        {/* Subject Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {document.tags.slice(0, 3).map((tag, idx) => (
              <Badge
                key={idx}
                variant="neutral"
                size="sm"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Information & Action Strip */}
      <div className="pt-4 border-t border-ink/10 flex items-center justify-between text-xs">
        <div className="flex flex-col meta-mono text-ash">
          <span className="truncate max-w-[170px] text-ink/80">{document.department}</span>
          <span className="truncate max-w-[170px]">
            {formatBytes(document.file_size)} · {document.download_count} dl
            {document.uploader_name ? ` · by ${document.uploader_name}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            aria-label={isFavorited ? 'Remove bookmark' : 'Bookmark resource'}
            className="p-2 border border-ink/20 hover:border-ink transition-colors cursor-pointer text-ink"
            title={isFavorited ? 'Saved in Library' : 'Save to Library'}
          >
            {favoriteLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bookmark className={`w-3.5 h-3.5 ${isFavorited ? 'fill-oxblood text-oxblood' : ''}`} />
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadLoading}
            className="p-2 border border-ink/20 hover:border-ink transition-colors cursor-pointer text-ink"
            title="Download PDF"
          >
            {downloadLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>

          <Link
            href={`/documents/${document.id}`}
            className="flex h-8 w-8 items-center justify-center border border-ink/30 group-hover:bg-ink group-hover:text-paper transition-colors duration-300"
            title="View Full Folio"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
