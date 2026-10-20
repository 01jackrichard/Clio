import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, isGoogleDriveConfigured } from '@/lib/drive/google-drive-service';
import { verifyUnlockToken } from '@/lib/security/password-service';
import { hasValidAccessGrant } from '@/lib/services/sharing-service';

export const dynamic = 'force-dynamic';

interface DocumentRecordResult {
  id: string;
  title: string;
  mime_type?: string | null;
  original_filename?: string | null;
  drive_file_id?: string | null;
  visibility?: 'public' | 'private' | null;
  password_hash?: string | null;
  uploader_id?: string | null;
  status?: string | null;
  collection_id?: string | null;
  file_size?: number | null;
}

async function resolveDocumentAndAuthorize(
  request: NextRequest,
  id: string
): Promise<{
  authorized: boolean;
  document?: DocumentRecordResult;
  status: number;
  error?: string;
  requiresPassword?: boolean;
}> {
  const supabase = await createClient();

  // 1. Fetch document record
  const { data: documentData, error: docError } = await supabase
    .from('documents')
    .select(
      'id, title, mime_type, original_filename, drive_file_id, visibility, password_hash, uploader_id, status, collection_id, file_size'
    )
    .eq('id', id)
    .single();

  let document: DocumentRecordResult | null = documentData as DocumentRecordResult | null;

  if (docError || !document) {
    if (
      docError &&
      (docError.code === '42703' ||
        docError.message?.includes('does not exist') ||
        docError.message?.includes('column'))
    ) {
      const fallbackRes = await supabase
        .from('documents')
        .select('id, title, mime_type, original_filename, drive_file_id, uploader_id, status, file_size')
        .eq('id', id)
        .single();

      if (fallbackRes.data) {
        document = {
          ...fallbackRes.data,
          visibility: 'public',
          password_hash: null,
          collection_id: null,
        } as DocumentRecordResult;
      }
    }
  }

  if (!document || !document.drive_file_id) {
    return {
      authorized: false,
      status: 404,
      error: 'The requested document folio could not be found in the archive.',
    };
  }

  // 2. Authorization check
  let isAuthorized = false;

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
        .maybeSingle();

      if (profile?.role === 'admin') {
        isAuthorized = true;
      } else {
        const hasGrant = await hasValidAccessGrant(user.id, 'document', id);
        if (hasGrant) {
          isAuthorized = true;
        }
      }
    }
  }

  // Approved public document access
  if (!isAuthorized && document.visibility !== 'private') {
    if (document.status === 'approved') {
      isAuthorized = true;
    }
  }

  // Private document unlock token check (cookie or custom header)
  if (!isAuthorized && document.visibility === 'private') {
    const cookieToken = request.cookies.get(`clio_unlock_${id}`)?.value;
    const headerToken = request.headers.get('x-clio-unlock-token');
    const token = cookieToken || headerToken;

    if (verifyUnlockToken(token, id)) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    if (document.visibility === 'private') {
      return {
        authorized: false,
        status: 403,
        error: 'This document is private. An access password is required.',
        requiresPassword: true,
      };
    }

    if (document.status === 'pending') {
      return {
        authorized: false,
        status: 403,
        error: 'This document is currently pending academic moderation.',
      };
    }

    return {
      authorized: false,
      status: 401,
      error: 'Please sign in to access this document.',
    };
  }

  return {
    authorized: true,
    document,
    status: 200,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCheck = await resolveDocumentAndAuthorize(request, id);

    if (!authCheck.authorized || !authCheck.document) {
      return NextResponse.json(
        {
          error: authCheck.error || 'Access denied',
          requiresPassword: authCheck.requiresPassword,
        },
        { status: authCheck.status }
      );
    }

    const document = authCheck.document;
    const isPrivate = document.visibility === 'private';
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';

    // 3. Fetch from upstream storage via authorized server OAuth credentials
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: 'Document archival storage is temporarily unavailable.' },
        { status: 503 }
      );
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken();
    } catch (tokenErr) {
      console.error('[DocumentStream] Token acquisition error:', tokenErr instanceof Error ? tokenErr.message : tokenErr);
      return NextResponse.json(
        { error: 'Document archival storage is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      document.drive_file_id!
    )}?alt=media`;

    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Forward HTTP Range header for streaming page-by-page PDF viewing
    const clientRange = request.headers.get('range');
    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const driveRes = await fetch(driveUrl, {
      headers: upstreamHeaders,
    });

    if (!driveRes.ok && driveRes.status !== 206) {
      const errText = await driveRes.text().catch(() => '');
      console.error(
        `[DocumentStream] Upstream storage fetch failed with status ${driveRes.status}:`,
        errText.slice(0, 200)
      );

      if (driveRes.status === 404) {
        return NextResponse.json(
          { error: 'The requested archival folio file could not be found.' },
          { status: 404 }
        );
      }

      if (driveRes.status === 401 || driveRes.status === 403) {
        return NextResponse.json(
          { error: 'Archival storage authentication is temporarily unavailable. Please try again shortly.' },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: 'Unable to stream the requested document folio. Please try again.' },
        { status: 502 }
      );
    }

    const contentType = document.mime_type || 'application/pdf';
    const filename = encodeURIComponent(document.original_filename || `${document.title || 'folio'}.pdf`);

    // Stream the binary response securely under the Clio application origin
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    // Caching semantics
    if (isPrivate) {
      responseHeaders.set('Cache-Control', 'private, no-transform, max-age=300');
    } else {
      responseHeaders.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }

    const contentRange = driveRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }

    const contentLength = driveRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    return new NextResponse(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Streaming error';
    console.error('[DocumentStream] Unhandled stream exception:', message);
    return NextResponse.json(
      { error: 'An unexpected error occurred while loading this document.' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authCheck = await resolveDocumentAndAuthorize(request, id);

    if (!authCheck.authorized || !authCheck.document) {
      return new NextResponse(null, { status: authCheck.status });
    }

    const document = authCheck.document;
    const isPrivate = document.visibility === 'private';
    const contentType = document.mime_type || 'application/pdf';
    const filename = encodeURIComponent(document.original_filename || `${document.title || 'folio'}.pdf`);

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Content-Disposition', `inline; filename="${filename}"`);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');

    if (document.file_size) {
      responseHeaders.set('Content-Length', document.file_size.toString());
    }

    if (isPrivate) {
      responseHeaders.set('Cache-Control', 'private, no-transform, max-age=300');
    } else {
      responseHeaders.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }

    return new NextResponse(null, {
      status: 200,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
