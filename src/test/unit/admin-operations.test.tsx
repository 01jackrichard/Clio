import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from '@/app/admin/page';
import { ModerationQueue } from '@/app/admin/moderation/moderation-queue';
import { ReportsList } from '@/app/admin/reports/reports-list';
import { UsersTable } from '@/app/admin/users/users-table';
import { RegisterDocumentForm } from '@/app/admin/register-document/register-document-form';
import { DocumentRecord, Profile, ReportRecord } from '@/types/database';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    app: {
      name: 'Clio',
      tagline: 'Knowledge, preserved.',
      description: 'Academic library',
      collegeName: 'Imperial Institute of Technology',
      collegeShortName: 'IIT',
      collegeDomain: 'iit.edu',
      url: 'http://localhost:3000',
    },
    auth: {
      registrationMode: 'open',
      allowedDomains: [],
    },
    storage: {
      provider: 'google_drive',
      maxFileSizeMb: 50,
      maxFileSizeBytes: 50 * 1024 * 1024,
      allowedMimeTypes: ['application/pdf'],
      requiresZeroCostCredentials: true,
    },
    googleDrive: {
      clientId: 'mock-client-id',
      clientSecret: 'mock-client-secret',
      refreshToken: 'mock-refresh-token',
      folderId: 'mock-folder-id',
      enablePublicSharing: true,
      isConfigured: true,
    },
    supabase: {
      url: 'https://valid-test-project.supabase.co',
      publishableKey: 'valid-publishable-key',
      secretKey: 'valid-secret-key',
    },
    features: {
      maxPendingSubmissionsPerUser: 10,
      maxUploadsPerHour: 20,
      rateLimitWindowMinutes: 60,
    },
  },
  checkConfigStatus: () => ({
    isConfigured: true,
    missingPublic: [],
    missingServer: [],
    supabaseConfigured: true,
    storageConfigured: true,
    r2Configured: true,
  }),
}));

// Mock Supabase client for Client Components
const mockSupabaseUpdate = vi.fn();
const mockSupabaseEq = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: mockSupabaseUpdate.mockReturnValue({
        eq: mockSupabaseEq,
      }),
    }),
  }),
}));

// Mock Supabase server for Server Components
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: (fields?: string) => {
            if (fields === 'role, status' || fields === 'role') {
              return {
                eq: () => ({
                  single: mockProfileSingle,
                }),
              };
            }
            return {
              count: 42,
              order: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      }
      if (table === 'documents') {
        return {
          select: () => ({
            eq: () => ({
              count: 15,
            }),
          }),
        };
      }
      if (table === 'reports') {
        return {
          select: () => ({
            eq: () => ({
              count: 3,
            }),
          }),
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null }),
      };
    },
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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock test documents
const mockPendingDocs: DocumentRecord[] = [
  {
    id: 'doc-mod-001',
    title: 'Fluid Dynamics & Navier-Stokes Folio',
    subject: 'Fluid Dynamics',
    unit: 'Unit 2',
    semester: 'Semester 4',
    academic_year: '2nd Year',
    material_type: 'unit_notes',
    department: 'Mechanical Engineering',
    description: 'Complete lecture derivation notes.',
    tags: ['fluids', 'navier-stokes'],
    file_size: 1048576,
    download_count: 0,
    drive_file_id: '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P',
    submitted_drive_url: 'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P/view',
    original_filename: 'fluids-unit2.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Arthur Pendelton',
    uploader_id: 'user-001',
    status: 'pending',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
  },
];

// Mock abuse reports
const mockReports: ReportRecord[] = [
  {
    id: 'rep-001',
    document_id: 'doc-mod-001',
    document_title: 'Fluid Dynamics & Navier-Stokes Folio',
    reporter_id: 'user-002',
    reporter_email: 'scholar.marie@iit.edu',
    reason: 'copyright_concern',
    details: 'This is copyrighted textbook material from Academic Press 2024.',
    status: 'pending',
    created_at: '2026-10-16T14:30:00Z',
    updated_at: '2026-10-16T14:30:00Z',
  },
  {
    id: 'rep-002',
    document_id: 'doc-mod-002',
    document_title: 'Quantum Computing Foundations',
    reporter_id: 'user-003',
    reporter_email: 'scholar.alan@iit.edu',
    reason: 'corrupt_pdf',
    details: 'Pages 10 through 25 are completely blurred.',
    status: 'resolved',
    created_at: '2026-10-14T09:00:00Z',
    updated_at: '2026-10-14T09:00:00Z',
  },
];

