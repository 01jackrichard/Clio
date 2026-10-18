'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter } from 'lucide-react';
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  SEMESTERS,
  MATERIAL_TYPES,
  UNITS,
  REGULATIONS,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

export function DocumentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  const [regulation, setRegulation] = useState(searchParams.get('regulation') || '');
  const [academicYear, setAcademicYear] = useState(searchParams.get('academic_year') || '');
  const [semester, setSemester] = useState(searchParams.get('semester') || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [unit, setUnit] = useState(searchParams.get('unit') || '');
  const [materialType, setMaterialType] = useState(searchParams.get('material_type') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const applyFilters = (overrides?: Record<string, string>) => {
    const params = new URLSearchParams();

    const activeQ = overrides?.q !== undefined ? overrides.q : q;
    const activeDept = overrides?.department !== undefined ? overrides.department : department;
    const activeReg = overrides?.regulation !== undefined ? overrides.regulation : regulation;
    const activeYear = overrides?.academic_year !== undefined ? overrides.academic_year : academicYear;
    const activeSem = overrides?.semester !== undefined ? overrides.semester : semester;
    const activeSub = overrides?.subject !== undefined ? overrides.subject : subject;
    const activeUnit = overrides?.unit !== undefined ? overrides.unit : unit;
    const activeMat = overrides?.material_type !== undefined ? overrides.material_type : materialType;
    const activeSort = overrides?.sort !== undefined ? overrides.sort : sort;

    if (activeQ.trim()) params.set('q', activeQ.trim());
    if (activeDept) params.set('department', activeDept);
    if (activeReg) params.set('regulation', activeReg);
    if (activeYear) params.set('academic_year', activeYear);
    if (activeSem) params.set('semester', activeSem);
    if (activeSub.trim()) params.set('subject', activeSub.trim());
    if (activeUnit) params.set('unit', activeUnit);
    if (activeMat) params.set('material_type', activeMat);
    if (activeSort && activeSort !== 'newest') params.set('sort', activeSort);

    router.push(`/documents?${params.toString()}`);
    setMobileFilterOpen(false);
  };

  const handleReset = () => {
    setQ('');
    setDepartment('');
    setRegulation('');
    setAcademicYear('');
    setSemester('');
    setSubject('');
    setUnit('');
    setMaterialType('');
    setSort('newest');
    router.push('/documents');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const hasActiveFilters = Boolean(
    q || department || regulation || academicYear || semester || subject || unit || materialType || (sort && sort !== 'newest')
  );

  return (
    <div className="space-y-4">
      {/* Search Input Bar (Editorial) */}
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <Search className="w-4 h-4 text-ash/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by course code, subject, title..."
          className="w-full h-11 pl-10 pr-24 bg-card border border-ink/20 text-ink placeholder:text-ash/70 text-xs sm:text-sm focus:outline-hidden focus:border-ink transition-colors"
        />
        <div className="absolute right-1.5 flex items-center gap-1">
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                applyFilters({ q: '' });
              }}
              className="meta-mono text-ash hover:text-ink text-xs px-1.5 py-0.5"
            >
              Clear
            </button>
          )}
          <Button
            type="submit"
            size="sm"
            variant="primary"
            className="h-8 px-2.5 text-xs font-medium"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Mobile filter toggle button */}
      <div className="lg:hidden flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          leftIcon={<Filter className="w-3.5 h-3.5" />}
        >
          {mobileFilterOpen ? 'Hide Filters' : 'Filter Catalogue'}
        </Button>

        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="link-underline meta-mono text-oxblood text-xs cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Filter Sidebar Container */}
      <div className={`${mobileFilterOpen ? 'block' : 'hidden'} lg:block bg-card border border-ink/15 p-5 sm:p-6 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <span className="meta-mono text-oxblood text-xs font-semibold uppercase tracking-wider">Index</span>
            <span className="block h-px w-4 bg-ink/20" aria-hidden="true" />
            <span className="label-eyebrow text-ink text-xs font-medium">Classification</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="meta-mono text-oxblood text-xs hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-3.5">
          {/* Department */}
          <Select
            label="Department"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              applyFilters({ department: e.target.value });
            }}
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>

          {/* Curriculum Regulation */}
          <Select
            label="Curriculum Regulation"
            value={regulation}
            onChange={(e) => {
              setRegulation(e.target.value);
              applyFilters({ regulation: e.target.value });
            }}
          >
            <option value="">All Regulations</option>
            {REGULATIONS.map((r) => (
              <option key={r} value={r}>
                Regulation {r}
              </option>
            ))}
          </Select>

          {/* Material Type */}
          <Select
            label="Resource Format"
            value={materialType}
            onChange={(e) => {
              setMaterialType(e.target.value);
              applyFilters({ material_type: e.target.value });
            }}
          >
            <option value="">All Formats</option>
            {MATERIAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          {/* Academic Year */}
          <Select
            label="Academic Standing"
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              applyFilters({ academic_year: e.target.value });
            }}
          >
            <option value="">All Years</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>

          {/* Semester */}
          <Select
            label="Semester"
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              applyFilters({ semester: e.target.value });
            }}
          >
            <option value="">All Semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          {/* Unit / Module */}
          <Select
            label="Unit Module"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              applyFilters({ unit: e.target.value });
            }}
          >
            <option value="">All Units</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>

          {/* Sort Order */}
          <Select
            label="Catalogue Ordering"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
          >
            <option value="newest">Newest Additions</option>
            <option value="popular">Most Downloaded</option>
            <option value="title">Title (A-Z)</option>
            <option value="size_desc">File Size (Largest)</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
