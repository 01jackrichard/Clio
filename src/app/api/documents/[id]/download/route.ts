import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractDriveFileId } from '@/lib/drive/urls';
import { verifyUnlockToken } from '@/lib/security/password-service';
import { hasValidAccessGrant } from '@/lib/services/sharing-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate requester
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to download documents.' },
        { status: 401 }
      );
    }

    // 2. Fetch document record from database
    const { data: documentData, error: docError } = await supabase
      .from('documents')
      .select('id, title, original_filename, file_key, drive_file_id, submitted_drive_url, status, uploader_id, storage_provider, visibility, password_hash, collection_id')
      .eq('id', id)
      .single();

    let document = documentData;

    if (docError || !document) {
      if (docError && (docError.code === '42703' || docError.message?.includes('does not exist') || docError.message?.includes('column'))) {
        const fallbackRes = await supabase
          .from('documents')
          .select('id, title, original_filename, file_key, drive_file_id, submitted_drive_url, status, uploader_id, storage_provider')
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

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 3. Authorization check
    const isOwner = document.uploader_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        isAdmin = true;
      }
    }

    const isAuthorized = document.status === 'approved' || isOwner || isAdmin;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'This document is pending review or not currently available for download.' },
        { status: 403 }
      );
    }

    // 4. Privacy password check
    const isPrivate = document.visibility === 'private';
    let hasGrant = false;
    if (isPrivate && !isOwner && !isAdmin) {
      hasGrant = await hasValidAccessGrant(user.id, 'document', id);
    }

    if (isPrivate && !isOwner && !isAdmin && !hasGrant) {
      const cookieToken = request.cookies.get(`clio_unlock_${id}`)?.value;
      const headerToken = request.headers.get('x-clio-unlock-token');
      const token = cookieToken || headerToken;

      if (!verifyUnlockToken(token, id)) {
        return NextResponse.json(
          {
            error: 'This document is private. Password required to download.',
            requiresPassword: true,
          },
          { status: 403 }
        );
      }
    }

    // 5. Resolve archival file identifier
    let driveId: string | null = null;

    if (document.status === 'approved') {
      if (document.storage_provider !== 'google_drive' || !document.drive_file_id) {
        return NextResponse.json(
          {
            error:
              'This document is stored on legacy storage or lacks canonical archival registration.',
          },
          { status: 422 }
        );
      }
      driveId = document.drive_file_id;
    } else {
      if (document.submitted_drive_url) {
        driveId = extractDriveFileId(document.submitted_drive_url);
      } else if (document.drive_file_id) {
        driveId = document.drive_file_id;
      }
    }

    if (!driveId) {
      return NextResponse.json(
        { error: 'This document does not have an associated archival file.' },
        { status: 404 }
      );
    }

    // Always route through Clio's authenticated streaming delivery endpoint
    const downloadUrl = `/api/documents/${id}/raw?download=true`;
    const viewUrl = `/api/documents/${id}/raw`;

    // 6. Asynchronously record download log and atomic increment
    try {
      await Promise.allSettled([
        supabase.rpc('increment_document_download', { doc_id: document.id }),
        supabase.from('download_logs').insert({
          document_id: document.id,
          user_id: user.id,
          user_agent: request.headers.get('user-agent') || 'unknown',
        }),
      ]);
    } catch (logErr) {
      console.warn('Non-fatal: failed to record download telemetry', logErr);
    }

    const searchParams = request.nextUrl.searchParams;
    if (searchParams.get('redirect') === 'true') {
      return NextResponse.redirect(new URL(downloadUrl, request.url));
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      viewUrl,
      isPrivate,
      filename: document.original_filename,
    });
  } catch (err: unknown) {
    console.error('Error generating download URL:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: `Download failed: ${message}` },
      { status: 500 }
    );
  }
}
