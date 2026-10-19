import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { studentSubmissionSchema } from '@/lib/validations/document';
import { extractDriveFileId } from '@/lib/drive/urls';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate student requester
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to submit documents.' },
        { status: 401 }
      );
    }

    // Check account status
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single();

    if (profile && profile.status === 'suspended') {
      return NextResponse.json(
        { error: 'Your account is suspended. You cannot submit documents.' },
        { status: 403 }
      );
    }

    // 2. Parse and validate metadata payload
    const body = await request.json();
    const parseResult = studentSubmissionSchema.safeParse(body);

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
      drive_url,
    } = parseResult.data;

    // 3. Extract and validate Google Drive File ID
    const fileId = extractDriveFileId(drive_url);
    if (!fileId) {
      return NextResponse.json(
        {
          error:
            'Invalid Google Drive link format. Please provide a link such as https://drive.google.com/file/d/FILE_ID/view with sharing set to "Anyone with the link can view".',
        },
        { status: 400 }
      );
    }

    // Check for existing document with this submitted URL or already published canonical ID
    const safeDriveUrl = drive_url.replace(/["'\\]/g, '');
    const safeFileId = fileId.replace(/["'\\]/g, '');
    const { data: duplicate } = await supabase
      .from('documents')
      .select('id, title, status')
      .or(`submitted_drive_url.eq."${safeDriveUrl}",drive_file_id.eq."${safeFileId}"`)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error: `This document link or file has already been submitted or published: "${duplicate.title}" (Status: ${duplicate.status}).`,
        },
        { status: 409 }
      );
    }

    // 4. Enforce submission quotas and abuse controls
    const { count: pendingCount, error: countErr } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploader_id', user.id)
      .eq('status', 'pending');

    if (!countErr && (pendingCount ?? 0) >= config.features.maxPendingSubmissionsPerUser) {
      return NextResponse.json(
        {
          error: `Submission limit reached: You have ${pendingCount} pending submissions awaiting review. Please wait for an administrator to review them before submitting more.`,
        },
        { status: 429 }
      );
    }

    const windowStart = new Date(
      Date.now() - config.features.rateLimitWindowMinutes * 60 * 1000
    ).toISOString();

    const { count: recentCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('uploader_id', user.id)
      .gte('created_at', windowStart);

    if ((recentCount ?? 0) >= config.features.maxUploadsPerHour) {
      return NextResponse.json(
        {
          error: `Submission rate limit exceeded. You have submitted ${recentCount} documents in the last hour. Please try again later.`,
        },
        { status: 429 }
      );
    }

    // 5. Insert document record with status 'pending'
    const safeFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;

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
        drive_file_id: null, // Strictly null: Student's personal link is only a review reference until an admin explicitly registers a canonical file
        submitted_drive_url: drive_url,
        storage_provider: 'google_drive',
        file_size: null,
        mime_type: 'application/pdf',
        uploader_id: user.id,
        status: 'pending',
        download_count: 0,
      })
      .select()
      .single();


    if (dbError || !document) {
      console.error('Database error saving submission:', dbError);
      return NextResponse.json(
        { error: 'Failed to record document submission. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        documentId: document.id,
        status: document.status,
        message:
          'Your academic document was submitted successfully and is now awaiting administrator review.',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('Error in document submission:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: `Submission failed: ${message}` },
      { status: 500 }
    );
  }
}
