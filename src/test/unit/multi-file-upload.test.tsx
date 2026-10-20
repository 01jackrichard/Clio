import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadPage from '@/app/upload/page';

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
      collegeDomain: 'yourcollege.edu',
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

let mockRole = 'student';
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id', email: 'scholar@college.edu' } },
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
      return {};
    },
  }),
}));

describe('CLIO — Multi-File Academic Document Upload Suite', () => {
  beforeEach(() => {
    mockRole = 'student';
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('1. supports selecting multiple valid files and generates clean initial titles', () => {
    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'discrete_mathematics_unit1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'discrete_mathematics_unit2.pdf', { type: 'application/pdf' });
    Object.defineProperty(file1, 'size', { value: 1024 * 1024 });
    Object.defineProperty(file2, 'size', { value: 2048 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    expect(screen.getByText('discrete_mathematics_unit1.pdf')).toBeInTheDocument();
    expect(screen.getByText('discrete_mathematics_unit2.pdf')).toBeInTheDocument();
    expect(screen.getByText(/01\. Selected Folios \(2 files/i)).toBeInTheDocument();
  });

  it('2. supports removing an individual file from the batch selection', () => {
    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'file_to_keep.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'file_to_remove.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    expect(screen.getByText('file_to_keep.pdf')).toBeInTheDocument();
    expect(screen.getByText('file_to_remove.pdf')).toBeInTheDocument();

    const removeBtn = screen.getByLabelText('Remove file file_to_remove.pdf');
    fireEvent.click(removeBtn);

    expect(screen.getByText('file_to_keep.pdf')).toBeInTheDocument();
    expect(screen.queryByText('file_to_remove.pdf')).not.toBeInTheDocument();
  });

  it('3. allows applying shared subject across all files in the batch', () => {
    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'oop_unit_1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'oop_unit_2.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Set shared subject
    const subjectInput = screen.getByLabelText(/subject name \/ course code/i);
    fireEvent.change(subjectInput, { target: { value: 'Object Oriented Programming' } });

    // Click Apply Subject to All Files
    const applyAllBtn = screen.getByRole('button', { name: /apply subject to all files/i });
    fireEvent.click(applyAllBtn);

    const subjectInput1 = screen.getByLabelText('Subject for oop_unit_1.pdf') as HTMLInputElement;
    const subjectInput2 = screen.getByLabelText('Subject for oop_unit_2.pdf') as HTMLInputElement;

    expect(subjectInput1.value).toBe('Object Oriented Programming');
    expect(subjectInput2.value).toBe('Object Oriented Programming');
  });

  it('4. supports configuring different subjects for files in the same batch', () => {
    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'oop_notes.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'stats_notes.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    const subjectInput1 = screen.getByLabelText('Subject for oop_notes.pdf');
    const subjectInput2 = screen.getByLabelText('Subject for stats_notes.pdf');

    fireEvent.change(subjectInput1, { target: { value: 'Object Oriented Programming' } });
    fireEvent.change(subjectInput2, { target: { value: 'Probability and Statistics' } });

    expect((subjectInput1 as HTMLInputElement).value).toBe('Object Oriented Programming');
    expect((subjectInput2 as HTMLInputElement).value).toBe('Probability and Statistics');
  });

  it('5. detects and skips duplicate file selections without creating duplicates', () => {
    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'duplicate_note.pdf', { type: 'application/pdf' });
    Object.defineProperty(file1, 'size', { value: 1024 });

    // Add first time
    fireEvent.change(fileInput, { target: { files: [file1] } });
    expect(screen.getAllByText('duplicate_note.pdf')).toHaveLength(1);

    // Try adding duplicate
    const fileDuplicate = new File(['content 1'], 'duplicate_note.pdf', { type: 'application/pdf' });
    Object.defineProperty(fileDuplicate, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [fileDuplicate] } });

    // Still only 1 entry in the ledger
    expect(screen.getAllByText('duplicate_note.pdf')).toHaveLength(1);
    expect(screen.getByText(/1 duplicate file\(s\) already in selection were skipped/i)).toBeInTheDocument();
  });

  it('6. handles partial failure and allows retrying only the failed item without re-uploading succeeded files', async () => {
    let uploadCallCount = 0;

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (url: string, opts: RequestInit) => {
      if (url === '/api/documents/upload') {
        uploadCallCount++;
        const body = opts.body as FormData;
        const file = body.get('file') as File;

        // Make file2 fail on first attempt
        if (file.name === 'flaky_file.pdf' && uploadCallCount <= 2) {
          return {
            ok: false,
            json: async () => ({ error: 'Temporary storage timeout' }),
          };
        }

        return {
          ok: true,
          json: async () => ({
            success: true,
            document: { id: `doc-${file.name}`, title: body.get('title') },
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<UploadPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(['content 1'], 'good_file.pdf', { type: 'application/pdf' });
    const file2 = new File(['content 2'], 'flaky_file.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    // Set subjects
    fireEvent.change(screen.getByLabelText('Subject for good_file.pdf'), { target: { value: 'Algorithms' } });
    fireEvent.change(screen.getByLabelText('Subject for flaky_file.pdf'), { target: { value: 'Algorithms' } });

    // Check declaration
    fireEvent.click(screen.getByRole('checkbox'));

    // Submit batch
    const submitBtn = screen.getByRole('button', { name: /deposit & publish batch/i });
    fireEvent.click(submitBtn);

    // File 1 succeeded, File 2 failed
    await waitFor(() => {
      expect(screen.getByText(/temporary storage timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument();
    });

    // Reset call counter to check retry
    const initialCalls = uploadCallCount;

    // Click retry on the failed item
    const retryBtn = screen.getByRole('button', { name: /retry all failed uploads/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      // Both should now be successful
      expect(screen.getByText(/2 Folios Preserved Successfully/i)).toBeInTheDocument();
    });

    // Only flaky_file was re-uploaded (1 additional call, NOT 2)
    expect(uploadCallCount).toBe(initialCalls + 1);
  });
});
