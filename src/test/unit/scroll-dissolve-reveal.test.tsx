import { describe, it, expect, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScrollDissolveReveal } from '@/components/ui/scroll-dissolve-reveal';
import { DissolveMuseumOverlay } from '@/components/ui/dissolve-museum-overlay';
import { motionValue } from 'framer-motion';

beforeAll(() => {
  // Mock matchMedia for jsdom
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  // Mock ResizeObserver for jsdom
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('ScrollDissolveReveal Component', () => {
  it('renders gracefully in non-WebGL / JSDOM environments using accessible fallback image', () => {
    const { container } = render(
      <ScrollDissolveReveal
        imageFront="/images/clio/scattered-study-notes.webp"
        imageBack="/images/clio/clio-archive-preview.webp"
        containerClassName="test-container"
        className="test-sticky"
      />
    );

    // Outer scroll container should have the specified class
    expect(container.querySelector('.test-container')).toBeInTheDocument();

    // Fallback image should render with the front image source
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/clio/scattered-study-notes.webp');
    expect(img).toHaveAttribute(
      'alt',
      'Johann Hamza, The Library — a scholar reading in a book-lined study.'
    );
  });

  it('renders overlay children cleanly within the sticky viewport', () => {
    render(
      <ScrollDissolveReveal
        imageFront="/images/clio/scattered-study-notes.webp"
        imageBack="/images/clio/clio-archive-preview.webp"
      >
        <div data-testid="archival-overlay">
          <span>KNOWLEDGE, PRESERVED.</span>
        </div>
      </ScrollDissolveReveal>
    );

    const overlay = screen.getByTestId('archival-overlay');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText('KNOWLEDGE, PRESERVED.')).toBeInTheDocument();
  });

  it('renders authentic museum overlay narrative: THE STUDY and THE ARCHIVE', () => {
    const progress = motionValue(0);
    render(<DissolveMuseumOverlay scrollYProgress={progress} />);

    expect(screen.getByRole('heading', { name: 'THE STUDY' })).toBeInTheDocument();
    expect(screen.getByText('Every idea begins somewhere.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'THE ARCHIVE' })).toBeInTheDocument();
    expect(screen.getByText('Knowledge, preserved.')).toBeInTheDocument();
    expect(screen.getByText(/Johann Hamza/i)).toBeInTheDocument();
    expect(screen.getByText(/Edward Lamson Henry/i)).toBeInTheDocument();
  });

  it('renders default museum overlay when no children are provided', () => {
    render(
      <ScrollDissolveReveal
        imageFront="/images/clio/johann-hamza-the-library.jpg"
        imageBack="/images/clio/the-archive-lamson-henry.webp"
        showMuseumOverlay={true}
      />
    );

    expect(screen.getByRole('heading', { name: 'THE STUDY' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'THE ARCHIVE' })).toBeInTheDocument();
  });

  it('supports functional children in ScrollDissolveReveal without duplicate overlay', () => {
    render(
      <ScrollDissolveReveal
        imageFront="/images/clio/johann-hamza-the-library.jpg"
        imageBack="/images/clio/the-archive-lamson-henry.webp"
      >
        {({ scrollYProgress }) => (
          <DissolveMuseumOverlay scrollYProgress={scrollYProgress} />
        )}
      </ScrollDissolveReveal>
    );

    expect(screen.getByRole('heading', { name: 'THE STUDY' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'THE ARCHIVE' })).toBeInTheDocument();
  });
});
