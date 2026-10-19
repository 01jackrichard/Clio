'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  ArrowUpRight,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { AcademicYearGroup, SemesterGroup, SemesterSubjectGroup } from '@/types';
import { getMaterialTypeBadge } from '@/lib/utils';

interface SemesterBrowserProps {
  years: AcademicYearGroup[];
  institutionName?: string;
}

export function SemesterBrowser({ years, institutionName }: SemesterBrowserProps) {
  // Determine initially expanded years (expand all years that have resources, or 1st & 2nd year by default)
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    years.forEach((yr) => {
      // Default open if it has resources or is the first year
      initial[yr.year] = yr.totalResources > 0 || yr.year === '1st Year' || yr.year === '2nd Year';
    });
    return initial;
  });

  // Keep track of expanded semesters
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    years.forEach((yr) => {
      yr.semesters.forEach((sem) => {
        initial[sem.semester] = sem.totalResources > 0;
      });
    });
    return initial;
  });

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => ({ ...prev, [year]: !prev[year] }));
  };

  const toggleSemester = (sem: string) => {
    setExpandedSemesters((prev) => ({ ...prev, [sem]: !prev[sem] }));
  };

  const totalResourcesOverall = years.reduce((acc, yr) => acc + yr.totalResources, 0);

  return (
    <div className="space-y-6">
      {/* Editorial Overview Header */}
      <div className="p-4 sm:p-5 bg-card border border-ink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 meta-mono text-xs text-ash">
            <span className="text-oxblood font-semibold uppercase">Academic Curriculum</span>
            <span className="text-ink/20" aria-hidden="true">•</span>
            <span>4-Year Degree Sequence</span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-normal text-ink">
            Semester-by-Semester Curriculum Tree
          </h3>
          <p className="text-xs text-ash max-w-xl">
            Explore academic resources structured chronologically across all 8 undergraduate semesters
            {institutionName ? ` for ${institutionName}` : ''}.
          </p>
        </div>

        <div className="flex items-center gap-2 meta-mono text-xs text-ash self-start sm:self-auto">
          <span className="px-2 py-1 bg-paper border border-ink/15 text-ink font-semibold">
            {totalResourcesOverall} {totalResourcesOverall === 1 ? 'Resource' : 'Resources'} Indexed
          </span>
        </div>
      </div>

      {/* Academic Year Accordions */}
      <div className="space-y-4">
        {years.map((yearGroup) => {
          const isYearOpen = Boolean(expandedYears[yearGroup.year]);

          return (
            <div
              key={yearGroup.year}
              className="bg-card border border-ink/15 transition-colors"
            >
              {/* Year Header / Trigger */}
              <button
                type="button"
                onClick={() => toggleYear(yearGroup.year)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-bone/40 transition-colors cursor-pointer border-b border-ink/10"
                aria-expanded={isYearOpen}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-ink/20 bg-paper flex items-center justify-center text-ink shrink-0 font-display font-medium text-sm">
                    {isYearOpen ? (
                      <ChevronDown className="w-4 h-4 text-oxblood" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-ash" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-display text-lg sm:text-xl font-medium text-ink">
                      {yearGroup.title}
                    </h4>
                    <span className="meta-mono text-xs text-ash">
                      {yearGroup.semesters.map((s) => s.semester).join(' & ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`meta-mono text-xs px-2 py-0.5 border ${
                      yearGroup.totalResources > 0
                        ? 'bg-paper text-oxblood border-oxblood/30 font-semibold'
                        : 'bg-paper text-ash border-ink/15'
                    }`}
                  >
                    {yearGroup.totalResources} {yearGroup.totalResources === 1 ? 'Folio' : 'Folios'}
                  </span>
                </div>
              </button>

              {/* Year Semesters Body */}
              {isYearOpen && (
                <div className="p-4 sm:p-6 space-y-5 bg-paper/50">
                  <div className="grid grid-cols-1 gap-5">
                    {yearGroup.semesters.map((sem) => (
                      <SemesterCard
                        key={sem.semester}
                        semester={sem}
                        isOpen={Boolean(expandedSemesters[sem.semester])}
                        onToggle={() => toggleSemester(sem.semester)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SemesterCardProps {
  semester: SemesterGroup;
  isOpen: boolean;
  onToggle: () => void;
}

function SemesterCard({ semester, isOpen, onToggle }: SemesterCardProps) {
  const hasResources = semester.totalResources > 0;

  return (
    <div className="border border-ink/15 bg-card">
      {/* Semester Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-bone/40 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border border-ink/20 bg-paper flex items-center justify-center shrink-0">
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-oxblood" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-ash" />
            )}
          </div>
          <div>
            <h5 className="font-display text-base sm:text-lg font-medium text-ink">
              {semester.semester}
            </h5>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasResources ? (
            <span className="meta-mono text-xs text-oxblood bg-paper px-2 py-0.5 border border-oxblood/30 font-semibold">
              {semester.totalResources} {semester.totalResources === 1 ? 'Resource' : 'Resources'}
            </span>
          ) : (
            <span className="meta-mono text-xs text-ash bg-paper px-2 py-0.5 border border-ink/15">
              0 Indexed
            </span>
          )}
        </div>
      </button>

      {/* Expanded Subject List */}
      {isOpen && (
        <div className="border-t border-ink/10 p-4 sm:p-5 bg-paper/60 space-y-4">
          {hasResources ? (
            <div className="space-y-4">
              {semester.subjects.map((sub) => (
                <SubjectItem key={sub.name + (sub.code || '')} subject={sub} />
              ))}
            </div>
          ) : (
            /* Graceful Empty State */
            <div className="p-6 text-center border border-dashed border-ink/20 bg-paper space-y-3">
              <FolderOpen className="w-5 h-5 text-ash mx-auto" />
              <div className="space-y-1">
                <p className="font-display text-base text-ink font-medium">
                  No folios currently indexed for {semester.semester}
                </p>
                <p className="text-xs text-ash max-w-sm mx-auto leading-relaxed">
                  Be the first student to deposit verified lecture folios, examination papers, or lab guides for this semester.
                </p>
              </div>
              <div>
                <Link
                  href={`/upload?semester=${encodeURIComponent(semester.semester)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-xs meta-mono hover:bg-oxblood transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Contribute for {semester.semester}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SubjectItemProps {
  subject: SemesterSubjectGroup;
}

function SubjectItem({ subject }: SubjectItemProps) {
  return (
    <div className="p-4 bg-card border border-ink/15 space-y-3">
      {/* Subject Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-ink/10">
        <div className="flex flex-wrap items-center gap-2">
          {subject.code && (
            <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-bone border border-ink/20 text-ink">
              {subject.code}
            </span>
          )}
          <h6 className="font-display text-base sm:text-lg font-medium text-ink">
            {subject.name}
          </h6>
        </div>

        <div className="flex items-center gap-2 meta-mono text-[11px] text-ash">
          <span>{subject.department}</span>
          {subject.regulation && (
            <>
              <span className="text-ink/20" aria-hidden="true">•</span>
              <span>Reg. {subject.regulation}</span>
            </>
          )}
          <span className="text-ink/20" aria-hidden="true">•</span>
          <span className="text-oxblood font-semibold">
            {subject.totalResources} {subject.totalResources === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Materials List under Subject */}
      <div className="space-y-2">
        {/* Collections */}
        {subject.collections.map((col) => (
          <div
            key={col.id}
            className="p-2.5 bg-paper border border-ink/10 hover:border-ink/30 transition-colors flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Layers className="w-4 h-4 text-oxblood shrink-0" />
              <Link
                href={`/collections/${col.slug || col.id}`}
                className="font-display font-medium text-ink hover:text-oxblood truncate"
              >
                {col.title}
              </Link>
              <span className="px-1.5 py-0.2 meta-mono text-[10px] bg-bone border border-ink/15 text-ash shrink-0">
                Course Pack ({col.document_count || 0} folios)
              </span>
            </div>

            <Link
              href={`/collections/${col.slug || col.id}`}
              className="meta-mono text-xs text-ash hover:text-ink shrink-0 inline-flex items-center gap-1"
            >
              <span>View</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        ))}

        {/* Individual Documents */}
        {subject.documents.map((doc) => {
          const badge = getMaterialTypeBadge(doc.material_type);

          return (
            <div
              key={doc.id}
              className="p-2.5 bg-paper border border-ink/10 hover:border-ink/30 transition-colors flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-ash shrink-0" />
                <Link
                  href={`/documents/${doc.id}`}
                  className="font-display font-medium text-ink hover:text-oxblood truncate"
                >
                  {doc.title}
                </Link>
                <span className="px-1.5 py-0.2 meta-mono text-[10px] bg-bone border border-ink/15 text-ink/80 shrink-0">
                  {badge.label}
                </span>
                {doc.unit && (
                  <span className="meta-mono text-[10px] text-ash shrink-0">
                    {doc.unit}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 meta-mono text-[11px] text-ash">
                <span className="hidden sm:inline">{doc.download_count} dl</span>
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-ash hover:text-ink inline-flex items-center gap-1"
                >
                  <span>Inspect</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
