import { describe, it, expect, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';

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

  // Mock IntersectionObserver for jsdom
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

describe('SculptureHero Component', () => {
  it('renders with Clio branding and configured navigation links', () => {
    render(
      <SculptureHero
        brand="Clio"
        showNav={true}
        theme="light"
        themeToggle={false}
        eyebrow="THE ACADEMIC ARCHIVE · KNOWLEDGE, PRESERVED"
        headline={'Your semester,\nwithin reach.'}
        headlineAccent="within reach."
        body="A shared academic resource library where students discover, upload, organize, preview, and download notes, previous-year question papers, and lab manuals."
        primaryCta={{
          label: 'Browse the library',
          href: '/documents',
        }}
        secondaryCta={{
          label: 'Contribute notes',
          href: '/upload',
        }}
        navLinks={[
          { label: 'Library', href: '/documents' },
          { label: 'Upload PDF', href: '/upload' },
          { label: 'Sign in', href: '/auth/login' },
        ]}
        navCta={{
          label: 'Register',
          href: '/auth/register',
        }}
        backdropText="CLIO"
        showCredit={true}
      />
    );

    // Verify brand
    expect(screen.getByText('Clio')).toBeInTheDocument();

    // Verify navigation links
    expect(screen.getByText('Library')).toHaveAttribute('href', '/documents');
    expect(screen.getByText('Upload PDF')).toHaveAttribute('href', '/upload');
    expect(screen.getByText('Sign in')).toHaveAttribute('href', '/auth/login');
    expect(screen.getByText('Register')).toHaveAttribute('href', '/auth/register');

    // Verify eyebrow and headline
    expect(screen.getByText('THE ACADEMIC ARCHIVE · KNOWLEDGE, PRESERVED')).toBeInTheDocument();
    expect(screen.getByText('within reach.')).toBeInTheDocument();

    // Verify CTAs
    expect(screen.getByText('Browse the library')).toHaveAttribute('href', '/documents');
    expect(screen.getByText('Contribute notes')).toHaveAttribute('href', '/upload');

    // Verify original author credit is preserved
    const credit = screen.getByText('by guglielmogiannattasio.it');
    expect(credit).toBeInTheDocument();
    expect(credit).toHaveAttribute('href', 'https://guglielmogiannattasio.it');

    // Verify backdrop text
    expect(screen.getByText('CLIO')).toBeInTheDocument();
  });
});
