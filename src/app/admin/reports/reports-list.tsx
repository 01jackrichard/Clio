'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  X,
  Trash2,
  Eye,
  AlertTriangle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { ReportRecord } from '@/types/database';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface ReportsListProps {
  initialReports: ReportRecord[];
}

type FilterStatus = 'all' | 'pending' | 'resolved' | 'dismissed';

export function ReportsList({ initialReports }: ReportsListProps) {
  const [reports, setReports] = useState(initialReports);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Take down document modal state
  const [removeTarget, setRemoveTarget] = useState<ReportRecord | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Resolve modal state
  const [resolveTarget, setResolveTarget] = useState<ReportRecord | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Dismiss modal state
  const [dismissTarget, setDismissTarget] = useState<ReportRecord | null>(null);
  const [dismissNotes, setDismissNotes] = useState('');
  const [dismissError, setDismissError] = useState<string | null>(null);

  // Notification banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtered reports
  const filtered = reports.filter((report) => {
    // Status filter
    if (statusFilter !== 'all' && report.status !== statusFilter) {
      return false;
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = report.document_title?.toLowerCase().includes(q);
      const matchReason = report.reason?.toLowerCase().includes(q);
      const matchReporter = report.reporter_email?.toLowerCase().includes(q);
      const matchDetails = report.details?.toLowerCase().includes(q);
      return Boolean(matchTitle || matchReason || matchReporter || matchDetails);
    }
    return true;
  });

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const dismissedCount = reports.filter((r) => r.status === 'dismissed').length;

  // Resolve report handler
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;

    setLoadingId(resolveTarget.id);
    setResolveError(null);

    try {
      const res = await fetch(`/api/admin/reports/${resolveTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          review_notes: resolveNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resolve report');
      }

      setReports((prev) =>
        prev.map((r) => (r.id === resolveTarget.id ? { ...r, status: 'resolved' } : r))
      );
      setBanner({ type: 'success', message: `Report for "${resolveTarget.document_title}" marked as resolved.` });
      setResolveTarget(null);
      setResolveNotes('');
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : 'Error resolving report');
    } finally {
      setLoadingId(null);
    }
  };

  // Dismiss report handler
  const handleDismissSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dismissTarget) return;

    setLoadingId(dismissTarget.id);
    setDismissError(null);

    try {
      const res = await fetch(`/api/admin/reports/${dismissTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          review_notes: dismissNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dismiss report');
      }

      setReports((prev) =>
        prev.map((r) => (r.id === dismissTarget.id ? { ...r, status: 'dismissed' } : r))
      );
      setBanner({ type: 'success', message: `Report for "${dismissTarget.document_title}" dismissed.` });
      setDismissTarget(null);
      setDismissNotes('');
    } catch (err: unknown) {
      setDismissError(err instanceof Error ? err.message : 'Error dismissing report');
    } finally {
      setLoadingId(null);
    }
  };

  // Permanent take-down handler
  const handleRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeTarget) return;

    if (!removeReason.trim() || removeReason.trim().length < 5) {
      setRemoveError('Please provide a specific justification for removing this document (min 5 characters).');
      return;
    }

    setLoadingId(removeTarget.id);
    setRemoveError(null);

    try {
      const res = await fetch(`/api/admin/moderation/${removeTarget.document_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          rejection_reason: removeReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove document');
      }

      // Mark report resolved as part of removal
      await fetch(`/api/admin/reports/${removeTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          review_notes: `Document permanently taken down: ${removeReason.trim()}`,
        }),
      });

      setReports((prev) =>
        prev.map((r) => (r.id === removeTarget.id ? { ...r, status: 'resolved' } : r))
      );
      setBanner({
        type: 'success',
        message: `Document "${removeTarget.document_title}" has been taken down and the report is resolved.`,
      });
      setRemoveTarget(null);
      setRemoveReason('');
    } catch (err: unknown) {
      setRemoveError(err instanceof Error ? err.message : 'Error removing document');
    } finally {
      setLoadingId(null);
    }
  };

  const openRemoveModal = (report: ReportRecord) => {
    setRemoveTarget(report);
    setRemoveReason(report.details || `Flagged for: ${report.reason.replace(/_/g, ' ')}`);
    setRemoveError(null);
  };

  const openResolveModal = (report: ReportRecord) => {
    setResolveTarget(report);
    setResolveNotes('');
    setResolveError(null);
  };

  const openDismissModal = (report: ReportRecord) => {
    setDismissTarget(report);
    setDismissNotes('');
    setDismissError(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingId) {
        if (resolveTarget) setResolveTarget(null);
        else if (dismissTarget) setDismissTarget(null);
        else if (removeTarget) setRemoveTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resolveTarget, dismissTarget, removeTarget, loadingId]);

  return (
    <div className="space-y-6">
      {/* Toast / Banner Notification */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-md border flex items-start justify-between gap-3 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-body">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-ash hover:text-ink cursor-pointer p-0.5"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink/10">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: 'All Reports', count: reports.length },
              { key: 'pending', label: 'Pending Review', count: pendingCount },
              { key: 'resolved', label: 'Resolved', count: resolvedCount },
              { key: 'dismissed', label: 'Dismissed', count: dismissedCount },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer border ${
                  active
                    ? 'bg-ink text-paper border-ink font-semibold'
                    : 'bg-card text-ash border-ink/10 hover:border-ink/30 hover:text-ink'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-xs ${
                    active ? 'bg-paper/20 text-paper' : 'bg-bone text-ash'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports or documents..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            className="h-9"
          />
        </div>
      </div>

      {/* Reports Grid */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((report) => {
            const isLoading = loadingId === report.id;
            const isPending = report.status === 'pending';

            return (
              <Card
                key={report.id}
                className="p-5 sm:p-6 bg-card border-ink/10 space-y-4 transition-shadow hover:shadow-xs"
              >
                {/* Header row: Reason, Status, Date */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[11px] uppercase tracking-wider">
                      Flag: {report.reason.replace(/_/g, ' ')}
                    </Badge>
                    {report.status === 'pending' && (
                      <Badge variant="warning">Awaiting Review</Badge>
                    )}
                    {report.status === 'resolved' && (
                      <Badge variant="success">Resolved</Badge>
                    )}
                    {report.status === 'dismissed' && (
                      <Badge variant="neutral">Dismissed</Badge>
                    )}
                  </div>

                  <span className="meta-mono text-xs text-ash">
                    Filed on {formatDate(report.created_at)}
                  </span>
                </div>

                {/* Document Information & Reporter */}
                <div className="space-y-1.5">
                  <h3 className="font-display text-lg sm:text-xl text-ink font-medium leading-snug">
                    {report.document_title}
                  </h3>
                  <div className="meta-mono text-xs text-ash flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Reported by:{' '}
                      <span className="text-ink font-semibold">{report.reporter_email}</span>
                    </span>
                    <span className="text-ink/20">•</span>
                    <span>
                      Document ID:{' '}
                      <code className="text-ink font-mono">{report.document_id.slice(0, 8)}...</code>
                    </span>
                  </div>
                </div>

                {/* Reporter statement */}
                {report.details && (
                  <div className="p-3.5 bg-paper rounded border border-ink/10 text-xs font-body text-ink space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ash font-bold block">
                      Reporter Explanation:
                    </span>
                    <p className="leading-relaxed italic text-ink/90">&ldquo;{report.details}&rdquo;</p>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10">
                  <Link
                    href={`/documents/${report.document_id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink hover:text-oxblood transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Document Page</span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => openResolveModal(report)}
                        >
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                          <span>Resolve</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => openDismissModal(report)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          <span>Dismiss</span>
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => openRemoveModal(report)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Take Down Document</span>
                        </Button>
                      </>
                    ) : (
                      <span className="meta-mono text-xs text-ash italic">
                        Case completed ({report.status})
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 sm:p-16 text-center border-dashed border-ink/20 bg-card space-y-3">
          <div className="w-12 h-12 rounded-full bg-bone/50 text-ash flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="font-display text-lg text-ink font-medium">
            No Reports Matching Query
          </h3>
          <p className="text-xs text-ash max-w-md mx-auto leading-relaxed font-body">
            {search
              ? 'No reports correspond to your search criteria. Try a different term or clear the filter.'
              : statusFilter === 'pending'
              ? 'All abuse and copyright flags have been reviewed. The archive is clean.'
              : 'No reports registered in this category.'}
          </p>
          {search && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear Search
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* RESOLVE REPORT MODAL */}
      {resolveTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="resolve-modal-title"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="max-w-lg w-full p-6 sm:p-8 bg-paper border-ink/20 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="label-eyebrow text-oxblood">Governance Disposition</span>
              <h2 id="resolve-modal-title" className="font-display text-xl sm:text-2xl text-ink font-medium">
                Resolve Report
              </h2>
              <p className="text-xs text-ash font-body">
                Marking this flag as resolved indicates that administrative inspection was conducted and necessary action or verification was completed.
              </p>
            </div>

            <div className="p-3 bg-bone/40 rounded border border-ink/10 text-xs">
              <div className="meta-mono text-[10px] uppercase text-ash">Target Document</div>
              <div className="font-display font-medium text-ink mt-0.5">{resolveTarget.document_title}</div>
            </div>

            {resolveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resolveError}</span>
              </div>
            )}

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                  Resolution Notes (Optional)
                </label>
                <Textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Document scanned and confirmed authentic; author verified."
                  rows={3}
                  className="bg-card"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingId === resolveTarget.id}
                  onClick={() => setResolveTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={loadingId === resolveTarget.id}
                >
                  Confirm Resolution
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DISMISS REPORT MODAL */}
      {dismissTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dismiss-modal-title"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="max-w-lg w-full p-6 sm:p-8 bg-paper border-ink/20 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="label-eyebrow text-ash">Report Review</span>
              <h2 id="dismiss-modal-title" className="font-display text-xl sm:text-2xl text-ink font-medium">
                Dismiss Abuse Report
              </h2>
              <p className="text-xs text-ash font-body">
                Dismiss this report if the claim is invalid, frivolous, or incorrect. The document will remain published in the library.
              </p>
            </div>

            <div className="p-3 bg-bone/40 rounded border border-ink/10 text-xs">
              <div className="meta-mono text-[10px] uppercase text-ash">Target Document</div>
              <div className="font-display font-medium text-ink mt-0.5">{dismissTarget.document_title}</div>
            </div>

            {dismissError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{dismissError}</span>
              </div>
            )}

            <form onSubmit={handleDismissSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                  Dismissal Justification (Optional)
                </label>
                <Textarea
                  value={dismissNotes}
                  onChange={(e) => setDismissNotes(e.target.value)}
                  placeholder="e.g. Flag unfounded; syllabus matches accredited university curriculum."
                  rows={3}
                  className="bg-card"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingId === dismissTarget.id}
                  onClick={() => setDismissTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  loading={loadingId === dismissTarget.id}
                >
                  Dismiss Report
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* TAKE DOWN / REMOVE DOCUMENT MODAL */}
      {removeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-modal-title"
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <Card className="max-w-lg w-full p-6 sm:p-8 bg-paper border-oxblood/30 space-y-6 shadow-xl">
            <div className="space-y-1">
              <span className="label-eyebrow text-oxblood">Permanent Moderation Action</span>
              <h2 id="remove-modal-title" className="font-display text-xl sm:text-2xl text-oxblood font-medium">
                Take Down Academic Document
              </h2>
              <p className="text-xs text-ash font-body">
                This action will mark the document as removed, revoke public student access, purge cached assets, and resolve this report.
              </p>
            </div>

            <div className="p-3 bg-oxblood/5 rounded border border-oxblood/20 text-xs space-y-1">
              <div className="meta-mono text-[10px] uppercase text-oxblood font-semibold">Document to Unpublish</div>
              <div className="font-display font-medium text-ink">{removeTarget.document_title}</div>
            </div>

            {removeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{removeError}</span>
              </div>
            )}

            <form onSubmit={handleRemoveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ink mb-1.5">
                  Removal Reason <span className="text-oxblood">*</span>
                </label>
                <Textarea
                  required
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="State the academic, legal, or policy reason for removal (min 5 chars)..."
                  rows={3}
                  className="bg-card"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-ink/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingId === removeTarget.id}
                  onClick={() => setRemoveTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  loading={loadingId === removeTarget.id}
                >
                  Confirm Take Down
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
