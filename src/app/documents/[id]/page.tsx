import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Layers,
  User,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { getDocumentById } from '@/lib/services/document-service';
import { formatDate, getMaterialTypeBadge } from '@/lib/utils';
import { PdfViewer } from '@/components/pdf-viewer';
import { DocumentActions } from './document-actions';
import { Badge, Container } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  const materialBadge = getMaterialTypeBadge(document.material_type);

  return (
    <div className="bg-paper min-h-screen py-8 sm:py-12">
      <Container className="space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-ink/15 pb-4">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 meta-mono text-xs text-ash hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Library Catalogue</span>
          </Link>

          <span className="meta-mono text-oxblood hidden sm:inline">
            Archival Folio Nº {document.id.slice(0, 8)}
          </span>
        </div>

        {/* Main Document Folio Card */}
        <article className="bg-card border border-ink/15 p-6 sm:p-10 space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              {/* Classification Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="oxblood" size="md">
                  {materialBadge.label}
                </Badge>
                <Badge variant="neutral" size="md">
                  {document.subject}
                </Badge>
                {document.unit && (
                  <Badge variant="paper" size="md">
                    {document.unit}
                  </Badge>
                )}
              </div>

              {/* Document Title in Fraunces */}
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ink font-medium tracking-tight leading-[1.12] text-balance">
                {document.title}
              </h1>

              {/* Meta Attributes Strip */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 meta-mono text-ash text-xs">
                <div className="flex items-center gap-1.5 text-ink/90">
                  <Building2 className="w-3.5 h-3.5 text-ash" />
                  <span>{document.department}</span>
                </div>
                <span className="text-ink/30" aria-hidden="true">•</span>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-ash" />
                  <span>
                    {document.semester} ({document.academic_year})
                  </span>
                </div>
                <span className="text-ink/30" aria-hidden="true">•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-ash" />
                  <span>Uploaded {formatDate(document.approved_at || document.created_at)}</span>
                </div>
                <span className="text-ink/30" aria-hidden="true">•</span>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-ash" />
                  <span>Shared by {document.uploader_name || 'Scholar Contributor'}</span>
                </div>
              </div>
            </div>

            {/* Actions: Download, Bookmark, Report */}
            <DocumentActions
              documentId={document.id}
              documentTitle={document.title}
              originalFilename={document.original_filename}
              fileSize={document.file_size}
              downloadCount={document.download_count}
            />
          </div>

          {/* Description & Abstract */}
          {document.description && (
            <div className="pt-5 border-t border-ink/10 space-y-1.5">
              <h2 className="meta-mono text-ash text-[11px]">
                Folio Abstract & Syllabus Context
              </h2>
              <p className="text-xs sm:text-sm text-ash leading-relaxed whitespace-pre-line font-sans max-w-4xl">
                {document.description}
              </p>
            </div>
          )}

          {/* Subject & Topic Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-ink/10">
              <span className="meta-mono text-ash text-xs mr-1">Classification Index:</span>
              {document.tags.map((t, idx) => (
                <Badge key={idx} variant="neutral" size="sm">
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </article>

        {/* PDF Interactive Reader Container */}
        <section className="space-y-3" aria-label="Academic Document Reader">
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-display text-xl text-ink font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-oxblood" />
              <span>Interactive Folio Viewer</span>
            </h2>
            <span className="meta-mono text-ash text-xs hidden sm:inline">
              Google Drive Embedded Engine · In-App Reading
            </span>
          </div>

          <PdfViewer
            documentId={document.id}
            documentTitle={document.title}
            driveFileId={document.drive_file_id}
          />
        </section>

        {/* Academic Fair Use Notice */}
        <aside className="p-5 bg-card border border-ink/15 text-xs text-ash flex items-start gap-3.5">
          <ShieldAlert className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="font-medium text-ink">Academic Fair Use & Honor Code:</strong>
            <p>
              This document is distributed solely for personal academic study, research, and coursework
              revision by students of the academic community. If this document infringes on private
              faculty copyright or contains unapproved assessment materials, please utilize the report action above.
            </p>
          </div>
        </aside>
      </Container>
    </div>
  );
}
