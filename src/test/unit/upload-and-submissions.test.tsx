import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadPage from '@/app/upload/page';
import { MySubmissionsList } from '@/app/my-submissions/submissions-list';
import { DocumentRecord } from '@/types/database';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    app: {
      name: 'Clio',
      collegeName: 'Academic Institution',
    },
    supabase: {
      url: 'https://valid-test-project.supabase.co',
      publishableKey: 'valid-publishable-key',
    },
    storage: {
      maxFileSizeMb: 50,
      maxFileSizeBytes: 50 * 1024 * 1024,
    },
  },
}));

// Mock Supabase client
let mockRole = 'student';
const mockEq = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: mockRole ? { id: 'test-user-id', email: 'test@example.com' } : null },
          error: null,
        })
      ),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockImplementation(() =>
                Promise.resolve({
                  data: { id: 'test-user-id', role: mockRole },
                  error: null,
                })
              ),
            }),
          }),
        };
      }
      return {
        delete: () => ({
          eq: mockEq,
        }),
      };
    },
  }),
}));

const mockSubmissions: DocumentRecord[] = [
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
    description: 'MATLAB and Python simulation scripts and exercises.',
    tags: ['dsp', 'matlab', 'filters'],
    file_size: 5120000,
    download_count: 0,
    drive_file_id: 'drive-222',
    original_filename: 'dsp-lab-guide.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Arthur Pendelton',
    uploader_id: 'user-001',
    status: 'pending',
    created_at: '2026-10-10T14:30:00Z',
    updated_at: '2026-10-10T14:30:00Z',
  },
  {
    id: 'sub-003',
    title: 'Fluid Dynamics Question Bank 2025',
    subject: 'Fluid Mechanics',
    unit: 'Complete Syllabus / All Units',
    semester: 'Semester 4',
    academic_year: '2nd Year',
    material_type: 'pyq',
    department: 'Mechanical Engineering',
    description: 'Past 5 years solved university question papers.',
    tags: ['fluids', 'past-papers'],
    file_size: 8192000,
    download_count: 0,
    drive_file_id: 'drive-333',
    original_filename: 'fluids-qb.pdf',
    mime_type: 'application/pdf',
    uploader_name: 'Arthur Pendelton',
    uploader_id: 'user-001',
    status: 'rejected',
    review_notes: 'Missing solutions for section C. Please provide full derivations or mark as unverified.',
    created_at: '2026-09-20T08:00:00Z',
    updated_at: '2026-09-21T11:00:00Z',
  },
];

