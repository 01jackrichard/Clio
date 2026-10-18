'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCw,
  FileText,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { getDriveEmbedUrl, isValidDriveFileId } from '@/lib/drive/urls';
import { Button, buttonVariants } from '@/components/ui';

interface PdfViewerProps {
  documentId: string;
  documentTitle: string;
  driveFileId?: string | null;
  initialPreviewUrl?: string;
}

export function PdfViewer({
  documentId,
  documentTitle,
  driveFileId: initialDriveId,
  initialPreviewUrl,
}: PdfViewerProps) {
  const [driveFileId, setDriveFileId] = useState<string | null>(initialDriveId || null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(
    initialPreviewUrl || (initialDriveId ? getDriveEmbedUrl(initialDriveId) : null)
  );
  const [loading, setLoading] = useState<boolean>(!initialPreviewUrl && !initialDriveId);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // If driveFileId was not supplied server-side, fetch it from the preview endpoint
  useEffect(() => {
    if (initialDriveId || initialPreviewUrl) {
      return;
    }

    let isMounted = true;

    async function fetchDocumentPreview() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/documents/${documentId}/preview`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize document preview');
        }

        if (isMounted) {
          if (data.driveFileId) {
            setDriveFileId(data.driveFileId);
          }
          if (data.previewUrl) {
            setEmbedUrl(data.previewUrl);
          } else if (data.driveFileId) {
            setEmbedUrl(getDriveEmbedUrl(data.driveFileId));
          } else {
            throw new Error('This document does not have an associated Google Drive file identifier.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error preparing document preview');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDocumentPreview();

    return () => {
      isMounted = false;
    };
  }, [documentId, initialDriveId, initialPreviewUrl]);

  const handleRefresh = () => {
    setIframeLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div
      className={`relative flex flex-col bg-ink border border-ink/30 overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen'
          : 'w-full h-[680px] sm:h-[780px] shadow-sm'
      }`}
    >
      {/* Viewer Header Toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-ink border-b border-paper/15 text-paper text-xs select-none">
        <div className="flex items-center gap-3 truncate pr-3">
          <FileText className="w-4 h-4 text-paper/80 shrink-0" />
          <span className="font-medium text-paper truncate max-w-xs sm:max-w-md font-sans">
            {documentTitle}
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 border border-paper/20 meta-mono text-[10px] text-paper/70">
            Google Drive In-App Reader
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 text-paper/70 hover:text-paper hover:bg-paper/10 transition-colors cursor-pointer"
            title="Reload preview frame"
            aria-label="Reload preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {driveFileId && isValidDriveFileId(driveFileId) && (
            <a
              href={`https://drive.google.com/file/d/${driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-paper/25 text-paper/80 hover:text-paper hover:bg-paper/10 transition-colors meta-mono"
              title="Open repository file in Google Drive (external tab)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Drive View</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-paper/70 hover:text-paper hover:bg-paper/10 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="relative flex-1 bg-ink/95 flex items-center justify-center overflow-hidden">
        {/* Loading overlay */}
        {(loading || iframeLoading) && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/95 text-paper text-xs">
            <Loader2 className="w-7 h-7 animate-spin text-paper/80" />
            <p className="meta-mono text-paper/90">Initializing in-app Google Drive preview...</p>
            <p className="text-[11px] text-paper/50">Rendering academic folio within Clio</p>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center gap-3.5 p-8 max-w-lg text-center text-paper bg-card border border-ink/20 shadow-lg m-4">
            <AlertCircle className="w-9 h-9 text-oxblood" />
            <h3 className="font-display text-lg text-ink font-medium">Document Preview Unavailable</h3>
            <p className="text-xs text-ash leading-relaxed">{error}</p>

            <div className="p-3 bg-paper border border-ink/15 text-[11px] text-ash text-left space-y-1.5 w-full">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-oxblood" />
                Troubleshooting Guidance:
              </p>
              <ul className="list-disc list-inside space-y-1 text-ash">
                <li>Verify this document has been approved and published in Clio.</li>
                <li>Ensure browser extensions or strict cookie protection are not blocking Google previews.</li>
                <li>The canonical file in Google Drive must permit reader access.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/documents"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Catalogue</span>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRefresh}
                leftIcon={<RotateCw className="w-3.5 h-3.5" />}
              >
                Retry Loading
              </Button>
            </div>
          </div>
        ) : embedUrl ? (
          <iframe
            key={reloadKey}
            src={embedUrl}
            title={`Academic Document Preview - ${documentTitle}`}
            className="w-full h-full border-0 bg-paper"
            allow="autoplay"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads"
            loading="lazy"
            onLoad={() => setIframeLoading(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
