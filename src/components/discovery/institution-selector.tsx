'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Landmark, CheckCircle2, ChevronDown, X, Globe, Search, School } from 'lucide-react';
import { InstitutionInfo, getAvailableInstitutions } from '@/lib/services/institution-service';

interface InstitutionSelectorProps {
  currentInstitution?: string | null;
}

export function InstitutionSelector({ currentInstitution }: InstitutionSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const institutions = getAvailableInstitutions();

  // Find active institution
  const activeParam = searchParams.get('institution') || currentInstitution || 'all';
  const isAll = !activeParam || activeParam.toLowerCase() === 'all';

  const selectedInst: InstitutionInfo | undefined = isAll
    ? undefined
    : institutions.find(
        (inst) =>
          inst.code.toLowerCase() === activeParam.toLowerCase() ||
          inst.name.toLowerCase() === activeParam.toLowerCase() ||
          inst.shortName.toLowerCase() === activeParam.toLowerCase()
      );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectInstitution = (code: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (code === 'all') {
      params.delete('institution');
    } else {
      params.set('institution', code);
    }
    params.delete('page'); // Reset pagination
    router.push(`/documents?${params.toString()}`);
    setIsOpen(false);
  };

  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Banner / Selector Strip */}
      <div className="bg-card border border-ink/15 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 bg-bone border border-ink/20 flex items-center justify-center text-oxblood">
            <Landmark className="w-4 h-4" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="meta-mono text-[11px] uppercase tracking-wider text-ash font-medium">
                Academic Jurisdiction
              </span>
              <span className="text-ink/20" aria-hidden="true">•</span>
              <span className="inline-flex items-center gap-1 meta-mono text-[11px] text-oxblood font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Verified Curriculum</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h3 className="font-display text-base sm:text-lg font-medium text-ink leading-tight">
                {isAll ? 'All Preserved Institutions' : selectedInst?.name || activeParam}
              </h3>
              {!isAll && (
                <span className="px-1.5 py-0.2 bg-bone border border-ink/20 meta-mono text-[10px] text-ink/70">
                  {selectedInst?.shortName || 'Curriculum'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isAll && (
            <button
              type="button"
              onClick={() => selectInstitution('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs meta-mono text-ash hover:text-ink border border-ink/15 hover:border-ink bg-paper transition-colors"
              title="Reset to All Institutions"
            >
              <X className="w-3 h-3" />
              <span>All Institutions</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs meta-mono bg-paper text-ink border border-ink/20 hover:border-ink transition-colors font-medium cursor-pointer"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <School className="w-3.5 h-3.5 text-oxblood" />
            <span>Switch Institution</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-card border border-ink/20 shadow-lg p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ash absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search institutions, universities, or university codes..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-paper border border-ink/20 text-ink placeholder:text-ash/70 focus:outline-hidden focus:border-ink transition-colors"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div className="divide-y divide-ink/10 max-h-64 overflow-y-auto" role="listbox">
            {/* All Institutions Option */}
            <button
              type="button"
              onClick={() => selectInstitution('all')}
              className={`w-full text-left p-2.5 hover:bg-bone/60 transition-colors flex items-center justify-between group ${
                isAll ? 'bg-bone border-l-2 border-oxblood' : ''
              }`}
              role="option"
              aria-selected={isAll}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-medium text-ink group-hover:text-oxblood">
                    All Preserved Institutions
                  </span>
                  <span className="meta-mono text-[10px] text-ash bg-paper px-1.5 border border-ink/15">
                    Universal
                  </span>
                </div>
                <p className="text-xs text-ash">
                  Discover lecture folios, examination papers, and manuals across all verified colleges.
                </p>
              </div>
              {isAll && <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0" />}
            </button>

            {/* Individual Institutions */}
            {filteredInstitutions.map((inst) => {
              const isSelected =
                !isAll &&
                (activeParam.toLowerCase() === inst.code.toLowerCase() ||
                  activeParam.toLowerCase() === inst.name.toLowerCase());

              return (
                <button
                  key={inst.code}
                  type="button"
                  onClick={() => selectInstitution(inst.code)}
                  className={`w-full text-left p-2.5 hover:bg-bone/60 transition-colors flex items-center justify-between group ${
                    isSelected ? 'bg-bone border-l-2 border-oxblood' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="space-y-0.5 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-medium text-ink group-hover:text-oxblood truncate">
                        {inst.name}
                      </span>
                      {inst.isPrimary && (
                        <span className="meta-mono text-[10px] text-oxblood bg-paper px-1.5 border border-oxblood/30">
                          Campus Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ash line-clamp-1">{inst.description}</p>
                    {inst.domain && (
                      <span className="inline-flex items-center gap-1 meta-mono text-[10px] text-ash/80">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{inst.domain}</span>
                      </span>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-oxblood shrink-0" />}
                </button>
              );
            })}

            {filteredInstitutions.length === 0 && (
              <div className="py-4 text-center meta-mono text-xs text-ash">
                No verified institutions matched &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
