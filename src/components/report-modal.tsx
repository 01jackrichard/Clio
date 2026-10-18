'use client';

import React, { useState, useEffect } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
import { REPORT_REASONS, ReportReason } from '@/lib/constants';
import { Button, Select, Textarea } from '@/components/ui';

interface ReportModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({
  documentId,
  documentTitle,
  isOpen,
  onClose,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md bg-card border border-ink/20 p-6 sm:p-8 space-y-5 text-ink shadow-lg">
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <div className="flex items-center gap-2 text-oxblood">
            <Flag className="w-4 h-4 shrink-0" />
            <span id="report-modal-title" className="font-display text-lg font-medium tracking-tight">
              Report Academic Folio
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-ash hover:text-ink p-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-ash leading-relaxed">
          Reporting <strong className="text-ink font-medium">{documentTitle}</strong>.
          Our academic curator team evaluates all submissions against the institutional honor code.
        </p>

        {success ? (
          <div
            role="status"
            className="p-4 bg-paper border border-ink/15 space-y-2 text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-oxblood mx-auto" aria-hidden="true" />
            <h4 className="font-display text-base text-ink font-medium">Report Dispatched</h4>
            <p className="text-xs text-ash">
              Thank you. Your report has been submitted to moderators for compliance review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 bg-oxblood/10 border border-oxblood/20 text-oxblood text-xs leading-relaxed"
              >
                {error}
              </div>
            )}

            <Select
              id="report-reason"
              label="Classification Violation Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              disabled={loading}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>

            <Textarea
              id="report-details"
              label="Additional Context (Optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain why this folio infringes on academic policy or contains unauthorized material..."
              rows={3}
              disabled={loading}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                loading={loading}
                leftIcon={<Flag className="w-3.5 h-3.5" />}
              >
                Submit Report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
