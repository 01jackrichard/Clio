import { describe, it, expect, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CatalogueWelcome } from '@/components/catalogue-welcome';
import { WaveGridBackground } from '@/components/ui/wave-grid-background';
import { resolveDisplayName, formatWelcomeGreeting } from '@/lib/utils';

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

describe('resolveDisplayName & formatWelcomeGreeting', () => {
  it('correctly resolves genuine user names', () => {
    expect(resolveDisplayName('Jack')).toBe('Jack');
    expect(resolveDisplayName('Dr. Eleanor Vance')).toBe('Dr. Eleanor Vance');
    expect(resolveDisplayName('jack')).toBe('Jack');
  });

  it('filters out generic placeholders and checks OAuth metadata', () => {
    // If profile is "User", but OAuth metadata has full_name "Jack Robinson"
    expect(
      resolveDisplayName('User', { full_name: 'Jack Robinson' }, 'user@example.com')
    ).toBe('Jack Robinson');

    // If profile is "User" and no valid metadata, falls back to email prefix if not placeholder
    expect(
      resolveDisplayName('user', null, 'jack.r@university.edu')
    ).toBe('Jack');

    // If all inputs are literal placeholders
    expect(resolveDisplayName('User', null, 'user@example.com')).toBeNull();
    expect(resolveDisplayName('Student', null, 'student@example.com')).toBeNull();
    expect(resolveDisplayName('Scholar', null, null)).toBeNull();
  });

  it('formats greetings properly according to presence of name', () => {
    expect(formatWelcomeGreeting('Jack')).toBe('Welcome, Jack.');
    expect(formatWelcomeGreeting('Sarah Connor')).toBe('Welcome, Sarah Connor.');
    expect(formatWelcomeGreeting(null)).toBe('Welcome.');
    expect(formatWelcomeGreeting('   ')).toBe('Welcome.');
    expect(formatWelcomeGreeting('User')).toBe('Welcome.');
  });
});

describe('CatalogueWelcome Component', () => {
  it('renders personalized greeting "Welcome back, {displayName}." when displayName is provided', () => {
    render(<CatalogueWelcome displayName="Jack" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Jack.');
  });

  it('falls back to institutional greeting when not authenticated', () => {
    const { rerender } = render(<CatalogueWelcome />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Preserved Scholarship · Academic Archive'
    );

    rerender(<CatalogueWelcome displayName="   " />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Preserved Scholarship · Academic Archive'
    );

    rerender(<CatalogueWelcome displayName="User" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Preserved Scholarship · Academic Archive'
    );
  });

  it('renders MorphText rotating verbs and supporting editorial sentence', () => {
    render(<CatalogueWelcome displayName="Jack" />);
    expect(screen.getByText('DISCOVER')).toBeInTheDocument();
    expect(
      screen.getByText('Find useful academic resources, save what matters, and share what you learn.')
    ).toBeInTheDocument();
  });

  it('renders only 2 personal metrics for standard users without leaking admin metrics', () => {
    render(
      <CatalogueWelcome
        initialStats={{
          isAuthenticated: true,
          role: 'user',
          displayName: 'Jack',
          metrics: { myContributions: 3, savedFolios: 7 },
        }}
      />
    );
    expect(screen.getByText(/01 — My Contributions/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/02 — Saved Folios/i)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.queryByText(/03 — Archive Resources/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/04 — Contributors/i)).not.toBeInTheDocument();
  });

  it('renders 4 complete metrics for administrators', () => {
    render(
      <CatalogueWelcome
        initialStats={{
          isAuthenticated: true,
          role: 'admin',
          displayName: 'Administrator',
          metrics: {
            myContributions: 12,
            savedFolios: 25,
            archiveResources: 140,
            contributors: 42,
          },
        }}
      />
    );
    expect(screen.getByText(/01 — My Contributions/i)).toBeInTheDocument();
    expect(screen.getByText(/02 — Saved Folios/i)).toBeInTheDocument();
    expect(screen.getByText(/03 — Archive Resources/i)).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText(/04 — Contributors/i)).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});

describe('WaveGridBackground Component', () => {
  it('renders fallback container gracefully when WebGL is unavailable in JSDOM', () => {
    render(
      <WaveGridBackground colorBase="#F2EFE9" colorHigh="#7A1F1D">
        <div data-testid="child-content">Child Content</div>
      </WaveGridBackground>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