beforeEach(() => {
  mockRole = 'student';
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('Phase 4 — Upload Experience & Student Submissions', () => {
  describe('Upload Page Component', () => {
    it('renders the editorial header, instructions, and dropzone', () => {
      render(<UploadPage />);

      expect(screen.getByText(/contribution folio/i)).toBeInTheDocument();
      expect(screen.getByText(/contribute academic notes/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf, doc, docx · max 50 mb/i)).toBeInTheDocument();
      expect(screen.getByText(/select a folio or drag and drop file here/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/document title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject name \/ course code/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^department/i)).toBeInTheDocument();
    });

    it('rejects files exceeding the 50MB limit with a clear error', () => {
      render(<UploadPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a 55MB mock file
      const oversizedFile = new File(['x'.repeat(100)], 'huge-handbook.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(oversizedFile, 'size', { value: 55 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(
        screen.getByText(/file size exceeds the 50 mb/i)
      ).toBeInTheDocument();
    });

    it('allows files exceeding 50MB when user is an administrator and shows admin unlimited upload status', async () => {
      mockRole = 'admin';
      render(<UploadPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/Standard Limit: 50 MB \(Admin: No Limit\)/i)
        ).toBeInTheDocument();
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a 75MB mock file
      const largeFile = new File(['x'.repeat(100)], 'admin-huge-folio.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(largeFile, 'size', { value: 75 * 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      // No error should be shown for admin
      expect(screen.queryByText(/file size exceeds the 50 mb/i)).not.toBeInTheDocument();
      expect(screen.getByText('admin-huge-folio.pdf')).toBeInTheDocument();
      expect(screen.getByText(/Admin Unlimited Folio/i)).toBeInTheDocument();
    });

    it('accepts a valid PDF file and auto-populates title from filename', () => {
      render(<UploadPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['sample content'], 'computational_mechanics_vol1.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(validFile, 'size', { value: 1024 * 1024 });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // File should appear selected
      expect(screen.getByText('computational_mechanics_vol1.pdf')).toBeInTheDocument();
      // Title should be formatted from filename
      const titleInput = screen.getByLabelText(/document title/i) as HTMLInputElement;
      expect(titleInput.value).toBe('computational mechanics vol1');
    });

    it('requires the Fair Use and Academic Integrity declaration before submission', async () => {
      render(<UploadPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['sample content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const titleInput = screen.getByLabelText(/document title/i);
      fireEvent.change(titleInput, { target: { value: 'Test Title' } });

      const subjectInput = screen.getByLabelText(/subject name \/ course code/i);
      fireEvent.change(subjectInput, { target: { value: 'Computer Science 101' } });

      // Declaration is not checked yet
      const submitBtn = screen.getByRole('button', { name: /deposit & publish to catalog/i });
      fireEvent.click(submitBtn);

      expect(
        screen.getByText(/you must accept the academic honesty and fair use declaration/i)
      ).toBeInTheDocument();
    });

    it('submits form with staged progress and shows success confirmation screen', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Document uploaded successfully',
          document: {
            id: 'doc-new-123',
            title: 'Linear Algebra Lecture Folio',
            drive_file_id: 'drive-999',
            status: 'approved',
            material_type: 'unit_notes',
          },
        }),
      });

      render(<UploadPage />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['content'], 'linear_algebra.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      fireEvent.change(screen.getByLabelText(/subject name \/ course code/i), {
        target: { value: 'Mathematics' },
      });

      // Check declaration
      const declarationCheckbox = screen.getByRole('checkbox');
      fireEvent.click(declarationCheckbox);

      const submitBtn = screen.getByRole('button', { name: /deposit & publish to catalog/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/documents/upload',
          expect.objectContaining({ method: 'POST' })
        );
        expect(screen.getByText(/folio preserved successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/open in document reader/i)).toBeInTheDocument();
      });
    });
  });

  describe('MySubmissionsList Component', () => {
    it('renders dynamic summary metric cards matching submission data', () => {
      render(
        <MySubmissionsList initialSubmissions={mockSubmissions} currentStatus="all" />
      );

      // Total submissions: 3
      expect(screen.getByText('Total Folios')).toBeInTheDocument();
      // Published
      expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
      // Under Review
      expect(screen.getAllByText('Under Review').length).toBeGreaterThanOrEqual(1);
      // Revision Needed
      expect(screen.getByText('Revision Needed')).toBeInTheDocument();

      // Check document titles
      expect(
        screen.getByText('Advanced Thermodynamics & Entropy Notes')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Digital Signal Processing Lab Manual')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Fluid Dynamics Question Bank 2025')
      ).toBeInTheDocument();
    });

    it('filters documents when status tabs are selected', () => {
      render(
        <MySubmissionsList initialSubmissions={mockSubmissions} currentStatus="all" />
      );

      // Click "Under Review" tab
      const pendingTab = screen.getByRole('button', { name: /under review/i });
      fireEvent.click(pendingTab);

      expect(mockPush).toHaveBeenCalledWith('/my-submissions?status=pending', {
        scroll: false,
      });

      // Digital Signal Processing Lab Manual should be visible (pending)
      expect(
        screen.getByText('Digital Signal Processing Lab Manual')
      ).toBeInTheDocument();

      // Advanced Thermodynamics should be filtered out
      expect(
        screen.queryByText('Advanced Thermodynamics & Entropy Notes')
      ).not.toBeInTheDocument();
    });

    it('displays reviewer feedback box for rejected submissions', () => {
      render(
        <MySubmissionsList initialSubmissions={mockSubmissions} currentStatus="all" />
      );

      expect(
        screen.getByText(/reviewer feedback & revision request/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/missing solutions for section c/i)
      ).toBeInTheDocument();
    });

    it('displays cancel submission button only for pending documents', () => {
      render(
        <MySubmissionsList initialSubmissions={mockSubmissions} currentStatus="all" />
      );

      const cancelButtons = screen.getAllByRole('button', {
        name: /cancel submission/i,
      });
      // Exactly 1 pending submission in mockSubmissions
      expect(cancelButtons).toHaveLength(1);
    });

    it('handles withdrawal of pending submission via Supabase delete', async () => {
      mockEq.mockResolvedValueOnce({ error: null });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MySubmissionsList initialSubmissions={mockSubmissions} currentStatus="all" />
      );

      const cancelBtn = screen.getByRole('button', {
        name: /cancel submission/i,
      });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(mockEq).toHaveBeenCalledWith('id', 'sub-002');
      });
    });

    it('renders helpful empty state when no submissions match the active tab', () => {
      render(
        <MySubmissionsList initialSubmissions={[]} currentStatus="all" />
      );

      expect(screen.getByText(/no submissions found/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /contribute new material/i })
      ).toBeInTheDocument();
    });
  });
});
