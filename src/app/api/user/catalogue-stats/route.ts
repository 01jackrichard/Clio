import { NextResponse } from 'next/server';
import { getCatalogueMetrics } from '@/lib/services/catalogue-stats-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/catalogue-stats
 * Authoritative catalogue overview metrics endpoint for the current session.
 * - Authenticated admin receives: My Contributions, Saved Folios, Archive Resources, Contributors
 * - Authenticated user receives: My Contributions, Saved Folios
 * - Guest receives null metrics
 */
export async function GET() {
  try {
    const stats = await getCatalogueMetrics();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: unknown) {
    console.error('[CatalogueStatsAPI] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
