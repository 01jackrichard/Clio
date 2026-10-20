import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileCheck2 } from 'lucide-react';
import { createClient, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { ReportsList } from './reports-list';
import { ReportRecord } from '@/types/database';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

interface ReportWithJoins extends ReportRecord {
  documents?: { title?: string | null } | null;
  profiles?: { email?: string | null; display_name?: string | null } | null;
}

export default async function AdminReportsPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin/reports');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/reports');
  }

  const profile = await getCurrentUserProfile(user.id);

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  const supabase = await createClient();

  let formattedReports: ReportRecord[] = [];
  try {
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*, documents(id, title, status, original_filename), profiles(email, display_name)')
      .order('created_at', { ascending: false });

    if (!error && reports) {
      formattedReports = (reports as unknown as ReportWithJoins[]).map((r) => ({
        ...r,
        document_title: r.documents?.title || 'Unknown Document',
        reporter_email: r.profiles?.email || 'Student Scholar',
      }));
    } else {
      const fallback = await supabase
        .from('reports')
        .select('*, documents(id, title, status, original_filename)')
        .order('created_at', { ascending: false });

      if (fallback.data) {
        formattedReports = (fallback.data as unknown as ReportWithJoins[]).map((r) => ({
          ...r,
          document_title: r.documents?.title || 'Unknown Document',
          reporter_email: 'Student Scholar',
        }));
      }
    }
  } catch {
    formattedReports = [];
  }

  const pendingReportsCount = formattedReports.filter((r) => r.status === 'pending').length;

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Integrity & Compliance"
        title="Abuse & Quality Reports"
        description="Investigate documents flagged for duplicates, copyright concerns, incorrect classification, or unreadable scans."
        action={
          <Link
            href="/admin/moderation"
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            <FileCheck2 className="w-4 h-4 mr-2" />
            <span>Open Moderation Queue</span>
          </Link>
        }
      />

      {/* Shared Admin Navigation */}
      <AdminNav reportsCount={pendingReportsCount} />

      {/* Reports List */}
      <ReportsList initialReports={formattedReports} />
    </Container>
  );
}
