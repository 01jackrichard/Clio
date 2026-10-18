import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  ArrowLeft,
  Layers,
  BookOpen,
  Calendar,
  Plus,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyUnlockToken } from '@/lib/security/password-service';
import { formatDate } from '@/lib/utils';
import { Badge, Container, buttonVariants } from '@/components/ui';
import { DocumentCard } from '@/components/document-card';
import { PasswordUnlockCard } from '@/components/password-unlock-card';
import { DocumentRecord } from '@/types/database';

export const dynamic = 'force-dynamic';

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const adminClient = getAdminClient();
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  let query = adminClient.from('collections').select('*');

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', id);
  }

  const { data: collection, error } = await query.maybeSingle();

  if (error || !collection) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user ? collection.user_id === user.id : false;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  let isUnlocked = true;
  if (collection.visibility === 'private' && !isOwner && !isAdmin) {
    const cookieStore = await cookies();
    const unlockCookie = cookieStore.get(`clio_collection_unlock_${collection.id}`)?.value;
    isUnlocked = unlockCookie ? verifyUnlockToken(unlockCookie, collection.id) : false;
  }

  // If unlocked, fetch all approved documents in this collection
  let documents: DocumentRecord[] = [];
  if (isUnlocked) {
    const { data: docs } = await adminClient
      .from('documents')
      .select('*, profiles(display_name)')
      .eq('collection_id', collection.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    documents = (docs || []).map((d) => ({
      ...d,
      uploader_name: d.profiles?.display_name || 'Classmate',
    }));
  }

  return (
    <div className="bg-paper min-h-screen py-8 sm:py-14">
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
            {collection.visibility === 'private' ? (
              <Badge variant="oxblood" size="sm" dot>
                Protected Course Pack
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm" dot>
                Public Course Pack
              </Badge>
            )}
            <span className="meta-mono text-oxblood hidden sm:inline">
              Collection Ref: {collection.slug || collection.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Collection Overview Card */}
        <article className="bg-card border border-ink/15 p-6 sm:p-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="oxblood" size="md">
                  Course Pack
                </Badge>
                {collection.regulation && (
                  <Badge variant="paper" size="md">
                    Regulation {collection.regulation}
                  </Badge>
                )}
                {collection.department && (
                  <Badge variant="neutral" size="md">
                    {collection.department}
                  </Badge>
                )}
                {collection.semester && (
                  <Badge variant="paper" size="md">
                    {collection.semester}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl text-ink font-medium tracking-tight leading-tight">
                {collection.title}
              </h1>

              {collection.description && (
                <p className="text-sm text-ash leading-relaxed max-w-3xl whitespace-pre-line">
                  {collection.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 meta-mono text-xs text-ash pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Curated {formatDate(collection.created_at)}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {isUnlocked
                      ? `${documents.length} ${documents.length === 1 ? 'document' : 'documents'} assembled`
                      : 'Protected documents'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/upload"
                className={buttonVariants({
                  variant: 'primary',
                  size: 'md',
                  className: 'gap-2',
                })}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Folio to Pack</span>
              </Link>
            </div>
          </div>
        </article>

        {/* Documents Section or Unlock Gate */}
        {isUnlocked ? (
          <section className="space-y-6" aria-label="Course Pack Documents">
            <div className="flex items-center justify-between pb-3 border-b border-ink/15">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-oxblood" />
                <span className="label-eyebrow text-ink">Pack Inventory</span>
              </div>
              <span className="meta-mono text-xs text-ash">
                {documents.length} {documents.length === 1 ? 'Folio' : 'Folios'} Included
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-12 text-center bg-card border border-ink/15 space-y-4">
                <BookOpen className="w-10 h-10 text-oxblood mx-auto" />
                <h3 className="font-display text-xl text-ink font-medium">No documents assembled yet</h3>
                <p className="text-xs sm:text-sm text-ash max-w-md mx-auto">
                  This course pack has been created, but no folios have been attached yet. Contribute the first document to populate this collection.
                </p>
                <Link
                  href="/upload"
                  className={buttonVariants({ variant: 'primary', size: 'md' })}
                >
                  Contribute First Document
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc, idx) => (
                  <DocumentCard key={doc.id} document={doc} index={idx + 1} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="py-12" aria-label="Unlock Course Pack">
            <PasswordUnlockCard
              resourceId={collection.id}
              resourceTitle={collection.title}
              resourceType="collection"
            />
          </section>
        )}
      </Container>
    </div>
  );
}
