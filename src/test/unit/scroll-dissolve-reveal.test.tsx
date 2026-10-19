import { describe, it, expect, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScrollDissolveReveal } from '@/components/ui/scroll-dissolve-reveal';

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
    expect(img).toHaveAttribute('alt', 'Physical academic manuscript notes');
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
});
