import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserFavorites } from '@/lib/services/document-service';
import { config } from '@/lib/config';
import { Container, PageHeader } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { FavoritesList } from './favorites-list';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    redirect('/auth/login?redirectTo=/favorites');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/favorites');
  }

  const favorites = await getUserFavorites(user.id);

  return (
    <Container className="py-8 sm:py-12 space-y-8">
      <PageHeader
        eyebrow="Personal Archive"
        eyebrowNumber="FOLIO 03"
        title="Saved Bookmarks"
        description="Reference materials, lecture notes, and examination papers pinned to your personal study desk for quick revision."
        action={
          <Link
            href="/documents"
            className={buttonVariants({ variant: 'secondary', size: 'md' })}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span>Browse Catalogue</span>
          </Link>
        }
      />

      <FavoritesList initialFavorites={favorites} />
    </Container>
  );
}
