'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Award,
  Search,
  Upload,
  Bookmark,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClioEmblem } from '@/components/clio-logo';

/**
 * ============================================================================
 * TYPE DEFINITIONS & CUSTOMIZATION CONTRACTS
 * ============================================================================
 */

// Represents an individual academic node orbiting the core.
export interface SolarSystemItem {
  id: string; // Unique identifier (e.g. "institutions", "collections")
  label: string; // Text label shown next to the icon (e.g. "Academic Collections")
  type?: string; // Optional classification tag (e.g. "Curriculum Structure", "Resource Format")
  badge?: string; // Optional status badge text (e.g. "Verified Curriculum")
  desc?: string; // Informational description of the real academic capability
  color: string; // Accent color for active highlighting (e.g. "#7A1F1D")
  svg: React.ReactNode; // Icon representing the node
  code?: string; // Optional code or citation sample
  href?: string; // Optional verified destination route
  actionLabel?: string; // Action button label (e.g. "Explore Collections")
}

// Configures a single orbit ring layer (e.g. inner, middle, outer).
export interface OrbitConfig {
  id: string; // Unique ring identifier (e.g. "inner", "mid", "outer")
  name: string; // Human-readable name for the ring
  radiusClass: string; // CSS variable or absolute size (e.g. "var(--radius-inner)")
  radiusPx: number; // Absolute size in pixels (used for calculations)
  speed: number; // Base duration in seconds for one full 360-degree rotation
  items: SolarSystemItem[]; // Array of nodes revolving on this ring
}

export interface SolarSystemProps extends React.HTMLAttributes<HTMLDivElement> {
  centerLogo?: string | React.ReactNode;
  centerLogoAlt?: string;
  orbits?: OrbitConfig[];
  isPaused?: boolean;
  speedMultiplier?: number;
  title?: string;
  description?: string;
  eyebrow?: string;
  onSelectNode?: (item: SolarSystemItem) => void;
  selectedItemId?: string | null;
  showDetailPanel?: boolean;
}

/**
 * ============================================================================
 * DEFAULT CLIO ACADEMIC ECOSYSTEM ORBITS
 * Truthful, functional components of the Clio Academic Archive.
 * ============================================================================
 */
