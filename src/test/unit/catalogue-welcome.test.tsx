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
  it('renders minimal personalized greeting when displayName is provided', () => {
    render(<CatalogueWelcome displayName="Jack" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome, Jack.');
  });

  it('falls back gracefully to "Welcome." when displayName is empty, omitted, or a placeholder', () => {
    const { rerender } = render(<CatalogueWelcome />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome.');

    rerender(<CatalogueWelcome displayName="   " />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome.');

    rerender(<CatalogueWelcome displayName="User" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome.');
  });

  it('contains ONLY the greeting and NO competing cards, labels, descriptions, or buttons', () => {
    render(<CatalogueWelcome displayName="Jack" />);

    // Must NOT contain badges or secondary labels
    expect(screen.queryByText(/Academic Portal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Institutional Repository/i)).not.toBeInTheDocument();

    // Must NOT contain supporting description
    expect(
      screen.queryByText(/Discover, organize, and preserve academic knowledge/i)
    ).not.toBeInTheDocument();

    // Must NOT contain buttons or links
    expect(screen.queryByRole('link', { name: /Contribute a Folio/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Browse Archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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
