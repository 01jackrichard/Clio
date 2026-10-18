import { createClient } from '@/lib/supabase/server';
import { DocumentFilterParams, PaginatedResult } from '@/types';
import { DocumentRecord } from '@/types/database';
import { config } from '@/lib/config';

interface DocumentWithProfileRow extends DocumentRecord {
  profiles?: {
    display_name?: string | null;
  } | null;
}

interface FavoriteWithDocumentRow {
  document: (DocumentRecord & {
    profiles?: {
      display_name?: string | null;
    } | null;
  }) | null;
}

/**
 * Fetch approved documents with filtering, search, and pagination.
 * Resilient against unconfigured environments or schema variations.
 */
export async function getDocuments(params: DocumentFilterParams): Promise<PaginatedResult<DocumentRecord>> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const offset = (page - 1) * limit;

  // Gracefully handle unconfigured Supabase environment
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      unconfigured: true,
    };
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from('documents')
      .select('*, profiles(display_name)', { count: 'exact' })
      .eq('status', 'approved');

    // Default catalogue view excludes unlisted private documents
    if (params.visibility) {
      query = query.eq('visibility', params.visibility);
    } else {
      query = query.or('visibility.eq.public,visibility.is.null');
    }

    // Search filter across title, subject, subject_code, description
    if (params.q && params.q.trim()) {
      const searchTerm = params.q.trim();
      query = query.or(
        `title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,subject_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    // Exact filters
    if (params.department) {
      query = query.eq('department', params.department);
    }
    if (params.regulation) {
      query = query.eq('regulation', params.regulation);
    }
    if (params.academic_year) {
      query = query.eq('academic_year', params.academic_year);
    }
    if (params.semester) {
      query = query.eq('semester', params.semester);
    }
    if (params.subject) {
      query = query.ilike('subject', `%${params.subject.trim()}%`);
    }
    if (params.subject_code) {
      query = query.ilike('subject_code', `%${params.subject_code.trim()}%`);
    }
    if (params.unit) {
      query = query.eq('unit', params.unit);
    }
    if (params.material_type) {
      query = query.eq('material_type', params.material_type);
    }

    // Sorting
    if (params.sort === 'downloads') {
      query = query.order('download_count', { ascending: false }).order('created_at', { ascending: false });
    } else if (params.sort === 'title') {
      query = query.order('title', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Pagination range
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      // If the join with profiles fails due to schema cache, retry without join
      if (error.message.includes('relationship') || error.message.includes('profiles')) {
        const fallbackRes = await supabase
          .from('documents')
          .select('*', { count: 'exact' })
          .eq('status', 'approved')
          .range(offset, offset + limit - 1);

        if (!fallbackRes.error && fallbackRes.data) {
          const total = fallbackRes.count ?? 0;
          return {
            data: (fallbackRes.data as DocumentRecord[]).map(doc => ({
              ...doc,
              uploader_name: 'Classmate',
            })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          };
        }
      }

      console.warn('Document query message:', error.message);
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        error: error.message,
      };
    }

    const formattedData: DocumentRecord[] = ((data as unknown as DocumentWithProfileRow[]) || []).map((row) => ({
      ...row,
      uploader_name: row.profiles?.display_name || 'Classmate',
    }));

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: formattedData,
      total,
      page,
      limit,
      totalPages,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query documents';
    console.warn('Document service exception:', msg);
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      error: msg,
    };
  }
}

/**
 * Fetch a single document by ID with fallback.
 */
export async function getDocumentById(id: string): Promise<DocumentRecord | null> {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return null;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('documents')
      .select('*, profiles(display_name)')
      .eq('id', id)
      .single();

    if (error || !data) {
      // Fallback query without profiles join
      const fallback = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (fallback.data) {
        return {
          ...(fallback.data as DocumentRecord),
          uploader_name: 'Classmate',
        };
      }
      return null;
    }

    const typedData = data as unknown as DocumentWithProfileRow;

    return {
      ...typedData,
      uploader_name: typedData.profiles?.display_name || 'Classmate',
    };
  } catch (err) {
    console.warn('Error fetching document by ID:', err);
    return null;
  }
}

/**
 * Fetch user submissions.
 */
export async function getUserSubmissions(
  userId: string,
  status?: string
): Promise<DocumentRecord[]> {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return [];
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from('documents')
      .select('*')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching user submissions:', error.message);
      return [];
    }

    return (data as DocumentRecord[]) || [];
  } catch {
    return [];
  }
}

/**
 * Fetch user favorites.
 */
export async function getUserFavorites(userId: string): Promise<DocumentRecord[]> {
  if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('favorites')
      .select('document:documents(*, profiles(display_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as FavoriteWithDocumentRow[];

    return rows
      .map((row) => row.document)
      .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc && doc.status === 'approved'))
      .map((doc) => ({
        ...doc,
        uploader_name: doc.profiles?.display_name || 'Classmate',
      }));
  } catch {
    return [];
  }
}
