import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import { FavoritesList } from '@/app/favorites/favorites-list';
import { ProfileForm } from '@/app/profile/profile-form';
import { DocumentRecord, Profile } from '@/types/database';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
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
    supabase: {
      url: 'https://valid-test-project.supabase.co',
      publishableKey: 'valid-publishable-key',
      secretKey: 'valid-secret-key',
    },
  },
}));

// Mock Supabase client for Client Components
const mockUpdate = vi.fn();
const mockUpdateEq = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: mockUpdate.mockReturnValue({
        eq: mockUpdateEq,
      }),
    }),
  }),
}));

// Mock document-service and Supabase server for Server Components
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();
const mockFavoritesQuery = vi.fn();

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
      if (table === 'favorites') {
        return {
          select: () => ({
            eq: () => ({
              order: mockFavoritesQuery,
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    },
  })),
}));

const mockGetUserSubmissions = vi.fn();
const mockGetUserFavorites = vi.fn();
vi.mock('@/lib/services/document-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/document-service')>();
  return {
    ...actual,
    getUserSubmissions: (...args: unknown[]) => mockGetUserSubmissions(...args),
    getUserFavorites: (...args: unknown[]) => mockGetUserFavorites(...args),
  };
});

const mockProfile: Profile = {
  id: 'user-001',
  email: 'arthur.pendelton@iit.edu',
  display_name: 'Arthur Pendelton',
  avatar_url: null,
  department: 'Mechanical Engineering',
  academic_year: '3rd Year',
  graduation_year: 2027,
  role: 'student',
  status: 'active',
  created_at: '2026-01-15T09:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
};

const mockSubmissionsList: DocumentRecord[] = [
  {
    id: 'sub-001',
    title: 'Advanced Thermodynamics & Entropy Notes',
    subject: 'Applied Thermodynamics',
    unit: 'Unit 3',
    semester: 'Semester 5',
    academic_year: '3rd Year',
    material_type: 'unit_notes',
    department: 'Mechanical Engineering',
    description: 'Detailed lecture notes covering Carnot cycles.',
    tags: ['thermodynamics', 'entropy'],
    file_size: 2048576,
    download_count: 14,
    drive_file_id: 'drive-111',
    original_filename: 'thermo-unit-3.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Arthur Pendelton',
    uploader_id: 'user-001',
    status: 'approved',
    created_at: '2026-09-15T10:00:00Z',
    updated_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'sub-002',
    title: 'Digital Signal Processing Lab Manual',
    subject: 'Signal Processing',
    unit: 'Unit 2',
    semester: 'Semester 6',
    academic_year: '3rd Year',
    material_type: 'lab_manual',
    department: 'Electronics & Communication Engineering',
    description: 'MATLAB simulation scripts.',
    tags: ['dsp', 'matlab'],
    file_size: 5120000,
    download_count: 0,
    drive_file_id: 'drive-222',
    original_filename: 'dsp-lab.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Arthur Pendelton',
    uploader_id: 'user-001',
    status: 'pending',
    created_at: '2026-10-10T14:30:00Z',
    updated_at: '2026-10-10T14:30:00Z',
  },
];

