import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { getSharedWithMeResources } from '@/lib/services/sharing-service';
import { Container, PageHeader } from '@/components/ui/container';
import { SharedResourcesList } from './shared-resources-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shared with Me — Clio Academic Archive',
  description:
    'Academic lecture notes, examination materials, and curated course packs shared directly with you by verified scholars.',
};

export default async function SharedWithMePage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/shared-with-me');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/shared-with-me');
  }

  const sharedItems = await getSharedWithMeResources(user.id);

  return (
    <div className="bg-paper min-h-screen py-8 sm:py-12">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Scholar Exchange"
          title="Shared with me"
          description={`Private academic folios and course packs shared directly with you by students and educators at ${config.app.collegeName}.`}
        />

        <SharedResourcesList initialItems={sharedItems} />
      </Container>
    </div>
  );
}
