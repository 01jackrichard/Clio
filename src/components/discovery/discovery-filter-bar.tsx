'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  SEMESTERS,
  MATERIAL_TYPES,
  REGULATIONS,
} from '@/lib/constants';
import { GooeySearch } from '@/components/ui/gooey-search';
import type { SearchResultItem } from '@/app/api/documents/search/route';

interface DiscoveryFilterBarProps {
  currentMode?: 'all' | 'files' | 'collections' | 'semester';
  currentLayout?: 'grid' | 'list';
}

export function DiscoveryFilterBar({
  currentMode = 'all',
  currentLayout = 'grid',
}: DiscoveryFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Read current query values
  const q = searchParams.get('q') || '';
  const department = searchParams.get('department') || '';
  const regulation = searchParams.get('regulation') || '';
  const academicYear = searchParams.get('academic_year') || '';
  const semester = searchParams.get('semester') || '';
  const materialType = searchParams.get('material_type') || '';
  const sort = searchParams.get('sort') || 'newest';
  const layout = (searchParams.get('layout') as 'grid' | 'list') || currentLayout;

  const searchResultMapRef = React.useRef<Map<string, SearchResultItem>>(new Map());

  const applyChanges = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all' || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    params.delete('page'); // Reset to page 1
    router.push(`/documents?${params.toString()}`);
  };

  const handleGooeySearch = async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];
    try {
      const inst = searchParams.get('institution') || '';
      const url = `/api/documents/search?q=${encodeURIComponent(query.trim())}${
        inst && inst !== 'all' ? `&institution=${encodeURIComponent(inst)}` : ''
      }`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json: { results: SearchResultItem[] } = await res.json();
      const map = new Map<string, SearchResultItem>();
      json.results.forEach((item) => {
        map.set(item.label, item);
      });
      searchResultMapRef.current = map;
      return json.results.map((item) => item.label);
    } catch (err) {
      console.warn('Gooey search fetch error:', err);
      return [];
    }
  };

  const handleGooeySelect = (selectedLabel: string) => {
    const record = searchResultMapRef.current.get(selectedLabel);
    if (record) {
      switch (record.type) {
        case 'document':
          if (record.url) {
            router.push(record.url);
            return;
          }
          break;
        case 'collection':
          if (record.url) {
            router.push(record.url);
            return;
          }
          break;
        case 'institution':
          if (record.institution) {
            applyChanges({ institution: record.institution });
            return;
          }
          break;
        case 'department':
          if (record.department) {
            applyChanges({ department: record.department });
            return;
          }
          break;
        case 'subject_code':
          if (record.term) {
            applyChanges({ q: record.term });
            return;
          }
          break;
      }
    }

    applyChanges({ q: selectedLabel });
  };

  const handleClearSearch = () => {
    applyChanges({ q: null });
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    // Preserve mode and layout if set
    const mode = searchParams.get('mode');
    const inst = searchParams.get('institution');
    if (mode) params.set('mode', mode);
    if (inst) params.set('institution', inst);
    if (layout !== 'grid') params.set('layout', layout);

    router.push(`/documents${params.toString() ? `?${params.toString()}` : ''}`);
    setMobileDrawerOpen(false);
  };

  const toggleLayout = (newLayout: 'grid' | 'list') => {
    applyChanges({ layout: newLayout === 'grid' ? null : newLayout });
  };

  // Compile active filter chips
  const activeChips: { key: string; label: string }[] = [
    q ? { key: 'q', label: `"${q}"` } : null,
    department ? { key: 'department', label: department } : null,
    regulation ? { key: 'regulation', label: `Reg. ${regulation}` } : null,
    academicYear ? { key: 'academic_year', label: academicYear } : null,
    semester ? { key: 'semester', label: semester } : null,
    materialType
      ? {
          key: 'material_type',
          label: MATERIAL_TYPES.find((m) => m.value === materialType)?.label || materialType,
        }
      : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const activeFilterCount = activeChips.length;

  return (
    <div className="space-y-3">
      {/* 1. Main Search & Action Bar */}
      <div className="bg-card border border-ink/15 p-2 sm:p-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Gooey Search Component */}
          <div className="flex-1 flex items-center justify-start min-h-[42px] relative z-30">
            <GooeySearch
              key={q}
              placeholder="Search subject, course code (e.g. 22CS394), or folio..."
              buttonLabel={q ? `Search: "${q}"` : 'Search Folios'}
              defaultValue={q}
              onSearch={handleGooeySearch}
              onSelect={handleGooeySelect}
              debounceMs={400}
              maxResults={6}
              className="w-full sm:w-auto"
            />
            {q && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="ml-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border border-ink/20 hover:border-ink text-xs meta-mono text-ash hover:text-ink transition-colors cursor-pointer"
                title="Clear search term"
              >
                <X className="w-3.5 h-3.5 text-oxblood" />
                <span className="hidden sm:inline">Clear &ldquo;{q}&rdquo;</span>
              </button>
            )}
          </div>

          {/* Controls: Mobile Filter Toggle + Layout Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className={`lg:hidden inline-flex items-center gap-1.5 h-10 px-3 bg-paper border border-ink/20 text-xs meta-mono font-medium transition-colors cursor-pointer ${
                activeFilterCount > 0 ? 'text-oxblood border-oxblood/40' : 'text-ink'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-oxblood text-paper text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Layout Toggle (Grid vs List) - Hidden in Semester Mode */}
            {currentMode !== 'semester' && (
              <div className="flex items-center border border-ink/20 bg-paper p-0.5">
                <button
                  type="button"
                  onClick={() => toggleLayout('grid')}
                  className={`p-1.5 text-xs transition-colors cursor-pointer ${
                    layout === 'grid'
                      ? 'bg-ink text-paper font-semibold'
                      : 'text-ash hover:text-ink'
                  }`}
                  title="Grid View (Balanced Cards)"
                  aria-label="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLayout('list')}
                  className={`p-1.5 text-xs transition-colors cursor-pointer ${
                    layout === 'list'
                      ? 'bg-ink text-paper font-semibold'
                      : 'text-ash hover:text-ink'
                  }`}
                  title="List View (Wide Editorial Rows)"
                  aria-label="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Desktop Horizontal Facet Bar (Hidden on Mobile unless toggled) */}
        <div
          className={`pt-2.5 mt-2 border-t border-ink/10 ${
            mobileDrawerOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Department */}
            <div>
              <label htmlFor="filter-department" className="sr-only">
                Department
              </label>
              <select
                id="filter-department"
                value={department}
                onChange={(e) => applyChanges({ department: e.target.value })}
                className="w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Regulation */}
            <div>
              <label htmlFor="filter-regulation" className="sr-only">
                Regulation
              </label>
              <select
                id="filter-regulation"
                value={regulation}
                onChange={(e) => applyChanges({ regulation: e.target.value })}
                className="w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer"
              >
                <option value="">All Regulations</option>
                {REGULATIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    Regulation {reg}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label htmlFor="filter-year" className="sr-only">
                Academic Year
              </label>
              <select
                id="filter-year"
                value={academicYear}
                onChange={(e) => applyChanges({ academic_year: e.target.value })}
                className="w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer"
              >
                <option value="">All Years</option>
                {ACADEMIC_YEARS.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester */}
            <div>
              <label htmlFor="filter-semester" className="sr-only">
                Semester
              </label>
              <select
                id="filter-semester"
                value={semester}
                onChange={(e) => applyChanges({ semester: e.target.value })}
                className="w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer"
              >
                <option value="">All Semesters</option>
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type (Only applicable to files / all) */}
            <div>
              <label htmlFor="filter-material" className="sr-only">
                Material Type
              </label>
              <select
                id="filter-material"
                value={materialType}
                onChange={(e) => applyChanges({ material_type: e.target.value })}
                disabled={currentMode === 'collections'}
                className={`w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer ${
                  currentMode === 'collections' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">All Material Types</option>
                {MATERIAL_TYPES.map((mat) => (
                  <option key={mat.value} value={mat.value}>
                    {mat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ordering / Sort */}
            <div>
              <label htmlFor="filter-sort" className="sr-only">
                Sort Order
              </label>
              <select
                id="filter-sort"
                value={sort}
                onChange={(e) => applyChanges({ sort: e.target.value })}
                className="w-full h-8 px-2 bg-paper border border-ink/15 text-xs text-ink focus:outline-hidden focus:border-ink transition-colors cursor-pointer"
              >
                <option value="newest">Sort: Newest Added</option>
                <option value="downloads">Sort: Most Downloaded</option>
                <option value="title">Sort: Title (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Active Filters Strip */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-card border border-ink/10 text-xs">
          <span className="meta-mono text-ash text-[11px] mr-1 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-oxblood" />
            <span>Active filters:</span>
          </span>

          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                applyChanges({ [chip.key]: null });
              }}
              className="group inline-flex items-center gap-1 px-2 py-0.5 bg-paper border border-ink/15 meta-mono text-[11px] text-ink hover:border-oxblood hover:text-oxblood transition-colors cursor-pointer"
              title={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <X className="w-3 h-3 text-ash group-hover:text-oxblood transition-colors" />
            </button>
          ))}

          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 meta-mono text-[11px] text-oxblood hover:underline ml-auto pl-2 cursor-pointer font-medium"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Clear All</span>
          </button>
        </div>
      )}
    </div>
  );
}
