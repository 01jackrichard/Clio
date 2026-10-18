import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { verifyUnlockToken } from '@/lib/security/password-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminClient = getAdminClient();

    // Query collection by UUID or by slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let query = adminClient.from('collections').select('*');

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: collection, error: colError } = await query.maybeSingle();

    if (colError || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user is admin
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin';
    }

    const isOwner = user ? collection.user_id === user.id : false;

    // Check privacy
    if (collection.visibility === 'private' && !isOwner && !isAdmin) {
      const cookieName = `clio_collection_unlock_${collection.id}`;
      const unlockCookie = request.cookies.get(cookieName)?.value;
      const isUnlocked = unlockCookie
        ? verifyUnlockToken(unlockCookie, collection.id)
        : false;

      if (!isUnlocked) {
        // Return locked state without sensitive documents
        const { count: docCount } = await adminClient
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('collection_id', collection.id)
          .eq('status', 'approved');

        return NextResponse.json({
          collection: {
            id: collection.id,
            title: collection.title,
            slug: collection.slug,
            description: collection.description,
            department: collection.department,
            regulation: collection.regulation,
            academic_year: collection.academic_year,
            semester: collection.semester,
            visibility: 'private',
            document_count: docCount || 0,
            created_at: collection.created_at,
          },
          is_locked: true,
          documents: [],
        });
      }
    }

    // Fetch documents in this collection
    const { data: docs, error: docsError } = await adminClient
      .from('documents')
      .select(`
        id,
        title,
        description,
        department,
        academic_year,
        semester,
        subject,
        subject_code,
        regulation,
        is_verified_subject,
        unit,
        material_type,
        tags,
        original_filename,
        file_size,
        mime_type,
        download_count,
        visibility,
        created_at
      `)
      .eq('collection_id', collection.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('[Collection Detail] Error fetching docs:', docsError);
    }

    return NextResponse.json({
      collection: {
        id: collection.id,
        title: collection.title,
        slug: collection.slug,
        description: collection.description,
        department: collection.department,
        regulation: collection.regulation,
        academic_year: collection.academic_year,
        semester: collection.semester,
        visibility: collection.visibility,
        document_count: (docs || []).length,
        created_at: collection.created_at,
        is_owner: isOwner,
      },
      is_locked: false,
      documents: docs || [],
    });
  } catch (err: unknown) {
    console.error('[Collection Detail] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
