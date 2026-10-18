import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createCollectionSchema } from '@/lib/validations/document';
import { hashAccessPassword } from '@/lib/security/password-service';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim();
    const department = searchParams.get('department')?.trim();
    const regulation = searchParams.get('regulation')?.trim();
    const mineOnly = searchParams.get('mine') === 'true';

    const adminClient = getAdminClient();
    let query = adminClient
      .from('collections')
      .select(`
        id,
        title,
        slug,
        description,
        department,
        regulation,
        academic_year,
        semester,
        user_id,
        visibility,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (mineOnly) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      query = query.eq('user_id', user.id);
    } else {
      // Return public collections OR user's own collections
      if (user) {
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
      } else {
        query = query.eq('visibility', 'public');
      }
    }

    if (department) {
      query = query.eq('department', department);
    }
    if (regulation) {
      query = query.eq('regulation', regulation);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: collections, error } = await query.limit(50);

    if (error) {
      console.error('[Collections API] GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
    }

    // Augment with document counts
    const collectionIds = (collections || []).map((c) => c.id);
    let countsMap: Record<string, number> = {};

    if (collectionIds.length > 0) {
      const { data: countData } = await adminClient
        .from('documents')
        .select('collection_id')
        .in('collection_id', collectionIds)
        .eq('status', 'approved');

      if (countData) {
        countsMap = countData.reduce((acc, row) => {
          if (row.collection_id) {
            acc[row.collection_id] = (acc[row.collection_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }
    }

    const result = (collections || []).map((col) => ({
      ...col,
      document_count: countsMap[col.id] || 0,
      is_owner: user ? col.user_id === user.id : false,
    }));

    return NextResponse.json({ collections: result });
  } catch (err: unknown) {
    console.error('[Collections API] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create a collection.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createCollectionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid collection input' },
        { status: 400 }
      );
    }

    const { title, description, department, regulation, academic_year, semester, visibility, password } =
      validation.data;

    let passwordHash: string | null = null;
    if (visibility === 'private' && password) {
      passwordHash = await hashAccessPassword(password);
    }

    const baseSlug = slugify(title);
    const uniqueSlugSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSlugSuffix}`;

    const adminClient = getAdminClient();
    const { data: newCollection, error: insertError } = await adminClient
      .from('collections')
      .insert({
        title,
        slug,
        description: description || null,
        department: department || null,
        regulation: regulation || '2021',
        academic_year: academic_year || null,
        semester: semester || null,
        user_id: user.id,
        visibility,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (insertError || !newCollection) {
      console.error('[Collections API] Insertion error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create collection. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        collection: {
          id: newCollection.id,
          title: newCollection.title,
          slug: newCollection.slug,
          visibility: newCollection.visibility,
          created_at: newCollection.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[Collections API] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
