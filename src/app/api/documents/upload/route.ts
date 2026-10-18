import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { config } from '@/lib/config';
import { validateAcademicDocument } from '@/lib/drive/file-validation';
import {
  uploadFileToDrive,
  setDriveFilePublicReader,
  isGoogleDriveConfigured,
  getGoogleDriveConfig,
} from '@/lib/drive/google-drive-service';
import {
  Department,
  AcademicYear,
  Semester,
  MaterialTypeValue,
  Unit,
} from '@/lib/constants';

import { hashAccessPassword } from '@/lib/security/password-service';
import { directUploadSchema } from '@/lib/validations/document';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to upload documents.' },
        { status: 401 }
      );
    }

    // 2. Verify account status
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, status, role, display_name')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete registration.' },
        { status: 403 }
      );
    }

    if (profile.status === 'suspended') {
      return NextResponse.json(
        { error: 'Your account is suspended. You cannot upload documents.' },
        { status: 403 }
      );
    }

    // 3. Enforce velocity rate limit
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
          error: `Hourly upload limit reached. You have uploaded ${recentCount} documents in the last hour. Please try again later.`,
        },
        { status: 429 }
      );
    }

    // 4. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Please select a document file to upload (.pdf, .doc, or .docx).' },
        { status: 400 }
      );
    }

    // Extract metadata fields
    const title = (formData.get('title') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();
    const department = (formData.get('department') as string || '').trim() as Department;
    const academicYear = (formData.get('academic_year') as string || '').trim() as AcademicYear;
    const semester = (formData.get('semester') as string || '').trim() as Semester;
    const subject = (formData.get('subject') as string || '').trim();
    const subjectCode = (formData.get('subject_code') as string || '').trim();
    const regulation = (formData.get('regulation') as string || '2021').trim();
    const isVerifiedSubject = formData.get('is_verified_subject') !== 'false';
    const unit = ((formData.get('unit') as string || '').trim() || null) as Unit | null;
    const materialType = (formData.get('material_type') as string || '').trim() as MaterialTypeValue;
    const visibility = (formData.get('visibility') as string || 'public').trim() as 'public' | 'private';
    const password = (formData.get('password') as string || '').trim();
    const collectionId = (formData.get('collection_id') as string || '').trim();
    const declarationAccepted = formData.get('declaration_accepted') === 'true' || formData.get('declaration_accepted') === 'on';

    let tags: string[] = [];
    const tagsRaw = formData.get('tags');
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw as string);
      } catch {
        tags = (tagsRaw as string)
          .split(/[,\s#]+/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .slice(0, 8);
      }
    }

    // 5. Validate academic metadata via directUploadSchema
    const validationResult = directUploadSchema.safeParse({
      title,
      description,
      department,
      academic_year: academicYear,
      semester,
      subject,
      subject_code: subjectCode || undefined,
      regulation,
      is_verified_subject: isVerifiedSubject,
      unit: unit || null,
      material_type: materialType,
      tags,
      visibility,
      password: password || undefined,
      collection_id: collectionId || undefined,
      declaration_accepted: declarationAccepted,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstIssue ? firstIssue.message : 'Invalid document metadata' },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // 6. Validate file content and binary magic bytes
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileValidation = validateAcademicDocument(
      file.name,
      file.type,
      fileBuffer,
      config.storage.maxFileSizeBytes
    );

    if (!fileValidation.isValid) {
      return NextResponse.json(
        { error: fileValidation.error || 'Invalid document file' },
        { status: 400 }
      );
    }

    // 7. Check for duplicate upload by the same student
    const { data: duplicate } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('uploader_id', user.id)
      .eq('title', validatedData.title)
      .eq('subject', validatedData.subject)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error: `You have already uploaded a document with this title and subject ("${duplicate.title}", Status: ${duplicate.status}).`,
        },
        { status: 409 }
      );
    }

    // 8. Ensure Google Drive integration is configured
    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        {
          error:
            'Google Drive storage is not configured on this server. Please notify an administrator to connect their Google Drive account in the Clio Admin Console.',
        },
        { status: 503 }
      );
    }

    // 9. Upload file directly to designated Google Drive folder
    const driveUpload = await uploadFileToDrive({
      filename: file.name,
      mimeType: fileValidation.detectedMimeType!,
      buffer: fileBuffer,
    });

    if (!driveUpload.fileId) {
      return NextResponse.json(
        { error: 'Failed to obtain Google Drive file identifier after upload.' },
        { status: 502 }
      );
    }

    // 10. Apply public link reader permission ONLY if document is public and public sharing is enabled
    const driveConfig = getGoogleDriveConfig();
    if (validatedData.visibility === 'public' && driveConfig.enablePublicSharing) {
      await setDriveFilePublicReader(driveUpload.fileId);
    }

    // 11. Hash password if private
    let passwordHash: string | null = null;
    if (validatedData.visibility === 'private' && validatedData.password) {
      passwordHash = await hashAccessPassword(validatedData.password);
    }

    // 12. Register and auto-publish document in Supabase
    const adminClient = getAdminClient();
    const now = new Date().toISOString();

    const { data: newDoc, error: insertError } = await adminClient
      .from('documents')
      .insert({
        title: validatedData.title,
        description: validatedData.description || null,
        department: validatedData.department,
        academic_year: validatedData.academic_year,
        semester: validatedData.semester,
        subject: validatedData.subject,
        subject_code: validatedData.subject_code || null,
        regulation: validatedData.regulation || '2021',
        is_verified_subject: validatedData.is_verified_subject,
        visibility: validatedData.visibility,
        password_hash: passwordHash,
        collection_id: validatedData.collection_id || null,
        unit: validatedData.unit || null,
        material_type: validatedData.material_type,
        tags: validatedData.tags || [],
        original_filename: file.name,
        file_size: fileBuffer.length,
        mime_type: fileValidation.detectedMimeType!,
        uploader_id: user.id,
        storage_provider: 'google_drive',
        drive_file_id: driveUpload.fileId,
        status: 'approved', // Auto-published for pilot
        approved_at: now,
        review_notes: validatedData.visibility === 'private'
          ? 'Published as private access document with password'
          : 'Automatically published via direct Google Drive upload',
        download_count: 0,
      })
      .select()
      .single();

    if (insertError || !newDoc) {
      console.error('[DirectUpload] Database insertion error:', insertError);
      return NextResponse.json(
        { error: 'File was uploaded to Google Drive, but catalog registration failed. Please contact an administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Document uploaded and published successfully!',
        document: {
          id: newDoc.id,
          title: newDoc.title,
          drive_file_id: newDoc.drive_file_id,
          status: newDoc.status,
          material_type: newDoc.material_type,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[DirectUpload] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error during upload' },
      { status: 500 }
    );
  }
}
