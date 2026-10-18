'use client';

import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Eye,
  Building2,
  Layers,
  FileCheck2,
  ExternalLink,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { DocumentRecord } from '@/types/database';
import { formatBytes, formatDate, getMaterialTypeBadge } from '@/lib/utils';
import { PdfViewer } from '@/components/pdf-viewer';
import { extractDriveFileId, validateDriveInput } from '@/lib/drive/urls';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ModerationQueueProps {
  initialDocuments: DocumentRecord[];
}

export function ModerationQueue({ initialDocuments }: ModerationQueueProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Approve modal state
  const [approveDoc, setApproveDoc] = useState<DocumentRecord | null>(null);
  const [canonicalDriveInput, setCanonicalDriveInput] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  // Reject modal state
  const [rejectDoc, setRejectDoc] = useState<DocumentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const openApproveModal = (doc: DocumentRecord) => {
    setApproveDoc(doc);
    // Pre-fill with existing Drive ID or submitted link if available
    setCanonicalDriveInput(doc.drive_file_id || doc.submitted_drive_url || '');
    setReviewNotes('');
    setApproveError(null);
  };

  const openRejectModal = (doc: DocumentRecord) => {
    setRejectDoc(doc);
    setRejectionReason('');
    setRejectError(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDoc) setPreviewDoc(null);
        else if (approveDoc && !actionLoadingId) setApproveDoc(null);
        else if (rejectDoc && !actionLoadingId) setRejectDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, approveDoc, rejectDoc, actionLoadingId]);

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveDoc) return;

    if (!canonicalDriveInput.trim()) {
      setApproveError('Please provide the canonical central repository Google Drive link or file ID.');
      return;
    }

    const driveCheck = validateDriveInput(canonicalDriveInput);
    if (!driveCheck.isValid) {
      setApproveError(driveCheck.error || 'Invalid Google Drive link or file ID format.');
      return;
    }

    setActionLoadingId(approveDoc.id);
    setApproveError(null);

    try {
      const res = await fetch(`/api/admin/moderation/${approveDoc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          canonical_drive_file_id: canonicalDriveInput.trim(),
          review_notes: reviewNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve document');
      }

      setDocuments((prev) => prev.filter((d) => d.id !== approveDoc.id));
      setApproveDoc(null);
      setCanonicalDriveInput('');
      setReviewNotes('');
    } catch (err: unknown) {
      setApproveError(err instanceof Error ? err.message : 'Error approving document');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectDoc) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setRejectError('Please provide a specific rejection reason (minimum 5 characters).');
      return;
    }

    setActionLoadingId(rejectDoc.id);
    setRejectError(null);

    try {
      const res = await fetch(`/api/admin/moderation/${rejectDoc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject document');
      }

      setDocuments((prev) => prev.filter((d) => d.id !== rejectDoc.id));
      setRejectDoc(null);
      setRejectionReason('');
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Error rejecting document');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Count Header */}
      <div className="flex items-center justify-between pb-3 border-b border-ink/10 meta-mono text-xs text-ash">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          <span>{documents.length} pending submissions awaiting quality review</span>
        </span>
        <span>Sequential Order</span>
      </div>

      {documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {documents.map((doc) => {
            const materialBadge = getMaterialTypeBadge(doc.material_type);
            const isLoading = actionLoadingId === doc.id;
            const previewId = doc.drive_file_id || extractDriveFileId(doc.submitted_drive_url || '');

            return (
              <Card
                key={doc.id}
                variant="default"
                className="p-5 sm:p-6 space-y-4 hover:border-ink/30 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" size="sm">
                        {materialBadge.label}
                      </Badge>
                      <span className="meta-mono text-xs font-semibold text-ink">
                        {doc.subject}
                      </span>
                      {doc.unit && (
                        <Badge variant="neutral" size="sm">
                          {doc.unit}
                        </Badge>
                      )}
                      <Badge variant="warning" dot size="sm">
                        Pending Moderation
                      </Badge>
                    </div>

                    <h3 className="font-display text-lg sm:text-xl font-medium text-ink">
                      {doc.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 meta-mono text-[11px] text-ash">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-ash" />
                        {doc.department}
                      </span>
                      <span className="text-ink/20">•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-ash" />
                        {doc.semester} ({doc.academic_year})
                      </span>
                      <span className="text-ink/20">•</span>
                      <span>{doc.file_size ? formatBytes(doc.file_size) : 'Google Drive Document'}</span>
                      <span className="text-ink/20">•</span>
                      <span>By {doc.uploader_name} on {formatDate(doc.created_at)}</span>
                    </div>

                    {doc.description && (
                      <p className="font-sans text-xs text-ash bg-paper p-3 rounded-xs border border-ink/10 leading-relaxed">
                        {doc.description}
                      </p>
                    )}

                    <div className="meta-mono text-[11px] text-ash flex flex-wrap items-center gap-2 pt-1">
                      <span>Drive Asset ID: <code className="text-ink font-mono bg-bone/40 px-1.5 py-0.5 rounded-xs">{doc.drive_file_id || 'Extracted upon review'}</code></span>
                      {doc.submitted_drive_url && (
                        <>
                          <span className="text-ink/20">•</span>
                          <a
                            href={doc.submitted_drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-oxblood hover:underline inline-flex items-center gap-1"
                          >
                            <span>Open Source Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contextual Moderation Actions */}
                  <div className="flex items-center gap-2 self-start shrink-0 pt-1">
                    {previewId && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewDoc(doc)}
                        className="gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-ash" />
                        <span>Preview</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openRejectModal(doc)}
                      disabled={isLoading}
                      className="gap-1.5 text-oxblood hover:bg-oxblood/10 hover:border-oxblood/30"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </Button>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => openApproveModal(doc)}
                      disabled={isLoading}
                      className="gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card variant="paper" className="p-12 sm:p-16 text-center border-dashed border-ink/20 space-y-4">
          <div className="w-14 h-14 rounded-full bg-bone border border-ink/15 flex items-center justify-center mx-auto text-emerald-800">
            <FileCheck2 className="w-7 h-7 text-emerald-700" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-display text-xl sm:text-2xl font-medium text-ink tracking-tight">
              Moderation Queue Clear
            </h3>
            <p className="font-sans text-xs sm:text-sm text-ash leading-relaxed">
              All submitted student documents have been processed. Newly deposited notes, question banks, and manuals will appear here for quality verification.
            </p>
          </div>
        </Card>
      )}

      {/* Approve Modal */}
      {approveDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="approve-modal-title"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-paper border border-ink/20 w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-lg rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-ink/15">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-800" />
                <h3 id="approve-modal-title" className="font-display text-lg font-medium text-ink">
                  Approve & Index Folio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApproveDoc(null)}
                aria-label="Close dialog"
                className="text-ash hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ash leading-relaxed">
              Confirm canonical Google Drive publication for{' '}
              <strong className="text-ink font-medium">{approveDoc.title}</strong> ({approveDoc.subject}).
            </p>

            {approveError && (
              <div role="alert" className="p-3 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                <span>{approveError}</span>
              </div>
            )}

            <form onSubmit={handleApproveSubmit} className="space-y-4">
              <Input
                id="canonical-drive-input"
                label="Canonical Google Drive File ID or Sharing Link"
                required
                value={canonicalDriveInput}
                onChange={(e) => setCanonicalDriveInput(e.target.value)}
                placeholder="e.g. 1AbCdEfGhIjKlMnOpQrStUvWxYz"
                helperText="Must be a valid 25-100 character Google Drive asset identifier."
              />

              <Textarea
                id="approve-review-notes"
                label="Reviewer Notes (Optional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Verified syllabus alignment with Unit 3 course outline."
                helperText="Optional praise or notes attached to the moderation record."
              />

              <div className="pt-3 border-t border-ink/10 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setApproveDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={actionLoadingId === approveDoc.id}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Publish to Catalogue</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-paper border border-ink/20 w-full max-w-lg p-6 sm:p-8 space-y-5 shadow-lg rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-ink/15">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-oxblood" />
                <h3 id="reject-modal-title" className="font-display text-lg font-medium text-ink">
                  Reject & Request Revisions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectDoc(null)}
                aria-label="Close dialog"
                className="text-ash hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ash leading-relaxed">
              Provide feedback for <strong className="text-ink font-medium">{rejectDoc.title}</strong>. This feedback will be displayed in the student&apos;s submissions folio.
            </p>

            {rejectError && (
              <div role="alert" className="p-3 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                <span>{rejectError}</span>
              </div>
            )}

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <Textarea
                id="rejection-reason"
                label="Specific Revision Request / Rejection Reason"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                placeholder="e.g. Scan is blurry on pages 4-8. Please re-upload with high contrast or upload individual unit notes."
                helperText="Minimum 5 characters. Be constructive and specific."
              />

              <div className="pt-3 border-t border-ink/10 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setRejectDoc(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="md"
                  loading={actionLoadingId === rejectDoc.id}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-modal-title"
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8 animate-in fade-in"
        >
          <div className="bg-paper border border-ink/20 w-full max-w-5xl h-[85vh] flex flex-col shadow-xl">
            <div className="p-4 sm:p-5 border-b border-ink/15 flex items-center justify-between bg-card shrink-0">
              <div className="space-y-0.5 truncate pr-4">
                <span className="meta-mono text-ash text-[10px] uppercase font-semibold">
                  In-Queue Document Verification
                </span>
                <h3 id="preview-modal-title" className="font-display text-base font-medium text-ink truncate">
                  {previewDoc.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="shrink-0"
              >
                <X className="w-4 h-4 mr-1.5" />
                <span>Close Reader</span>
              </Button>
            </div>

            <div className="flex-1 overflow-hidden p-4 bg-bone/30">
              <PdfViewer
                documentId={previewDoc.id}
                documentTitle={previewDoc.title}
                driveFileId={previewDoc.drive_file_id || extractDriveFileId(previewDoc.submitted_drive_url || '')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
