import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateAcademicDocument,
  isPdfBuffer,
  isDocBuffer,
  isDocxBuffer,
  detectDocumentType,
} from '@/lib/drive/file-validation';
import {
  getDriveOAuthUrl,
  GOOGLE_DRIVE_NARROW_SCOPE,
  getOrCreateClioLibraryFolder,
  CLIO_LIBRARY_FOLDER_NAME,
} from '@/lib/drive/google-drive-service';

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockProfilesSelect = vi.fn();
const mockDocumentsInsert = vi.fn();

interface MockQueryBuilder {
  eq: () => MockQueryBuilder;
  gte: () => Promise<{ count: number; error: null }>;
  maybeSingle: () => Promise<{ data: null; error: null }>;
  single: () => Promise<{ data: null; error: null }>;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: mockProfilesSelect,
            }),
          }),
        };
      }
      if (table === 'documents') {
        return {
          select: () => {
            const builder: MockQueryBuilder = {
              eq: () => builder,
              gte: () => Promise.resolve({ count: 0, error: null }),
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null }),
            };
            return builder;
          },
        };
      }
      return {};
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'documents') {
        return {
          insert: (data: Record<string, unknown>) => ({
            select: () => ({
              single: () => mockDocumentsInsert(data),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

// Mock Google Drive Service for the route test
vi.mock('@/lib/drive/google-drive-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/drive/google-drive-service')>();
  return {
    ...actual,
    isGoogleDriveConfigured: vi.fn(() => true),
    uploadFileToDrive: vi.fn(async ({ filename }: { filename: string }) => ({
      fileId: 'mock-drive-file-id-12345',
      name: filename,
      mimeType: 'application/pdf',
      webViewLink: 'https://drive.google.com/file/d/mock-drive-file-id-12345/view',
    })),
    setDriveFilePublicReader: vi.fn(async () => ({ success: true })),
  };
});

describe('Direct Google Drive Upload Pipeline', () => {
  // Sample valid binary buffers
  const validPdfBuffer = Buffer.from('%PDF-1.7\n%Academic Document Sample Content\n%%EOF');
  const validDocBuffer = Buffer.from([
    0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00,
  ]);
  const validDocxBuffer = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, 0x08, 0x00,
  ]);

  describe('1. Binary Magic Bytes & File Content Inspection', () => {
    it('detects valid PDF buffers by inspecting %PDF- header', () => {
      expect(isPdfBuffer(validPdfBuffer)).toBe(true);
      expect(detectDocumentType(validPdfBuffer)).toBe('pdf');
    });

    it('detects valid Word DOC buffers by inspecting Compound File Binary header', () => {
      expect(isDocBuffer(validDocBuffer)).toBe(true);
      expect(detectDocumentType(validDocBuffer)).toBe('doc');
    });

    it('detects valid Word DOCX buffers by inspecting ZIP header', () => {
      expect(isDocxBuffer(validDocxBuffer)).toBe(true);
      expect(detectDocumentType(validDocxBuffer)).toBe('docx');
    });

    it('validates a proper PDF file with correct extension and matching bytes', () => {
      const result = validateAcademicDocument(
        'lecture_notes.pdf',
        'application/pdf',
        validPdfBuffer
      );
      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('application/pdf');
    });

    it('validates a proper DOCX file with correct extension and matching bytes', () => {
      const result = validateAcademicDocument(
        'assignment_guide.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        validDocxBuffer
      );
      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('rejects disguised plain text files with .pdf extension', () => {
      const fakePdfBuffer = Buffer.from('This is merely plain text disguised as a PDF file.');
      const result = validateAcademicDocument('notes.pdf', 'application/pdf', fakePdfBuffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File content validation failed');
    });

    it('rejects disallowed file extensions (e.g. .exe, .sh, .png)', () => {
      const result = validateAcademicDocument(
        'exploit.exe',
        'application/octet-stream',
        validPdfBuffer
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('rejects empty (0-byte) files', () => {
      const emptyBuffer = Buffer.from([]);
      const result = validateAcademicDocument('empty.pdf', 'application/pdf', emptyBuffer);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Uploaded file is empty');
    });

    it('rejects files exceeding the size limit', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024 * 51); // 51 MB
      // Prepend PDF magic bytes to satisfy byte check
      largeBuffer.write('%PDF-1.5', 0);
      const result = validateAcademicDocument(
        'large.pdf',
        'application/pdf',
        largeBuffer,
        50 * 1024 * 1024
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds');
    });

    it('accepts files exceeding 50MB when maxSizeBytes is Infinity (admin privilege)', () => {
      const largeBuffer = Buffer.alloc(1024 * 1024 * 55); // 55 MB
      largeBuffer.write('%PDF-1.5', 0);
      const result = validateAcademicDocument(
        'large-handbook.pdf',
        'application/pdf',
        largeBuffer,
        Infinity
      );
      expect(result.isValid).toBe(true);
      expect(result.detectedMimeType).toBe('application/pdf');
    });
  });

  describe('2. Google Drive OAuth URL & Narrow Scope Contract', () => {
    it('generates OAuth URL enforcing narrowest drive.file scope and offline access', () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

      const authUrl = getDriveOAuthUrl('http://localhost:3000/api/admin/google-drive/callback', 'test-state');
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain(`scope=${encodeURIComponent(GOOGLE_DRIVE_NARROW_SCOPE)}`);
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('state=test-state');

      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe('3. Direct Upload API Route Execution (POST /api/documents/upload)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

      const { POST } = await import('@/app/api/documents/upload/route');
      const req = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('rejects suspended users with 403 Forbidden', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-suspended-123', email: 'suspended@college.edu' } },
        error: null,
      });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-suspended-123', status: 'suspended', role: 'student' },
        error: null,
      });

      const { POST } = await import('@/app/api/documents/upload/route');
      const req = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('suspended');
    });

    it('rejects uploads without a file with 400 Bad Request', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-valid-1', email: 'student@college.edu' } },
        error: null,
      });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-valid-1', status: 'active', role: 'student' },
        error: null,
      });

      const formData = new FormData();
      formData.append('title', 'Distributed Systems Notes');

      const { POST } = await import('@/app/api/documents/upload/route');
      const req = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
      });
      req.formData = async () => formData;

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('select a document file');
    });

    it('rejects uploads with incomplete academic metadata or unaccepted declaration', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-valid-1', email: 'student@college.edu' } },
        error: null,
      });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-valid-1', status: 'active', role: 'student' },
        error: null,
      });

      const file = new File([validPdfBuffer], 'unit1.pdf', { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'OS Notes');
      // Missing subject, department, declaration

      const { POST } = await import('@/app/api/documents/upload/route');
      const req = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
      });
      req.formData = async () => formData;

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('successfully processes valid upload, uploads to Google Drive, and auto-publishes to Supabase', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-valid-1', email: 'student@college.edu' } },
        error: null,
      });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-valid-1', status: 'active', role: 'student' },
        error: null,
      });

      const file = new File([validPdfBuffer], 'operating_systems_notes.pdf', {
        type: 'application/pdf',
      });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Operating Systems - Concurrency & Deadlocks');
      formData.append('description', 'Detailed unit notes covering semaphores and mutex locks.');
      formData.append('department', 'Computer Science & Engineering');
      formData.append('academic_year', '3rd Year');
      formData.append('semester', 'Semester 5');
      formData.append('subject', 'Operating Systems');
      formData.append('unit', 'Unit 3');
      formData.append('material_type', 'unit_notes');
      formData.append('declaration_accepted', 'true');
      formData.append('tags', JSON.stringify(['os', 'concurrency', 'deadlocks']));

      mockDocumentsInsert.mockImplementationOnce((insertedData) =>
        Promise.resolve({
          data: {
            id: 'doc-created-12345',
            ...insertedData,
          },
          error: null,
        })
      );

      const { POST } = await import('@/app/api/documents/upload/route');
      const req = new NextRequest('http://localhost:3000/api/documents/upload', {
        method: 'POST',
      });
      req.formData = async () => formData;

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.document.id).toBe('doc-created-12345');
      expect(data.document.status).toBe('approved');
      expect(data.document.drive_file_id).toBe('mock-drive-file-id-12345');
    });
  });

  describe('4. Dedicated Library Folder Creation & Deduplication (drive.file scope)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('creates dedicated library folder if not found in Drive, under narrow scope', async () => {
      const mockFetch = vi.fn();
      // First call: GET search query -> returns empty array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      });
      // Second call: POST create folder -> returns new folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'newly-created-folder-id-777',
          name: CLIO_LIBRARY_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          webViewLink: 'https://drive.google.com/drive/folders/newly-created-folder-id-777',
        }),
      });

      global.fetch = mockFetch;

      const result = await getOrCreateClioLibraryFolder('fake-access-token');
      expect(result.id).toBe('newly-created-folder-id-777');
      expect(result.name).toBe(CLIO_LIBRARY_FOLDER_NAME);
      expect(result.isNew).toBe(true);

      // Verify POST call payload
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [createUrl, createOpts] = mockFetch.mock.calls[1];
      expect(createUrl).toContain('https://www.googleapis.com/drive/v3/files');
      expect(createOpts.method).toBe('POST');
      const body = JSON.parse(createOpts.body);
      expect(body.name).toBe(CLIO_LIBRARY_FOLDER_NAME);
      expect(body.mimeType).toBe('application/vnd.google-apps.folder');

      global.fetch = originalFetch;
    });

    it('reuses existing folder on repeat authorization without creating duplicates', async () => {
      const mockFetch = vi.fn();
      // First call: GET search query -> finds existing folder
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [
            {
              id: 'existing-folder-id-888',
              name: CLIO_LIBRARY_FOLDER_NAME,
              mimeType: 'application/vnd.google-apps.folder',
              webViewLink: 'https://drive.google.com/drive/folders/existing-folder-id-888',
            },
          ],
        }),
      });

      global.fetch = mockFetch;

      const result = await getOrCreateClioLibraryFolder('fake-access-token');
      expect(result.id).toBe('existing-folder-id-888');
      expect(result.name).toBe(CLIO_LIBRARY_FOLDER_NAME);
      expect(result.isNew).toBe(false);

      // Verify NO POST call was made (no duplicate created)
      expect(mockFetch).toHaveBeenCalledTimes(1);

      global.fetch = originalFetch;
    });

    it('rejects non-admin access to POST /api/admin/google-drive/init-folder with 403', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'usr-student-1' } },
        error: null,
      });
      mockProfilesSelect.mockResolvedValueOnce({
        data: { id: 'usr-student-1', role: 'student' },
        error: null,
      });

      const { POST } = await import('@/app/api/admin/google-drive/init-folder/route');
      const res = await POST();
      expect(res.status).toBe(403);
    });
  });
});
