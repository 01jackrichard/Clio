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

export function isSchemaMismatchError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    code === '42703' || // PostgreSQL undefined_column
    code === 'PGRST204' || // PostgREST column not found in schema cache
    code === 'PGRST200' || // PostgREST relationship not found
    code === '42P01' || // PostgreSQL undefined_table
    msg.includes('does not exist') ||
    msg.includes('column') ||
    msg.includes('relationship') ||
    msg.includes('profiles') ||
    msg.includes('visibility') ||
    msg.includes('subject_code') ||
    msg.includes('regulation')
  );
}

/**
 * Baseline fallback query querying only universally present schema columns.
 * Guarantees zero downtime and prevents catalogue crashes on unmigrated databases.
 */
async function fetchBaselineDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: DocumentFilterParams,
  offset: number,
  limit: number,
  page: number
): Promise<PaginatedResult<DocumentRecord> | null> {
  // Security guarantee: In an unmigrated database, all approved documents are public legacy folios.
  // If the requester explicitly filtered for private resources, return zero results to ensure no public documents leak as private.
  if (params.visibility === 'private') {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  // If filtered for a non-default regulation on unmigrated DB, return zero results
  if (params.regulation && params.regulation !== '2021') {
    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const buildQuery = (selectClause: string) => {
    let q = supabase
      .from('documents')
      .select(selectClause, { count: 'exact' })
      .eq('status', 'approved');

    if (params.department) {
      q = q.eq('department', params.department);
    }
    if (params.academic_year) {
      q = q.eq('academic_year', params.academic_year);
    }
    if (params.semester) {
      q = q.eq('semester', params.semester);
    }
    if (params.subject) {
      q = q.ilike('subject', `%${params.subject.trim()}%`);
    }
    if (params.unit) {
      q = q.eq('unit', params.unit);
    }
    if (params.material_type) {
      q = q.eq('material_type', params.material_type);
    }

    // Keyword search over baseline text columns only (title, subject, description)
    if (params.q && params.q.trim()) {
      const searchTerm = params.q.trim();
      q = q.or(
        `title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
      );
    }

    if (params.sort === 'downloads') {
      q = q.order('download_count', { ascending: false }).order('created_at', { ascending: false });
    } else if (params.sort === 'title') {
      q = q.order('title', { ascending: true });
    } else {
      q = q.order('created_at', { ascending: false });
    }

    return q.range(offset, offset + limit - 1);
  };

  try {
    // Try baseline with profiles join first
    const resWithProfiles = await buildQuery('*, profiles(display_name)');
    if (!resWithProfiles.error && resWithProfiles.data) {
      const total = resWithProfiles.count ?? 0;
      const formattedData: DocumentRecord[] = (resWithProfiles.data as unknown as DocumentWithProfileRow[]).map(
        (row) => ({
          ...row,
          visibility: 'public',
          regulation: row.regulation || '2021',
          subject_code: row.subject_code || null,
          is_verified_subject: row.is_verified_subject ?? true,
          uploader_name: row.profiles?.display_name || 'Classmate',
        })
      );

      return {
        data: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  } catch {
    // Continue to fallback without join
  }

  try {
    // Fallback: Plain query on documents table without profiles join
    const resPlain = await buildQuery('*');
    if (!resPlain.error && resPlain.data) {
      const total = resPlain.count ?? 0;
      const formattedData: DocumentRecord[] = (resPlain.data as unknown as DocumentRecord[]).map(
        (doc) => ({
          ...doc,
          visibility: 'public',
          regulation: doc.regulation || '2021',
          subject_code: doc.subject_code || null,
          is_verified_subject: doc.is_verified_subject ?? true,
          uploader_name: 'Classmate',
        })
      );

      return {
        data: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  } catch {
    // Failed plain query
  }

  return null;
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
      // If error is due to missing columns (e.g. visibility, subject_code, regulation) or relations (profiles)
      // gracefully fall back to baseline query guaranteed to work on any Supabase schema version.
      if (isSchemaMismatchError(error)) {
        console.warn('Document query encountered schema variation, activating baseline fallback:', error.message);
        const baselineResult = await fetchBaselineDocuments(supabase, params, offset, limit, page);
        if (baselineResult) {
          return baselineResult;
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
      visibility: row.visibility || 'public',
      regulation: row.regulation || '2021',
      subject_code: row.subject_code || null,
      is_verified_subject: row.is_verified_subject ?? true,
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
        const doc = fallback.data as DocumentRecord;
        return {
          ...doc,
          visibility: doc.visibility || 'public',
          regulation: doc.regulation || '2021',
          subject_code: doc.subject_code || null,
          is_verified_subject: doc.is_verified_subject ?? true,
          uploader_name: 'Classmate',
        };
      }
      return null;
    }

    const typedData = data as unknown as DocumentWithProfileRow;

    return {
      ...typedData,
      visibility: typedData.visibility || 'public',
      regulation: typedData.regulation || '2021',
      subject_code: typedData.subject_code || null,
      is_verified_subject: typedData.is_verified_subject ?? true,
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

    return ((data as DocumentRecord[]) || []).map((doc) => ({
      ...doc,
      visibility: doc.visibility || 'public',
      regulation: doc.regulation || '2021',
      subject_code: doc.subject_code || null,
      is_verified_subject: doc.is_verified_subject ?? true,
    }));
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
        visibility: doc.visibility || 'public',
        regulation: doc.regulation || '2021',
        subject_code: doc.subject_code || null,
        is_verified_subject: doc.is_verified_subject ?? true,
        uploader_name: doc.profiles?.display_name || 'Classmate',
      }));
  } catch {
    return [];
  }
}
