import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { config } from '@/lib/config';
import { sanitizeRedirectUrl } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Ensures a first-time or returning OAuth user has a valid, safe profile in public.profiles.
 * Invariant: Never escalates role or permissions. Defaults to 'student' and 'active'.
 */
async function ensureUserProfile(supabaseUser: User, authenticatedClient: Awaited<ReturnType<typeof createClient>>) {
  try {
    const meta = supabaseUser.user_metadata || {};
    const googleName =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
      null;

    const emailFallback = supabaseUser.email ? supabaseUser.email.split('@')[0] : 'Scholar';
    const resolvedDisplayName = googleName || emailFallback;

    // Use admin client if secret key is configured; fallback to authenticated client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = authenticatedClient;
    try {
      if (config.supabase.secretKey) {
        client = getAdminClient();
      }
    } catch {
      client = authenticatedClient;
    }

    const { data: profile } = await client
      .from('profiles')
      .select('id, role, status, display_name, email')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (!profile) {
      // First-time Google user whose trigger has not completed:
      // Provision with strict safe defaults: role 'student', status 'active'
      await client.from('profiles').upsert(
        {
          id: supabaseUser.id,
          email: supabaseUser.email,
          display_name: resolvedDisplayName,
          role: 'student',
          status: 'active',
        },
        { onConflict: 'id' }
      );
    } else {
      // Profile exists: Strictly preserve role, status, and custom settings.
      // If the trigger populated display_name with raw email username and Google provided a real name,
      // safely enrich the display name.
      const isDefaultEmailName = !profile.display_name || profile.display_name === emailFallback;
      if (googleName && isDefaultEmailName && profile.display_name !== googleName) {
        await client
          .from('profiles')
          .update({ display_name: googleName })
          .eq('id', supabaseUser.id);
      }
    }
  } catch (err: unknown) {
    // Non-fatal: do not block authentication if profile metadata sync encounters an error
    console.warn(
      '[AuthCallback] Profile verification notice:',
      err instanceof Error ? err.message : 'Unknown profile sync error'
    );
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const rawNext = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirectTo');
  const next = sanitizeRedirectUrl(rawNext, '/documents');

  // 1. Handle OAuth provider errors or user cancellation
  if (error) {
    const loginUrl = new URL('/auth/login', requestUrl.origin);
    const userMessage =
      error === 'access_denied'
        ? 'Google authentication was cancelled.'
        : errorDescription || 'Google authentication could not be completed. Please try again.';
    loginUrl.searchParams.set('error', userMessage);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Handle missing authorization code
  if (!code) {
    const loginUrl = new URL('/auth/login', requestUrl.origin);
    loginUrl.searchParams.set(
      'error',
      'No authorization code was received from Google authentication.'
    );
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createClient();

    // 3. Exchange authorization code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      const loginUrl = new URL('/auth/login', requestUrl.origin);
      loginUrl.searchParams.set(
        'error',
        'Failed to exchange authorization code for an active session. Please sign in again.'
      );
      return NextResponse.redirect(loginUrl);
    }

    // 4. Ensure profile is safely provisioned with correct role, status, and display name
    await ensureUserProfile(data.user, supabase);

    // 5. Redirect successfully authenticated user to safe destination
    const destinationUrl = new URL(next, requestUrl.origin);
    return NextResponse.redirect(destinationUrl);
  } catch {
    const loginUrl = new URL('/auth/login', requestUrl.origin);
    loginUrl.searchParams.set(
      'error',
      'An unexpected error occurred while finalizing authentication. Please try again.'
    );
    return NextResponse.redirect(loginUrl);
  }
}
