import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { AdminNav } from '@/components/admin/admin-nav';
import { RegisterDocumentForm } from './register-document-form';

export const dynamic = 'force-dynamic';

export default async function AdminRegisterDocumentPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin/register-document');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/register-document');
  }

  const profile = await getCurrentUserProfile(user.id);

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  const supabase = await createClient();

  // Fetch pending counters for navigation
  let pendingModerationCount = 0;
  let pendingReportsCount = 0;

  try {
    const [modRes, repRes] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    pendingModerationCount = modRes.count || 0;
    pendingReportsCount = repRes.count || 0;
  } catch {
    // Non-fatal
  }

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Central Repository Workflow"
        title="Register Canonical Google Drive Folio"
        description="Index accredited lecture notes, syllabus folios, and past papers directly from institutional Google Drive storage without secondary re-uploads."
      />

      {/* Shared Admin Navigation */}
      <AdminNav
        pendingCount={pendingModerationCount}
        reportsCount={pendingReportsCount}
      />

      {/* Registration Form */}
      <RegisterDocumentForm />
    </Container>
  );
}
