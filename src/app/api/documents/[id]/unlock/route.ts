import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = request.headers.get('x-forwarded-for') || 'local-client';
    const rateLimitKey = `doc_unlock_${id}_${ip}`;

    // 1. Brute-force protection check
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

    const supabase = await createClient();

    // 2. Fetch document record (including password_hash)
    const { data: documentData, error: docError } = await supabase
      .from('documents')
      .select('id, title, visibility, password_hash, uploader_id')
      .eq('id', id)
      .single();

    let document = documentData;

    if (docError || !document) {
      if (docError && (docError.code === '42703' || docError.message?.includes('does not exist') || docError.message?.includes('column'))) {
        const fallbackRes = await supabase
          .from('documents')
          .select('id, title, uploader_id')
          .eq('id', id)
          .single();

        if (fallbackRes.data) {
          document = {
            ...fallbackRes.data,
            visibility: 'public',
            password_hash: null,
          };
        }
      }
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or inaccessible.' },
        { status: 404 }
      );
    }

    // If document is public, it requires no password
    if (document.visibility !== 'private' || !document.password_hash) {
      return NextResponse.json({
        success: true,
        message: 'This document is public.',
      });
    }

    // 3. Constant-time password verification
    const isValid = verifyAccessPassword(password, document.password_hash);

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

    // 4. Success — reset rate limit and generate signed token
    resetUnlockAttempts(rateLimitKey);
    const token = generateUnlockToken(document.id);

    const response = NextResponse.json({
      success: true,
      message: 'Document unlocked successfully.',
      token,
    });

    // Set HTTP-only secure cookie for 24-hour grant
    response.cookies.set(`clio_unlock_${document.id}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unlock error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
