import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Clock,
  Flag,
  Users,
  HardDrive,
  Download,
  FilePlus2,
  ArrowRight,
  Server,
  Layers,
  Lock,
  Globe,
} from 'lucide-react';
import { getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { formatBytes } from '@/lib/utils';
import { config } from '@/lib/config';
import { verifyDriveConnection } from '@/lib/drive/google-drive-service';
import { Container, PageHeader } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { AdminNav } from '@/components/admin/admin-nav';
import { MasterDocumentLedger, AdminDocumentItem } from '@/components/admin/master-document-ledger';
import { PlatformActivityFeed, ActivityEvent } from '@/components/admin/platform-activity-feed';
import { ScholarsStorageSummary, ScholarStorageProfile } from '@/components/admin/scholars-storage-summary';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/admin');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/admin');
  }

  // Server-side administrator verification
  const profile = await getCurrentUserProfile(user.id);

  if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
    redirect('/unauthorized');
  }

  const adminClient = getAdminClient();

  // Parallel data extraction using privileged admin client to access all public and private data
  const [
    allDocsRes,
    allProfilesRes,
    reportsRes,
    downloadLogsRes,
    auditLogsRes,
    driveConnection,
  ] = await Promise.all([
    adminClient
      .from('documents')
      .select(`
        id, title, subject, subject_code, department, academic_year, semester, material_type, unit,
        visibility, status, file_size, download_count, created_at, approved_at, uploader_id,
        uploader:profiles!uploader_id(display_name, email, role, department)
      `)
      .order('created_at', { ascending: false }),
    adminClient
      .from('profiles')
      .select('id, email, display_name, department, academic_year, role, status, created_at')
      .order('created_at', { ascending: false }),
    adminClient
      .from('reports')
      .select('id, reason, details, status, created_at, document_id, reporter_id')
      .order('created_at', { ascending: false })
      .limit(30),
    adminClient
      .from('download_logs')
      .select('id, created_at, document_id, user_id, ip_hash')
      .order('created_at', { ascending: false })
      .limit(30),
    adminClient
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, metadata, created_at, actor_id')
      .order('created_at', { ascending: false })
      .limit(30),
    verifyDriveConnection().catch((): Awaited<ReturnType<typeof verifyDriveConnection>> => ({
      configured: false,
      canRefresh: false,
      folderFound: false,
      error: 'Google Drive check failed during runtime verification.',
    })),
  ]);

  const allDocs = ((allDocsRes.data || []) as unknown) as AdminDocumentItem[];
  const allProfiles = allProfilesRes.data || [];
  const reports = reportsRes.data || [];
  const downloadLogs = downloadLogsRes.data || [];
  const auditLogs = auditLogsRes.data || [];

  // 1. Metric Calculations
  let totalIndexedSizeBytes = 0;
  let totalDownloads = 0;
  let publicBytes = 0;
  let privateBytes = 0;
  let publicCount = 0;
  let privateCount = 0;
  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const doc of allDocs) {
    const size = Number(doc.file_size || 0);
    totalIndexedSizeBytes += size;
    totalDownloads += Number(doc.download_count || 0);

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

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  // 2. Scholar Storage Profiles
  const scholars: ScholarStorageProfile[] = allProfiles.map((p) => {
    const userDocs = allDocs.filter((d) => d.uploader_id === p.id);
    const userPublic = userDocs.filter((d) => d.visibility !== 'private').length;
    const userPrivateDocs = userDocs.filter((d) => d.visibility === 'private');
    const userPrivateCount = userPrivateDocs.length;
    const userPrivateBytes = userPrivateDocs.reduce((acc, d) => acc + Number(d.file_size || 0), 0);

    return {
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      department: p.department,
      role: p.role,
      status: p.status,
      publicCount: userPublic,
      privateCount: userPrivateCount,
      privateBytes: userPrivateBytes,
      created_at: p.created_at,
    };
  });

  // 3. Platform Activity Events Synthesis
  const docMap = new Map(allDocs.map((d) => [d.id, d]));
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  const activityEvents: ActivityEvent[] = [];

  // Recent Uploads
  for (const doc of allDocs.slice(0, 15)) {
    activityEvents.push({
      id: `up_${doc.id}`,
      type: 'upload',
      title: doc.title,
      subtitle: `${doc.uploader?.display_name || 'Scholar'} (${doc.uploader?.email || 'N/A'}) deposited ${doc.subject} · ${doc.department}`,
      meta: `${formatBytes(doc.file_size)} · Status: ${doc.status === 'approved' ? 'Live in catalogue' : doc.status}`,
      timestamp: doc.created_at,
      link: `/documents/${doc.id}`,
      visibility: doc.visibility,
    });
  }

  // Recent Signups
  for (const p of allProfiles.slice(0, 10)) {
    activityEvents.push({
      id: `user_${p.id}`,
      type: 'signup',
      title: `${p.display_name} joined Clio`,
      subtitle: `${p.email} · ${p.department || 'General Academic'}`,
      meta: `Role: ${p.role === 'admin' ? 'Administrator' : 'Student Scholar'} · Status: ${p.status}`,
      timestamp: p.created_at,
      badge: p.role === 'admin' ? 'Admin' : 'Scholar',
      badgeVariant: p.role === 'admin' ? 'oxblood' : 'neutral',
    });
  }

  // Recent Abuse Reports
  for (const r of reports.slice(0, 10)) {
    const targetDoc = docMap.get(r.document_id);
    const reporter = profileMap.get(r.reporter_id);
    activityEvents.push({
      id: `rep_${r.id}`,
      type: 'report',
      title: `Abuse Report: ${r.reason}`,
      subtitle: targetDoc ? `Flagged on "${targetDoc.title}"` : 'Flagged archival resource',
      meta: reporter ? `Reported by ${reporter.display_name} (${reporter.email})` : 'Anonymous report',
      timestamp: r.created_at,
      link: targetDoc ? `/documents/${targetDoc.id}` : undefined,
    });
  }

  // Recent Downloads
  for (const dl of downloadLogs.slice(0, 10)) {
    const targetDoc = docMap.get(dl.document_id);
    const downloader = dl.user_id ? profileMap.get(dl.user_id) : null;
    activityEvents.push({
      id: `dl_${dl.id}`,
      type: 'download',
      title: targetDoc ? `Downloaded "${targetDoc.title}"` : 'Resource downloaded',
      subtitle: downloader ? `Scholar: ${downloader.display_name} (${downloader.email})` : 'Archival Reader fetch',
      meta: dl.ip_hash ? `Security hash: ${dl.ip_hash.slice(0, 10)}...` : undefined,
      timestamp: dl.created_at,
      link: targetDoc ? `/documents/${targetDoc.id}` : undefined,
    });
  }

  // Recent Audit Logs
  for (const al of auditLogs.slice(0, 10)) {
    const actor = al.actor_id ? profileMap.get(al.actor_id) : null;
    activityEvents.push({
      id: `aud_${al.id}`,
      type: al.action.includes('delete') ? 'delete' : 'upload',
      title: `Administrative action: ${al.action}`,
      subtitle: actor ? `Authorized by ${actor.display_name} (${actor.email})` : 'System action',
      meta: al.metadata ? JSON.stringify(al.metadata) : undefined,
      timestamp: al.created_at,
    });
  }

  activityEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentActivities = activityEvents.slice(0, 20);

  return (
    <Container className="py-8 sm:py-12 space-y-10">
      {/* Header */}
      <PageHeader
        eyebrow="Academic Governance & Telemetry Desk"
        title="Operations & Integrity Console"
        description={`Complete platform transparency, master archive holdings, and cloud infrastructure governance for ${config.app.collegeName}.`}
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

      {/* SECTION 1: Aggregate Telemetry & Holdings */}
      <section className="space-y-4" aria-labelledby="overview-stats-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="overview-stats-heading" className="label-eyebrow text-ink">
            True Platform Telemetry & Master Holdings
          </h2>
          <span className="meta-mono text-ash text-[11px]">Database Authoritative Ledger</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Approved Public */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Live Public
              </span>
              <Globe className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="font-display text-2xl text-ink font-medium">
              {approvedCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1 truncate">
              {formatBytes(publicBytes)} ({publicCount} total)
            </span>
          </Card>

          {/* 2. Confidential Private Vaults */}
          <Card variant="paper" className="p-4 flex flex-col justify-between border-oxblood/30 bg-oxblood/5">
            <div className="flex items-center justify-between text-oxblood mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Private Vaults
              </span>
              <Lock className="w-3.5 h-3.5 text-oxblood" />
            </div>
            <div className="font-display text-2xl text-oxblood font-medium">
              {privateCount}
            </div>
            <span className="meta-mono text-[10px] text-oxblood/80 mt-1 truncate font-medium">
              {formatBytes(privateBytes)} stored
            </span>
          </Card>

          {/* 3. Pending Moderation */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Pending
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="font-display text-2xl text-ink font-medium">
              {pendingCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">
              {rejectedCount > 0 ? `${rejectedCount} rejected` : 'Review queue'}
            </span>
          </Card>

          {/* 4. Abuse Reports */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-oxblood mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Reports
              </span>
              <Flag className="w-3.5 h-3.5 text-oxblood" />
            </div>
            <div className="font-display text-2xl text-ink font-medium">
              {pendingReportsCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Flagged folios</span>
          </Card>

          {/* 5. Scholars */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Scholars
              </span>
              <Users className="w-3.5 h-3.5 text-ash" />
            </div>
            <div className="font-display text-2xl text-ink font-medium">
              {allProfiles.length}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">User directory</span>
          </Card>

          {/* 6. Total Platform Storage */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                All Storage
              </span>
              <HardDrive className="w-3.5 h-3.5 text-ash" />
            </div>
            <div className="font-display text-xl text-ink font-medium truncate">
              {formatBytes(totalIndexedSizeBytes)}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Physical sum</span>
          </Card>

          {/* 7. Total Downloads */}
          <Card variant="paper" className="p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] uppercase tracking-wider font-semibold">
                Downloads
              </span>
              <Download className="w-3.5 h-3.5 text-ash" />
            </div>
            <div className="font-display text-2xl text-ink font-medium">
              {totalDownloads}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Total reads</span>
          </Card>
        </div>
      </section>

      {/* SECTION 2: Master Document Ledger (Public & Confidential Private Holdings) */}
      <section className="space-y-4" aria-labelledby="master-ledger-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <div>
            <h2 id="master-ledger-heading" className="label-eyebrow text-ink">
              Master Document Archive & Privacy Ledger
            </h2>
            <p className="font-sans text-xs text-ash mt-0.5">
              Unified governance explorer covering all public contributions and confidential private vault notes across all accounts.
            </p>
          </div>
          <span className="meta-mono text-oxblood text-xs hidden sm:inline font-medium">
            Admin Bypass Active
          </span>
        </div>

        <MasterDocumentLedger initialDocuments={allDocs} />
      </section>

      {/* SECTION 3: Live Activity Stream & Scholar Storage Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live Activity Stream */}
        <section className="space-y-4" aria-labelledby="live-activity-heading">
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <h2 id="live-activity-heading" className="label-eyebrow text-ink">
                Live Platform Activity Stream
              </h2>
            </div>
            <span className="meta-mono text-ash text-[11px]">Real-Time Event Audit</span>
          </div>

          <PlatformActivityFeed events={recentActivities} />
        </section>

        {/* Scholar Storage Directory */}
        <section className="space-y-4" aria-labelledby="scholars-storage-heading">
          <div className="flex items-center justify-between pb-2 border-b border-ink/10">
            <h2 id="scholars-storage-heading" className="label-eyebrow text-ink">
              Scholar Storage Quota & Private Usage
            </h2>
            <span className="meta-mono text-ash text-[11px]">50 GB Limit Audit</span>
          </div>

          <ScholarsStorageSummary scholars={scholars} />
        </section>
      </div>

      {/* SECTION 4: Storage Governance & Drive Health */}
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

      {/* SECTION 5: Core Governance Modules Directory */}
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
                  {allProfiles.length} Accounts
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
