import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as rawGet, HEAD as rawHead } from '@/app/api/documents/[id]/raw/route';
import { GET as downloadGet } from '@/app/api/documents/[id]/download/route';
import { GET as previewGet } from '@/app/api/documents/[id]/preview/route';

// Mock Supabase Server
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockDocSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'documents') {
        return {
          select: () => ({
            eq: () => ({
              single: mockDocSingle,
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockProfileSingle,
              single: mockProfileSingle,
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  getCurrentUser: vi.fn(async () => {
    const res = await mockGetUser();
    return res?.data?.user ?? null;
  }),
  getCurrentUserProfile: vi.fn(async () => {
    const res = await mockProfileSingle();
    return res?.data ?? null;
  }),
}));

// Mock Google Drive Service
vi.mock('@/lib/drive/google-drive-service', () => ({
  isGoogleDriveConfigured: vi.fn(() => true),
  getValidAccessToken: vi.fn(async () => 'mock-access-token-xyz'),
  getGoogleDriveConfig: vi.fn(() => ({
    clientId: 'mock-id',
    clientSecret: 'mock-sec',
    refreshToken: 'mock-refresh',
    folderId: 'mock-folder',
    enablePublicSharing: false,
  })),
}));

// Mock sharing service
const mockHasValidAccessGrant = vi.fn();
vi.mock('@/lib/services/sharing-service', () => ({
  hasValidAccessGrant: (...args: unknown[]) => mockHasValidAccessGrant(...args),
}));

// Mock password service
const mockVerifyUnlockToken = vi.fn();
vi.mock('@/lib/security/password-service', () => ({
  verifyUnlockToken: (...args: unknown[]) => mockVerifyUnlockToken(...args),
}));

describe('CLIO — Unified Document Delivery & Authorization Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockProfileSingle.mockResolvedValue({ data: null });
    mockHasValidAccessGrant.mockResolvedValue(false);
    mockVerifyUnlockToken.mockReturnValue(false);
    global.fetch = vi.fn();
  });

  describe('1. Public Approved Document Streaming (/api/documents/[id]/raw)', () => {
    it('successfully streams an approved public document with correct headers', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-approved-01',
          title: 'Fluid Mechanics Lecture Folio',
          mime_type: 'application/pdf',
          original_filename: 'fluid_mechanics.pdf',
          drive_file_id: 'drive-file-123',
          visibility: 'public',
          status: 'approved',
          uploader_id: 'uploader-999',
          file_size: 5242880,
        },
        error: null,
      });

      const mockStream = new ReadableStream();
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream,
        headers: new Headers({
          'content-length': '5242880',
        }),
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-approved-01/raw');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-approved-01' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('inline; filename="fluid_mechanics.pdf"');
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
      expect(res.headers.get('Cache-Control')).toContain('public');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('supports HTTP byte-range requests forwarding upstream and returning 206', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-range-01',
          title: 'Quantum Mechanics Unit 1',
          mime_type: 'application/pdf',
          original_filename: 'quantum.pdf',
          drive_file_id: 'drive-file-range',
          visibility: 'public',
          status: 'approved',
          uploader_id: 'uploader-999',
        },
        error: null,
      });

      const mockStream = new ReadableStream();
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce((url, options) => {
        expect(options.headers.Range).toBe('bytes=0-1024');
        return Promise.resolve({
          ok: true,
          status: 206,
          body: mockStream,
          headers: new Headers({
            'content-range': 'bytes 0-1024/5242880',
            'content-length': '1025',
          }),
        });
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-range-01/raw', {
        headers: { Range: 'bytes=0-1024' },
      });
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-range-01' }) });

      expect(res.status).toBe(206);
      expect(res.headers.get('Content-Range')).toBe('bytes 0-1024/5242880');
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    });

    it('sets Content-Disposition to attachment when ?download=true is requested', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-dl-01',
          title: 'Thermodynamics Notes',
          mime_type: 'application/pdf',
          original_filename: 'thermo_notes.pdf',
          drive_file_id: 'drive-file-dl',
          visibility: 'public',
          status: 'approved',
        },
        error: null,
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream(),
        headers: new Headers(),
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-dl-01/raw?download=true');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-dl-01' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="thermo_notes.pdf"');
    });

    it('responds to HEAD requests with headers without executing body stream', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-head-01',
          title: 'Structural Analysis Folio',
          mime_type: 'application/pdf',
          original_filename: 'structures.pdf',
          drive_file_id: 'drive-file-head',
          visibility: 'public',
          status: 'approved',
          file_size: 1048576,
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-head-01/raw', { method: 'HEAD' });
      const res = await rawHead(req, { params: Promise.resolve({ id: 'doc-head-01' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Length')).toBe('1048576');
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    });
  });

  describe('2. Private Document Access Control & Protection', () => {
    it('blocks access to private document when caller is unauthenticated and lacks password', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-priv-01',
          title: 'Proprietary Research Notes',
          mime_type: 'application/pdf',
          drive_file_id: 'drive-priv-1',
          visibility: 'private',
          status: 'approved',
          uploader_id: 'scholar-123',
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-priv-01/raw');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-priv-01' }) });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.requiresPassword).toBe(true);
      expect(json.error).toMatch(/private/i);
    });

    it('permits private document access when valid unlock cookie is presented', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-priv-02',
          title: 'Protected Coursework Folio',
          mime_type: 'application/pdf',
          original_filename: 'protected.pdf',
          drive_file_id: 'drive-priv-2',
          visibility: 'private',
          status: 'approved',
          uploader_id: 'scholar-123',
        },
        error: null,
      });

      mockVerifyUnlockToken.mockReturnValueOnce(true);

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream(),
        headers: new Headers(),
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-priv-02/raw', {
        headers: { cookie: 'clio_unlock_doc-priv-02=valid-token-sig' },
      });
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-priv-02' }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('private');
    });

    it('permits private document access when authenticated scholar holds a valid share grant', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'peer-scholar-456' } } });
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-priv-03',
          title: 'Shared Research Folio',
          mime_type: 'application/pdf',
          original_filename: 'shared.pdf',
          drive_file_id: 'drive-priv-3',
          visibility: 'private',
          status: 'approved',
          uploader_id: 'scholar-author-123',
        },
        error: null,
      });

      mockHasValidAccessGrant.mockResolvedValueOnce(true);

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: new ReadableStream(),
        headers: new Headers(),
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-priv-03/raw');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-priv-03' }) });

      expect(res.status).toBe(200);
    });
  });

  describe('3. Clean Branded Error Handling & Upstream Failure Protection', () => {
    it('returns clean Clio branded error without exposing provider names on upstream 404', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-missing-01',
          title: 'Archived Folio',
          mime_type: 'application/pdf',
          drive_file_id: 'missing-file-id',
          visibility: 'public',
          status: 'approved',
        },
        error: null,
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'File not found in upstream drive',
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-missing-01/raw');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-missing-01' }) });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('The requested archival folio file could not be found.');
      expect(JSON.stringify(json)).not.toMatch(/google/i);
      expect(JSON.stringify(json)).not.toMatch(/drive/i);
    });

    it('returns clean 502 message on upstream authentication error without leaking tokens', async () => {
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-auth-err-01',
          title: 'Folio with Auth Error',
          mime_type: 'application/pdf',
          drive_file_id: 'auth-err-file-id',
          visibility: 'public',
          status: 'approved',
        },
        error: null,
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid credentials',
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-auth-err-01/raw');
      const res = await rawGet(req, { params: Promise.resolve({ id: 'doc-auth-err-01' }) });

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toContain('Archival storage authentication is temporarily unavailable.');
      expect(JSON.stringify(json)).not.toMatch(/google/i);
    });
  });

  describe('4. Download and Preview Endpoints Alignment', () => {
    it('download endpoint routes through /api/documents/[id]/raw?download=true and does not leak provider', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-001' } } });
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-dl-route-01',
          title: 'Algorithm Design Notes',
          original_filename: 'algorithms.pdf',
          drive_file_id: 'drive-algo-1',
          status: 'approved',
          visibility: 'public',
          uploader_id: 'author-002',
          storage_provider: 'google_drive',
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-dl-route-01/download');
      const res = await downloadGet(req, { params: Promise.resolve({ id: 'doc-dl-route-01' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.downloadUrl).toBe('/api/documents/doc-dl-route-01/raw?download=true');
      expect(json.viewUrl).toBe('/api/documents/doc-dl-route-01/raw');
      expect(json.storageProvider).toBeUndefined();
    });

    it('preview endpoint returns Clio streaming route and does not leak driveFileId or provider', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-001' } } });
      mockDocSingle.mockResolvedValueOnce({
        data: {
          id: 'doc-prev-route-01',
          title: 'Database Systems Notes',
          drive_file_id: 'drive-db-1',
          status: 'approved',
          visibility: 'public',
          uploader_id: 'author-003',
          storage_provider: 'google_drive',
        },
        error: null,
      });

      const req = new NextRequest('http://localhost:3000/api/documents/doc-prev-route-01/preview');
      const res = await previewGet(req, { params: Promise.resolve({ id: 'doc-prev-route-01' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.previewUrl).toBe('/api/documents/doc-prev-route-01/raw');
      expect(json.driveFileId).toBeUndefined();
      expect(json.storageProvider).toBeUndefined();
    });
  });
});
