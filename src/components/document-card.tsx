'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Bookmark,
  ArrowUpRight,
  Loader2,
  Lock,
} from 'lucide-react';
import { DocumentRecord } from '@/types/database';
import { formatBytes, getMaterialTypeBadge } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DocumentCardProps {
  document: DocumentRecord;
  index?: number;
  layout?: 'grid' | 'list';
  showInstitution?: boolean;
  initiallyFavorited?: boolean;
  onFavoriteChange?: (isFav: boolean) => void;
}

export function DocumentCard({
  document,
  index = 1,
  layout = 'grid',
  showInstitution = false,
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

  if (layout === 'list') {
    return (
      <article className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 bg-card border border-ink/15 hover:border-ink transition-colors duration-300">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 meta-mono text-ash text-xs">
            <span className="text-oxblood font-semibold">Nº {formattedIndex}</span>
            <span className="block h-px w-4 bg-ink/20" aria-hidden="true" />
            <span className="text-ink font-medium">{materialBadge.label}</span>
            {document.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-oxblood font-semibold">
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </span>
            )}
            {document.regulation && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span className="text-[11px] text-ash">Reg. {document.regulation}</span>
              </>
            )}
            <span className="text-ink/20" aria-hidden="true">•</span>
            <span>{document.semester}</span>
            {(showInstitution || document.institution) && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span className="px-1.5 py-0.2 bg-bone border border-ink/15 text-[10px] text-ash font-medium truncate max-w-[150px]">
                  {document.institution}
                </span>
              </>
            )}
          </div>

          <Link href={`/documents/${document.id}`} className="block group/link">
            <h3 className="font-display text-lg sm:text-xl font-medium text-ink group-hover/link:text-oxblood transition-colors truncate">
              {document.title}
            </h3>
          </Link>

          <div className="flex flex-wrap items-center gap-1.5">
            {document.subject_code && (
              <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-bone text-ink border border-ink/20">
                {document.subject_code}
              </span>
            )}
            <p className="font-display italic text-xs sm:text-sm text-ash leading-snug">
              {document.subject}
              {document.unit && <span className="text-ink/80 not-italic ml-1 font-sans text-xs">({document.unit})</span>}
            </p>
          </div>

          {document.description && (
            <p className="text-xs text-ash line-clamp-1 leading-relaxed">
              {document.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 meta-mono text-[11px] text-ash pt-1">
            <span className="text-ink/80">{document.department}</span>
            <span className="text-ink/20" aria-hidden="true">•</span>
            <span>{formatBytes(document.file_size)}</span>
            <span className="text-ink/20" aria-hidden="true">•</span>
            <span>{document.download_count} dl</span>
            {document.uploader_name && (
              <>
                <span className="text-ink/20" aria-hidden="true">•</span>
                <span>by {document.uploader_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:self-center shrink-0">
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
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col justify-between p-6 bg-card border border-ink/15 hover:border-ink transition-colors duration-300">
      <div>
        {/* Top Editorial Metadata Line */}
        <div className="flex items-center justify-between meta-mono text-ash mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-oxblood font-semibold">Nº {formattedIndex}</span>
            <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
            <span className="text-ink font-medium">{materialBadge.label}</span>
            {document.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-oxblood font-semibold">
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(showInstitution || document.institution) && (
              <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 bg-bone border border-ink/15 text-ash truncate max-w-[110px]">
                {document.institution}
              </span>
            )}
            {document.regulation && (
              <span className="text-[11px] text-ash">Reg. {document.regulation}</span>
            )}
            <span>{document.semester}</span>
          </div>
        </div>

        {/* Document Title in Fraunces */}
        <Link href={`/documents/${document.id}`} className="block group/link mb-2">
          <h3 className="font-display text-xl sm:text-2xl leading-tight tracking-[-0.02em] text-ink group-hover/link:text-oxblood transition-colors">
            {document.title}
          </h3>
        </Link>

        {/* Course Code & Subject Accent */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {document.subject_code && (
            <span className="px-1.5 py-0.5 font-mono text-[11px] font-semibold bg-bone text-ink border border-ink/20">
              {document.subject_code}
            </span>
          )}
          <p className="font-display italic text-sm sm:text-base text-ash leading-snug">
            {document.subject}
            {document.unit && <span className="text-ink/80 not-italic ml-1 font-sans text-xs">({document.unit})</span>}
          </p>
        </div>

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
