import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SolarSystem, DEFAULT_CLIO_ORBITS } from '@/components/ui/solar-system';

describe('SolarSystem Component — Clio Academic Ecosystem', () => {
  it('renders eyebrow, title, and description when provided', () => {
    render(
      <SolarSystem
        eyebrow="THE CLIO ECOSYSTEM"
        title="An archive of connected knowledge."
        description="Discover how academic resources, subjects, collections, and student contributions come together in one searchable archive."
      />
    );

    expect(screen.getByText('THE CLIO ECOSYSTEM')).toBeInTheDocument();
    expect(screen.getByText('An archive of connected knowledge.')).toBeInTheDocument();
    expect(
      screen.getByText(/Discover how academic resources, subjects, collections/i)
    ).toBeInTheDocument();
  });

  it('renders central Clio brand emblem core', () => {
    render(<SolarSystem />);

    const core = screen.getByLabelText('Clio Academic Archive');
    expect(core).toBeInTheDocument();
  });

  it('renders all default academic nodes across the 3 orbit rings', () => {
    render(<SolarSystem />);

    // Ring 1: Curriculum Scheme
    expect(screen.getAllByText('Verified Institutions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Semester Browser').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Course Codes & Syllabi').length).toBeGreaterThanOrEqual(1);

    // Ring 2: Academic Resources
    expect(screen.getAllByText('Academic Collections').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Individual Study Folios').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Previous-Year Exam Archive').length).toBeGreaterThanOrEqual(1);

    // Ring 3: Community & Discovery
    expect(screen.getAllByText('Instant Catalogue Search').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Student Contributions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Saved Folios & Bookshelf').length).toBeGreaterThanOrEqual(1);
  });

  it('displays accurate detail card with real route link when an academic node is selected', () => {
    render(<SolarSystem />);

    // Select Academic Collections
    const collectionsButtons = screen.getAllByRole('button', {
      name: /Academic Collections/i,
    });
    fireEvent.click(collectionsButtons[0]);

    expect(screen.getByText('Curated Course Packs')).toBeInTheDocument();
    expect(
      screen.getByText(/Bundled multi-document folios combining complete unit notes/i)
    ).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /View Collections/i });
    expect(link).toHaveAttribute('href', '/documents?mode=collections');
  });

  it('allows selecting nodes via the Orbit Index pills', () => {
    render(<SolarSystem />);

    const contributionsPill = screen.getByRole('button', {
      name: 'Student Contributions',
    });
    fireEvent.click(contributionsPill);

    expect(screen.getByText('Peer Moderated')).toBeInTheDocument();
    expect(
      screen.getByText(/Student-deposited academic materials validated against the Fair Use declaration/i)
    ).toBeInTheDocument();

    const uploadLink = screen.getByRole('link', { name: /Contribute Material/i });
    expect(uploadLink).toHaveAttribute('href', '/upload');
  });

  it('toggles pause and resume on orbit rotation', () => {
    render(<SolarSystem />);

    const pauseButton = screen.getByRole('button', { name: /Pause Orbit/i });
    expect(pauseButton).toBeInTheDocument();

    fireEvent.click(pauseButton);
    expect(screen.getByRole('button', { name: /Resume Orbit/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Resume Orbit/i }));
    expect(screen.getByRole('button', { name: /Pause Orbit/i })).toBeInTheDocument();
  });

  it('supports custom orbits and fires onSelectNode callback', () => {
    const handleSelect = vi.fn();
    render(
      <SolarSystem
        orbits={DEFAULT_CLIO_ORBITS}
        onSelectNode={handleSelect}
      />
    );

    const semesterButtons = screen.getAllByRole('button', {
      name: /Semester Browser/i,
    });
    fireEvent.click(semesterButtons[0]);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'semesters',
        label: 'Semester Browser',
      })
    );
  });
});