export const DEFAULT_CLIO_ORBITS: OrbitConfig[] = [
  {
    id: 'inner',
    name: 'Curriculum Scheme',
    radiusClass: 'var(--radius-inner)',
    radiusPx: 175,
    speed: 30,
    items: [
      {
        id: 'institutions',
        label: 'Verified Institutions',
        type: 'Curricular Governance',
        badge: 'Anna Univ & SJCE',
        desc: 'Curriculum mapped to accredited institutional schemes, including St. Joseph’s College of Engineering and Anna University regulations (2021 & 2017 schemes).',
        color: '#7A1F1D',
        href: '/documents?institution=anna-university',
        actionLabel: 'Explore Institutions',
        svg: <GraduationCap className="w-4 h-4" />,
      },
      {
        id: 'semesters',
        label: 'Semester Browser',
        type: 'Curricular Scheme',
        badge: 'Semesters 1–8',
        desc: 'Chronological syllabus breakdown organizing course materials semester by semester, from foundational freshman math to final-year electives.',
        color: '#8C2E2B',
        href: '/documents?mode=semester',
        actionLabel: 'Browse Semesters',
        svg: <Calendar className="w-4 h-4" />,
      },
      {
        id: 'course-codes',
        label: 'Course Codes & Syllabi',
        type: 'Index Architecture',
        badge: 'e.g. 22CS394',
        desc: 'Strict indexing under official university subject codes, allowing immediate cross-departmental lookup and precise syllabus matching.',
        color: '#6E1B19',
        href: '/documents?q=22CS394',
        actionLabel: 'Search Course Code',
        svg: <BookOpen className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'mid',
    name: 'Academic Resources',
    radiusClass: 'var(--radius-mid)',
    radiusPx: 285,
    speed: 44,
    items: [
      {
        id: 'collections',
        label: 'Academic Collections',
        type: 'Resource Format',
        badge: 'Curated Course Packs',
        desc: 'Bundled multi-document folios combining complete unit notes, solved problems, and revision sheets into comprehensive semester study packs.',
        color: '#7A1F1D',
        href: '/documents?mode=collections',
        actionLabel: 'View Collections',
        svg: <Layers className="w-4 h-4" />,
      },
      {
        id: 'documents',
        label: 'Individual Study Folios',
        type: 'Resource Format',
        badge: 'Verified Manuscripts',
        desc: 'Direct access to standalone lecture units, formula digests, and lab records, preserved in clean PDF format with in-browser reading.',
        color: '#8C2E2B',
        href: '/documents?mode=individual',
        actionLabel: 'Browse Folios',
        svg: <FileText className="w-4 h-4" />,
      },
      {
        id: 'exam-archive',
        label: 'Previous-Year Exam Archive',
        type: 'Resource Format',
        badge: 'Past University Papers',
        desc: 'Five years of mid-term and end-semester university examination papers with question frequency categorization and verified solutions.',
        color: '#581514',
        href: '/documents?material_type=previous_year_questions',
        actionLabel: 'View Exam Archive',
        svg: <Award className="w-4 h-4" />,
      },
    ],
  },
  {
    id: 'outer',
    name: 'Community & Discovery',
    radiusClass: 'var(--radius-outer)',
    radiusPx: 395,
    speed: 60,
    items: [
      {
        id: 'discovery',
        label: 'Instant Catalogue Search',
        type: 'Search Architecture',
        badge: 'Fluid Filtered Search',
        desc: 'Real-time catalogue search indexing subject titles, course codes, departments, and public collections with keyboard navigation.',
        color: '#7A1F1D',
        href: '/documents',
        actionLabel: 'Open Catalogue',
        svg: <Search className="w-4 h-4" />,
      },
      {
        id: 'contributions',
        label: 'Student Contributions',
        type: 'Community Governance',
        badge: 'Peer Moderated',
        desc: 'Student-deposited academic materials validated against the Fair Use declaration and moderated before entering the permanent institutional catalogue.',
        color: '#8C2E2B',
        href: '/upload',
        actionLabel: 'Contribute Material',
        svg: <Upload className="w-4 h-4" />,
      },
      {
        id: 'saved-folios',
        label: 'Saved Folios & Bookshelf',
        type: 'Student Workspace',
        badge: 'Personal Bookshelf',
        desc: 'Personal academic library allowing registered students to bookmark folios, track their semester reading lists, and review submitted notes.',
        color: '#581514',
        href: '/saved',
        actionLabel: 'View Saved Folios',
        svg: <Bookmark className="w-4 h-4" />,
      },
    ],
  },
];

/**
 * ============================================================================
 * SOLAR SYSTEM COMPONENT
 * Interactive 3D planetary orbit visualization of Clio's academic ecosystem.
 * ============================================================================
 */
export const SolarSystem = React.forwardRef<HTMLDivElement, SolarSystemProps>(
  (
    {
      centerLogo,
      centerLogoAlt = 'Clio Academic Archive',
      orbits = DEFAULT_CLIO_ORBITS,
      isPaused: controlledPaused,
      speedMultiplier = 1,
      title,
      description,
      eyebrow,
      onSelectNode,
      selectedItemId,
      showDetailPanel = true,
      className,
      ...props
    },
    ref
  ) => {
    const scopeId = useId().replace(/:/g, '');
    const [internalPaused, setInternalPaused] = useState(false);
    const isPaused = controlledPaused !== undefined ? controlledPaused : internalPaused;

    // Default to the first item (Verified Institutions) for initial inspection
    const [activeNodeId, setActiveNodeId] = useState<string>(
      selectedItemId || orbits[0]?.items[0]?.id || 'institutions'
    );
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Find active item
    const allItems = orbits.flatMap((o) => o.items);
    const activeItem =
      allItems.find((item) => item.id === (hoveredId || activeNodeId)) || allItems[0];
    const activeOrbit = orbits.find((o) => o.items.some((item) => item.id === activeItem?.id));

    // Handle node activation
    const handleNodeClick = (item: SolarSystemItem) => {
      setActiveNodeId(item.id);
      onSelectNode?.(item);
    };

    // Cosmic dust particle positions (warm academic palette)
    const dustItems = [
      { delay: '-4s', radius: '155px', color: '#7A1F1D' },
      { delay: '-11s', radius: '240px', color: '#8C2E2B' },
      { delay: '-19s', radius: '320px', color: '#5A554E' },
      { delay: '-28s', radius: '380px', color: '#7A1F1D' },
      { delay: '-7s', radius: '200px', color: '#581514' },
      { delay: '-15s', radius: '350px', color: '#C4BDB2' },
      { delay: '-23s', radius: '420px', color: '#8C2E2B' },
    ];

    return (
      <div
        ref={ref}
        className={cn(
          'clio-solar-scope w-full flex flex-col items-center select-none',
          `scope-${scopeId}`,
          className
        )}
        {...props}
      >
        {/* Dynamic CSS keyframes injector scoped to component */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .scope-${scopeId} {
              --radius-inner: 175px;
              --radius-mid: 285px;
              --radius-outer: 395px;
            }

            @media (max-width: 840px) {
              .scope-${scopeId} {
                --radius-inner: 110px;
                --radius-mid: 180px;
                --radius-outer: 245px;
              }
            }

            @media (max-width: 480px) {
              .scope-${scopeId} {
                --radius-inner: 75px;
                --radius-mid: 120px;
                --radius-outer: 165px;
              }
            }

            /* Orbit revolutions */
            @keyframes clio-orbitMove {
              0% {
                transform: translate(-50%, -50%) rotateZ(0deg) translateX(var(--orbit-radius));
              }
              100% {
                transform: translate(-50%, -50%) rotateZ(-360deg) translateX(var(--orbit-radius));
              }
            }

            /* Billboard counter-rotation (cancels the 65deg X-tilt and 10deg Y-tilt) */
            @keyframes clio-billboardCancel {
              0% {
                transform: translate(-50%, -50%) rotateZ(0deg) rotateY(10deg) rotateX(-65deg);
              }
              100% {
                transform: translate(-50%, -50%) rotateZ(360deg) rotateY(10deg) rotateX(-65deg);
              }
            }

            /* Sun glow pulsation */
            @keyframes clio-sun-pulse {
              0% { transform: scale(0.92); opacity: 0.65; }
              100% { transform: scale(1.08); opacity: 0.95; }
            }

            /* Sun ring rotation */
            @keyframes clio-spin-clockwise {
              0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
              100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(360deg); }
            }
            @keyframes clio-spin-counter {
              0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
              100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(-360deg); }
            }

            .scope-${scopeId} .animate-clio-orbit {
              animation: clio-orbitMove var(--orbit-duration) linear infinite;
              animation-play-state: var(--orbit-play-state);
            }
            .scope-${scopeId} .animate-clio-billboard {
              animation: clio-billboardCancel var(--orbit-duration) linear infinite;
              animation-play-state: var(--orbit-play-state);
            }
            .scope-${scopeId} .animate-clio-sun-pulse {
              animation: clio-sun-pulse 4s ease-in-out infinite alternate;
            }
            .scope-${scopeId} .animate-clio-spin-cw {
              animation: clio-spin-clockwise 24s linear infinite;
            }
            .scope-${scopeId} .animate-clio-spin-ccw {
              animation: clio-spin-counter 32s linear infinite;
            }

            /* Orbit node card styling */
            .scope-${scopeId} .orbit-node-card {
              position: absolute;
              left: 50%;
              top: 50%;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 0.4rem 0.85rem;
              background: #FAF7F2;
              border: 1px solid #E5DFD5;
              border-radius: 9999px;
              font-family: var(--font-inter-tight, inherit);
              font-size: 12px;
              font-weight: 500;
              color: #0E0E11;
              white-space: nowrap;
              user-select: none;
              cursor: pointer;
              pointer-events: auto;
              transition: border-color 0.25s, color 0.25s, background 0.25s, box-shadow 0.25s, scale 0.25s;
              box-shadow: 0 2px 8px rgba(14, 14, 17, 0.05);
            }
            .scope-${scopeId} .orbit-node-card:hover,
            .scope-${scopeId} .orbit-node-card.is-active {
              background: #FFFFFF;
              border-color: #7A1F1D;
              color: #7A1F1D;
              box-shadow: 0 4px 16px rgba(122, 31, 29, 0.18), 0 0 0 1px #7A1F1D;
            }
            @media (max-width: 480px) {
              .scope-${scopeId} .orbit-node-card {
                padding: 0.25rem 0.55rem;
                gap: 5px;
                font-size: 10px;
              }
            }

            /* Reduced motion compliance */
            @media (prefers-reduced-motion: reduce) {
              .scope-${scopeId} .animate-clio-orbit,
              .scope-${scopeId} .animate-clio-billboard,
              .scope-${scopeId} .animate-clio-sun-pulse,
              .scope-${scopeId} .animate-clio-spin-cw,
              .scope-${scopeId} .animate-clio-spin-ccw {
                animation-play-state: paused !important;
              }
            }
          `,
          }}
        />

        {/* Optional Header Content if supplied via props */}
        {(eyebrow || title || description) && (
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-6 sm:mb-10 px-4">
            {eyebrow && (
              <div className="inline-flex items-center gap-3">
                <span className="meta-mono text-oxblood font-semibold tracking-widest text-xs uppercase">
                  {eyebrow}
                </span>
                <span className="block h-px w-8 bg-ink/30" />
                <span className="label-eyebrow text-xs">INTERACTIVE ARCHIVE</span>
              </div>
            )}
            {title && (
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.06] tracking-[-0.03em] text-ink text-balance">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm sm:text-base leading-relaxed text-ash max-w-xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}

        {/* 3D Orbit Stage Viewport */}
        <div className="relative flex items-center justify-center w-full max-w-[940px] h-[340px] sm:h-[420px] md:h-[480px] perspective-[1200px] overflow-hidden sm:overflow-visible">
          {/* Tiltable Orbit Container (handles 3D tilt coordinates) */}
          <div
            className="absolute w-[360px] h-[360px] md:w-[940px] md:h-[940px] flex items-center justify-center"
            style={{
              transform: 'rotateX(65deg) rotateY(-10deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 
              ======================================================================
              CENTRAL SUN CORE (CLIO MONOGRAM MEDALLION)
              ======================================================================
            */}
            <div
              className="absolute w-[96px] h-[96px] md:w-[130px] md:h-[130px] flex items-center justify-center z-20 pointer-events-none"
              style={{
                transform: 'rotateY(10deg) rotateX(-65deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Soft burgundy aura */}
              <div className="absolute w-[80px] h-[80px] md:w-[110px] md:h-[110px] rounded-full filter blur-md animate-clio-sun-pulse z-10 bg-oxblood/15" />

              {/* Central medallion */}
              {centerLogo ? (
                typeof centerLogo === 'string' ? (
                  <Image
                    className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-oxblood/40 shadow-[0_0_24px_rgba(122,31,29,0.25)] z-20 bg-card p-2 relative object-contain"
                    src={centerLogo}
                    alt={centerLogoAlt}
                    width={80}
                    height={80}
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-oxblood/40 shadow-[0_0_24px_rgba(122,31,29,0.25)] z-20 bg-card flex items-center justify-center p-2 relative">
                    {centerLogo}
                  </div>
                )
              ) : (
                <div
                  className="w-14 h-14 md:w-20 md:h-20 rounded-full border-2 border-oxblood/40 shadow-[0_0_24px_rgba(122,31,29,0.25)] z-20 bg-card flex items-center justify-center p-2 relative"
                  title="Clio Academic Archive"
                  aria-label={centerLogoAlt}
                >
                  <ClioEmblem size={40} className="w-9 h-9 md:w-11 md:h-11" />
                </div>
              )}

              {/* Concentric subtle armillary dashed rings */}
              <div className="absolute w-[110px] h-[110px] md:w-[145px] md:h-[145px] rounded-full border border-dashed border-oxblood/25 animate-clio-spin-cw pointer-events-none" />
              <div className="absolute w-[145px] h-[145px] md:w-[185px] md:h-[185px] rounded-full border border-dashed border-ink/15 animate-clio-spin-ccw pointer-events-none" />
            </div>

            {/* Cosmic Dust Particles */}
            {dustItems.map((dust, idx) => (
              <div
                key={idx}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full opacity-45 pointer-events-none animate-clio-orbit"
                style={{
                  background: dust.color,
                  boxShadow: `0 0 6px ${dust.color}`,
                  animationDelay: dust.delay,
                  animationPlayState: isPaused ? 'paused' : 'running',
                  animationDuration: `${28 / speedMultiplier}s`,
                  ['--orbit-radius' as string]: dust.radius,
                  ['--orbit-duration' as string]: `${28 / speedMultiplier}s`,
                  ['--orbit-play-state' as string]: isPaused ? 'paused' : 'running',
                }}
              />
            ))}

            {/* 
              ======================================================================
              ORBITS AND ACADEMIC NODES
              ======================================================================
            */}
            {orbits.map((orbit) => {
              return (
                <React.Fragment key={orbit.id}>
                  {/* Dashed ring guide */}
                  <div
                    className="absolute rounded-full border border-dashed border-ink/20 pointer-events-none"
                    style={{
                      width: `calc(2 * ${orbit.radiusClass})`,
                      height: `calc(2 * ${orbit.radiusClass})`,
                      boxShadow:
                        'inset 0 0 16px rgba(122, 31, 29, 0.02), 0 0 16px rgba(122, 31, 29, 0.02)',
                      ['--orbit-radius' as string]: orbit.radiusClass,
                    }}
                  />

                  {/* Revolving nodes */}
                  {orbit.items.map((item, idx, arr) => {
                    const delayValue = -(orbit.speed / arr.length) * idx;
                    const durationValue = orbit.speed / speedMultiplier;
                    const isHovered = hoveredId === item.id;
                    const isActive = activeNodeId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none animate-clio-orbit"
                        style={{
                          animationDelay: `${delayValue}s`,
                          animationDuration: `${durationValue}s`,
                          animationPlayState: isPaused ? 'paused' : 'running',
                          ['--orbit-radius' as string]: orbit.radiusClass,
                          ['--orbit-duration' as string]: `${durationValue}s`,
                          ['--orbit-play-state' as string]: isPaused ? 'paused' : 'running',
                          ['--hover-color' as string]: item.color,
                          zIndex: isHovered || isActive ? 30 : 10,
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        {/* Ray connecting central core with node */}
                        <div
                          className="absolute right-0 top-1/2 h-[1.5px] origin-right -translate-y-1/2 pointer-events-none transition-opacity duration-300 z-0"
                          style={{
                            width: orbit.radiusClass,
                            opacity: isHovered || isActive ? 0.95 : 0,
                            background: `linear-gradient(90deg, rgba(122,31,29,0.02) 0%, rgba(122,31,29,0.2) 20%, ${item.color} 80%, ${item.color} 100%)`,
                            boxShadow: `0 0 8px ${item.color}50`,
                          }}
                        />

                        {/* Node Card Button */}
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onClick={() => handleNodeClick(item)}
                          className={cn(
                            'orbit-node-card animate-clio-billboard',
                            (isHovered || isActive) && 'is-active'
                          )}
                          style={{
                            animationDelay: `${delayValue}s`,
                            animationDuration: `${durationValue}s`,
                            animationPlayState: isPaused ? 'paused' : 'running',
                            scale: isHovered || isActive ? 1.06 : 1,
                            ['--orbit-duration' as string]: `${durationValue}s`,
                            ['--orbit-play-state' as string]: isPaused ? 'paused' : 'running',
                          }}
                          aria-label={`${item.label} (${item.type || 'Academic Feature'})`}
                        >
                          <span
                            className="transition-transform duration-250 flex items-center justify-center shrink-0"
                            style={{
                              color: isHovered || isActive ? '#7A1F1D' : '#5A554E',
                              transform: isHovered || isActive ? 'scale(1.15)' : 'scale(1)',
                            }}
                          >
                            {item.svg}
                          </span>
                          <span className="tracking-tight leading-none">{item.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 
          ======================================================================
          INTERACTIVE CONTROLS & FOLIO INSPECTOR PANEL
          Displays truthful details for the active node with direct navigation.
          ======================================================================
        */}
        {showDetailPanel && activeItem && (
          <div className="w-full max-w-3xl mt-6 sm:mt-10 px-4">
            <div className="p-5 sm:p-7 bg-card border border-ink/20 shadow-xs space-y-4">
              {/* Header Strip with Ring Info, Node Type, and Play/Pause Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
                <div className="flex items-center gap-2 sm:gap-3 text-xs meta-mono">
                  <span className="text-oxblood font-semibold uppercase tracking-wider">
                    {activeOrbit?.name || 'Clio Ecosystem'}
                  </span>
                  <span className="text-ink/30">/</span>
                  <span className="text-ash">{activeItem.type || 'Archive Component'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Orbit Play/Pause Toggle */}
                  <button
                    type="button"
                    onClick={() => setInternalPaused(!isPaused)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] meta-mono bg-paper border border-ink/20 hover:border-ink transition-colors text-ink cursor-pointer"
                    title={isPaused ? 'Resume Orbit Animation' : 'Pause Orbit Animation'}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3 h-3 text-oxblood" />
                        <span>Resume Orbit</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3 text-oxblood" />
                        <span>Pause Orbit</span>
                      </>
                    )}
                  </button>

                  {/* Reset view */}
                  {activeNodeId !== (orbits[0]?.items[0]?.id || '') && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveNodeId(orbits[0]?.items[0]?.id || 'institutions')
                      }
                      className="p-1 text-ash hover:text-ink transition-colors"
                      title="Reset Selection"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Node Title, Badge & Description */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-8 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-paper border border-ink/15 text-oxblood shrink-0">
                      {activeItem.svg}
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl text-ink leading-tight">
                      {activeItem.label}
                    </h3>
                    {activeItem.badge && (
                      <span className="px-2 py-0.5 text-[10px] meta-mono bg-oxblood/10 text-oxblood font-medium border border-oxblood/20 rounded-xs">
                        {activeItem.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-xl">
                    {activeItem.desc}
                  </p>
                </div>

                {/* Direct Action Link if the node connects to a live route */}
                <div className="md:col-span-4 flex md:justify-end items-center pt-2 md:pt-0">
                  {activeItem.href ? (
                    <Link
                      href={activeItem.href}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper hover:bg-oxblood text-xs font-medium tracking-tight transition-colors cursor-pointer"
                    >
                      <span>{activeItem.actionLabel || 'Explore in Archive'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs meta-mono text-ash italic">
                      Core Institutional Engine
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Quick-Switcher Pills for Touch / Keyboard Users */}
              <div className="pt-2 border-t border-ink/10">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                  <span className="text-[11px] meta-mono text-ash/80 shrink-0">
                    Orbit Index:
                  </span>
                  {allItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNodeClick(item)}
                      className={cn(
                        'text-[11px] meta-mono px-2.5 py-1 border transition-colors whitespace-nowrap cursor-pointer',
                        item.id === activeItem.id
                          ? 'bg-oxblood text-paper border-oxblood'
                          : 'bg-paper text-ash border-ink/15 hover:border-ink hover:text-ink'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SolarSystem.displayName = 'SolarSystem';
