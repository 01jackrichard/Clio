import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { config } from '@/lib/config';
import {
  resolveInstitutionFilter,
  getAvailableInstitutions,
} from '@/lib/services/institution-service';
import { DEPARTMENTS } from '@/lib/constants';
import { sanitizePostgrestFilter } from '@/lib/utils';

export interface SearchResultItem {
  label: string;
  type: 'document' | 'subject_code' | 'collection' | 'institution' | 'department';
  id?: string;
  url?: string;
  term?: string;
  institution?: string;
  department?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const institutionParam = searchParams.get('institution') || '';

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const cleanTerm = q.toLowerCase();
  const results: SearchResultItem[] = [];
  const addedLabels = new Set<string>();

  const addResult = (item: SearchResultItem) => {
    if (!addedLabels.has(item.label) && results.length < 6) {
      addedLabels.add(item.label);
      results.push(item);
    }
  };

  // 1. Match Verified Institutions
  const availableInstitutions = getAvailableInstitutions();
  for (const inst of availableInstitutions) {
    if (
      inst.name.toLowerCase().includes(cleanTerm) ||
      inst.shortName.toLowerCase().includes(cleanTerm) ||
      inst.code.toLowerCase().includes(cleanTerm)
    ) {
      addResult({
        label: `[Institution] ${inst.shortName || inst.name}`,
        type: 'institution',
        institution: inst.name,
      });
    }
  }

  // 2. Match Academic Departments
  for (const dept of DEPARTMENTS) {
    if (dept.toLowerCase().includes(cleanTerm)) {
      addResult({
        label: `[Department] ${dept}`,
        type: 'department',
        department: dept,
      });
    }
  }

  // 3. Query Database for Approved Public Documents & Collections
  const isSupabaseConfigured =
    Boolean(config.supabase.url) && !config.supabase.url.includes('placeholder');

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();

      // Search approved public documents (RLS & public visibility enforced; private documents strictly excluded)
      let docQuery = supabase
        .from('documents')
        .select(
          'id, title, subject, subject_code, institution, department, material_type'
        )
        .eq('status', 'approved')
        .or('visibility.eq.public,visibility.is.null');

      // Filter institution if active and not 'all'
      if (institutionParam && institutionParam !== 'all') {
        const instTarget = resolveInstitutionFilter(institutionParam);
        if (instTarget) {
          docQuery = docQuery.ilike('institution', `%${instTarget}%`);
        }
      }

      // Keyword match across title, subject, subject_code
      const safeQ = sanitizePostgrestFilter(q);
      if (safeQ) {
        docQuery = docQuery
          .or(
            `title.ilike.%${safeQ}%,subject.ilike.%${safeQ}%,subject_code.ilike.%${safeQ}%`
          )
          .limit(6);
      } else {
        docQuery = docQuery.limit(6);
      }

      let { data: docs, error: docError } = await docQuery;

      // Schema resilience fallback if visibility column is not present
      if (docError && (docError.code === '42703' || docError.message?.includes('visibility'))) {
        let fallbackQuery = supabase
          .from('documents')
          .select('id, title, subject, subject_code, institution, department, material_type')
          .eq('status', 'approved');

        if (institutionParam && institutionParam !== 'all') {
          const instTarget = resolveInstitutionFilter(institutionParam);
          if (instTarget) {
            fallbackQuery = fallbackQuery.ilike('institution', `%${instTarget}%`);
          }
        }
        if (safeQ) {
          fallbackQuery = fallbackQuery
            .or(`title.ilike.%${safeQ}%,subject.ilike.%${safeQ}%,subject_code.ilike.%${safeQ}%`)
            .limit(6);
        } else {
          fallbackQuery = fallbackQuery.limit(6);
        }
        const fallbackRes = await fallbackQuery;
        docs = fallbackRes.data;
        docError = fallbackRes.error;
      }

      if (!docError && docs) {
        for (const doc of docs) {
          // If the course code matches directly, offer a dedicated subject/code suggestion
          if (
            doc.subject_code &&
            doc.subject_code.toLowerCase().includes(cleanTerm)
          ) {
            addResult({
              label: `[Code] ${doc.subject_code} — ${doc.subject}`,
              type: 'subject_code',
              term: doc.subject_code,
            });
          }

          // Offer the specific document with distinguishing metadata
          const docInst = doc.institution || 'Preserved';
          const codePart = doc.subject_code ? ` · ${doc.subject_code}` : '';
          addResult({
            label: `[Folio] ${doc.title}${codePart} (${docInst})`,
            type: 'document',
            id: doc.id,
            url: `/documents/${doc.id}`,
            term: doc.title,
          });
        }
      }

      // Search public collections
      let colQuery = supabase
        .from('collections')
        .select('id, title, department, institution')
        .eq('visibility', 'public');

      if (institutionParam && institutionParam !== 'all') {
        const instTarget = resolveInstitutionFilter(institutionParam);
        if (instTarget) {
          colQuery = colQuery.ilike('institution', `%${instTarget}%`);
        }
      }

      if (safeQ) {
        colQuery = colQuery
          .or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
          .limit(3);
      } else {
        colQuery = colQuery.limit(3);
      }

      const { data: cols, error: colError } = await colQuery;

      if (!colError && cols) {
        for (const col of cols) {
          addResult({
            label: `[Collection] ${col.title} (${col.department || 'Curated Pack'})`,
            type: 'collection',
            id: col.id,
            url: `/collections/${col.id}`,
            term: col.title,
          });
        }
      }
    } catch (err) {
      console.warn('Autocomplete search API error:', err);
    }
  }

  return NextResponse.json({ results });
}
