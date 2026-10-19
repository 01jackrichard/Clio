'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layers, FileText, Calendar, Compass } from 'lucide-react';

interface BrowseModeSelectorProps {
  currentMode?: 'all' | 'files' | 'collections' | 'semester';
  totalAll?: number;
  totalFiles?: number;
  totalCollections?: number;
}

export function BrowseModeSelector({
  currentMode = 'all',
  totalAll,
  totalFiles,
  totalCollections,
}: BrowseModeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeMode = (searchParams.get('mode') as typeof currentMode) || currentMode || 'all';

  const handleSelectMode = (mode: 'all' | 'files' | 'collections' | 'semester') => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'all') {
      params.delete('mode');
    } else {
      params.set('mode', mode);
    }
    params.delete('page'); // Reset to page 1 on mode switch
    router.push(`/documents?${params.toString()}`);
  };

  const tabs = [
    {
      id: 'all' as const,
      label: 'All Materials',
      icon: Compass,
      count: totalAll,
      description: 'Unified archive: documents and collections',
    },
    {
      id: 'files' as const,
      label: 'Individual Files',
      icon: FileText,
      count: totalFiles,
      description: 'Direct lecture notes, PYQs, and lab manuals',
    },
    {
      id: 'collections' as const,
      label: 'Collections',
      icon: Layers,
      count: totalCollections,
      description: 'Course packs and curated semester folios',
    },
    {
      id: 'semester' as const,
      label: 'By Semester',
      icon: Calendar,
      count: undefined,
      description: 'Hierarchical academic syllabus tree',
    },
  ];

  return (
    <div className="border-b border-ink/15 bg-card">
      <div
        role="tablist"
        aria-label="Catalogue Discovery Modes"
        className="flex items-center overflow-x-auto no-scrollbar gap-1 sm:gap-2 px-1 pt-1"
      >
        {tabs.map((tab) => {
          const isActive = activeMode === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`mode-panel-${tab.id}`}
              id={`mode-tab-${tab.id}`}
              onClick={() => handleSelectMode(tab.id)}
              className={`group relative flex items-center gap-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'text-oxblood font-semibold bg-bone/40'
                  : 'text-ash hover:text-ink hover:bg-bone/20'
              }`}
              title={tab.description}
            >
              <Icon
                className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? 'text-oxblood' : 'text-ash group-hover:text-ink'
                }`}
              />
              <span className="font-display tracking-tight text-sm sm:text-[15px]">
                {tab.label}
              </span>

              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 meta-mono text-[10px] border transition-colors ${
                    isActive
                      ? 'bg-paper text-oxblood border-oxblood/30 font-semibold'
                      : 'bg-paper text-ash border-ink/15 group-hover:text-ink'
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {/* Active Tab Underline Indicator */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-oxblood"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
