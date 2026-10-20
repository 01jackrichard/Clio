import React from 'react';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { UsersTable } from './users-table';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin/users');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin/users');
  }

  const profile = await getCurrentUserProfile(user.id);

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  const supabase = await createClient();

  // Fetch pending counts for AdminNav
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
    // Non-fatal if counts fail
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Directory & Governance"
        title="Scholars & Access Directory"
        description="Inspect registered academic accounts, oversee institutional contribution standing, and delegate governance privileges."
      />

      {/* Shared Admin Navigation */}
      <AdminNav
        pendingCount={pendingModerationCount}
        reportsCount={pendingReportsCount}
      />

      {/* Users Directory Table */}
      <UsersTable
        initialProfiles={profiles || []}
        currentAdminId={user.id}
      />
    </Container>
  );
}
