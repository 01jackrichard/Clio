import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderationActionSchema } from '@/lib/validations/document';
import { extractDriveFileId } from '@/lib/drive/urls';

export async function POST(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || profile.status === 'suspended') {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }

    // 3. Parse action and notes
    const body = await request.json();
    const parseResult = moderationActionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { action, review_notes, rejection_reason, canonical_drive_file_id } = parseResult.data;

    // Fetch existing document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_key, drive_file_id, submitted_drive_url, status, title')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updatedStatus: 'approved' | 'rejected' | 'removed' = 'approved';
    let updatePayload: Record<string, unknown> = {
      reviewer_id: user.id,
      updated_at: now,
    };

    if (action === 'approve') {
      const canonicalFileId = canonical_drive_file_id ? extractDriveFileId(canonical_drive_file_id) : null;
      if (!canonicalFileId) {
        return NextResponse.json(
          {
            error:
              'An authorized administrator must explicitly provide a valid canonical Google Drive file link or ID from the central repository before approving and publishing.',
          },
          { status: 400 }
        );
      }

      // Check for duplicate canonical drive_file_id in existing documents
      const { data: duplicate } = await supabase
        .from('documents')
        .select('id, title')
        .eq('drive_file_id', canonicalFileId)
        .neq('id', id)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          {
            error: `A document with this canonical Google Drive file ID is already registered: "${duplicate.title}".`,
          },
          { status: 409 }
        );
      }

      updatedStatus = 'approved';
      updatePayload = {
        ...updatePayload,
        status: 'approved',
        approved_at: now,
        storage_provider: 'google_drive',
        drive_file_id: canonicalFileId,
        review_notes: review_notes || 'Approved and registered into central repository by administrator',
      };
    } else if (action === 'reject') {

      updatedStatus = 'rejected';
      updatePayload = {
        ...updatePayload,
        status: 'rejected',
        review_notes: rejection_reason,
      };
    } else if (action === 'remove') {
      updatedStatus = 'removed';
      updatePayload = {
        ...updatePayload,
        status: 'removed',
        review_notes: rejection_reason || 'Removed by administrator',
      };
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', id);


    if (updateError) {
      console.error('Error updating document status:', updateError);
      return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: `document_${action}`,
        entity_type: 'document',
        entity_id: id,
        metadata: {
          document_title: document.title,
          previous_status: document.status,
          new_status: updatedStatus,
          notes: review_notes || rejection_reason,
        },
      });
    } catch {
      // non-blocking audit error
    }

    return NextResponse.json({
      success: true,
      message: `Document has been successfully ${updatedStatus}.`,
      status: updatedStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