// Mock user profiles
const mockProfiles: Profile[] = [
  {
    id: 'admin-001',
    email: 'admin.lead@iit.edu',
    display_name: 'Lead Archivist',
    role: 'admin',
    status: 'active',
    department: 'Computer Science & Engineering',
    academic_year: 'Postgraduate / Research',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'student-001',
    email: 'student.bob@iit.edu',
    display_name: 'Bob Wilkins',
    role: 'student',
    status: 'active',
    department: 'Civil Engineering',
    academic_year: '3rd Year',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'student-002',
    email: 'student.suspended@iit.edu',
    display_name: 'Suspended User',
    role: 'student',
    status: 'suspended',
    department: 'Applied Sciences & Humanities',
    academic_year: '2nd Year',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  },
];

describe('Phase 6: Admin Operations & Governance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ==========================================
  // 1. ACCESS CONTROL & ROUTE GUARDS
  // ==========================================
  describe('Admin Route Access Guarding', () => {
    it('redirects unauthenticated visitor to login', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });

      await expect(AdminPage()).rejects.toThrow('REDIRECT:/auth/login?redirectTo=/admin');
    });

    it('redirects non-admin student to /unauthorized', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'student-001' } } });
      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'student', status: 'active' },
        error: null,
      });

      await expect(AdminPage()).rejects.toThrow('REDIRECT:/unauthorized');
    });

    it('redirects suspended admin to /unauthorized', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-001' } } });
      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'admin', status: 'suspended' },
        error: null,
      });

      await expect(AdminPage()).rejects.toThrow('REDIRECT:/unauthorized');
    });

    it('renders admin console when authorized administrator visits', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-001' } } });
      mockProfileSingle.mockResolvedValueOnce({
        data: { role: 'admin', status: 'active' },
        error: null,
      });

      const element = await AdminPage();
      render(element);

      expect(screen.getByText('Operations & Integrity Console')).toBeInTheDocument();
      expect(screen.getByText('User Directory & Access')).toBeInTheDocument();
    });
  });

  // ==========================================
  // 2. MODERATION QUEUE COMPONENT
  // ==========================================
  describe('ModerationQueue', () => {
    it('renders pending submissions with academic metadata and actions', () => {
      render(<ModerationQueue initialDocuments={mockPendingDocs} />);

      expect(
        screen.getByText('Fluid Dynamics & Navier-Stokes Folio')
      ).toBeInTheDocument();
      expect(screen.getByText('Mechanical Engineering')).toBeInTheDocument();
      expect(screen.getByText(/Semester 4/i)).toBeInTheDocument();
      expect(screen.getByText('Unit 2')).toBeInTheDocument();

      // Actions
      expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();
    });

    it('renders empty queue state when no pending documents exist', () => {
      render(<ModerationQueue initialDocuments={[]} />);

      expect(screen.getByText('Moderation Queue Clear')).toBeInTheDocument();
      expect(
        screen.getByText(/All submitted student documents have been processed/i)
      ).toBeInTheDocument();
    });

    it('opens approval modal, validates input, and approves document successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ModerationQueue initialDocuments={mockPendingDocs} />);

      // Click Approve
      fireEvent.click(screen.getByRole('button', { name: /^approve$/i }));

      // Modal appears
      expect(screen.getByText('Approve & Index Folio')).toBeInTheDocument();

      // Submit approval form
      const confirmBtn = screen.getByRole('button', { name: /publish to catalogue/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/moderation/doc-mod-001',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"action":"approve"'),
          })
        );
      });
    });

    it('opens rejection modal, validates minimum reason, and rejects submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ModerationQueue initialDocuments={mockPendingDocs} />);

      // Click Reject
      fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));

      // Modal appears
      expect(screen.getByText('Reject & Request Revisions')).toBeInTheDocument();

      // Type rejection reason
      const reasonInput = screen.getByPlaceholderText(
        /scan is blurry on pages 4-8/i
      );
      fireEvent.change(reasonInput, {
        target: { value: 'Pages 4 and 5 are missing formulas and cut off.' },
      });

      // Submit rejection
      fireEvent.click(screen.getByRole('button', { name: /confirm rejection/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/moderation/doc-mod-001',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"action":"reject"'),
          })
        );
      });
    });
  });

  // ==========================================
  // 3. ABUSE REPORTS COMPONENT
  // ==========================================
  describe('ReportsList', () => {
    it('renders reports list with status badges and reporter information', () => {
      render(<ReportsList initialReports={mockReports} />);

      expect(
        screen.getByText('Fluid Dynamics & Navier-Stokes Folio')
      ).toBeInTheDocument();
      expect(screen.getByText(/Flag:\s*copyright concern/i)).toBeInTheDocument();
      expect(screen.getByText('scholar.marie@iit.edu')).toBeInTheDocument();
    });

    it('filters reports using status category tabs', () => {
      render(<ReportsList initialReports={mockReports} />);

      // Click Pending Review tab
      const pendingTab = screen.getByRole('button', { name: /pending review/i });
      fireEvent.click(pendingTab);

      expect(
        screen.getByText('Fluid Dynamics & Navier-Stokes Folio')
      ).toBeInTheDocument();
      expect(screen.queryByText('Quantum Computing Foundations')).not.toBeInTheDocument();

      // Click Resolved tab
      const resolvedTab = screen.getByRole('button', { name: /resolved/i });
      fireEvent.click(resolvedTab);

      expect(screen.getByText('Quantum Computing Foundations')).toBeInTheDocument();
      expect(
        screen.queryByText('Fluid Dynamics & Navier-Stokes Folio')
      ).not.toBeInTheDocument();
    });

    it('opens resolve modal and successfully marks report resolved', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ReportsList initialReports={mockReports} />);

      // Click Resolve button on the pending report
      const resolveBtn = screen.getByRole('button', { name: /^resolve$/i });
      fireEvent.click(resolveBtn);

      // Modal appears
      expect(screen.getByText('Resolve Report')).toBeInTheDocument();

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /confirm resolution/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/reports/rep-001',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"action":"resolve"'),
          })
        );
      });
    });

    it('opens take-down modal and executes permanent document removal', async () => {
      // First call: moderation remove
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });
      // Second call: report resolve
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<ReportsList initialReports={mockReports} />);

      // Click Take Down Document
      fireEvent.click(screen.getByRole('button', { name: /take down document/i }));

      // Modal appears
      expect(screen.getByText('Take Down Academic Document')).toBeInTheDocument();

      // Confirm take down
      fireEvent.click(screen.getByRole('button', { name: /confirm take down/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/moderation/doc-mod-001',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"action":"remove"'),
          })
        );
      });
    });
  });

  // ==========================================
  // 4. USERS DIRECTORY COMPONENT
  // ==========================================
  describe('UsersTable', () => {
    it('renders scholars directory with governance roles and active standing', () => {
      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      expect(screen.getByText('Lead Archivist')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilkins')).toBeInTheDocument();
      expect(screen.getByText('Suspended User')).toBeInTheDocument();

      // Self badge for current admin
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('Current Session')).toBeInTheDocument();
    });

    it('filters users by search query', () => {
      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      const searchInput = screen.getByPlaceholderText(/search by name, email, or dept/i);
      fireEvent.change(searchInput, { target: { value: 'Civil' } });

      expect(screen.getByText('Bob Wilkins')).toBeInTheDocument();
      expect(screen.queryByText('Suspended User')).not.toBeInTheDocument();
    });

    it('filters users by status tabs', () => {
      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      const suspendedTab = screen.getByRole('button', { name: /^suspended/i });
      fireEvent.click(suspendedTab);

      expect(screen.getByText('Suspended User')).toBeInTheDocument();
      expect(screen.queryByText('Bob Wilkins')).not.toBeInTheDocument();
    });

    it('opens suspension modal and toggles user status', async () => {
      mockSupabaseEq.mockResolvedValueOnce({ error: null });

      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      // Click exact "Suspend" action button on Bob Wilkins
      const suspendBtn = screen.getByRole('button', { name: /^suspend$/i });
      fireEvent.click(suspendBtn);

      // Confirmation modal
      expect(screen.getByText('Suspend Account')).toBeInTheDocument();

      // Confirm suspension
      fireEvent.click(screen.getByRole('button', { name: /confirm suspension/i }));

      await waitFor(() => {
        expect(mockSupabaseUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'suspended' })
        );
      });
    });

    it('opens role elevation modal and promotes scholar to administrator', async () => {
      mockSupabaseEq.mockResolvedValueOnce({ error: null });

      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      // Click exact "Promote" button on Bob Wilkins
      const promoteButtons = screen.getAllByRole('button', { name: /^promote$/i });
      fireEvent.click(promoteButtons[0]);

      // Confirmation modal
      expect(screen.getByText('Promote to Administrator')).toBeInTheDocument();

      // Confirm promotion
      fireEvent.click(screen.getByRole('button', { name: /confirm promotion/i }));

      await waitFor(() => {
        expect(mockSupabaseUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin' })
        );
      });
    });

    it('dismisses modal dialogs on Escape key press', () => {
      render(
        <UsersTable
          initialProfiles={mockProfiles}
          currentAdminId="admin-001"
        />
      );

      const suspendBtn = screen.getByRole('button', { name: /^suspend$/i });
      fireEvent.click(suspendBtn);
      expect(screen.getByText('Suspend Account')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('Suspend Account')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // 5. CANONICAL DOCUMENT REGISTRATION FORM
  // ==========================================
  describe('RegisterDocumentForm', () => {
    it('validates Google Drive link syntax dynamically', () => {
      render(<RegisterDocumentForm />);

      const driveInput = screen.getByLabelText(/google drive share url or file id/i);

      // Enter valid Drive link
      fireEvent.change(driveInput, {
        target: {
          value: 'https://drive.google.com/file/d/1X9aBcDeFgHiJkLmNoPqRsTuVwXyZ1234/view',
        },
      });

      expect(screen.getByText(/recognized file id:/i)).toBeInTheDocument();
      expect(screen.getByText('1X9aBcDeFgHiJkLmNoPqRsTuVwXyZ1234')).toBeInTheDocument();
    });

    it('submits valid canonical registration payload and renders success folio card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          documentId: 'doc-canonical-999',
          status: 'approved',
        }),
      });

      render(<RegisterDocumentForm />);

      // Fill in Drive URL
      const driveInput = screen.getByLabelText(/google drive share url or file id/i);
      fireEvent.change(driveInput, {
        target: {
          value: 'https://drive.google.com/file/d/1X9aBcDeFgHiJkLmNoPqRsTuVwXyZ1234/view',
        },
      });

      // Fill in Title
      const titleInput = screen.getByLabelText(/document title/i);
      fireEvent.change(titleInput, {
        target: {
          value: 'CS302 — Advanced Algorithms Complete Folio',
        },
      });

      // Fill in Subject
      const subjectInput = screen.getByLabelText(/subject name \/ course code/i);
      fireEvent.change(subjectInput, {
        target: {
          value: 'Data Structures & Algorithms (CS302)',
        },
      });

      // Submit registration
      const submitBtn = screen.getByRole('button', {
        name: /register document in central repository/i,
      });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/documents/register',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('CS302 — Advanced Algorithms Complete Folio'),
          })
        );
      });

      // Confirmation screen rendered
      expect(screen.getByText('Canonical Document Indexed')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /view document in catalogue/i })
      ).toBeInTheDocument();
    });
  });
});
