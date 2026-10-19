import React from 'react';
import { redirect } from 'next/navigation';
import { Lock, Calendar, Mail, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { ProfileForm } from './profile-form';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getStorageUsage } from '@/lib/services/storage-quota-service';
import { PrivateStoragePanel } from '@/components/storage/private-storage-panel';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/profile');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/profile');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Scholar';
  const initialLetter = displayName.charAt(0).toUpperCase();
  const isProfileIncomplete = !profile?.department || !profile?.academic_year;
  const storageUsage = await getStorageUsage(user.id);

  return (
    <Container className="py-8 sm:py-12 space-y-10">
      {/* Editorial Page Header */}
      <PageHeader
        eyebrow="Academic Identity"
        title="Scholar Profile"
        description={`Manage your institutional affiliation, academic standing, and public scholar credentials for ${config.app.collegeName}.`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Account Identity & Institutional Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card variant="paper" className="p-6 text-center space-y-5">
            {/* Monogram Seal */}
            <div className="w-20 h-20 rounded-full bg-bone border-2 border-ink/20 text-ink flex items-center justify-center font-display text-2xl font-medium mx-auto shadow-xs">
              {initialLetter}
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-xl font-medium text-ink tracking-tight">
                {displayName}
              </h3>
              <p className="meta-mono text-xs text-ash truncate flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-ash" />
                <span>{profile?.email || user.email}</span>
              </p>
            </div>

            {/* Read-Only Status & Role Badges */}
            <div className="pt-4 border-t border-ink/10 flex flex-wrap items-center justify-center gap-2">
              <Badge
                variant={profile?.role === 'admin' ? 'oxblood' : 'neutral'}
                dot
                size="sm"
              >
                Role: {profile?.role || 'student'}
              </Badge>

              <Badge
                variant={profile?.status === 'active' ? 'success' : 'warning'}
                dot
                size="sm"
              >
                Status: {profile?.status || 'active'}
              </Badge>
            </div>

            {/* Academic Standing Eyebrow */}
            <div className="pt-4 border-t border-ink/10 space-y-2 text-left meta-mono text-xs text-ash">
              <div className="flex items-center justify-between">
                <span>Department:</span>
                <span className="text-ink font-sans font-medium truncate max-w-[170px]">
                  {profile?.department || 'Unspecified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Standing:</span>
                <span className="text-ink font-sans font-medium">
                  {profile?.academic_year || 'Unspecified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Graduation:</span>
                <span className="text-ink font-sans font-medium">
                  {profile?.graduation_year || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-ink/5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-ash" />
                  <span>Enrolled:</span>
                </span>
                <span>{formatDate(profile?.created_at || '2026-01-01')}</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-bone/40 border border-ink/10 rounded-xs text-left">
              <div className="flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-ash shrink-0 mt-0.5" />
                <p className="font-sans text-[11px] text-ash leading-relaxed">
                  Institutional email and administrative roles are authoritative and governed by Supabase directory policies.
                </p>
              </div>
            </div>
          </Card>

          {isProfileIncomplete && (
            <Card variant="default" className="p-4 border-amber-900/25 bg-amber-950/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-mono uppercase text-[11px] font-semibold tracking-wider">
                <GraduationCap className="w-4 h-4 text-amber-800" />
                <span>Affiliation Incomplete</span>
              </div>
              <p className="font-sans text-xs text-ink/80 leading-relaxed">
                Please complete your department and current academic year using the form to ensure uploaded lecture notes are correctly indexed in the library.
              </p>
            </Card>
          )}

          {/* Private Storage Quota Panel */}
          <PrivateStoragePanel initialUsage={storageUsage} />
        </div>

        {/* Right Column: Profile Form */}
        <div className="lg:col-span-8">
          <ProfileForm profile={profile} />
        </div>
      </div>
    </Container>
  );
}
