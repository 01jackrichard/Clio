import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileText,
  UploadCloud,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  User,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { getUserSubmissions, getUserFavorites } from '@/lib/services/document-service';
import { formatBytes, formatDate, getMaterialTypeBadge } from '@/lib/utils';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/dashboard');
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard');
  }

  // Fetch student profile and user-scoped data in parallel
  const [profile, submissions, favorites] = await Promise.all([
    getCurrentUserProfile(user.id),
    getUserSubmissions(user.id),
    getUserFavorites(user.id),
  ]);

  const approvedCount = submissions.filter((s) => s.status === 'approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const isProfileIncomplete = !profile?.department || !profile?.academic_year;
  const studentName = profile?.display_name || user.email?.split('@')[0] || 'Scholar';

  const quickNav = [
    {
      title: 'Academic Catalogue',
      description: 'Consult verified course syllabi, unit notes, and examination papers.',
      href: '/documents',
      icon: BookOpen,
      actionLabel: 'Explore Library',
    },
    {
      title: 'Contribute Material',
      description: 'Deposit lecture notes or question banks to the institutional academic archive.',
      href: '/upload',
      icon: UploadCloud,
      actionLabel: 'Deposit Folio',
    },
    {
      title: 'My Submissions',
      description: 'Track moderation decisions, peer feedback, and your contribution history.',
      href: '/my-submissions',
      icon: FileText,
      actionLabel: 'View Folios',
      badge: submissions.length > 0 ? `${submissions.length}` : undefined,
    },
    {
      title: 'Saved Bookmarks',
      description: 'Review pinned study materials and cheat sheets saved for exam revision.',
      href: '/favorites',
      icon: Bookmark,
      actionLabel: 'Open Archive',
      badge: favorites.length > 0 ? `${favorites.length}` : undefined,
    },
    {
      title: 'Scholar Profile',
      description: 'Manage department affiliation, academic year, and public credentials.',
      href: '/profile',
      icon: User,
      actionLabel: 'Edit Profile',
    },
  ];

  return (
    <Container className="py-8 sm:py-12 space-y-10">
      {/* Editorial Header */}
      <PageHeader
        eyebrow="Academic Workspace"
        title={`Welcome back, ${studentName}`}
        description={
          profile?.department && profile?.academic_year
            ? `${profile.department} · ${profile.academic_year} · ${config.app.collegeName}`
            : `Student Scholar · ${config.app.collegeName}`
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/upload"
              className={buttonVariants({ variant: 'primary', size: 'md' })}
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              <span>Contribute Folio</span>
            </Link>
            <Link
              href="/documents"
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              <span>Browse Library</span>
            </Link>
          </div>
        }
      />

      {/* Profile Incomplete Notification */}
      {isProfileIncomplete && (
        <Card variant="paper" className="p-4 sm:p-5 border-oxblood/30 bg-oxblood/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-oxblood shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-display text-sm font-medium text-ink">
                  Incomplete Academic Affiliation
                </p>
                <p className="font-sans text-xs text-ash leading-relaxed">
                  Set your department and current academic standing to personalize your study recommendations and properly attribute uploaded materials.
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              <span>Complete Profile</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </Card>
      )}

      {/* Academic Activity Summary Metrics */}
      <section className="space-y-4" aria-labelledby="metrics-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="metrics-heading" className="label-eyebrow text-ink">
            Activity Folio & Repository Standing
          </h2>
          <span className="meta-mono text-ash text-[11px]">Direct Supabase Verification</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-ash mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Contributed Folios
              </span>
              <Archive className="w-4 h-4 text-ash" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {submissions.length}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Total deposited materials</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Published
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {approvedCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Live in academic catalogue</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Under Review
              </span>
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {pendingCount}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Pending moderation</span>
          </Card>

          <Card variant="paper" className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-oxblood mb-2">
              <span className="meta-mono text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold">
                Saved Bookmarks
              </span>
              <Bookmark className="w-4 h-4 text-oxblood" />
            </div>
            <div className="font-display text-2xl sm:text-3xl text-ink font-medium">
              {favorites.length}
            </div>
            <span className="meta-mono text-[10px] text-ash mt-1">Pinned for exam study</span>
          </Card>
        </div>
      </section>

      {/* Suggested Academic Hub Navigation */}
      <section className="space-y-4" aria-labelledby="navigation-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <h2 id="navigation-heading" className="label-eyebrow text-ink">
            Scholar Folio Directory
          </h2>
          <span className="meta-mono text-ash text-[11px]">Core Repository Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                variant="default"
                className="p-5 flex flex-col justify-between hover:border-ink/30 transition-colors group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xs bg-bone/60 border border-ink/10 flex items-center justify-center text-ink group-hover:text-oxblood transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    {item.badge && (
                      <Badge variant="outline" size="sm">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-medium text-ink group-hover:text-oxblood transition-colors">
                      {item.title}
                    </h3>
                    <p className="font-sans text-xs text-ash mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-ink/10 flex items-center justify-between">
                  <Link
                    href={item.href}
                    className="meta-mono text-xs font-semibold text-ink group-hover:text-oxblood flex items-center gap-1.5 transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Contributions Section */}
      <section className="space-y-4" aria-labelledby="contributions-heading">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <div>
            <h2 id="contributions-heading" className="label-eyebrow text-ink">
              Recent Academic Deposits
            </h2>
          </div>
          <Link
            href="/my-submissions"
            className="meta-mono text-xs text-ash hover:text-oxblood flex items-center gap-1 transition-colors"
          >
            <span>View Full Submissions Archive</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {submissions.length > 0 ? (
          <div className="space-y-3">
            {submissions.slice(0, 5).map((doc) => {
              const materialBadge = getMaterialTypeBadge(doc.material_type);
              return (
                <Card
                  key={doc.id}
                  variant="default"
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-ink/30 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" size="sm">
                        {materialBadge.label}
                      </Badge>
                      <span className="meta-mono text-xs font-semibold text-ink">
                        {doc.subject}
                      </span>
                      {doc.unit && (
                        <Badge variant="neutral" size="sm">
                          {doc.unit}
                        </Badge>
                      )}
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-medium text-ink truncate">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="hover:text-oxblood transition-colors"
                      >
                        {doc.title}
                      </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 meta-mono text-[11px] text-ash">
                      <span>{doc.department}</span>
                      <span className="text-ink/20">•</span>
                      <span>{doc.semester}</span>
                      <span className="text-ink/20">•</span>
                      <span>{formatBytes(doc.file_size)}</span>
                      <span className="text-ink/20">•</span>
                      <span>Submitted {formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                    {doc.status === 'approved' && (
                      <Badge variant="success" dot size="sm">
                        Published
                      </Badge>
                    )}
                    {doc.status === 'pending' && (
                      <Badge variant="warning" dot size="sm">
                        Under Review
                      </Badge>
                    )}
                    {doc.status === 'rejected' && (
                      <Badge variant="oxblood" dot size="sm">
                        Needs Revision
                      </Badge>
                    )}
                    {doc.status === 'removed' && (
                      <Badge variant="neutral" dot size="sm">
                        Archived
                      </Badge>
                    )}

                    <Link
                      href={`/documents/${doc.id}`}
                      className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                    >
                      <span>Read Folio</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card variant="paper" className="p-10 text-center border-dashed border-ink/20 space-y-3">
            <div className="w-12 h-12 rounded-full bg-bone border border-ink/10 flex items-center justify-center mx-auto text-ash">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base text-ink font-medium">
                No academic contributions yet
              </h3>
              <p className="font-sans text-xs text-ash max-w-sm mx-auto leading-relaxed">
                Deposit lecture notes, question banks, or laboratory guides to start building your academic folio.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/upload"
                className={buttonVariants({ variant: 'primary', size: 'sm' })}
              >
                <UploadCloud className="w-4 h-4 mr-1.5" />
                <span>Deposit First Folio</span>
              </Link>
            </div>
          </Card>
        )}
      </section>
    </Container>
  );
}
