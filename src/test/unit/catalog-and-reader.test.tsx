import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentCard } from '@/components/document-card';
import { PdfViewer } from '@/components/pdf-viewer';
import { DocumentActions } from '@/app/documents/[id]/document-actions';
import { ReportModal } from '@/components/report-modal';
import { DocumentRecord } from '@/types/database';

const mockDoc: DocumentRecord = {
  id: 'doc-123',
  title: 'Advanced Thermodynamics & Entropy Notes',
  subject: 'Applied Thermodynamics',
  unit: 'Unit 3',
  semester: 'Semester 5',
  academic_year: '3rd Year',
  material_type: 'unit_notes',
  department: 'Mechanical Engineering',
  description: 'Detailed lecture notes covering Carnot cycles and Maxwell relations.',
  tags: ['thermodynamics', 'entropy', 'cycles'],
  file_size: 2048576,
  download_count: 42,
  drive_file_id: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
  original_filename: 'thermo-lecture-03.pdf',
  mime_type: 'application/pdf',
  uploader_name: 'Arthur Pendelton',
  uploader_id: 'user-001',
  status: 'approved',
  created_at: '2026-09-15T10:00:00Z',
  updated_at: '2026-09-15T10:00:00Z',
  approved_at: '2026-09-15T12:00:00Z',
  reviewer_id: 'admin-001',
};

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('Phase 3 — Academic Library & Document Reader Components', () => {
  describe('DocumentCard Component', () => {
    it('renders document hierarchy: title, index, subject, unit, and attribution', () => {
      render(<DocumentCard document={mockDoc} index={3} />);

      expect(screen.getByText('Nº 03')).toBeInTheDocument();
      expect(screen.getByText('Advanced Thermodynamics & Entropy Notes')).toBeInTheDocument();
      expect(screen.getByText(/Applied Thermodynamics/i)).toBeInTheDocument();
      expect(screen.getByText(/Mechanical Engineering/i)).toBeInTheDocument();
      expect(screen.getByText('(Unit 3)')).toBeInTheDocument();
      expect(screen.getByText('Semester 5')).toBeInTheDocument();
      expect(screen.getByText('#thermodynamics')).toBeInTheDocument();
      expect(screen.getByText(/by Arthur Pendelton/i)).toBeInTheDocument();
      expect(screen.getByText(/42 dl/i)).toBeInTheDocument();
    });

    it('toggles favorite bookmark when clicked', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isFavorited: true }),
      });

      render(<DocumentCard document={mockDoc} initiallyFavorited={false} />);

      const bookmarkBtn = screen.getByLabelText(/bookmark resource/i);
      fireEvent.click(bookmarkBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123/favorite', {
          method: 'POST',
        });
      });
    });
  });

  describe('PdfViewer Component', () => {
    it('renders iframe with authenticated Clio streaming URL and toolbar', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      render(
        <PdfViewer
          documentId="doc-123"
          documentTitle="Advanced Thermodynamics & Entropy Notes"
          driveFileId="1AbCdEfGhIjKlMnOpQrStUvWxYz"
        />
      );

      expect(screen.getByText('Advanced Thermodynamics & Entropy Notes')).toBeInTheDocument();
      expect(screen.getByText('Document Reader')).toBeInTheDocument();

      const iframe = await screen.findByTitle(/Academic Document Reader/i);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        'src',
        '/api/documents/doc-123/raw#toolbar=1&navpanes=1'
      );
    });

    it('toggles fullscreen state when fullscreen button is clicked', () => {
      render(
        <PdfViewer
          documentId="doc-123"
          documentTitle="Advanced Thermodynamics"
          driveFileId="1AbCdEfGhIjKlMnOpQrStUvWxYz"
        />
      );

      const fullscreenBtn = screen.getByLabelText(/fullscreen/i);
      fireEvent.click(fullscreenBtn);

      expect(screen.getByLabelText(/exit fullscreen/i)).toBeInTheDocument();
    });
  });

  describe('DocumentActions Component', () => {
    it('renders download button with count and handles click', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      (global.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isFavorited: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ downloadUrl: '/api/documents/doc-123/raw?download=true' }),
        });

      render(
        <DocumentActions
          documentId="doc-123"
          documentTitle="Advanced Thermodynamics"
          originalFilename="thermo.pdf"
          fileSize={2048576}
          downloadCount={42}
        />
      );

      const downloadBtn = screen.getByRole('button', { name: /download pdf/i });
      expect(downloadBtn).toHaveTextContent('42');

      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123/download');
        expect(windowOpenSpy).toHaveBeenCalledWith(
          '/api/documents/doc-123/raw?download=true',
          '_blank',
          'noopener,noreferrer'
        );
      });

      windowOpenSpy.mockRestore();
    });
  });

  describe('ReportModal Component', () => {
    it('submits compliance report with selected reason and details', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const handleClose = vi.fn();
      render(
        <ReportModal
          documentId="doc-123"
          documentTitle="Advanced Thermodynamics"
          isOpen={true}
          onClose={handleClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/report academic folio/i)).toBeInTheDocument();

      const textarea = screen.getByLabelText(/additional context/i);
      fireEvent.change(textarea, { target: { value: 'Contains copyright protected textbook scan' } });

      fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/documents/doc-123/report',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Contains copyright protected textbook scan'),
          })
        );
      });
    });
  });
});
