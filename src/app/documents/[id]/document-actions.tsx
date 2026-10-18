'use client';

import React, { useState, useEffect } from 'react';
import { Download, Bookmark, Flag } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { ReportModal } from '@/components/report-modal';
import { Button } from '@/components/ui';

interface DocumentActionsProps {
  documentId: string;
  documentTitle: string;
  originalFilename: string;
  fileSize?: number | null;
  downloadCount: number;
}

export function DocumentActions({
  documentId,
  documentTitle,
  fileSize,
  downloadCount: initialDownloadCount,
}: DocumentActionsProps) {
  const [downloadCount, setDownloadCount] = useState(initialDownloadCount);
  const [downloading, setDownloading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    async function checkFavorite() {
      try {
        const res = await fetch(`/api/documents/${documentId}/favorite`);
        if (res.ok) {
          const data = await res.json();
          setIsFavorited(Boolean(data.isFavorited));
        }
      } catch {
        // Ignored
      }
    }
    checkFavorite();
  }, [documentId]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/download`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to download document');
      }

      if (data.downloadUrl) {
        setDownloadCount((prev) => prev + 1);
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error preparing download');
    } finally {
      setDownloading(false);
    }
  };

  const handleFavorite = async () => {
    if (favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      const res = await fetch(`/api/documents/${documentId}/favorite`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(Boolean(data.isFavorited));
      }
    } catch {
      // Ignored
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
        <Button
          onClick={handleDownload}
          loading={downloading}
          variant="primary"
          size="md"
          leftIcon={<Download className="w-4 h-4" />}
          className="flex-1 sm:flex-none gap-2 font-medium"
        >
          <span>Download PDF {fileSize && fileSize > 0 ? `(${formatBytes(fileSize)})` : ''}</span>
          <span className="text-[11px] bg-paper/20 text-paper px-1.5 py-0.5 font-mono ml-1">
            {downloadCount}
          </span>
        </Button>

        <Button
          onClick={handleFavorite}
          disabled={favoriteLoading}
          aria-label={isFavorited ? 'Remove folio bookmark' : 'Bookmark folio for later'}
          variant={isFavorited ? 'subtle' : 'outline'}
          size="icon"
          title={isFavorited ? 'Saved in library bookmarks' : 'Save to library bookmarks'}
          className="transition-colors"
        >
          <Bookmark
            className={`w-4 h-4 ${isFavorited ? 'fill-oxblood text-oxblood' : 'text-ink'}`}
          />
        </Button>

        <Button
          onClick={() => setReportModalOpen(true)}
          variant="outline"
          size="icon"
          aria-label="Report this document"
          title="Report compliance issue with this document"
          className="hover:text-oxblood hover:border-oxblood/40"
        >
          <Flag className="w-4 h-4" />
        </Button>
      </div>

      <ReportModal
        documentId={documentId}
        documentTitle={documentTitle}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
