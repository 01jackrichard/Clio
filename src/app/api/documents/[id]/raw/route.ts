import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/drive/google-drive-service';
import { verifyUnlockToken } from '@/lib/security/password-service';
import { hasValidAccessGrant } from '@/lib/services/sharing-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch document record
    const { data: documentData, error: docError } = await supabase
      .from('documents')
      .select('id, title, mime_type, original_filename, drive_file_id, visibility, password_hash, uploader_id, status, collection_id')
      .eq('id', id)
      .single();

    let document = documentData;

    if (docError || !document) {
      if (docError && (docError.code === '42703' || docError.message?.includes('does not exist') || docError.message?.includes('column'))) {
        const fallbackRes = await supabase
          .from('documents')
          .select('id, title, mime_type, original_filename, drive_file_id, uploader_id, status')
          .eq('id', id)
          .single();

        if (fallbackRes.data) {
          document = {
            ...fallbackRes.data,
            visibility: 'public',
            password_hash: null,
            collection_id: null,
          };
        }
      }
    }

    if (!document || !document.drive_file_id) {
      return NextResponse.json(
        { error: 'Document not found or has no associated Google Drive asset.' },
        { status: 404 }
      );
    }

    // 2. Authorization check
    let isAuthorized = false;

    // Check session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (document.uploader_id === user.id) {
        isAuthorized = true;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          isAuthorized = true;
        } else {
          // Check if caller has a persistent, unrevoked share grant for this document
          const hasGrant = await hasValidAccessGrant(user.id, 'document', id);
          if (hasGrant) {
            isAuthorized = true;
          }
        }
      }
    }

    // Check if public
    if (!isAuthorized && document.visibility !== 'private') {
      if (document.status === 'approved') {
        isAuthorized = true;
      }
    }

    // Check unlock cookie or header if private
    if (!isAuthorized && document.visibility === 'private') {
      const cookieToken = request.cookies.get(`clio_unlock_${id}`)?.value;
      const headerToken = request.headers.get('x-clio-unlock-token');
      const token = cookieToken || headerToken;

      if (verifyUnlockToken(token, id)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'This document is private. An access password is required.',
          requiresPassword: true,
        },
        { status: 403 }
      );
    }

    // 3. Fetch from Google Drive API with server OAuth access token
    const accessToken = await getValidAccessToken();
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      document.drive_file_id
    )}?alt=media`;

    const driveRes = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveRes.ok) {
      const errText = await driveRes.text().catch(() => '');
      return NextResponse.json(
        {
          error: `Google Drive stream failed: ${driveRes.statusText}`,
          details: errText,
        },
        { status: 502 }
      );
    }

    const contentType = document.mime_type || 'application/pdf';
    const filename = encodeURIComponent(document.original_filename || 'document.pdf');

    // Stream the binary response securely
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Content-Disposition', `inline; filename="${filename}"`);
    responseHeaders.set('Cache-Control', 'private, max-age=3600');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(driveRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Streaming error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
