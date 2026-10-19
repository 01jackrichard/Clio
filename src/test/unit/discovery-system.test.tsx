import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstitutionSelector } from '@/components/discovery/institution-selector';
import { BrowseModeSelector } from '@/components/discovery/browse-mode-selector';
import { DiscoveryFilterBar } from '@/components/discovery/discovery-filter-bar';
import { CollectionCard } from '@/components/discovery/collection-card';
import { SemesterBrowser } from '@/components/discovery/semester-browser';
import { CollectionRecord } from '@/types/database';
import { AcademicYearGroup } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    app: {
      collegeName: 'St. Joseph’s College of Engineering',
      collegeShortName: 'SJCE',
      collegeDomain: 'stjosephs.ac.in',
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'anon-test',
    },
  },
}));

// Mock GooeySearch in JSDOM environment
vi.mock('@/components/ui/gooey-search', () => ({
  GooeySearch: ({ placeholder, defaultValue }: { placeholder?: string; defaultValue?: string }) => (
    <div data-testid="gooey-search">
      <input placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })
  );
});

describe('Clio Academic Discovery System Components', () => {
  describe('InstitutionSelector Component', () => {
    it('renders "All Preserved Institutions" by default', () => {
      render(<InstitutionSelector currentInstitution="all" />);

      expect(screen.getByText('All Preserved Institutions')).toBeInTheDocument();
      expect(screen.getByText('Verified Curriculum')).toBeInTheDocument();
      expect(screen.getByText('Switch Institution')).toBeInTheDocument();
    });

    it('opens dropdown and allows selecting verified institution', () => {
      render(<InstitutionSelector currentInstitution="all" />);

      const switchBtn = screen.getByText('Switch Institution');
      fireEvent.click(switchBtn);

      expect(screen.getByPlaceholderText(/Search institutions/i)).toBeInTheDocument();
      expect(screen.getByText('Anna University (Affiliated Colleges)')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Anna University (Affiliated Colleges)'));
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('institution=anna-university'));
    });
  });

  describe('BrowseModeSelector Component', () => {
    it('renders 4 accessible browsing modes with real count badges', () => {
      render(
        <BrowseModeSelector
          currentMode="all"
          totalAll={42}
          totalFiles={38}
          totalCollections={4}
        />
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /All Materials/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Individual Files/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Collections/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /By Semester/i })).toBeInTheDocument();

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('38')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('switches discovery mode and updates URL', () => {
      render(<BrowseModeSelector currentMode="all" />);

      const semesterTab = screen.getByRole('tab', { name: /By Semester/i });
      fireEvent.click(semesterTab);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('mode=semester'));
    });
  });

  describe('DiscoveryFilterBar Component', () => {
    it('renders search input, facet selectors, and layout toggles', () => {
      render(<DiscoveryFilterBar currentMode="all" currentLayout="grid" />);

      expect(screen.getByPlaceholderText(/Search subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Department')).toBeInTheDocument();
      expect(screen.getByLabelText('Regulation')).toBeInTheDocument();
      expect(screen.getByLabelText('Academic Year')).toBeInTheDocument();
      expect(screen.getByLabelText('Semester')).toBeInTheDocument();
      expect(screen.getByLabelText('Material Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort Order')).toBeInTheDocument();
      expect(screen.getByLabelText('Grid View')).toBeInTheDocument();
      expect(screen.getByLabelText('List View')).toBeInTheDocument();
    });

    it('allows toggling between grid and list layout', () => {
      render(<DiscoveryFilterBar currentMode="all" currentLayout="grid" />);

      const listBtn = screen.getByLabelText('List View');
      fireEvent.click(listBtn);

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('layout=list'));
    });

    it('renders active filter chips when filters are applied in searchParams', () => {
      mockSearchParams = new URLSearchParams('q=Algorithms&department=Computer+Science+%26+Engineering');
      render(<DiscoveryFilterBar currentMode="all" currentLayout="grid" />);

      expect(screen.getByText('"Algorithms"')).toBeInTheDocument();
      expect(screen.getAllByText('Computer Science & Engineering').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });
  });

  describe('CollectionCard Component', () => {
    const mockCollection: CollectionRecord = {
      id: 'col-1',
      title: 'Full Semester 5 CSE Course Pack',
      slug: 'cse-sem-5-pack',
      description: 'Comprehensive bundle including Theory of Computation, OS, and Networks.',
      department: 'Computer Science & Engineering',
      regulation: '2021',
      academic_year: '3rd Year',
      semester: 'Semester 5',
      visibility: 'public',
      user_id: 'user-123',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
      document_count: 5,
      owner_name: 'Professor Rao',
    };

    it('renders collection title, document count, and owner attribution in grid mode', () => {
      render(<CollectionCard collection={mockCollection} layout="grid" index={1} />);

      expect(screen.getByText('Full Semester 5 CSE Course Pack')).toBeInTheDocument();
      expect(screen.getByText('5 Folios')).toBeInTheDocument();
      expect(screen.getAllByText(/Course Pack/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Curated by Professor Rao/i)).toBeInTheDocument();
      expect(screen.getByText('Semester 5')).toBeInTheDocument();
      expect(screen.getByText('(Reg. 2021)')).toBeInTheDocument();
    });

    it('renders in list mode with horizontal scanning layout', () => {
      render(<CollectionCard collection={mockCollection} layout="list" index={2} />);

      expect(screen.getByText('COL Nº 02')).toBeInTheDocument();
      expect(screen.getByText('Full Semester 5 CSE Course Pack')).toBeInTheDocument();
      expect(screen.getByText('Inspect Pack')).toBeInTheDocument();
    });
  });

  describe('SemesterBrowser Component', () => {
    const mockYears: AcademicYearGroup[] = [
      {
        year: '1st Year',
        title: '1st Year · Foundation & Core Sciences',
        totalResources: 1,
        semesters: [
          {
            semester: 'Semester 1',
            semesterNumber: 1,
            totalResources: 1,
            subjects: [
              {
                code: '21MA101',
                name: 'Matrices and Calculus',
                department: 'Applied Sciences & Humanities',
                semester: 'Semester 1',
                regulation: '2021',
                totalResources: 1,
                documents: [
                  {
                    id: 'doc-m1',
                    title: 'Calculus Handout Unit 1',
                    material_type: 'unit_notes',
                    subject: 'Matrices and Calculus',
                    department: 'Applied Sciences & Humanities',
                    academic_year: '1st Year',
                    semester: 'Semester 1',
                    download_count: 15,
                    tags: ['calculus'],
                    uploader_id: 'u-1',
                    status: 'approved',
                    created_at: '2026-09-01T00:00:00Z',
                    updated_at: '2026-09-01T00:00:00Z',
                    original_filename: 'calc1.pdf',
                    mime_type: 'application/pdf',
                  },
                ],
                collections: [],
              },
            ],
          },
          {
            semester: 'Semester 2',
            semesterNumber: 2,
            totalResources: 0,
            subjects: [],
          },
        ],
      },
      {
        year: '2nd Year',
        title: '2nd Year · Professional Engineering Discipline',
        totalResources: 0,
        semesters: [
          {
            semester: 'Semester 3',
            semesterNumber: 3,
            totalResources: 0,
            subjects: [],
          },
          {
            semester: 'Semester 4',
            semesterNumber: 4,
            totalResources: 0,
            subjects: [],
          },
        ],
      },
    ];

    it('renders academic years and semesters with subject cards and empty states', () => {
      render(<SemesterBrowser years={mockYears} institutionName="St. Joseph's College" />);

      expect(screen.getByText(/Semester-by-Semester Curriculum Tree/i)).toBeInTheDocument();
      expect(screen.getByText('1st Year · Foundation & Core Sciences')).toBeInTheDocument();
      expect(screen.getByText('2nd Year · Professional Engineering Discipline')).toBeInTheDocument();

      // Subject item in Semester 1
      expect(screen.getByText('21MA101')).toBeInTheDocument();
      expect(screen.getByText('Matrices and Calculus')).toBeInTheDocument();
      expect(screen.getByText('Calculus Handout Unit 1')).toBeInTheDocument();

      // Semester 2 empty state can be expanded
      const sem2Trigger = screen.getByText('Semester 2');
      fireEvent.click(sem2Trigger);
      expect(screen.getByText(/No folios currently indexed for Semester 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Contribute for Semester 2/i)).toBeInTheDocument();
    });
  });
});
