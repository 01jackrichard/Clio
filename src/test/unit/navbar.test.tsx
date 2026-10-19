import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navbar } from '@/components/navbar';

let currentPathname = '/documents';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/config', () => ({
  config: {
    app: {
      name: 'Clio',
      tagline: 'Knowledge, preserved.',
      description: 'Academic library',
    },
    supabase: {
      url: 'https://placeholder.supabase.co',
      publishableKey: 'placeholder-publishable-key',
    },
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe('Navbar Component Typography & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Catalogue, My Submissions, and Saved Folios with 14.5px Inter Tight typography', () => {
    currentPathname = '/documents';
    render(<Navbar />);

    const catalogueLinks = screen.getAllByRole('link', { name: /catalogue/i });
    const desktopCatalogue = catalogueLinks.find((el) =>
      el.className.includes('text-[14.5px]')
    );
    expect(desktopCatalogue).toBeDefined();
    expect(desktopCatalogue).toHaveClass('font-sans');
    expect(desktopCatalogue).toHaveClass('text-[14.5px]');
    expect(desktopCatalogue).toHaveClass('leading-5');
    expect(desktopCatalogue).toHaveClass('font-semibold'); // active on /documents

    const mySubmissionsLinks = screen.getAllByRole('link', { name: /my submissions/i });
    const desktopSubmissions = mySubmissionsLinks.find((el) =>
      el.className.includes('text-[14.5px]')
    );
    expect(desktopSubmissions).toBeDefined();
    expect(desktopSubmissions).toHaveClass('font-sans');
    expect(desktopSubmissions).toHaveClass('text-[14.5px]');
    expect(desktopSubmissions).toHaveClass('font-medium'); // inactive

    const savedFoliosLinks = screen.getAllByRole('link', { name: /saved folios/i });
    const desktopFavorites = savedFoliosLinks.find((el) =>
      el.className.includes('text-[14.5px]')
    );
    expect(desktopFavorites).toBeDefined();
    expect(desktopFavorites).toHaveClass('font-sans');
    expect(desktopFavorites).toHaveClass('text-[14.5px]');
    expect(desktopFavorites).toHaveClass('font-medium'); // inactive
  });

  it('highlights My Submissions when active on /my-submissions', () => {
    currentPathname = '/my-submissions';
    render(<Navbar />);

    const mySubmissionsLinks = screen.getAllByRole('link', { name: /my submissions/i });
    const desktopSubmissions = mySubmissionsLinks.find((el) =>
      el.className.includes('text-[14.5px]')
    );
    expect(desktopSubmissions).toBeDefined();
    expect(desktopSubmissions).toHaveClass('text-ink');
    expect(desktopSubmissions).toHaveClass('font-semibold');
  });

  it('highlights Saved Folios when active on /favorites', () => {
    currentPathname = '/favorites';
    render(<Navbar />);

    const savedFoliosLinks = screen.getAllByRole('link', { name: /saved folios/i });
    const desktopFavorites = savedFoliosLinks.find((el) =>
      el.className.includes('text-[14.5px]')
    );
    expect(desktopFavorites).toBeDefined();
    expect(desktopFavorites).toHaveClass('text-ink');
    expect(desktopFavorites).toHaveClass('font-semibold');
  });

  it('preserves the active-page burgundy underline indicator', () => {
    currentPathname = '/documents';
    const { container } = render(<Navbar />);

    const activeUnderline = container.querySelector('span.bg-oxblood.w-full.opacity-100');
    expect(activeUnderline).toBeInTheDocument();
  });

  it('returns null on the landing page (/) to protect LiquidSculptureHero', () => {
    currentPathname = '/';
    const { container } = render(<Navbar />);
    expect(container.firstChild).toBeNull();
  });
});
