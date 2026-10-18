import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractDriveFileId, getDriveDownloadUrl, getDriveViewUrl } from '@/lib/drive/urls';
import { verifyUnlockToken } from '@/lib/security/password-service';

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
      .select('id, title, original_filename, file_key, drive_file_id, submitted_drive_url, status, uploader_id, storage_provider, visibility, password_hash')
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
    if (isPrivate && !isOwner && !isAdmin) {
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

    // 5. Resolve URLs
    let driveId: string | null = null;

    if (document.status === 'approved') {
      if (document.storage_provider !== 'google_drive' || !document.drive_file_id) {
        return NextResponse.json(
          {
            error:
              'This document is stored on legacy storage or lacks canonical Google Drive registration.',
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
        { error: 'This document does not have an associated Google Drive download link.' },
        { status: 404 }
      );
    }

    // For private files, direct to the secure server streaming route
    const downloadUrl = isPrivate
      ? `/api/documents/${id}/raw`
      : getDriveDownloadUrl(driveId) || getDriveViewUrl(driveId)!;

    const viewUrl = isPrivate
      ? `/api/documents/${id}/raw`
      : getDriveViewUrl(driveId)!;

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
      return NextResponse.redirect(downloadUrl);
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      viewUrl,
      isPrivate,
      filename: document.original_filename,
      storageProvider: 'google_drive',
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
