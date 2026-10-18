import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateClioLibraryFolder } from '@/lib/drive/google-drive-service';

export const dynamic = 'force-dynamic';

export async function POST() {
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

    const folder = await getOrCreateClioLibraryFolder();

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        isNew: folder.isNew,
        webViewLink: folder.webViewLink,
      },
      message: folder.isNew
        ? "Successfully created dedicated 'Clio Academic Library' folder in Google Drive."
        : "Found existing 'Clio Academic Library' folder in Google Drive (reused without creating duplicate).",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to initialize folder' },
      { status: 500 }
    );
  }
}
