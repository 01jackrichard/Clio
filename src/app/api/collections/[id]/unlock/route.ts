import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  verifyAccessPassword,
  generateUnlockToken,
  checkUnlockRateLimit,
  recordFailedUnlockAttempt,
  resetUnlockAttempts,
} from '@/lib/security/password-service';
import { unlockResourceSchema } from '@/lib/validations/document';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ip = request.headers.get('x-forwarded-for') || 'local-client';
    const rateLimitKey = `col_unlock_${id}_${ip}`;

    // 1. Rate-limit brute-force protection
    const rateCheck = checkUnlockRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed password attempts. Please wait ${rateCheck.resetInSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = unlockResourceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Please enter the access password.' },
        { status: 400 }
      );
    }

    const { password } = parseResult.data;

    const adminClient = getAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let query = adminClient.from('collections').select('id, title, visibility, password_hash, user_id');

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: collection, error: colError } = await query.maybeSingle();

    if (colError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found.' },
        { status: 404 }
      );
    }

    // If public or no password, already accessible
    if (collection.visibility !== 'private' || !collection.password_hash) {
      return NextResponse.json({
        success: true,
        message: 'This collection is public.',
      });
    }

    // Constant-time password verification
    const isValid = verifyAccessPassword(password, collection.password_hash);

    if (!isValid) {
      recordFailedUnlockAttempt(rateLimitKey);
      const remaining = Math.max(0, rateCheck.remainingAttempts - 1);
      return NextResponse.json(
        {
          error: `Incorrect access password. ${remaining} attempts remaining before temporary lockout.`,
        },
        { status: 401 }
      );
    }

    // Success — reset rate limit and issue signed unlock token
    resetUnlockAttempts(rateLimitKey);
    const token = generateUnlockToken(collection.id);

    const response = NextResponse.json({
      success: true,
      message: 'Collection unlocked successfully.',
      token,
    });

    response.cookies.set(`clio_collection_unlock_${collection.id}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('[Collection Unlock] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
