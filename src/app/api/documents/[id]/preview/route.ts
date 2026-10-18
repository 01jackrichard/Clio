import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractDriveFileId, getDriveEmbedUrl } from '@/lib/drive/urls';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to preview documents.' },
        { status: 401 }
      );
    }

    // 2. Fetch document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, original_filename, file_key, drive_file_id, submitted_drive_url, status, uploader_id, storage_provider')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 3. Authorization check
    let isAuthorized = document.status === 'approved' || document.uploader_id === user.id;

    if (!isAuthorized) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'This document is not currently available for preview.' },
        { status: 403 }
      );
    }

    // 4. Resolve Google Drive File ID
    let driveId: string | null = null;

    if (document.status === 'approved') {
      // Published library documents MUST be backed by canonical central repository Drive files
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
      // Pending review submissions: authorized uploader or admin can preview the submission reference link
      if (document.submitted_drive_url) {
        driveId = extractDriveFileId(document.submitted_drive_url);
      } else if (document.drive_file_id) {
        driveId = document.drive_file_id;
      }
    }

    if (!driveId) {
      return NextResponse.json(
        { error: 'This document does not have an associated Google Drive preview identifier.' },
        { status: 404 }
      );
    }


    const previewUrl = getDriveEmbedUrl(driveId);

    return NextResponse.json({
      success: true,
      previewUrl,
      driveFileId: driveId,
      title: document.title,
      storageProvider: 'google_drive',
    });
  } catch (err: unknown) {
    console.error('Error generating preview URL:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: `Preview failed: ${message}` },
      { status: 500 }
    );
  }
}