const mockFavoritesList: DocumentRecord[] = [
  {
    id: 'fav-001',
    title: 'Fluid Mechanics Cheat Sheet & Formulations',
    subject: 'Fluid Dynamics',
    unit: 'Complete Syllabus / All Units',
    semester: 'Semester 4',
    academic_year: '2nd Year',
    material_type: 'revision_notes',
    department: 'Mechanical Engineering',
    description: 'Summary of Navier-Stokes and boundary layer equations.',
    tags: ['fluids', 'cheatsheet'],
    file_size: 1048576,
    download_count: 88,
    drive_file_id: 'drive-333',
    original_filename: 'fluids-cheat-sheet.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Professor Reynolds',
    uploader_id: 'user-002',
    status: 'approved',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
  {
    id: 'fav-002',
    title: 'Machine Design Past 5 Years Solved Papers',
    subject: 'Machine Design',
    unit: 'Unit 1',
    semester: 'Semester 5',
    academic_year: '3rd Year',
    material_type: 'pyq',
    department: 'Mechanical Engineering',
    description: 'Fully solved university exam papers with free body diagrams.',
    tags: ['design', 'pyq'],
    file_size: 4096000,
    download_count: 65,
    drive_file_id: 'drive-444',
    original_filename: 'machine-design-pyq.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Claire Beauchamp',
    uploader_id: 'user-003',
    status: 'approved',
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-08-15T12:00:00Z',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('Phase 5 — Student Workspace & Personal Folios', () => {
  describe('Student Dashboard (/dashboard)', () => {
    it('renders personalized greeting, truthful activity metrics, and recent deposits', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-001', email: 'arthur.pendelton@iit.edu' } },
      });
      mockProfileSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockGetUserSubmissions.mockResolvedValueOnce(mockSubmissionsList);
      mockGetUserFavorites.mockResolvedValueOnce(mockFavoritesList);

      const ui = await DashboardPage();
      render(ui);

      // Welcome area with real profile name
      expect(screen.getByText('Welcome back, Arthur Pendelton')).toBeInTheDocument();
      expect(
        screen.getByText(/Mechanical Engineering · 3rd Year · Imperial Institute of Technology/i)
      ).toBeInTheDocument();

      // Metrics derived directly from input data
      expect(screen.getByText('Contributed Folios')).toBeInTheDocument();
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // 2 total submissions

      expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // 1 approved

      expect(screen.getAllByText('Under Review').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Saved Bookmarks').length).toBeGreaterThanOrEqual(1);

      // Recent activity entries
      expect(
        screen.getByText('Advanced Thermodynamics & Entropy Notes')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Digital Signal Processing Lab Manual')
      ).toBeInTheDocument();

      // Navigation cards
      expect(screen.getByText('Academic Catalogue')).toBeInTheDocument();
      expect(screen.getByText('Contribute Material')).toBeInTheDocument();
      expect(screen.getByText('My Submissions')).toBeInTheDocument();
      expect(screen.getByText('Scholar Profile')).toBeInTheDocument();
    });

    it('displays incomplete profile alert when department or year is missing', async () => {
      const incompleteProfile: Profile = {
        ...mockProfile,
        department: null,
        academic_year: null,
      };

      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-001', email: 'arthur.pendelton@iit.edu' } },
      });
      mockProfileSingle.mockResolvedValueOnce({ data: incompleteProfile, error: null });
      mockGetUserSubmissions.mockResolvedValueOnce([]);
      mockGetUserFavorites.mockResolvedValueOnce([]);

      const ui = await DashboardPage();
      render(ui);

      expect(screen.getByText(/incomplete academic affiliation/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /complete profile/i })).toBeInTheDocument();
    });

    it('renders empty contribution state when user has not uploaded any documents', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'user-001', email: 'arthur.pendelton@iit.edu' } },
      });
      mockProfileSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      mockGetUserSubmissions.mockResolvedValueOnce([]);
      mockGetUserFavorites.mockResolvedValueOnce([]);

      const ui = await DashboardPage();
      render(ui);

      expect(screen.getByText(/no academic contributions yet/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /deposit first folio/i })).toBeInTheDocument();
    });
  });

  describe('Personal Favorites (/favorites)', () => {
    it('renders saved document cards and updates dynamically when un-bookmarked', async () => {
      render(<FavoritesList initialFavorites={mockFavoritesList} />);

      expect(
        screen.getByText(/2 saved folios in study collection/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText('Fluid Mechanics Cheat Sheet & Formulations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Machine Design Past 5 Years Solved Papers')
      ).toBeInTheDocument();

      // Find the bookmark buttons on the rendered DocumentCards
      const bookmarkButtons = screen.getAllByLabelText(/remove bookmark/i);
      expect(bookmarkButtons).toHaveLength(2);

      // Un-bookmark the first document
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isFavorited: false }),
      });

      fireEvent.click(bookmarkButtons[0]);

      // Should immediately remove the un-bookmarked document from the active list
      await waitFor(() => {
        expect(
          screen.queryByText('Fluid Mechanics Cheat Sheet & Formulations')
        ).not.toBeInTheDocument();
        expect(
          screen.getByText(/1 saved folio in study collection/i)
        ).toBeInTheDocument();
      });
    });

    it('transitions to empty state when all favorites are removed or list is empty', () => {
      render(<FavoritesList initialFavorites={[]} />);

      expect(screen.getByText(/personal study archive is empty/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /browse academic catalogue/i })
      ).toBeInTheDocument();
    });

    it('getUserFavorites filters out unapproved or removed documents', async () => {
      // Mock Supabase to return mixed documents (approved, pending, null)
      mockFavoritesQuery.mockResolvedValueOnce({
        data: [
          {
            document: {
              ...mockFavoritesList[0],
              status: 'approved',
            },
          },
          {
            document: {
              ...mockFavoritesList[1],
              status: 'pending', // unapproved
            },
          },
          {
            document: null, // deleted
          },
        ],
        error: null,
      });

      const { getUserFavorites: realGetUserFavorites } = await vi.importActual<
        typeof import('@/lib/services/document-service')
      >('@/lib/services/document-service');

      const result = await realGetUserFavorites('user-001');

      // Only the approved document should be returned
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fav-001');
      expect(result[0].status).toBe('approved');
    });
  });

  describe('Student Profile (/profile)', () => {
    it('renders profile form with populated academic information', () => {
      render(<ProfileForm profile={mockProfile} />);

      expect(screen.getByLabelText(/scholar display name/i)).toHaveValue('Arthur Pendelton');
      expect(screen.getByLabelText(/institutional email address/i)).toHaveValue(
        'arthur.pendelton@iit.edu'
      );
      expect(screen.getByLabelText(/institutional email address/i)).toBeDisabled();
      expect(screen.getByLabelText(/academic department/i)).toHaveValue('Mechanical Engineering');
      expect(screen.getByLabelText(/academic standing/i)).toHaveValue('3rd Year');
      expect(screen.getByLabelText(/anticipated graduation year/i)).toHaveValue(2027);
    });

    it('validates display name and graduation year constraints', async () => {
      render(<ProfileForm profile={mockProfile} />);

      const nameInput = screen.getByLabelText(/scholar display name/i);
      fireEvent.change(nameInput, { target: { value: 'A' } }); // < 2 chars

      fireEvent.click(screen.getByRole('button', { name: /save academic profile/i }));

      expect(
        screen.getByText(/display name must be at least 2 characters/i)
      ).toBeInTheDocument();

      // Reset to valid name and enter invalid year
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      const yearInput = screen.getByLabelText(/anticipated graduation year/i);
      fireEvent.change(yearInput, { target: { value: '2015' } }); // < 2020

      fireEvent.click(screen.getByRole('button', { name: /save academic profile/i }));

      expect(
        screen.getByText(/graduation year must be between 2020 and 2035/i)
      ).toBeInTheDocument();
    });

    it('preserves user input and displays error alert when Supabase update fails', async () => {
      mockUpdateEq.mockResolvedValueOnce({
        error: { message: 'Database connection timeout during update' },
      });

      render(<ProfileForm profile={mockProfile} />);

      const nameInput = screen.getByLabelText(/scholar display name/i);
      fireEvent.change(nameInput, { target: { value: 'Arthur Pendelton Updated' } });

      fireEvent.click(screen.getByRole('button', { name: /save academic profile/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/database connection timeout during update/i)
        ).toBeInTheDocument();
        // Preserves user's typed value
        expect(nameInput).toHaveValue('Arthur Pendelton Updated');
      });
    });

    it('submits whitelisted fields only, preventing privilege escalation', async () => {
      mockUpdateEq.mockResolvedValueOnce({ error: null });

      render(<ProfileForm profile={mockProfile} />);

      const nameInput = screen.getByLabelText(/scholar display name/i);
      fireEvent.change(nameInput, { target: { value: 'Sir Arthur' } });

      fireEvent.click(screen.getByRole('button', { name: /save academic profile/i }));

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            display_name: 'Sir Arthur',
            department: 'Mechanical Engineering',
            academic_year: '3rd Year',
            graduation_year: 2027,
          })
        );

        // Security check: Verify no restricted/authoritative fields were sent
        const payload = mockUpdate.mock.calls[0][0];
        expect(payload).not.toHaveProperty('role');
        expect(payload).not.toHaveProperty('status');
        expect(payload).not.toHaveProperty('email');
        expect(payload).not.toHaveProperty('id');
        expect(payload).not.toHaveProperty('created_at');

        expect(
          screen.getByText(/profile credentials updated successfully/i)
        ).toBeInTheDocument();
      });
    });

    it('allows resetting form values back to initial profile state', () => {
      render(<ProfileForm profile={mockProfile} />);

      const nameInput = screen.getByLabelText(/scholar display name/i);
      fireEvent.change(nameInput, { target: { value: 'Temporary Altered Name' } });
      expect(nameInput).toHaveValue('Temporary Altered Name');

      const resetBtn = screen.getByRole('button', { name: /reset values/i });
      fireEvent.click(resetBtn);

      expect(nameInput).toHaveValue('Arthur Pendelton');
    });
  });
});
