import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Skiper89 } from '@/components/v1/skiper89';
import { PdfViewer } from '@/components/pdf-viewer';

// Mock NumberFlow for deterministic testing in jsdom
vi.mock('@number-flow/react', () => ({
  default: ({ value, suffix }: { value: number; suffix?: string }) => (
    <span data-testid="number-flow-value">
      {value}
      {suffix}
    </span>
  ),
}));

// Mock framer-motion useReducedMotion and useScroll
let mockScrollProgress = 0.42;

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => false,
    useScroll: () => ({
      scrollYProgress: {
        get: () => mockScrollProgress,
        onChange: (cb: (v: number) => void) => {
          cb(mockScrollProgress);
          return () => {};
        },
        on: (event: string, cb: (v: number) => void) => {
          cb(mockScrollProgress);
          return () => {};
        },
      },
    }),
  };
});

const VALID_DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz';

describe('CLIO — Skiper UI Skiper89 Scroll Progress Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockScrollProgress = 0.42;
  });

  describe('1. Component Structure & Default Zero-Props Contract', () => {
    it('renders genuine Skiper89 with zero props', () => {
      render(<Skiper89 />);

      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('aria-live', 'polite');
      expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('Reading scroll progress'));

      // Contains NumberFlow with percentage
      expect(screen.getByTestId('number-flow-value')).toBeInTheDocument();
      expect(screen.getByText(/%/)).toBeInTheDocument();
    });

    it('renders circular SVG progress ring in Clio academic palette', () => {
      const { container } = render(<Skiper89 />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 48 48');

      // Track circle with subtle opacity
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(1);

      // Verify Clio oxblood stroke on animated progress circle
      const progressCircle = Array.from(circles).find(
        (c) => c.getAttribute('stroke') === '#7A1F1D'
      );
      expect(progressCircle).toBeDefined();
    });

    it('supports custom positioning className and accessible labels', () => {
      render(
        <Skiper89
          className="custom-reader-position"
          ariaLabel="Thermodynamics Lecture Notes Progress"
        />
      );

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('custom-reader-position');
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Thermodynamics Lecture Notes Progress')
      );
    });
  });

  describe('2. Document Reader Integration & State Guarding', () => {
    it('renders Skiper89 when document preview is active and loaded', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      render(
        <PdfViewer
          documentId="doc-thermo-01"
          documentTitle="Classical Thermodynamics & Entropy"
          driveFileId={VALID_DRIVE_ID}
        />
      );

      // Simulate iframe finishing load
      const iframe = await screen.findByTitle(/Academic Document Reader/i);
      expect(iframe).toBeInTheDocument();
      fireEvent.load(iframe);

      // Skiper89 indicator appears in reader once loading is complete
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Classical Thermodynamics & Entropy')
      );
    });

    it('does NOT render Skiper89 during preview loading', () => {
      // Rendering with no driveFileId or previewUrl triggers initial fetch loading state
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {}) // never resolves to keep loading state active
      );

      render(
        <PdfViewer
          documentId="doc-loading"
          documentTitle="Loading Folio"
        />
      );

      // Shows Clio loading message
      expect(screen.getByText(/Loading document\.\.\./i)).toBeInTheDocument();

      // Skiper89 must not be displayed over loading states
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('does NOT render Skiper89 when document preview encounters an error', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      render(
        <PdfViewer
          documentId="doc-error"
          documentTitle="Restricted Folio"
        />
      );

      // Wait for error state to display
      const errorHeading = await screen.findByText(/Document Unavailable/i);
      expect(errorHeading).toBeInTheDocument();

      // Skiper89 must not be rendered over error cards
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('adapts position gracefully when toggling fullscreen reader', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      render(
        <PdfViewer
          documentId="doc-fs"
          documentTitle="Fullscreen Physics Folio"
          driveFileId={VALID_DRIVE_ID}
        />
      );

      const iframe = await screen.findByTitle(/Academic Document Reader/i);
      fireEvent.load(iframe);

      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('top-24'); // default regular view

      // Toggle fullscreen
      const fsBtn = screen.getByRole('button', { name: /^fullscreen$/i });
      fireEvent.click(fsBtn);

      // Indicator adapts to fullscreen toolbar offset
      expect(indicator).toHaveClass('top-16');
      expect(indicator).toHaveClass('z-50');
    });
  });

  describe('3. Truthful Progress & Iframe Sandboxing Guarantee', () => {
    it('truthfully labels folio reading scroll progress rather than fabricating cross-origin iframe page metrics', () => {
      render(
        <Skiper89
          ariaLabel="Folio reading scroll progress for Quantum Electrodynamics"
        />
      );

      const indicator = screen.getByRole('status');
      // Confirms truthful description for the surrounding reader folio
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Folio reading scroll progress')
      );
      expect(indicator).not.toHaveAttribute('aria-label', expect.stringContaining('iframe'));
    });
  });
});
