import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserSubmissions } from '@/lib/services/document-service';
import { MySubmissionsList } from './submissions-list';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface MySubmissionsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MySubmissionsPage({ searchParams }: MySubmissionsPageProps) {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/my-submissions');
  }

  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/my-submissions');
  }

  // Fetch all user submissions to power dynamic tab counts and instant filtering
  const allSubmissions = await getUserSubmissions(user.id);

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      {/* Editorial Page Header */}
      <PageHeader
        eyebrow="Academic Repository"
        eyebrowNumber="FOLIO 04"
        title="My Submissions"
        description="Review moderation status, track peer review notes, and manage your contributed academic materials."
        action={
          <Link
            href="/upload"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Contribute Document</span>
          </Link>
        }
      />

      {/* Submissions List with Dynamic Counts and Status Filtering */}
      <MySubmissionsList
        initialSubmissions={allSubmissions}
        currentStatus={params.status || 'all'}
      />
    </Container>
  );
}

