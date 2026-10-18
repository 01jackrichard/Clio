import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileCheck2,
  Clock,
  Flag,
  Users,
  HardDrive,
  Download,
  FilePlus2,
  ArrowRight,
  Server,
  Layers,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatBytes } from '@/lib/utils';
import { config } from '@/lib/config';
import { verifyDriveConnection } from '@/lib/drive/google-drive-service';
import { Container, PageHeader } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AdminNav } from '@/components/admin/admin-nav';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin');
  }

  // Server-side administrator verification
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  // Aggregate metrics across canonical entities
  const [
    approvedRes,
    pendingRes,
    ,
    usersRes,
    reportsRes,
    totalsRes,
  ] = await Promise.all([
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('documents').select('file_size, download_count').eq('status', 'approved'),
  ]);

  let totalIndexedSizeBytes = 0;
  let totalDownloads = 0;

  if (totalsRes.data) {
    for (const doc of totalsRes.data) {
      totalIndexedSizeBytes += Number(doc.file_size || 0);
      totalDownloads += Number(doc.download_count || 0);
    }
  }

  const pendingCount = pendingRes.count ?? 0;
  const pendingReportsCount = reportsRes.count ?? 0;

  // Safe Google Drive connection check (never exposes client secrets or tokens)
  let driveConnection;
  try {
    driveConnection = await verifyDriveConnection();
  } catch {
    driveConnection = {
      configured: false,
      canRefresh: false,
      folderFound: false,
      error: 'Google Drive check failed during runtime verification.',
    };
  }

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Header */}
      <PageHeader
        eyebrow="Academic Governance Desk"
        eyebrowNumber="FOLIO 00"
        title="Operations & Integrity Console"
        description={`Platform moderation, storage governance, and quality assurance for ${config.app.collegeName}.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/register-document"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              <FilePlus2 className="w-4 h-4 mr-2" />
              <span>Register Canonical Folio</span>
            </Link>
            <a
              href="/api/admin/google-drive/auth"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              <HardDrive className="w-4 h-4 mr-2" />
              <span>Drive Authorization</span>
            </a>
          </div>
        }
      />

      {/* Shared Admin Navigation */}
      <AdminNav pendingCount={pendingCount} reportsCount={pendingReportsCount} />

      {/* Aggregate Statistics */}
      <section className="space-y-4" aria-labelledby="overview-stats-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="overview-stats-heading" className="label-eyebrow text-ink">
            Repository Performance & Holdings
          </h2>
          <span className="meta-mono text-ash text-[11px]">Database Authoritative Counts</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Approved
              </span>
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {approvedRes.count ?? 0}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Live in catalogue</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Pending
              </span>
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {pendingCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Review queue</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-oxblood mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Reports
              </span>
              <Flag className="w-4 h-4 text-oxblood" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {pendingReportsCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Flagged folios</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Scholars
              </span>
              <Users className="w-4 h-4 text-ash" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {usersRes.count ?? 0}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Registered users</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Storage
              </span>
              <HardDrive className="w-4 h-4 text-ash" />
            </div>
            <div className="font-display text-xl sm:text-2xl text-ink font-medium truncate">
              {formatBytes(totalIndexedSizeBytes)}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Indexed file sum</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Downloads
              </span>
              <Download className="w-4 h-4 text-ash" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {totalDownloads}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Total downloads</span>
          </Card>
        </div>
      </section>

      {/* Storage Governance & Drive Health */}
      <section className="space-y-4" aria-labelledby="storage-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="storage-heading" className="label-eyebrow text-ink">
            Institutional Cloud & Storage Architecture
          </h2>
          <span className="meta-mono text-ash text-[11px]">Drive.file Scope Protocol</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="meta-mono text-[10px] text-ash uppercase font-semibold">
                  Google Drive Status
                </span>
                {driveConnection.canRefresh && driveConnection.folderFound ? (
                  <Badge variant="success" dot size="sm">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" dot size="sm">
                    Attention
                  </Badge>
                )}
              </div>
              <h3 className="font-display text-base font-medium text-ink">
                Central Repository Target
              </h3>
              <p className="font-sans text-xs text-ash leading-relaxed">
                {driveConnection.folderFound
                  ? `Connected to folder: ${driveConnection.folderName || 'Clio Academic Library'}. Files are stored under the app's dedicated drive.file scope.`
                  : driveConnection.error || 'Google Drive integration is not fully configured.'}
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10">
              <a
                href="/api/admin/google-drive/auth"
                className="meta-mono text-xs font-semibold text-ink hover:text-oxblood flex items-center gap-1.5 transition-colors"
              >
                <span>Re-authenticate Drive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>

          <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="meta-mono text-[10px] text-ash uppercase font-semibold">
                  Submission Flood Cap
                </span>
                <Server className="w-4 h-4 text-ash" />
              </div>
              <h3 className="font-display text-base font-medium text-ink">
                {config.features.maxPendingSubmissionsPerUser} Pending Folios / Scholar
              </h3>
              <p className="font-sans text-xs text-ash leading-relaxed">
                Strict database limit prevents unreviewed submission flooding while ensuring genuine student contributions proceed smoothly.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 meta-mono text-[11px] text-ash">
              Enforced at API upload gate
            </div>
          </Card>

          <Card variant="default" className="p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="meta-mono text-[10px] text-ash uppercase font-semibold">
                  Velocity Limit
                </span>
                <Layers className="w-4 h-4 text-ash" />
              </div>
              <h3 className="font-display text-base font-medium text-ink">
                {config.features.maxUploadsPerHour} Submissions / Hour
              </h3>
              <p className="font-sans text-xs text-ash leading-relaxed">
                Shared rate ceiling protecting Google Drive quota and Supabase connection pools against automated abuse.
              </p>
            </div>
            <div className="pt-3 border-t border-ink/10 meta-mono text-[11px] text-ash">
              {config.storage.maxFileSizeMb} MB maximum single file size
            </div>
          </Card>
        </div>
      </section>

      {/* Core Governance Modules Directory */}
      <section className="space-y-4" aria-labelledby="modules-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="modules-heading" className="label-eyebrow text-ink">
            Governance Workspaces
          </h2>
          <span className="meta-mono text-ash text-[11px]">Direct Review Actions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card
            variant="default"
            className="p-6 flex flex-col justify-between hover:border-ink/30 transition-colors group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xs bg-amber-950/10 border border-amber-900/20 text-amber-900 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-800" />
                </div>
                {pendingCount > 0 && (
                  <Badge variant="warning" dot size="sm">
                    {pendingCount} Pending
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-ink group-hover:text-oxblood transition-colors">
                  Moderation Queue
                </h3>
                <p className="font-sans text-xs text-ash mt-1.5 leading-relaxed">
                  Inspect pending student notes, verify syllabus taxonomy alignment, and approve or reject submissions with mandatory feedback.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-ink/10">
              <Link
                href="/admin/moderation"
                className="meta-mono text-xs font-semibold text-ink group-hover:text-oxblood flex items-center justify-between transition-colors"
              >
                <span>Open Moderation Queue</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </Card>

          <Card
            variant="default"
            className="p-6 flex flex-col justify-between hover:border-ink/30 transition-colors group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xs bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center">
                  <Flag className="w-5 h-5 text-oxblood" />
                </div>
                {pendingReportsCount > 0 && (
                  <Badge variant="oxblood" dot size="sm">
                    {pendingReportsCount} Open
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-ink group-hover:text-oxblood transition-colors">
                  Abuse & Integrity Reports
                </h3>
                <p className="font-sans text-xs text-ash mt-1.5 leading-relaxed">
                  Triage community reports for copyright violations, duplicate documents, classification errors, or unreadable scans.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-ink/10">
              <Link
                href="/admin/reports"
                className="meta-mono text-xs font-semibold text-ink group-hover:text-oxblood flex items-center justify-between transition-colors"
              >
                <span>Triage Reports</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </Card>

          <Card
            variant="default"
            className="p-6 flex flex-col justify-between hover:border-ink/30 transition-colors group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xs bg-bone border border-ink/15 text-ash flex items-center justify-center">
                  <Users className="w-5 h-5 text-ink" />
                </div>
                <Badge variant="neutral" size="sm">
                  {usersRes.count ?? 0} Accounts
                </Badge>
              </div>
              <div>
                <h3 className="font-display text-lg font-medium text-ink group-hover:text-oxblood transition-colors">
                  User Directory & Access
                </h3>
                <p className="font-sans text-xs text-ash mt-1.5 leading-relaxed">
                  Oversee student identities, department affiliations, account suspensions, and administrative role assignments.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-ink/10">
              <Link
                href="/admin/users"
                className="meta-mono text-xs font-semibold text-ink group-hover:text-oxblood flex items-center justify-between transition-colors"
              >
                <span>Manage Accounts</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </Container>
  );
}
