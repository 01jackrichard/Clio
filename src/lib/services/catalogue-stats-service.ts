import { createClient, getCurrentUser, getCurrentUserProfile } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import { resolveDisplayName } from '@/lib/utils';
import { getStorageUsage } from '@/lib/services/storage-quota-service';

export interface CatalogueMetrics {
  myContributions: number;
  savedFolios: number;
  privateStorageUsedBytes?: number;
  privateStorageQuotaBytes?: number;
  privateStorageFormatted?: string;
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
    const user = await getCurrentUser();

    if (!user) {
      return fallbackGuest;
    }

    // Authoritative profile & role lookup (cached per request)
    const profile = await getCurrentUserProfile(user.id);

    const isAdmin = profile?.role === 'admin' && profile?.status !== 'suspended';
    const displayName = resolveDisplayName(profile?.display_name, user.user_metadata, user.email);

    const supabase = await createClient();

    // Parallelize queries to eliminate sequential database round-trips
    if (isAdmin) {
      const [contributionsRes, favoritesRes, archiveRes, contributorRes, storageUsage] =
        await Promise.all([
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
          getStorageUsage(user.id),
        ]);

      const distinctContributors = contributorRes.data
        ? new Set(contributorRes.data.map((r) => r.uploader_id).filter(Boolean)).size
        : 0;

      const usedGb = (storageUsage.usedBytes / 1_000_000_000).toFixed(1);
      const quotaGb = Math.round(storageUsage.quotaBytes / 1_000_000_000);
      const privateStorageFormatted = `${usedGb} / ${quotaGb} GB`;

      return {
        isAuthenticated: true,
        role: 'admin',
        displayName,
        metrics: {
          myContributions: contributionsRes.count ?? 0,
          savedFolios: favoritesRes.count ?? 0,
          privateStorageUsedBytes: storageUsage.usedBytes,
          privateStorageQuotaBytes: storageUsage.quotaBytes,
          privateStorageFormatted,
          archiveResources: archiveRes.count ?? 0,
          contributors: distinctContributors,
        },
      };
    }

    // Normal user: return personal metrics (contributions, saved folios, private storage)
    const [contributionsRes, favoritesRes, storageUsage] = await Promise.all([
      supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('uploader_id', user.id)
        .eq('status', 'approved'),
      supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      getStorageUsage(user.id),
    ]);

    const usedGb = (storageUsage.usedBytes / 1_000_000_000).toFixed(1);
    const quotaGb = Math.round(storageUsage.quotaBytes / 1_000_000_000);
    const privateStorageFormatted = `${usedGb} / ${quotaGb} GB`;

    return {
      isAuthenticated: true,
      role: 'user',
      displayName,
      metrics: {
        myContributions: contributionsRes.count ?? 0,
        savedFolios: favoritesRes.count ?? 0,
        privateStorageUsedBytes: storageUsage.usedBytes,
        privateStorageQuotaBytes: storageUsage.quotaBytes,
        privateStorageFormatted,
      },
    };
  } catch (err: unknown) {
    console.warn('Error computing catalogue metrics:', err);
    return fallbackGuest;
  }
}
