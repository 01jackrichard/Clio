import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { documentRegistrationSchema } from '@/lib/validations/document';
import { extractDriveFileId } from '@/lib/drive/urls';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      );
    }

    // 3. Parse and validate registration payload
    const body = await request.json();
    const parseResult = documentRegistrationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      department,
      academic_year,
      semester,
      subject,
      unit,
      material_type,
      tags,
      drive_url_or_id,
      original_filename,
      publish_immediately,
    } = parseResult.data;

    const fileId = extractDriveFileId(drive_url_or_id);
    if (!fileId) {
      return NextResponse.json(
        {
          error:
            'Invalid Google Drive link or file ID. Please provide a link such as https://drive.google.com/file/d/FILE_ID/view or a valid file ID.',
        },
        { status: 400 }
      );
    }

    // 4. Check for duplicate drive_file_id in database
    const { data: duplicate } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('drive_file_id', fileId)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error: `A document with this Google Drive file ID is already registered: "${duplicate.title}" (Status: ${duplicate.status}).`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const safeFilename =
      original_filename?.trim() || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

    // 5. Insert canonical document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title,
        description: description || null,
        department,
        academic_year,
        semester,
        subject,
        unit: unit || null,
        material_type,
        tags: tags || [],
        original_filename: safeFilename,
        file_key: null,
        drive_file_id: fileId,
        submitted_drive_url: drive_url_or_id,
        storage_provider: 'google_drive',
        file_size: null,
        mime_type: 'application/pdf',
        uploader_id: user.id,
        status: publish_immediately ? 'approved' : 'pending',
        approved_at: publish_immediately ? now : null,
        reviewer_id: publish_immediately ? user.id : null,
        review_notes: 'Registered directly by maintainer via central repository workflow',
        download_count: 0,
      })
      .select()
      .single();

    if (dbError || !document) {
      console.error('Database error registering document:', dbError);
      return NextResponse.json(
        { error: 'Failed to record document in repository catalog.' },
        { status: 500 }
      );
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'document_registered',
        entity_type: 'document',
        entity_id: document.id,
        metadata: {
          title: document.title,
          drive_file_id: fileId,
          status: document.status,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json(
      {
        success: true,
        documentId: document.id,
        driveFileId: fileId,
        status: document.status,
        message: publish_immediately
          ? 'Canonical Google Drive document published successfully to the Clio library!'
          : 'Document registered and saved to review queue.',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error registering document:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: `Registration failed: ${message}` },
      { status: 500 }
    );
  }
}
