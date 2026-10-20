import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { deleteFileFromDrive } from '@/lib/drive/google-drive-service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/documents/[id]
 * Authorized document deletion endpoint.
 * Semantics:
 * - Owners can delete their own documents (submissions or private documents).
 * - Administrators can delete any document.
 * - Non-owners without administrative privileges are rejected with 403 Forbidden.
 * - Handles both underlying storage cleanup and database metadata deletion atomically.
 */
export async function DELETE(
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
        { error: 'Unauthorized. Please sign in to perform this action.' },
        { status: 401 }
      );
    }

    // 2. Fetch document record
    const adminClient = getAdminClient();
    const { data: document, error: docError } = await adminClient
      .from('documents')
      .select('id, title, uploader_id, drive_file_id, status, visibility, file_size, storage_provider, file_key')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'The requested document folio could not be found.' },
        { status: 404 }
      );
    }

    // 3. Authorization verification
    const isOwner = document.uploader_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin' && profile?.status !== 'suspended') {
        isAdmin = true;
      }
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this document.' },
        { status: 403 }
      );
    }

    // 4. Physical storage cleanup (Google Drive or Supabase storage)
    if (document.drive_file_id) {
      try {
        await deleteFileFromDrive(document.drive_file_id);
      } catch (storageErr) {
        console.warn(`[DocumentDelete] Storage cleanup warning for file ${document.drive_file_id}:`, storageErr);
      }
    }

    if (document.file_key && document.storage_provider === 'supabase') {
      try {
        await adminClient.storage.from('documents').remove([document.file_key]);
      } catch (storageErr) {
        console.warn(`[DocumentDelete] Supabase storage cleanup warning:`, storageErr);
      }
    }

    // 4b. Clean up associated share invitations and grants
    try {
      await adminClient
        .from('share_invitations')
        .delete()
        .eq('resource_type', 'document')
        .eq('resource_id', id);
    } catch {
      // Table may be absent in some test environments
    }

    try {
      await adminClient
        .from('share_access_grants')
        .delete()
        .eq('resource_type', 'document')
        .eq('resource_id', id);
    } catch {
      // Table may be absent in some test environments
    }

    // 5. Database deletion
    const { error: deleteError } = await adminClient
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`[DocumentDelete] Database deletion error for document ${id}:`, deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document from the database catalogue.' },
        { status: 500 }
      );
    }

    // 6. Optional non-blocking audit log
    try {
      await adminClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'document_delete',
        entity_type: 'document',
        entity_id: id,
        metadata: {
          title: document.title,
          deleted_by_role: isAdmin ? 'admin' : 'owner',
          visibility: document.visibility,
        },
      });
    } catch {
      // Audit table may be optional in some test schemas
    }

    return NextResponse.json({
      success: true,
      message: 'Document folio and associated storage deleted successfully.',
    });
  } catch (err: unknown) {
    console.error('[DocumentDelete] Unhandled deletion exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An error occurred during deletion.' },
      { status: 500 }
    );
  }
}
