'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Download,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui';
import { Skiper89 } from '@/components/v1/skiper89';

export interface PdfViewerProps {
  documentId: string;
  documentTitle: string;
  originalFilename?: string | null;
  fileSize?: number | null;
  driveFileId?: string | null;
  initialPreviewUrl?: string;
}

export function PdfViewer({
  documentId,
  documentTitle,
  initialPreviewUrl,
}: PdfViewerProps) {
  // Always use Clio's unified, authenticated streaming delivery endpoint
  const streamUrl = initialPreviewUrl || `/api/documents/${documentId}/raw`;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [documentReady, setDocumentReady] = useState(false);
  const [prevTrackedKey, setPrevTrackedKey] = useState(`${documentId}-${reloadKey}`);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Synchronously reset state during render when documentId or reloadKey changes
  if (prevTrackedKey !== `${documentId}-${reloadKey}`) {
    setPrevTrackedKey(`${documentId}-${reloadKey}`);
    setLoading(true);
    setError(null);
    setDocumentReady(false);
  }

  useEffect(() => {
    let isMounted = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timeout safety fallback: never leave the user trapped in infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        // Allow the iframe to continue attempting render even if pre-flight timed out
        setDocumentReady(true);
      }
    }, 7000);

    async function verifyDocumentAccess() {
      try {
        const res = await fetch(streamUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        if (!isMounted) return;
        clearTimeout(timeoutId);

        if (res.ok) {
          setDocumentReady(true);
          setLoading(false);
        } else {
          let errorMsg = 'Unable to load this document. Please try again.';
          if (res.status === 401) {
            errorMsg = 'Please sign in to read this document.';
          } else if (res.status === 403) {
            errorMsg = 'This document is private or requires an access password.';
          } else if (res.status === 404) {
            errorMsg = 'This document folio could not be found in the archive.';
          } else if (res.status === 502 || res.status === 503) {
            errorMsg = 'Archival document service is temporarily unavailable. Please try again shortly.';
          }
          setError(errorMsg);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        clearTimeout(timeoutId);
        // Fallback: if HEAD method fails (e.g. proxy restriction), attempt direct render
        setDocumentReady(true);
        setLoading(false);
      }
    }

    verifyDocumentAccess();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [documentId, streamUrl, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
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

  const downloadUrl = `${streamUrl}?download=true`;

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
            Document Reader
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 text-paper/70 hover:text-paper hover:bg-paper/10 transition-colors cursor-pointer"
            title="Reload Document"
            aria-label="Reload Document"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-paper/25 text-paper/80 hover:text-paper hover:bg-paper/10 transition-colors meta-mono"
            title="Open Reader in Full Screen Tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full View</span>
          </a>

          <a
            href={downloadUrl}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-paper/25 text-paper/80 hover:text-paper hover:bg-paper/10 transition-colors meta-mono"
            title="Download Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>

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
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/95 text-paper text-xs">
            <Loader2 className="w-7 h-7 animate-spin text-paper/80" />
            <p className="meta-mono text-paper/90">Loading document...</p>
            <p className="text-[11px] text-paper/50">Consulting archival folio in Clio</p>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="flex flex-col items-center gap-3.5 p-8 max-w-lg text-center text-paper bg-card border border-ink/20 shadow-lg m-4">
            <AlertCircle className="w-9 h-9 text-oxblood" />
            <h3 className="font-display text-lg text-ink font-medium">Document Unavailable</h3>
            <p className="text-xs text-ash leading-relaxed">{error}</p>

            <div className="p-3 bg-paper border border-ink/15 text-[11px] text-ash text-left space-y-1.5 w-full">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-oxblood" />
                Folio Guidance:
              </p>
              <ul className="list-disc list-inside space-y-1 text-ash">
                <li>Verify this document has been approved and published in the catalogue.</li>
                <li>If this document is private, ensure you have submitted the valid password or received an active share grant.</li>
                <li>You can reload the folio or download a copy directly below.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
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
                Reload Document
              </Button>
              <a
                href={downloadUrl}
                className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'gap-1.5' })}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        ) : documentReady ? (
          <iframe
            key={reloadKey}
            src={`${streamUrl}#toolbar=1&navpanes=1`}
            title={`Academic Document Reader - ${documentTitle}`}
            className="w-full h-full border-0 bg-paper"
            loading="lazy"
            onLoad={() => setLoading(false)}
          />
        ) : null}
      </div>

      {/* Skiper89 Scroll Progress: Active during reading mode */}
      {!loading && !error && (
        <Skiper89
          className={
            isFullscreen
              ? 'fixed top-16 right-4 sm:right-6 z-50'
              : 'fixed top-24 right-4 sm:right-6 z-30'
          }
          ariaLabel={`Folio reading scroll progress for ${documentTitle}`}
        />
      )}
    </div>
  );
}
