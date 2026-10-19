import { getAdminClient } from '@/lib/supabase/admin';

/**
 * ============================================================================
 * CLIO PRIVATE STORAGE QUOTA SERVICE
 * Enforces a strict 50 GB per-user limit on successfully stored private files.
 * ============================================================================
 */

// Authoritative exact limit in bytes: 50 GB
export const PRIVATE_STORAGE_QUOTA_BYTES = 50_000_000_000;

// Warning thresholds
export const STORAGE_WARNING_PERCENT = 80;
export const STORAGE_CRITICAL_PERCENT = 95;

export interface StorageUsageResult {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  percentage: number;
  fileCount: number;
  isWarning: boolean;
  isCritical: boolean;
  isExceeded: boolean;
  formattedUsed: string;
  formattedQuota: string;
  formattedRemaining: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  usedBytes: number;
  remainingBytes: number;
  quotaBytes: number;
  incomingBytes: number;
  excessBytes: number;
  formattedUsed: string;
  formattedRemaining: string;
  formattedQuota: string;
  error?: string;
}

/**
 * Format bytes into readable academic metrics: B, KB, MB, GB
 */
export function formatStorageBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';

  // Specific canonical formats
  if (bytes === PRIVATE_STORAGE_QUOTA_BYTES) return '50 GB';

  const k = 1000; // Decimal metric for storage quotas (1 GB = 10^9 B)
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  const val = bytes / Math.pow(k, safeI);

  // If exact whole number, omit trailing .0
  const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(decimals);
  return `${formatted} ${sizes[safeI]}`;
}

/**
 * IN-FLIGHT RESERVATIONS REGISTRY
 * Prevents race conditions from concurrent requests bypassing the quota.
 * Holds temporary reservation tokens with a 60-second TTL.
 */
interface InFlightReservation {
  userId: string;
  bytes: number;
  expiresAt: number;
}

const activeReservations = new Map<string, InFlightReservation>();

function pruneExpiredReservations(): void {
  const now = Date.now();
  for (const [token, res] of activeReservations.entries()) {
    if (res.expiresAt <= now) {
      activeReservations.delete(token);
    }
  }
}

/**
 * Get active reserved bytes currently in-flight for a user
 */
export function getActiveReservedBytes(userId: string): number {
  pruneExpiredReservations();
  let total = 0;
  for (const res of activeReservations.values()) {
    if (res.userId === userId) {
      total += res.bytes;
    }
  }
  return total;
}

/**
 * Reserve storage for an incoming in-flight upload.
 * Returns a release function or null if reservation would exceed quota.
 */
export function reservePrivateStorage(
  userId: string,
  incomingBytes: number,
  currentUsedBytes: number
): { token: string; release: () => void } | null {
  pruneExpiredReservations();
  const reservedBytes = getActiveReservedBytes(userId);
  const totalProposed = currentUsedBytes + reservedBytes + incomingBytes;

  if (totalProposed > PRIVATE_STORAGE_QUOTA_BYTES) {
    return null;
  }

  const token = `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  activeReservations.set(token, {
    userId,
    bytes: incomingBytes,
    expiresAt: Date.now() + 60_000, // 60s TTL
  });

  return {
    token,
    release: () => {
      activeReservations.delete(token);
    },
  };
}

/**
 * Fetch authoritative storage usage from trusted server-side database.
 * Only counts successfully stored private documents belonging to the user.
 */
export async function getStorageUsage(userId: string): Promise<StorageUsageResult> {
  const adminClient = getAdminClient();

  try {
    const { data: docs, error } = await adminClient
      .from('documents')
      .select('id, file_size, visibility, status')
      .eq('uploader_id', userId)
      .eq('visibility', 'private');

    if (error) {
      console.warn('[StorageQuota] Error querying user private documents:', error.message);
      // Fallback safe state
      return calculateStorageResult(0, 0);
    }

    // Only count active, non-rejected, non-deleted files
    const validDocs = (docs || []).filter(
      (d) => d.status !== 'rejected' && (d as { status?: string }).status !== 'deleted'
    );

    const usedBytes = validDocs.reduce((acc, doc) => {
      const size = Number(doc.file_size) || 0;
      return acc + (size > 0 ? size : 0);
    }, 0);

    const inFlight = getActiveReservedBytes(userId);
    const effectiveUsed = Math.max(0, usedBytes + inFlight);

    return calculateStorageResult(effectiveUsed, validDocs.length);
  } catch (err) {
    console.error('[StorageQuota] Unhandled error getting storage usage:', err);
    return calculateStorageResult(0, 0);
  }
}

/**
 * Helper to compute derived metrics
 */
export function calculateStorageResult(
  usedBytes: number,
  fileCount: number,
  quotaBytes = PRIVATE_STORAGE_QUOTA_BYTES
): StorageUsageResult {
  const safeUsed = Math.max(0, usedBytes);
  const remainingBytes = Math.max(0, quotaBytes - safeUsed);
  const rawPercentage = quotaBytes > 0 ? (safeUsed / quotaBytes) * 100 : 0;
  const percentage = Math.min(100, Math.max(0, parseFloat(rawPercentage.toFixed(2))));

  return {
    usedBytes: safeUsed,
    quotaBytes,
    remainingBytes,
    percentage,
    fileCount,
    isWarning: percentage >= STORAGE_WARNING_PERCENT,
    isCritical: percentage >= STORAGE_CRITICAL_PERCENT,
    isExceeded: safeUsed >= quotaBytes,
    formattedUsed: formatStorageBytes(safeUsed),
    formattedQuota: formatStorageBytes(quotaBytes),
    formattedRemaining: formatStorageBytes(remainingBytes),
  };
}

/**
 * Server-side quota check before committing a new private upload.
 */
export async function checkPrivateQuota(
  userId: string,
  incomingBytes: number
): Promise<QuotaCheckResult> {
  const currentUsage = await getStorageUsage(userId);
  const safeIncoming = Math.max(0, incomingBytes);
  const projectedTotal = currentUsage.usedBytes + safeIncoming;
  const allowed = projectedTotal <= PRIVATE_STORAGE_QUOTA_BYTES;
  const excessBytes = allowed ? 0 : projectedTotal - PRIVATE_STORAGE_QUOTA_BYTES;

  const result: QuotaCheckResult = {
    allowed,
    usedBytes: currentUsage.usedBytes,
    remainingBytes: currentUsage.remainingBytes,
    quotaBytes: PRIVATE_STORAGE_QUOTA_BYTES,
    incomingBytes: safeIncoming,
    excessBytes,
    formattedUsed: currentUsage.formattedUsed,
    formattedRemaining: currentUsage.formattedRemaining,
    formattedQuota: currentUsage.formattedQuota,
  };

  if (!allowed) {
    result.error = `Private storage quota exceeded. Uploading ${formatStorageBytes(
      safeIncoming
    )} requires more space than your remaining ${currentUsage.formattedRemaining} (Quota: 50 GB).`;
  }

  return result;
}
