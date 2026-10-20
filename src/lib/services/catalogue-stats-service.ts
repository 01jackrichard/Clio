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

    // 1. Personal contributions count (approved published resources)
    const { count: contributionsCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploader_id', user.id)
      .eq('status', 'approved');

    // 2. Personal saved bookmarks count
    const { count: favoritesCount } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const baseMetrics: CatalogueMetrics = {
      myContributions: contributionsCount ?? 0,
      savedFolios: favoritesCount ?? 0,
    };

    if (isAdmin) {
      // 3. Admin-only: Global archive resources in catalogue (status = 'approved')
      const { count: archiveCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      // 4. Admin-only: Distinct real contributors with published documents
      const { data: contributorRows } = await supabase
        .from('documents')
        .select('uploader_id')
        .eq('status', 'approved');

      const distinctContributors = contributorRows
        ? new Set(contributorRows.map((r) => r.uploader_id).filter(Boolean)).size
        : 0;

      return {
        isAuthenticated: true,
        role: 'admin',
        displayName,
        metrics: {
          ...baseMetrics,
          archiveResources: archiveCount ?? 0,
          contributors: distinctContributors,
        },
      };
    }

    // Normal user: return only personal metrics
    return {
      isAuthenticated: true,
      role: 'user',
      displayName,
      metrics: baseMetrics,
    };
  } catch (err: unknown) {
    console.warn('Error computing catalogue metrics:', err);
    return fallbackGuest;
  }
}
