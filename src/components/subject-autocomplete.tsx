'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, Sparkles, AlertCircle, Edit3 } from 'lucide-react';
import { searchAnnaUniversitySubjects } from '@/lib/services/subject-service';
import { AnnaUniversitySubject } from '@/lib/data/anna-university-subjects';
import { Department, Semester } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface SubjectAutocompleteProps {
  selectedSubject: string;
  selectedCode: string;
  selectedRegulation: string;
  selectedDepartment?: string;
  selectedSemester?: string;
  isVerified?: boolean;
  onSubjectChange: (data: {
    subject: string;
    subject_code: string;
    regulation: string;
    department?: Department;
    semester?: Semester;
    isVerified: boolean;
  }) => void;
}

export function SubjectAutocomplete({
  selectedSubject,
  selectedCode,
  selectedRegulation,
  selectedDepartment,
  selectedSemester,
  isVerified = true,
  onSubjectChange,
}: SubjectAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(
    selectedCode ? `${selectedCode} — ${selectedSubject}` : selectedSubject || ''
  );
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(!isVerified && Boolean(selectedSubject));
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search subjects matching query and optional regulation
  const results = searchAnnaUniversitySubjects({
    query: searchTerm.split('—')[0].trim(),
    regulation: selectedRegulation,
    limit: 8,
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (sub: AnnaUniversitySubject) => {
    setSearchTerm(`${sub.code} — ${sub.title}`);
    setIsOpen(false);
    setManualMode(false);
    onSubjectChange({
      subject: sub.title,
      subject_code: sub.code,
      regulation: sub.regulation,
      department: sub.department,
      semester: sub.semester,
      isVerified: true,
    });
  };

  const switchToManual = () => {
    setManualMode(true);
    setIsOpen(false);
    onSubjectChange({
      subject: selectedSubject || searchTerm,
      subject_code: selectedCode || '',
      regulation: selectedRegulation || '2021',
      isVerified: false,
    });
  };

  const switchToAutocomplete = () => {
    setManualMode(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-3" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label htmlFor="subject-autocomplete-input" className="text-xs font-medium text-ink flex items-center gap-2">
          <span>Subject Name / Course Code</span>
          <span className="text-oxblood">*</span>
          {isVerified && selectedCode ? (
            <Badge variant="success" size="sm" dot>
              Verified Anna Univ Syllabus
            </Badge>
          ) : manualMode ? (
            <Badge variant="warning" size="sm">
              Manual Unverified
            </Badge>
          ) : null}
        </label>

        {!manualMode ? (
          <button
            type="button"
            onClick={switchToManual}
            className="text-[11px] meta-mono text-ash hover:text-oxblood flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>Not listed? Enter manually</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={switchToAutocomplete}
            className="text-[11px] meta-mono text-oxblood hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Search Syllabus Database</span>
          </button>
        )}
      </div>

      {!manualMode ? (
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-ash absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="subject-autocomplete-input"
              aria-label="Subject Name / Course Code"
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="subject-autocomplete-list"
              placeholder="Search by course code (e.g. CS3351) or subject name..."
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                setIsOpen(true);
                setActiveIndex(-1);
                onSubjectChange({
                  subject: val,
                  subject_code: '',
                  regulation: selectedRegulation || '2021',
                  department: selectedDepartment as Department | undefined,
                  semester: selectedSemester as Semester | undefined,
                  isVerified: false,
                });
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-4 py-2.5 bg-paper border border-ink/20 text-xs text-ink placeholder:text-ash/60 focus:outline-hidden focus:border-ink transition-colors"
            />
          </div>

          {isOpen && (
            <div
              id="subject-autocomplete-list"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1 bg-card border border-ink/20 shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-ink/5"
            >
              <div className="p-2 bg-bone/30 border-b border-ink/10 flex items-center justify-between text-[10px] meta-mono text-ash">
                <span>Anna University Syllabus Registry</span>
                <span>{results.length} suggestions</span>
              </div>

              {results.length > 0 ? (
                results.map((sub, idx) => {
                  const isSelected = selectedCode === sub.code;
                  const isActive = activeIndex === idx;
                  return (
                    <div
                      key={`${sub.code}-${sub.regulation}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(sub)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                        isActive || isSelected
                          ? 'bg-bone/60 text-ink'
                          : 'hover:bg-bone/40 text-ink/90'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold px-1.5 py-0.5 bg-ink text-paper tracking-wider">
                            {sub.code}
                          </span>
                          <span className="text-xs font-medium text-ink font-sans">
                            {sub.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ash meta-mono">
                          <span>{sub.department}</span>
                          <span>•</span>
                          <span>{sub.semester}</span>
                          <span>•</span>
                          <span className="text-oxblood font-semibold">Reg {sub.regulation}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-ash">
                    No verified Anna University subjects match &ldquo;{searchTerm}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bone text-ink text-xs font-medium hover:bg-ink hover:text-paper transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Enter Subject Manually</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Manual entry fallback */
        <div className="space-y-3 p-4 bg-bone/20 border border-ink/15 rounded-none">
          <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 p-3 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Unverified Manual Subject</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This subject mapping is not yet in the official Anna University registry. It will be verified by academic maintainers during archival indexing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] meta-mono text-ash uppercase">Official Subject Title</label>
              <input
                type="text"
                value={selectedSubject}
                placeholder="e.g. Advanced Cryptography and Network Security"
                onChange={(e) =>
                  onSubjectChange({
                    subject: e.target.value,
                    subject_code: selectedCode,
                    regulation: selectedRegulation,
                    isVerified: false,
                  })
                }
                className="w-full px-3 py-2 bg-paper border border-ink/20 text-xs text-ink focus:outline-hidden focus:border-ink"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] meta-mono text-ash uppercase">Course Code</label>
              <input
                type="text"
                value={selectedCode}
                placeholder="e.g. CS9021"
                onChange={(e) =>
                  onSubjectChange({
                    subject: selectedSubject,
                    subject_code: e.target.value.toUpperCase(),
                    regulation: selectedRegulation,
                    isVerified: false,
                  })
                }
                className="w-full px-3 py-2 bg-paper border border-ink/20 text-xs text-ink font-mono uppercase focus:outline-hidden focus:border-ink"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
