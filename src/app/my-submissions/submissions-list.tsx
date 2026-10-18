'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
  FileText,
  Plus,
  Archive,
} from 'lucide-react';
import { DocumentRecord } from '@/types/database';
import { formatBytes, formatDate, getMaterialTypeBadge, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';

interface MySubmissionsListProps {
  initialSubmissions: DocumentRecord[];
  currentStatus: string;
}

export function MySubmissionsList({
  initialSubmissions,
  currentStatus,
}: MySubmissionsListProps) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<DocumentRecord[]>(initialSubmissions);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active status derived from explicit user tab selection or page route prop
  const activeStatus = selectedStatus ?? currentStatus ?? 'all';

  // Dynamic statistics calculated across all user submissions
  const counts = useMemo(() => {
    return {
      all: submissions.length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      pending: submissions.filter((s) => s.status === 'pending').length,
      rejected: submissions.filter((s) => s.status === 'rejected').length,
    };
  }, [submissions]);

  const filterTabs = [
    { id: 'all', label: 'All Materials', count: counts.all },
    { id: 'pending', label: 'Under Review', count: counts.pending },
    { id: 'approved', label: 'Published', count: counts.approved },
    { id: 'rejected', label: 'Needs Revision', count: counts.rejected },
  ];

  const handleTabClick = (tabId: string) => {
    setSelectedStatus(tabId);
    if (tabId === 'all') {
      router.push('/my-submissions', { scroll: false });
    } else {
      router.push(`/my-submissions?status=${tabId}`, { scroll: false });
    }
  };

  const handleDeletePending = async (docId: string) => {
    if (!confirm('Are you sure you want to cancel and withdraw this pending submission?')) {
      return;
    }

    setDeletingId(docId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('documents').delete().eq('id', docId);

      if (error) {
        alert(`Failed to withdraw submission: ${error.message}`);
      } else {
        setSubmissions((prev) => prev.filter((s) => s.id !== docId));
      }
    } catch {
      alert('Network error encountered while withdrawing submission.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter submissions by the active tab
  const filteredSubmissions = useMemo(() => {
    if (activeStatus === 'all') return submissions;
    return submissions.filter((doc) => doc.status === activeStatus);
  }, [submissions, activeStatus]);

  return (
    <div className="space-y-8">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ash mb-2">
            <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Total Folios
            </span>
            <Archive className="w-4 h-4 text-ash" />
          </div>
          <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
            {counts.all}
          </div>
          <span className="meta-mono text-[10px] text-ash mt-1">Contributed documents</span>
        </Card>

        <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Published
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
            {counts.approved}
          </div>
          <span className="meta-mono text-[10px] text-ash mt-1">Live in academic archive</span>
        </Card>

        <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Under Review
            </span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
            {counts.pending}
          </div>
          <span className="meta-mono text-[10px] text-ash mt-1">Pending moderation</span>
        </Card>

        <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-oxblood mb-2">
            <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
              Revision Needed
            </span>
            <XCircle className="w-4 h-4 text-oxblood" />
          </div>
          <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
            {counts.rejected}
          </div>
          <span className="meta-mono text-[10px] text-ash mt-1">Awaiting editorial review</span>
        </Card>
      </div>

      {/* Editorial Filter Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-ink/15 pb-3 overflow-x-auto">
        {filterTabs.map((tab) => {
          const active = activeStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all select-none border rounded-sm cursor-pointer whitespace-nowrap',
                active
                  ? 'bg-ink text-paper border-ink shadow-xs'
                  : 'bg-transparent text-ash border-transparent hover:text-ink hover:bg-bone/40'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-xs font-mono',
                  active ? 'bg-paper/20 text-paper' : 'bg-bone text-ash'
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredSubmissions.map((doc) => {
            const materialBadge = getMaterialTypeBadge(doc.material_type);
            return (
              <Card
                key={doc.id}
                variant="default"
                className="p-5 sm:p-6 space-y-4 hover:border-ink/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-3xl">
                    {/* Header Badges & Academic Classification */}
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
                    </div>

                    {/* Document Title */}
                    <h3 className="font-display text-xl sm:text-2xl font-medium text-ink tracking-tight">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="hover:text-oxblood transition-colors"
                      >
                        {doc.title}
                      </Link>
                    </h3>

                    {/* Document Description if present */}
                    {doc.description && (
                      <p className="font-sans text-xs sm:text-sm text-ash line-clamp-2 leading-relaxed">
                        {doc.description}
                      </p>
                    )}

                    {/* Technical Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 meta-mono text-[11px] text-ash pt-1">
                      <span>{doc.department}</span>
                      <span className="text-ink/20">•</span>
                      <span>{doc.semester}</span>
                      <span className="text-ink/20">•</span>
                      <span>{formatBytes(doc.file_size)}</span>
                      <span className="text-ink/20">•</span>
                      <span>Submitted {formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="self-start shrink-0">
                    {doc.status === 'approved' && (
                      <Badge variant="success" dot size="md">
                        Published
                      </Badge>
                    )}

                    {doc.status === 'pending' && (
                      <Badge variant="warning" dot size="md">
                        Under Review
                      </Badge>
                    )}

                    {doc.status === 'rejected' && (
                      <Badge variant="oxblood" dot size="md">
                        Needs Revision
                      </Badge>
                    )}

                    {doc.status === 'removed' && (
                      <Badge variant="neutral" dot size="md">
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Reviewer Feedback / Revision Request */}
                {doc.status === 'rejected' && (
                  <div className="p-4 bg-oxblood/5 border border-oxblood/20 rounded-xs text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-mono uppercase tracking-wider text-oxblood font-semibold text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-oxblood shrink-0" />
                      <span>Reviewer Feedback & Revision Request</span>
                    </div>
                    <p className="font-sans text-ink/90 leading-relaxed pl-6">
                      {doc.review_notes ||
                        'This document requires revisions before it can be indexed in the academic catalogue. Please verify course syllabus alignment and scan readability.'}
                    </p>
                  </div>
                )}

                {/* Card Footer: Source file and contextual actions */}
                <div className="pt-3 border-t border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="meta-mono text-[11px] text-ash flex items-center gap-1.5 truncate">
                    <span>Source:</span>
                    <code className="text-ink font-mono bg-bone/40 px-1.5 py-0.5 rounded-xs truncate max-w-xs">
                      {doc.original_filename}
                    </code>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Link
                      href={`/documents/${doc.id}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5 text-ash" />
                      <span>View in Reader</span>
                    </Link>

                    {doc.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePending(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-oxblood hover:text-oxblood hover:bg-oxblood/10"
                        title="Withdraw pending submission"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        <span>Cancel Submission</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card variant="paper" className="p-12 text-center border-dashed border-ink/20 space-y-4">
          <div className="w-12 h-12 rounded-full bg-bone border border-ink/10 flex items-center justify-center mx-auto text-ash">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg text-ink font-medium">
              No submissions found
            </h3>
            <p className="font-sans text-xs text-ash max-w-sm mx-auto leading-relaxed">
              {activeStatus === 'all'
                ? 'You have not uploaded any academic documents yet. Shared lecture notes and syllabi appear here after submission.'
                : `No academic materials currently in "${activeStatus.replace('-', ' ')}" status.`}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/upload"
              className={buttonVariants({ variant: 'primary', size: 'sm' })}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Contribute New Material</span>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

