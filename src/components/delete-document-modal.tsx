'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  X,
  Trash2,
  Lock,
  Globe,
  Loader2,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface DeleteDocumentTarget {
  id: string;
  title: string;
  visibility?: 'public' | 'private' | string;
  file_size?: number | null;
  department?: string;
  subject?: string;
}

interface DeleteDocumentModalProps {
  document: DeleteDocumentTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (deletedId: string) => void;
  redirectUrl?: string;
}

export function DeleteDocumentModal({
  document,
  isOpen,
  onClose,
  onSuccess,
  redirectUrl,
}: DeleteDocumentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Keyboard accessibility: Escape dismisses modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !document) return null;

  const isPrivate = document.visibility === 'private';
  const formattedSize = document.file_size ? formatBytes(document.file_size) : null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleConfirmDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete the document folio.');
      }

      setSuccess(true);

      setTimeout(() => {
        onSuccess?.(document.id);
        if (redirectUrl) {
          router.push(redirectUrl);
          router.refresh();
        } else {
          onClose();
        }
      }, 700);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while deleting the folio.'
      );
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-in fade-in-50 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-card border border-ink/20 p-6 sm:p-8 space-y-6 text-ink shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xs bg-oxblood/10 border border-oxblood/20 flex items-center justify-center text-oxblood">
              <AlertTriangle className="w-4 h-4 text-oxblood" />
            </span>
            <div>
              <span className="meta-mono text-[10px] uppercase tracking-wider text-oxblood font-semibold block">
                Critical Archive Action
              </span>
              <h2 id="delete-modal-title" className="font-display text-xl font-medium text-ink">
                Delete Academic Folio
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-1 text-ash hover:text-ink disabled:opacity-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-6 text-center space-y-3 bg-emerald-950/5 border border-emerald-900/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto animate-in zoom-in-50 duration-200" />
            <h3 className="font-display text-lg font-medium text-ink">
              Folio Expunged Successfully
            </h3>
            <p className="font-sans text-xs text-ash">
              The document record and its underlying cloud storage have been permanently purged.
            </p>
          </div>
        ) : (
          <>
            {/* Folio Metadata Summary */}
            <div className="p-4 bg-paper border border-ink/15 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {isPrivate ? (
                  <Badge variant="oxblood" size="sm" dot>
                    <Lock className="w-3 h-3 mr-1" />
                    <span>Private Vault Folio</span>
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    <Globe className="w-3 h-3 mr-1" />
                    <span>Public Catalogue Folio</span>
                  </Badge>
                )}

                {formattedSize && (
                  <span className="meta-mono text-[11px] text-ash bg-card px-2 py-0.5 border border-ink/10">
                    {formattedSize}
                  </span>
                )}

                {document.department && (
                  <span className="meta-mono text-[11px] text-ash bg-card px-2 py-0.5 border border-ink/10">
                    {document.department}
                  </span>
                )}
              </div>

              <h3 className="font-display text-base sm:text-lg font-medium text-ink tracking-tight line-clamp-2">
                {document.title}
              </h3>

              {isPrivate ? (
                <div className="flex items-center gap-1.5 meta-mono text-[11px] text-oxblood pt-1">
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Deleting this private folio will credit {formattedSize || 'its size'} back to
                    your 50 GB storage quota.
                  </span>
                </div>
              ) : (
                <p className="meta-mono text-[11px] text-ash pt-1">
                  This public resource will be completely expunged from the open academic library.
                </p>
              )}
            </div>

            {/* Warning Alert Block */}
            <div className="p-4 bg-oxblood/10 border border-oxblood/30 text-oxblood space-y-1.5">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Irreversible Permanent Purge</span>
              </div>
              <p className="font-sans text-xs text-ink/90 leading-relaxed pl-6">
                This operation permanently purges the document and its physical storage from the
                cloud servers. Any peer shared links, bookmarks, and course pack attachments will
                immediately be severed and cannot be recovered.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-oxblood/10 border border-oxblood text-oxblood text-xs meta-mono">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-ink/10">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleClose}
                disabled={loading}
                className="w-full sm:w-auto cursor-pointer"
              >
                <span>Cancel, Keep Folio</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmDelete}
                loading={loading}
                className="w-full sm:w-auto bg-oxblood hover:bg-oxblood/90 text-paper border-oxblood cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                <span>Permanently Delete Folio</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
