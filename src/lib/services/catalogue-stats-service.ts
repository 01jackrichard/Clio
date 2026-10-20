import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { resolveDisplayName } from '@/lib/utils';

export interface CatalogueMetrics {
  myContributions: number;
  savedFolios: number;
  archiveResources?: number;
  contributors?: number;
}

export interface CatalogueAuthStats {
  isAuthenticated: boolean;
  role: 'admin' | 'user' | 'guest';
  displayName: string | null;
  metrics: CatalogueMetrics | null;
}

/**
 * Authoritatively computes catalogue overview statistics for the current user.
 * - Administrators receive: My Contributions, Saved Folios, Archive Resources, Contributors.
 * - Standard users receive only their personal stats: My Contributions, Saved Folios.
 * - Guests receive no privileged counts.
 */
export async function getCatalogueMetrics(): Promise<CatalogueAuthStats> {
  const fallbackGuest: CatalogueAuthStats = {
    isAuthenticated: false,
    role: 'guest',
    displayName: null,
    metrics: null,
  };

  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return fallbackGuest;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return fallbackGuest;
    }

    // Authoritative profile & role lookup
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, status, display_name')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin' && profile?.status !== 'suspended';
    const displayName = resolveDisplayName(profile?.display_name, user.user_metadata, user.email);

    // Parallelize queries to eliminate sequential database round-trips
    if (isAdmin) {
      const [contributionsRes, favoritesRes, archiveRes, contributorRes] = await Promise.all([
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('uploader_id', user.id)
          .eq('status', 'approved'),
        supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved'),
        supabase
          .from('documents')
          .select('uploader_id')
          .eq('status', 'approved'),
      ]);

      const distinctContributors = contributorRes.data
        ? new Set(contributorRes.data.map((r) => r.uploader_id).filter(Boolean)).size
        : 0;

      return {
        isAuthenticated: true,
        role: 'admin',
        displayName,
        metrics: {
          myContributions: contributionsRes.count ?? 0,
          savedFolios: favoritesRes.count ?? 0,
          archiveResources: archiveRes.count ?? 0,
          contributors: distinctContributors,
        },
      };
    }

    // Normal user: return only personal metrics (parallelized)
    const [contributionsRes, favoritesRes] = await Promise.all([
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('uploader_id', user.id)
        .eq('status', 'approved'),
      supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    return {
      isAuthenticated: true,
      role: 'user',
      displayName,
      metrics: {
        myContributions: contributionsRes.count ?? 0,
        savedFolios: favoritesRes.count ?? 0,
      },
    };
  } catch (err: unknown) {
    console.warn('Error computing catalogue metrics:', err);
    return fallbackGuest;
  }
}
