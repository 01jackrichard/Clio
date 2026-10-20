'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Lock,
  Globe,
  Eye,
  Trash2,
  FileText,
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import { DEPARTMENTS } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { DeleteDocumentModal, DeleteDocumentTarget } from '@/components/delete-document-modal';

export interface AdminDocumentItem {
  id: string;
  title: string;
  subject: string;
  subject_code?: string | null;
  department: string;
  academic_year: string;
  semester: string;
  material_type: string;
  unit?: string | null;
  visibility: 'public' | 'private' | string;
  status: 'approved' | 'pending' | 'rejected' | 'removed' | string;
  file_size: number;
  download_count: number;
  created_at: string;
  approved_at?: string | null;
  uploader_id: string;
  uploader?: {
    display_name?: string | null;
    email?: string | null;
    role?: string | null;
    department?: string | null;
  } | null;
}

interface MasterDocumentLedgerProps {
  initialDocuments: AdminDocumentItem[];
}

export function MasterDocumentLedger({ initialDocuments }: MasterDocumentLedgerProps) {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>(initialDocuments);
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<DeleteDocumentTarget | null>(null);

  // Dynamic statistics
  const stats = useMemo(() => {
    let publicBytes = 0;
    let privateBytes = 0;
    let publicCount = 0;
    let privateCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    for (const doc of documents) {
      const size = Number(doc.file_size || 0);
      if (doc.visibility === 'private') {
        privateCount++;
        privateBytes += size;
      } else {
        publicCount++;
        publicBytes += size;
      }

      if (doc.status === 'approved') approvedCount++;
      else if (doc.status === 'pending') pendingCount++;
      else if (doc.status === 'rejected') rejectedCount++;
    }

    return {
      total: documents.length,
      publicCount,
      publicBytes,
      privateCount,
      privateBytes,
      approvedCount,
      pendingCount,
      rejectedCount,
    };
  }, [documents]);

  // Filtered documents
  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      // Visibility filter
      if (visibilityFilter !== 'all' && doc.visibility !== visibilityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (departmentFilter !== 'all' && doc.department !== departmentFilter) {
        return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchSubject = doc.subject?.toLowerCase().includes(q);
        const matchCode = doc.subject_code?.toLowerCase().includes(q);
        const matchUploaderName = doc.uploader?.display_name?.toLowerCase().includes(q);
        const matchUploaderEmail = doc.uploader?.email?.toLowerCase().includes(q);
        return Boolean(
          matchTitle || matchSubject || matchCode || matchUploaderName || matchUploaderEmail
        );
      }

      return true;
    });
  }, [documents, visibilityFilter, statusFilter, departmentFilter, search]);

  const handleDeleteSuccess = (deletedId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Confidential Governance Banner */}
      <div className="p-4 bg-paper border border-ink/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-xs bg-oxblood text-paper flex items-center justify-center font-bold text-xs">
            Ω
          </span>
          <div>
            <h3 className="font-display text-sm font-medium text-ink">
              Master Institutional Archive Ledger
            </h3>
            <p className="meta-mono text-[11px] text-ash">
              Full administrative visibility across all public materials and confidential private vault folios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 meta-mono text-xs text-ash">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-ink/15">
            <Globe className="w-3.5 h-3.5 text-emerald-700" />
            <span>Public: {stats.publicCount} ({formatBytes(stats.publicBytes)})</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-oxblood/30 text-oxblood">
            <Lock className="w-3.5 h-3.5 text-oxblood" />
            <span>Private: {stats.privateCount} ({formatBytes(stats.privateBytes)})</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="paper" className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
            <input
              type="text"
              placeholder="Search by folio title, subject, course code, scholar name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-card border border-ink/20 text-xs text-ink placeholder:text-ash/60 focus:outline-none focus:border-ink"
            />
          </div>

          {/* Visibility Tabs */}
          <div className="flex items-center border border-ink/20 bg-card p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1.5 text-xs meta-mono transition-colors cursor-pointer ${
                visibilityFilter === 'all'
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ash hover:text-ink'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('public')}
              className={`px-3 py-1.5 text-xs meta-mono transition-colors cursor-pointer ${
                visibilityFilter === 'public'
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ash hover:text-ink'
              }`}
            >
              Public ({stats.publicCount})
            </button>
            <button
              type="button"
              onClick={() => setVisibilityFilter('private')}
              className={`px-3 py-1.5 text-xs meta-mono transition-colors cursor-pointer flex items-center gap-1 ${
                visibilityFilter === 'private'
                  ? 'bg-oxblood text-paper font-semibold'
                  : 'text-ash hover:text-oxblood'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Private ({stats.privateCount})</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center border border-ink/20 bg-card p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1.5 text-xs meta-mono transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ash hover:text-ink'
              }`}
            >
              All Status
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1.5 text-xs meta-mono transition-colors cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ash hover:text-ink'
              }`}
            >
              Live ({stats.approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1.5 text-xs meta-mono transition-colors cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-900 text-paper font-semibold'
                  : 'text-ash hover:text-amber-800'
              }`}
            >
              Pending ({stats.pendingCount})
            </button>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9 px-2.5 bg-card border border-ink/20 text-xs text-ink focus:outline-none focus:border-ink cursor-pointer shrink-0"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Filter stats strip */}
        <div className="flex items-center justify-between text-[11px] meta-mono text-ash pt-1 border-t border-ink/10">
          <span>
            Displaying {filtered.length} of {documents.length} recorded folios in master repository
          </span>
          {(search || visibilityFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setVisibilityFilter('all');
                setStatusFilter('all');
                setDepartmentFilter('all');
              }}
              className="text-oxblood hover:underline cursor-pointer"
            >
              Reset active filters
            </button>
          )}
        </div>
      </Card>

      {/* Documents Ledger Table */}
      {filtered.length > 0 ? (
        <div className="border border-ink/15 overflow-x-auto bg-card">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink/15 bg-paper/80 meta-mono text-[10px] text-ash uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Academic Folio</th>
                <th className="py-3 px-3 font-semibold">Scholar / Uploader</th>
                <th className="py-3 px-3 font-semibold">Visibility</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold">Size & Downloads</th>
                <th className="py-3 px-3 font-semibold">Deposited</th>
                <th className="py-3 px-4 font-semibold text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map((doc) => {
                const isPrivate = doc.visibility === 'private';
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-bone/30 transition-colors group"
                  >
                    {/* Folio Info */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-1">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-display text-sm font-medium text-ink hover:text-oxblood transition-colors line-clamp-1"
                          title="Open in Reader (Admins have unrestricted bypass access)"
                        >
                          {doc.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 meta-mono text-[10px] text-ash">
                          {doc.subject_code && (
                            <span className="bg-bone px-1 py-0.2 border border-ink/10 font-semibold text-ink">
                              {doc.subject_code}
                            </span>
                          )}
                          <span className="truncate max-w-[140px]">{doc.subject}</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{doc.department}</span>
                          {doc.unit && (
                            <>
                              <span>•</span>
                              <span>{doc.unit}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Uploader Scholar */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-0.5">
                        <div className="font-sans font-medium text-ink text-xs truncate max-w-[160px]">
                          {doc.uploader?.display_name || 'Scholar'}
                        </div>
                        <div className="meta-mono text-[10px] text-ash truncate max-w-[160px]">
                          {doc.uploader?.email || doc.uploader_id.slice(0, 8)}
                        </div>
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="py-3.5 px-3">
                      {isPrivate ? (
                        <Badge variant="oxblood" size="sm" dot>
                          <Lock className="w-2.5 h-2.5 mr-1" />
                          <span>Private Vault</span>
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          <Globe className="w-2.5 h-2.5 mr-1" />
                          <span>Public Archive</span>
                        </Badge>
                      )}
                    </td>

                    {/* Moderation Status */}
                    <td className="py-3.5 px-3">
                      {doc.status === 'approved' && (
                        <Badge variant="success" dot size="sm">
                          Live
                        </Badge>
                      )}
                      {doc.status === 'pending' && (
                        <Badge variant="warning" dot size="sm">
                          Under Review
                        </Badge>
                      )}
                      {doc.status === 'rejected' && (
                        <Badge variant="oxblood" dot size="sm">
                          Revision
                        </Badge>
                      )}
                      {doc.status === 'removed' && (
                        <Badge variant="neutral" dot size="sm">
                          Archived
                        </Badge>
                      )}
                    </td>

                    {/* Size & Downloads */}
                    <td className="py-3.5 px-3 meta-mono text-[11px] text-ash whitespace-nowrap">
                      <div>{formatBytes(doc.file_size)}</div>
                      <div className="text-[10px] text-ink/70">
                        {doc.download_count} {doc.download_count === 1 ? 'download' : 'downloads'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 meta-mono text-[11px] text-ash whitespace-nowrap">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/documents/${doc.id}`}
                          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                          title="Inspect folio in interactive reader"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-ash" />
                          <span>Inspect</span>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(doc)}
                          className="text-oxblood hover:text-white hover:bg-oxblood hover:border-oxblood/40 cursor-pointer"
                          title="Permanently expunge this document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Card variant="paper" className="p-10 text-center border-dashed border-ink/20 space-y-3">
          <FileText className="w-8 h-8 text-ash mx-auto" />
          <h4 className="font-display text-base font-medium text-ink">
            No matching documents in ledger
          </h4>
          <p className="font-sans text-xs text-ash max-w-sm mx-auto">
            Try adjusting your search criteria or resetting the active filters above.
          </p>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteDocumentModal
        document={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
