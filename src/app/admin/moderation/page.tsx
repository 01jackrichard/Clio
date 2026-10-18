import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FilePlus2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ModerationQueue } from './moderation-queue';
import { DocumentRecord } from '@/types/database';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

interface PendingDocWithProfile extends DocumentRecord {
  profiles?: {
    display_name?: string | null;
    email?: string | null;
  } | null;
}

export default async function ModerationQueuePage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin/moderation');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/moderation');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  // Fetch pending documents with safe fallback
  let formattedDocs: DocumentRecord[] = [];
  try {
    const { data: pendingDocs, error } = await supabase
      .from('documents')
      .select('*, profiles(display_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!error && pendingDocs) {
      formattedDocs = (pendingDocs as unknown as PendingDocWithProfile[]).map((doc) => ({
        ...doc,
        uploader_name: doc.profiles?.display_name || doc.profiles?.email || 'Student Scholar',
      }));
    } else {
      const fallback = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (fallback.data) {
        formattedDocs = fallback.data.map((doc) => ({
          ...doc,
          uploader_name: 'Student Scholar',
        }));
      }
    }
  } catch {
    formattedDocs = [];
  }

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Quality Assurance"
        title="Moderation Queue"
        description="Review submitted student materials, inspect syllabus alignment, preview scans, and approve or reject submissions."
        action={
          <Link
            href="/admin/register-document"
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            <FilePlus2 className="w-4 h-4 mr-2" />
            <span>Register Canonical Folio</span>
          </Link>
        }
      />

      {/* Shared Admin Navigation */}
      <AdminNav pendingCount={formattedDocs.length} />

      {/* Interactive Moderation Queue */}
      <ModerationQueue initialDocuments={formattedDocs} />
    </Container>
  );
}
