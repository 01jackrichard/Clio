import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/documents/[id]/route';

// Mocks
const mockGetUser = vi.fn();
const mockProfilesSelect = vi.fn();
const mockDocSelect = vi.fn();
const mockDocDelete = vi.fn();
const mockAuditInsert = vi.fn();
const mockDeleteFileFromDrive = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
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
      return {};
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      if (table === 'documents') {
        return {
          select: () => ({
            eq: () => ({
              single: mockDocSelect,
            }),
          }),
          delete: () => ({
            eq: mockDocDelete,
          }),
        };
      }
      if (table === 'audit_logs') {
        return {
          insert: mockAuditInsert,
        };
      }
      return {};
    },
  }),
}));

vi.mock('@/lib/drive/google-drive-service', () => ({
  deleteFileFromDrive: (...args: unknown[]) => mockDeleteFileFromDrive(...args),
}));

describe('CLIO — Document Deletion & Lifecycle Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditInsert.mockResolvedValue({ error: null });
    mockDeleteFileFromDrive.mockResolvedValue(true);
    mockDocDelete.mockResolvedValue({ error: null });
  });

  it('rejects unauthenticated deletion requests with 401 Unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    const req = new NextRequest('http://localhost:3000/api/documents/doc-123', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-123' }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('returns 404 when target document does not exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    mockDocSelect.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const req = new NextRequest('http://localhost:3000/api/documents/doc-missing', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-missing' }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('could not be found');
  });

  it('rejects deletion by non-owner student with 403 Forbidden (prevents IDOR)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'attacker-id' } },
      error: null,
    });
    mockDocSelect.mockResolvedValue({
      data: {
        id: 'doc-123',
        title: 'Thermodynamics Lecture Notes',
        uploader_id: 'victim-owner-id',
        drive_file_id: 'drive-file-abc',
        visibility: 'private',
        file_size: 5000000,
      },
      error: null,
    });
    mockProfilesSelect.mockResolvedValue({
      data: { role: 'student', status: 'active' },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/documents/doc-123', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-123' }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Forbidden');
    expect(mockDeleteFileFromDrive).not.toHaveBeenCalled();
    expect(mockDocDelete).not.toHaveBeenCalled();
  });

  it('allows document owner to delete their own document and cleans up stored file', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id' } },
      error: null,
    });
    mockDocSelect.mockResolvedValue({
      data: {
        id: 'doc-owned-1',
        title: 'Mechanics Chapter 1',
        uploader_id: 'owner-user-id',
        drive_file_id: 'drive-file-xyz',
        visibility: 'public',
        file_size: 2048576,
      },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/documents/doc-owned-1', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-owned-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteFileFromDrive).toHaveBeenCalledWith('drive-file-xyz');
    expect(mockDocDelete).toHaveBeenCalledWith('id', 'doc-owned-1');
  });

  it('allows administrator to delete any document and cleans up stored file', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-user-id' } },
      error: null,
    });
    mockDocSelect.mockResolvedValue({
      data: {
        id: 'doc-flagged-2',
        title: 'Inappropriate Content',
        uploader_id: 'student-author-id',
        drive_file_id: 'drive-file-flagged',
        visibility: 'public',
        file_size: 1048576,
      },
      error: null,
    });
    mockProfilesSelect.mockResolvedValue({
      data: { role: 'admin', status: 'active' },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/documents/doc-flagged-2', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'doc-flagged-2' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteFileFromDrive).toHaveBeenCalledWith('drive-file-flagged');
    expect(mockDocDelete).toHaveBeenCalledWith('id', 'doc-flagged-2');
  });
});
