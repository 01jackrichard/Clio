import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Layers,
  User,
  ShieldAlert,
  FileText,
  Lock,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getDocumentById } from '@/lib/services/document-service';
import { formatDate, getMaterialTypeBadge } from '@/lib/utils';
import { PdfViewer } from '@/components/pdf-viewer';
import { DocumentActions } from './document-actions';
import { Badge, Container } from '@/components/ui';
import { PasswordUnlockCard } from '@/components/password-unlock-card';
import { verifyUnlockToken } from '@/lib/security/password-service';
import { hasValidAccessGrant } from '@/lib/services/sharing-service';

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

  // Check privacy access grant
  let isUnlocked = true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = Boolean(user && user.id === document.uploader_id);

  if (document.visibility === 'private') {
    isUnlocked = false;

    if (isOwner) {
      isUnlocked = true;
    } else {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin') isUnlocked = true;

        if (!isUnlocked) {
          const hasGrant = await hasValidAccessGrant(user.id, 'document', document.id);
          if (hasGrant) isUnlocked = true;
        }
      }

      if (!isUnlocked) {
        const cookieStore = await cookies();
        const unlockCookie = cookieStore.get(`clio_unlock_${document.id}`)?.value;
        if (unlockCookie && verifyUnlockToken(unlockCookie, document.id)) {
          isUnlocked = true;
        }
      }
    }
  }

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

          <div className="flex items-center gap-3">
            {document.visibility === 'private' && (
              <Badge variant="oxblood" size="sm" dot>
                Protected Folio
              </Badge>
            )}
            <span className="meta-mono text-oxblood hidden sm:inline">
              Archival Folio Nº {document.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Main Document Folio Header Card */}
        <article className="bg-card border border-ink/15 p-6 sm:p-10 space-y-7">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              {/* Classification Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="oxblood" size="md">
                  {materialBadge.label}
                </Badge>
                {document.subject_code && (
                  <span className="px-2 py-0.5 font-mono text-xs font-semibold bg-bone text-ink border border-ink/20">
                    {document.subject_code}
                  </span>
                )}
                <Badge variant="neutral" size="md">
                  {document.subject}
                </Badge>
                {document.regulation && (
                  <Badge variant="paper" size="md">
                    Regulation {document.regulation}
                  </Badge>
                )}
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

              {/* Collection reference if linked */}
              {document.collection_id && (
                <div className="pt-2">
                  <Link
                    href={`/collections/${document.collection_id}`}
                    className="inline-flex items-center gap-1.5 text-xs meta-mono text-oxblood hover:underline"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View associated Course Pack / Collection</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Actions: Download, Bookmark, Report (Only shown when unlocked) */}
            {isUnlocked ? (
              <DocumentActions
                documentId={document.id}
                documentTitle={document.title}
                originalFilename={document.original_filename}
                fileSize={document.file_size}
                downloadCount={document.download_count}
                isOwner={isOwner}
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-bone/60 border border-ink/20 meta-mono text-xs text-ash">
                <Lock className="w-3.5 h-3.5 text-oxblood" />
                <span>Actions Locked</span>
              </div>
            )}
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

        {/* PDF Reader or Password Unlock Card */}
        {isUnlocked ? (
          <section className="space-y-3" aria-label="Academic Document Reader">
            <div className="flex items-center justify-between pb-1">
              <h2 className="font-display text-xl text-ink font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-oxblood" />
                <span>Interactive Folio Viewer</span>
              </h2>
              <span className="meta-mono text-ash text-xs hidden sm:inline">
                {document.visibility === 'private'
                  ? 'Clio Secure Streaming Proxy · Authenticated Session'
                  : 'Google Drive Embedded Engine · In-App Reading'}
              </span>
            </div>

            <PdfViewer
              documentId={document.id}
              documentTitle={document.title}
              driveFileId={document.drive_file_id}
            />
          </section>
        ) : (
          <section className="py-8" aria-label="Password Unlock Desk">
            <PasswordUnlockCard
              resourceId={document.id}
              resourceTitle={document.title}
              resourceType="document"
            />
          </section>
        )}

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
