import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStorageUsage } from '@/lib/services/storage-quota-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/storage
 * Authoritative user storage quota and usage endpoint.
 * Strictly derives user identity from session cookies; never from request params.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to view storage quota.' },
        { status: 401 }
      );
    }

    const usage = await getStorageUsage(user.id);

    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (err: unknown) {
    console.error('[StorageAPI] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
