import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSchemaMismatchError, getDocuments, getDocumentById } from '@/lib/services/document-service';

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    supabase: {
      url: 'https://test-project.supabase.co',
      anonKey: 'test-anon-key',
    },
  },
}));

interface MockQueryChain {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
}

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

describe('Schema Resilience & Database Backward Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSchemaMismatchError helper', () => {
    it('detects PostgreSQL error code 42703 (undefined column)', () => {
      const err = { code: '42703', message: 'column documents.visibility does not exist' };
      expect(isSchemaMismatchError(err)).toBe(true);
    });

    it('detects PostgREST missing relationship or missing column errors', () => {
      expect(isSchemaMismatchError({ code: 'PGRST204', message: 'Could not find column' })).toBe(true);
      expect(isSchemaMismatchError({ code: 'PGRST200', message: 'Could not find a relationship' })).toBe(true);
      expect(isSchemaMismatchError({ code: '42P01', message: 'relation "collections" does not exist' })).toBe(true);
    });

    it('detects missing column errors by message text', () => {
      expect(isSchemaMismatchError({ message: 'column documents.visibility does not exist' })).toBe(true);
      expect(isSchemaMismatchError({ message: 'column documents.subject_code does not exist' })).toBe(true);
      expect(isSchemaMismatchError({ message: 'column documents.regulation does not exist' })).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isSchemaMismatchError(null)).toBe(false);
      expect(isSchemaMismatchError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
      expect(isSchemaMismatchError({ message: 'Network connection timeout' })).toBe(false);
    });
  });

  describe('getDocuments fallback on unmigrated database schema', () => {
    it('activates baseline query when visibility column does not exist and returns approved documents', async () => {
      const legacyDocs = [
        {
          id: 'doc-001',
          title: 'Fluid Mechanics Lecture 1',
          department: 'Mechanical Engineering',
          academic_year: '2nd Year',
          semester: 'Semester 3',
          subject: 'Fluid Mechanics',
          unit: 'Unit 1',
          material_type: 'unit_notes',
          status: 'approved',
          download_count: 10,
          created_at: '2026-09-01T00:00:00Z',
          profiles: { display_name: 'Sarah Connor' },
        },
      ];

      // First query (with visibility check) fails with 42703
      // Second query (baseline fallback) succeeds
      let queryCallCount = 0;
      mockFrom.mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount === 1) {
          // Primary query that includes visibility check
          const chain: MockQueryChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: null,
              count: null,
              error: {
                code: '42703',
                message: 'column documents.visibility does not exist',
              },
            }),
          };
          return chain;
        } else {
          // Fallback baseline query
          const chain: MockQueryChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({
              data: legacyDocs,
              count: 1,
              error: null,
            }),
          };
          return chain;
        }
      });

      const result = await getDocuments({ page: 1, limit: 12 });

      expect(result.error).toBeUndefined();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('doc-001');
      expect(result.data[0].title).toBe('Fluid Mechanics Lecture 1');
      expect(result.data[0].visibility).toBe('public');
      expect(result.data[0].regulation).toBe('2021');
      expect(result.data[0].uploader_name).toBe('Sarah Connor');
    });

    it('safely returns zero documents if private visibility is requested on an unmigrated schema', async () => {
      mockFrom.mockImplementation(() => {
        const chain: MockQueryChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: null,
            count: null,
            error: {
              code: '42703',
              message: 'column documents.visibility does not exist',
            },
          }),
        };
        return chain;
      });

      const result = await getDocuments({ visibility: 'private' });

      // Security invariant: Legacy documents must NEVER leak as private
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getDocumentById fallback on unmigrated database schema', () => {
    it('returns default visibility: public and default regulation: 2021 when columns are missing', async () => {
      const legacyDoc = {
        id: 'doc-002',
        title: 'Digital Signal Processing Notes',
        department: 'Electronics & Communication',
        status: 'approved',
        profiles: { display_name: 'John Doe' },
      };

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: legacyDoc,
          error: null,
        }),
      });

      const doc = await getDocumentById('doc-002');
      expect(doc).not.toBeNull();
      expect(doc?.visibility).toBe('public');
      expect(doc?.regulation).toBe('2021');
      expect(doc?.uploader_name).toBe('John Doe');
    });
  });
});
