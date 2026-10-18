import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyDriveConnection, getGoogleDriveConfig } from '@/lib/drive/google-drive-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const cfg = getGoogleDriveConfig();
    const status = await verifyDriveConnection();

    return NextResponse.json({
      configured: status.configured,
      canRefresh: status.canRefresh,
      folderFound: status.folderFound,
      folderName: status.folderName,
      folderId: cfg.folderId,
      publicSharingEnabled: cfg.enablePublicSharing,
      error: status.error,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to query Drive status' },
      { status: 500 }
    );
  }
}
