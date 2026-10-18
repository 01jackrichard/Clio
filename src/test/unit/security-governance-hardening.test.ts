import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as reportRoute } from '@/app/api/documents/[id]/report/route';
import { GET as driveStatusRoute } from '@/app/api/admin/google-drive/status/route';

// Mock Supabase
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockReportMaybeSingle = vi.fn();
const mockReportInsert = vi.fn();

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
              single: mockProfileSingle,
            }),
          }),
        };
      }
      if (table === 'reports') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: mockReportMaybeSingle,
                }),
              }),
            }),
          }),
          insert: mockReportInsert,
        };
      }
      return {};
    },
  })),
}));

// Mock Google Drive service
vi.mock('@/lib/drive/google-drive-service', () => ({
  getGoogleDriveConfig: vi.fn(() => ({
    folderId: 'folder-123',
    enablePublicSharing: true,
  })),
  verifyDriveConnection: vi.fn(async () => ({
    configured: true,
    canRefresh: true,
    folderFound: true,
    folderName: 'Clio Academic Library',
    error: null,
  })),
}));

describe('Security & Governance Hardening Suite', () => {
  const VALID_DOC_UUID = 'c30b2823-99d0-40c7-9524-73d8a9e40bc2';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/documents/[id]/report', () => {
    const makeParams = (id = VALID_DOC_UUID) => Promise.resolve({ id });

    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('No session'),
      });

      const req = new NextRequest(`http://localhost:3000/api/documents/${VALID_DOC_UUID}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'spam_inappropriate' }),
      });

      const res = await reportRoute(req, { params: makeParams() });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toMatch(/unauthorized/i);
    });

    it('returns 403 when user account is suspended', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-suspended-001', email: 'suspended@college.edu' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { status: 'suspended', role: 'student' },
        error: null,
      });

      const req = new NextRequest(`http://localhost:3000/api/documents/${VALID_DOC_UUID}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'spam_inappropriate', details: 'Suspended user report' }),
      });

      const res = await reportRoute(req, { params: makeParams() });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toMatch(/account is suspended/i);
    });

    it('returns 400 when report reason is invalid according to Zod schema', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-active-001', email: 'active@college.edu' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { status: 'active', role: 'student' },
        error: null,
      });

      const req = new NextRequest(`http://localhost:3000/api/documents/${VALID_DOC_UUID}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'invalid_arbitrary_reason' }),
      });

      const res = await reportRoute(req, { params: makeParams() });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/validation failed/i);
    });

    it('returns 409 when user already has a pending report for this document', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-active-001', email: 'active@college.edu' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { status: 'active', role: 'student' },
        error: null,
      });

      mockReportMaybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-report-001' },
        error: null,
      });

      const req = new NextRequest(`http://localhost:3000/api/documents/${VALID_DOC_UUID}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'spam_inappropriate' }),
      });

      const res = await reportRoute(req, { params: makeParams() });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/already submitted a pending report/i);
    });

    it('creates report successfully and returns 201 for active user', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-active-001', email: 'active@college.edu' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { status: 'active', role: 'student' },
        error: null,
      });

      mockReportMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockReportInsert.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const req = new NextRequest(`http://localhost:3000/api/documents/${VALID_DOC_UUID}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'incorrect_classification', details: 'Wrong department tags' }),
      });

      const res = await reportRoute(req, { params: makeParams() });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockReportInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          document_id: VALID_DOC_UUID,
          reporter_id: 'user-active-001',
          reason: 'incorrect_classification',
          status: 'pending',
        })
      );
    });
  });

  describe('GET /api/admin/google-drive/status', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('No session'),
      });

      const res = await driveStatusRoute();
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not an admin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'student-001' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'student', status: 'active' },
        error: null,
      });

      const res = await driveStatusRoute();
      expect(res.status).toBe(403);
    });

    it('returns 403 when user is admin but their account is suspended', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-suspended-001' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'admin', status: 'suspended' },
        error: null,
      });

      const res = await driveStatusRoute();
      expect(res.status).toBe(403);
    });

    it('returns 200 with status payload for active admin', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'admin-active-001' } },
        error: null,
      });

      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'admin', status: 'active' },
        error: null,
      });

      const res = await driveStatusRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.configured).toBe(true);
      expect(json.folderFound).toBe(true);
      expect(json.folderId).toBe('folder-123');
    });
  });
});
