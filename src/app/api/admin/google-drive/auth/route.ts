import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { getDriveOAuthUrl } from '@/lib/drive/google-drive-service';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL('/auth/login?redirectTo=/admin', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // CSRF state token
    const state = crypto.randomBytes(24).toString('hex');
    const redirectUri = `${config.app.url}/api/admin/google-drive/callback`;

    const authUrl = getDriveOAuthUrl(redirectUri, state);
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}
