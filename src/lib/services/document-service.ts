import { createClient } from '@/lib/supabase/server';
import {
  DocumentFilterParams,
  PaginatedResult,
  SemesterSubjectGroup,
  SemesterGroup,
  AcademicYearGroup,
  DiscoveryOverview,
} from '@/types';
import { CollectionRecord, DocumentRecord } from '@/types/database';
import { config } from '@/lib/config';
import { resolveInstitutionFilter } from './institution-service';
import { sanitizePostgrestFilter } from '@/lib/utils';

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
    msg.includes('regulation') ||
    msg.includes('institution') ||
    msg.includes('collections')
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

  // If filtered for an institution other than primary on unmigrated DB, return zero results
  if (params.institution && params.institution !== 'all') {
    const target = resolveInstitutionFilter(params.institution);
    const primaryName = config.app?.collegeName || 'Academic Institution';
    if (target && target !== primaryName) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
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
      const safeSubject = sanitizePostgrestFilter(params.subject);
      if (safeSubject) {
        q = q.ilike('subject', `%${safeSubject}%`);
      }
    }
    if (params.unit) {
      q = q.eq('unit', params.unit);
    }
    if (params.material_type) {
      q = q.eq('material_type', params.material_type);
    }

    // Keyword search over baseline text columns only (title, subject, description)
    if (params.q && params.q.trim()) {
      const searchTerm = sanitizePostgrestFilter(params.q);
      if (searchTerm) {
        q = q.or(
          `title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }
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
          institution: row.institution || config.app?.collegeName || 'Academic Institution',
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
          institution: doc.institution || config.app?.collegeName || 'Academic Institution',
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

    // Institution filter
    if (params.institution && params.institution !== 'all') {
      const targetInst = resolveInstitutionFilter(params.institution);
      if (targetInst) {
        const primaryCollege = config.app?.collegeName || 'Academic Institution';
        if (targetInst === primaryCollege) {
          query = query.or(`institution.eq.${targetInst},institution.is.null`);
        } else {
          query = query.eq('institution', targetInst);
        }
      }
    }

    // Search filter across title, subject, subject_code, description
    if (params.q && params.q.trim()) {
      const searchTerm = sanitizePostgrestFilter(params.q);
      if (searchTerm) {
        query = query.or(
          `title.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,subject_code.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }
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
      const safeSubject = sanitizePostgrestFilter(params.subject);
      if (safeSubject) {
        query = query.ilike('subject', `%${safeSubject}%`);
      }
    }
    if (params.subject_code) {
      const safeCode = sanitizePostgrestFilter(params.subject_code);
      if (safeCode) {
        query = query.ilike('subject_code', `%${safeCode}%`);
      }
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
      institution: row.institution || config.app.collegeName,
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

/**
 * Fetch approved public collections with filtering, search, and pagination.
 */
export async function getCollections(
  params: DocumentFilterParams
): Promise<PaginatedResult<CollectionRecord>> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
  const offset = (page - 1) * limit;

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
      .from('collections')
      .select('*, profiles(display_name)', { count: 'exact' })
      .eq('visibility', 'public');

    // Institution filter
    if (params.institution && params.institution !== 'all') {
      const targetInst = resolveInstitutionFilter(params.institution);
      if (targetInst) {
        const primaryCollege = config.app?.collegeName || 'Academic Institution';
        if (targetInst === primaryCollege) {
          query = query.or(`institution.eq.${targetInst},institution.is.null`);
        } else {
          query = query.eq('institution', targetInst);
        }
      }
    }

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
    if (params.q && params.q.trim()) {
      const searchTerm = sanitizePostgrestFilter(params.q);
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      if (isSchemaMismatchError(error)) {
        // Fallback without profiles or if collections not yet present
        try {
          let fallbackQuery = supabase
            .from('collections')
            .select('*', { count: 'exact' })
            .eq('visibility', 'public');

          if (params.department) fallbackQuery = fallbackQuery.eq('department', params.department);
          if (params.regulation) fallbackQuery = fallbackQuery.eq('regulation', params.regulation);
          if (params.semester) fallbackQuery = fallbackQuery.eq('semester', params.semester);
          if (params.q && params.q.trim()) {
            const safeFallbackQ = sanitizePostgrestFilter(params.q);
            if (safeFallbackQ) {
              fallbackQuery = fallbackQuery.or(
                `title.ilike.%${safeFallbackQ}%,description.ilike.%${safeFallbackQ}%`
              );
            }
          }

          const fbRes = await fallbackQuery
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (fbRes.data && !fbRes.error) {
            const total = fbRes.count ?? fbRes.data.length;
            return {
              data: (fbRes.data as CollectionRecord[]).map((c) => ({
                ...c,
                institution: c.institution || config.app?.collegeName || 'Academic Institution',
                owner_name: 'Classmate',
                document_count: 0,
              })),
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            };
          }
        } catch {
          // Safe fallback
        }
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      console.warn('Collection query error:', error.message);
      return { data: [], total: 0, page, limit, totalPages: 0, error: error.message };
    }

    type ColWithProfile = CollectionRecord & { profiles?: { display_name?: string | null } | null };
    const rawCollections = (data as unknown as ColWithProfile[]) || [];

    // Get document counts for each collection
    const collectionIds = rawCollections.map((c) => c.id);
    let countsMap: Record<string, number> = {};

    if (collectionIds.length > 0) {
      try {
        const { data: countData } = await supabase
          .from('documents')
          .select('collection_id')
          .in('collection_id', collectionIds)
          .eq('status', 'approved')
          .or('visibility.eq.public,visibility.is.null');

        if (countData) {
          countsMap = countData.reduce((acc, row) => {
            if (row.collection_id) {
              acc[row.collection_id] = (acc[row.collection_id] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);
        }
      } catch {
        // Safe fallback if collection_id column does not exist
      }
    }

    const formattedData: CollectionRecord[] = rawCollections.map((col) => ({
      ...col,
      institution: col.institution || config.app?.collegeName || 'Academic Institution',
      owner_name: col.profiles?.display_name || 'Classmate',
      document_count: countsMap[col.id] || 0,
    }));

    const total = count ?? formattedData.length;
    return {
      data: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query collections';
    return { data: [], total: 0, page, limit, totalPages: 0, error: msg };
  }
}

/**
 * Hierarchical academic semester discovery grouping.
 * Maps: Academic Year (1st, 2nd, 3rd, 4th) -> Semester (1-8) -> Subjects -> Materials (Documents & Collections)
 */
export async function getSemesterDiscoveryData(
  params: DocumentFilterParams
): Promise<AcademicYearGroup[]> {
  const [docsResult, collectionsResult] = await Promise.all([
    getDocuments({ ...params, limit: 100, page: 1 }),
    getCollections({ ...params, limit: 100, page: 1 }),
  ]);

  const docs = docsResult.data || [];
  const collections = collectionsResult.data || [];

  const yearDefinitions: { year: string; title: string; semesters: string[] }[] = [
    { year: '1st Year', title: '1st Year · Foundation & Core Sciences', semesters: ['Semester 1', 'Semester 2'] },
    { year: '2nd Year', title: '2nd Year · Professional Engineering Discipline', semesters: ['Semester 3', 'Semester 4'] },
    { year: '3rd Year', title: '3rd Year · Advanced Specializations & Systems', semesters: ['Semester 5', 'Semester 6'] },
    { year: '4th Year', title: '4th Year · Electives, Capstones & Synthesis', semesters: ['Semester 7', 'Semester 8'] },
  ];

  return yearDefinitions.map((yearDef) => {
    let yearTotalResources = 0;

    const semesters: SemesterGroup[] = yearDef.semesters.map((semStr, idx) => {
      const semNum = parseInt(semStr.replace(/\D/g, ''), 10) || idx + 1;

      const semDocs = docs.filter((d) => d.semester === semStr);
      const semCols = collections.filter((c) => c.semester === semStr);

      const subjectMap: Record<string, SemesterSubjectGroup> = {};

      for (const doc of semDocs) {
        const key = (doc.subject_code || doc.subject || 'General Studies').trim();
        if (!subjectMap[key]) {
          subjectMap[key] = {
            code: doc.subject_code || undefined,
            name: doc.subject || 'General Studies',
            department: doc.department,
            semester: semStr,
            regulation: doc.regulation || '2021',
            institution: doc.institution || config.app?.collegeName || 'Academic Institution',
            documents: [],
            collections: [],
            totalResources: 0,
          };
        }
        subjectMap[key].documents.push(doc);
        subjectMap[key].totalResources += 1;
      }

      for (const col of semCols) {
        const key = (col.title || 'Collection Bundle').trim();
        if (!subjectMap[key]) {
          subjectMap[key] = {
            name: col.title,
            department: col.department || 'Multidisciplinary',
            semester: semStr,
            regulation: col.regulation || '2021',
            institution: col.institution || config.app?.collegeName || 'Academic Institution',
            documents: [],
            collections: [],
            totalResources: 0,
          };
        }
        subjectMap[key].collections.push(col);
        subjectMap[key].totalResources += 1;
      }

      const subjects = Object.values(subjectMap).sort((a, b) => b.totalResources - a.totalResources);
      const semTotalResources = semDocs.length + semCols.length;
      yearTotalResources += semTotalResources;

      return {
        semester: semStr,
        semesterNumber: semNum,
        subjects,
        totalResources: semTotalResources,
      };
    });

    return {
      year: yearDef.year,
      title: yearDef.title,
      semesters,
      totalResources: yearTotalResources,
    };
  });
}

/**
 * Overview statistics and counts for all discovery modes.
 */
export async function getDiscoveryOverview(
  params: DocumentFilterParams
): Promise<DiscoveryOverview> {
  const [docsRes, collectionsRes] = await Promise.all([
    getDocuments({ ...params, page: 1, limit: 1 }),
    getCollections({ ...params, page: 1, limit: 1 }),
  ]);

  const totalFiles = docsRes.total;
  const totalCollections = collectionsRes.total;
  const activeInstitution = resolveInstitutionFilter(params.institution) || 'All Institutions';

  return {
    totalAll: totalFiles + totalCollections,
    totalFiles,
    totalCollections,
    activeInstitution,
  };
}

