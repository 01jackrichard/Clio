import React from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
} from 'lucide-react';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';
import { ScrollDissolveReveal } from '@/components/ui/scroll-dissolve-reveal';
import { SolarSystem } from '@/components/ui/solar-system';
import { DEPARTMENTS } from '@/lib/constants';
import { getDocuments } from '@/lib/services/document-service';
import { DocumentCard } from '@/components/document-card';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch real approved documents from the database
  const recentDocs = await getDocuments({ limit: 6, sort: 'newest' });

  return (
    <div className="flex flex-col bg-paper text-ink">
      {/* ─────────────────────────────────────────────────────────────
          1. EXACT ORIGINAL LIQUID SCULPTURE HERO
          Preserves original WebGL2 GPGPU particle physics, artwork,
          interactive liquid cursor dynamics, and 21st.dev composition.
          Height is 100svh. Because no navbar is rendered above it,
          it occupies the exact full screen with zero clipping.
         ───────────────────────────────────────────────────────────── */}
      <SculptureHero
        brand="Clio"
        showNav={true}
        theme="light"
        themeToggle={false}
        sculptureScale={1.14}
        mobileSculptureScale={1.08}
        eyebrow="THE ACADEMIC ARCHIVE · KNOWLEDGE, PRESERVED"
        headline={'Your semester,\nwithin reach.'}
        headlineAccent="within reach."
        body="A shared academic resource library where students discover, upload, organize, preview, and download notes, previous-year question papers, and lab manuals."
        primaryCta={{
          label: 'Browse the library',
          href: '/documents',
        }}
        secondaryCta={{
          label: 'Contribute notes',
          href: '/upload',
        }}
        navLinks={[
          { label: 'Library', href: '/documents' },
          { label: 'Upload PDF', href: '/upload' },
          { label: 'Sign in', href: '/auth/login' },
        ]}
        navCta={{
          label: 'Register',
          href: '/auth/register',
        }}
        backdropText="CLIO"
        showCredit={true}
      />

      {/* ─────────────────────────────────────────────────────────────
          2. RUNNING MASTHEAD / EDITORIAL HEADER STRIP
          Directly following the hero, setting the tone of an editorial journal
          ───────────────────────────────────────────────────────────── */}
      <div className="border-y border-ink/15 bg-paper py-3.5">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-x-4 sm:gap-x-6 items-baseline meta-mono text-ash">
            <span className="col-span-3 sm:col-span-2 text-ink font-semibold tracking-wider">CLIO</span>
            <span className="hidden sm:block sm:col-span-3 text-ink/70">Vol. I · Academic Archive</span>
            <span className="hidden md:block md:col-span-4 text-ink/70">
              {config.app.collegeName} · Syllabus Hub
            </span>
            <span className="col-span-9 sm:col-span-7 md:col-span-3 text-right text-ink">
              OCTOBER 2026 EDITION
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2.5 SCROLL DISSOLVE REVEAL — ARCHIVAL METAMORPHOSIS
          From scattered physical notes to lasting indexed knowledge
         ───────────────────────────────────────────────────────────── */}
      <section id="archive-reveal" className="relative bg-paper pt-14 sm:pt-20 pb-8 sm:pb-12 border-b border-ink/15">
        <div className="container-editorial">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-3">
              <span className="meta-mono text-oxblood font-semibold tracking-widest text-xs uppercase">
                KNOWLEDGE, PRESERVED.
              </span>
              <span className="block h-px w-8 bg-ink/30" />
              <span className="label-eyebrow text-xs">ARCHIVAL METAMORPHOSIS</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-[-0.03em] text-ink text-balance">
              From scattered notes to <span className="display-italic text-oxblood">lasting knowledge.</span>
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-ash max-w-xl mx-auto">
              Before research notes and lecture materials are catalogued, they live scattered across notebooks and desks. Clio collects, verifies, and indexes each folio into a structured institutional archive.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs meta-mono text-ash/80">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-oxblood animate-pulse" />
              <span>Scroll down to reveal the digital transformation</span>
            </div>
          </div>
        </div>
      </section>

      <ScrollDissolveReveal
        imageFront="/images/clio/scattered-study-notes.webp"
        imageBack="/images/clio/clio-archive-preview.webp"
        containerClassName="h-[220vh] border-b border-ink/15 bg-[#141312]"
        className="h-screen w-full flex items-center justify-center"
      >
        {/* Archival Overlay Labels */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-8 md:p-12">
          {/* Top Archival Header Strip */}
          <div className="flex items-center justify-between meta-mono text-xs text-paper/85 bg-ink/60 backdrop-blur-xs px-4 py-2 border border-paper/10 max-w-full">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-oxblood" />
              <span className="text-paper font-semibold tracking-wider">CLIO ARCHIVE</span>
              <span className="text-paper/40">/</span>
              <span className="hidden sm:inline text-paper/70">METAMORPHOSIS</span>
            </span>
            <span className="text-paper/60 uppercase tracking-widest text-[10px] sm:text-xs">
              Scroll Reveal
            </span>
          </div>

          {/* Bottom Archival Legend */}
          <div className="flex items-center justify-between meta-mono text-xs text-paper/85 bg-ink/60 backdrop-blur-xs px-4 py-2.5 border border-paper/10 max-w-full">
            <span className="flex items-center gap-2">
              <span className="text-oxblood font-bold">01</span>
              <span className="text-paper/90">Scattered Physical Notes</span>
            </span>
            <span className="text-paper/40 hidden sm:inline">───────────►</span>
            <span className="flex items-center gap-2">
              <span className="text-oxblood font-bold">02</span>
              <span className="text-paper/90">Indexed Institutional Archive</span>
            </span>
          </div>
        </div>
      </ScrollDissolveReveal>

      {/* ─────────────────────────────────────────────────────────────
          3. SECTION 01 — ACADEMIC INDEX & SEARCH CONSOLE
          Inspired by Apex & Asphalt Hero Layout (Issue 06 editorial grid)
         ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-paper">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-y-12 gap-x-6 lg:gap-x-12 items-start">
            {/* Left Column: Editorial Headline & Prominent Search */}
            <div className="col-span-12 lg:col-span-7 flex flex-col justify-between gap-8">
              <div className="flex items-center gap-4">
                <span className="meta-mono text-oxblood font-semibold">Issue 01</span>
                <span className="block h-px w-10 bg-ink/40" />
                <span className="label-eyebrow">Academic Index & Syllabus Search</span>
              </div>

              <h2 className="font-display text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.94] tracking-[-0.04em] text-balance text-ink">
                A photographic <span className="display-italic text-ink/85">archive</span> of the college{' '}
                <span className="display-italic text-ink/85">curriculum.</span>
              </h2>

              <p className="text-base sm:text-lg leading-relaxed text-ash max-w-xl">
                Independent academic repository. We curate, verify, and index lecture notes, unit syllabus folios, past examination papers, and laboratory manuals across all college departments.
              </p>

              {/* Architectural Search Form */}
              <div className="space-y-3 pt-2">
                <form action="/documents" method="GET" className="relative flex items-center shadow-xs">
                  <input
                    type="text"
                    name="q"
                    placeholder="Search by subject (e.g. Data Structures), course code, or topic..."
                    className="w-full h-14 pl-5 pr-36 bg-card border border-ink/30 text-ink placeholder:text-ash text-sm focus:outline-none focus:border-ink transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 px-5 py-2.5 bg-ink text-paper hover:bg-oxblood text-xs font-medium tracking-tight transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span className="meta-mono text-paper">Search Index</span>
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Popular Topics in .meta-mono style */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="meta-mono text-ash">Topics:</span>
                  {[
                    { tag: 'Data Structures', num: '01' },
                    { tag: 'Operating Systems', num: '02' },
                    { tag: 'Calculus', num: '03' },
                    { tag: 'Digital Electronics', num: '04' },
                    { tag: 'Thermodynamics', num: '05' },
                  ].map((item) => (
                    <Link
                      key={item.tag}
                      href={`/documents?q=${encodeURIComponent(item.tag)}`}
                      className="inline-flex items-baseline gap-1.5 px-2.5 py-1 bg-bone border border-ink/15 hover:border-ink transition-colors text-ink text-xs"
                    >
                      <span className="meta-mono text-oxblood">{item.num}</span>
                      <span className="font-medium">{item.tag}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Featured Study Folio Card (Matching Reference Feature 01) */}
            <div className="col-span-12 lg:col-span-5">
              <div className="relative aspect-[4/5] bg-bone border border-ink/20 p-6 flex flex-col justify-between overflow-hidden">
                <div className="flex items-start justify-between meta-mono">
                  <span className="bg-ink text-paper px-2.5 py-1">FOLIO · Nº 01</span>
                  <span className="bg-paper text-ink px-2.5 py-1 border border-ink/20">2026</span>
                </div>

                <div className="my-auto py-8 text-center space-y-3">
                  <span className="meta-mono text-oxblood">Verified Manuscript</span>
                  <h3 className="font-display text-3xl sm:text-4xl text-ink leading-tight tracking-[-0.02em]">
                    Data Structures <span className="display-italic">&amp;</span> Algorithms
                  </h3>
                  <p className="font-display italic text-sm text-ash max-w-xs mx-auto">
                    Full handwritten module notes covering trees, balanced AVL graphs, and dynamic programming
                  </p>
                </div>

                <div className="bg-paper p-4 border border-ink/15 flex items-center justify-between">
                  <div>
                    <p className="meta-mono text-ash">Department Study</p>
                    <p className="font-display text-sm font-semibold text-ink mt-0.5">
                      Computer Science · Semester 3
                    </p>
                  </div>
                  <Link
                    href="/documents"
                    className="flex h-9 w-9 items-center justify-center border border-ink/30 hover:bg-ink hover:text-paper transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Stats Strip (Matching Reference Stats Bar) */}
          <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10 border-t border-ink/15 pt-10">
            <div className="flex flex-col gap-3">
              <span className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none font-normal tracking-[-0.04em] text-ink">
                8
              </span>
              <span className="block h-px w-8 bg-ink/40" aria-hidden="true" />
              <span className="label-eyebrow text-ink/80">Academic Departments</span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none font-normal tracking-[-0.04em] text-ink">
                100%
              </span>
              <span className="block h-px w-8 bg-ink/40" aria-hidden="true" />
              <span className="label-eyebrow text-ink/80">Peer-Moderated PDFs</span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none font-normal tracking-[-0.04em] text-ink">
                DRIVE
              </span>
              <span className="block h-px w-8 bg-ink/40" aria-hidden="true" />
              <span className="label-eyebrow text-ink/80">Institutional Storage</span>
            </div>

            <div className="flex flex-col gap-3">
              <span className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none font-normal tracking-[-0.04em] text-ink">
                MMXXVI
              </span>
              <span className="block h-px w-8 bg-ink/40" aria-hidden="true" />
              <span className="label-eyebrow text-ink/80">Established</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. CONTINUOUS MARQUEE TICKER (Matching Reference Marquee)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden border-y bg-paper text-ink border-ink/15 py-5 sm:py-6" aria-hidden="true">
        <div className="animate-marquee whitespace-nowrap flex items-center">
          {[
            'Lecture Notes',
            'Unit Syllabi',
            'Question Paper Archive',
            'Laboratory Manuals',
            'Semester Digests',
            'Solved Exam Papers',
            'Reference Manuscripts',
            'Lecture Notes',
            'Unit Syllabi',
            'Question Paper Archive',
            'Laboratory Manuals',
            'Semester Digests',
            'Solved Exam Papers',
            'Reference Manuscripts',
          ].map((item, idx) => (
            <span key={idx} className="flex items-center gap-8 sm:gap-12 px-6 sm:px-8">
              <span className="font-display italic text-2xl sm:text-3xl md:text-4xl font-light tracking-tight">
                {item}
              </span>
              <span className="text-2xl sm:text-3xl md:text-4xl font-light text-ink/30">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. SECTION 02 — RECENTLY APPROVED RESOURCES
          Matching Reference Section 02 ("Selected commissions, freshly bound")
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-paper">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 sm:mb-18 items-end">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-4 mb-4">
                <span className="meta-mono text-oxblood font-semibold">02</span>
                <span className="block h-px w-10 bg-ink/40" />
                <span className="label-eyebrow">Recent Acquisitions</span>
              </div>
              <h2 className="text-[clamp(2rem,4.5vw,3.75rem)] font-display font-normal leading-[0.96] tracking-[-0.03em] text-ink text-balance">
                Selected resources, <span className="display-italic text-ink/85">freshly bound.</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-ash max-w-2xl">
                A working selection from the academic repository. New documents are indexed as peer and faculty reviews complete.
              </p>
            </div>

            <div className="lg:col-span-4 lg:col-start-9 flex lg:justify-end">
              <Link
                href="/documents?sort=newest"
                className="group inline-flex items-center gap-3"
              >
                <span className="link-underline meta-mono text-ink text-sm">Browse Full Archive</span>
                <span className="flex h-10 w-10 items-center justify-center border border-ink/30 group-hover:bg-ink group-hover:text-paper transition-colors duration-300">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          {/* Database Content */}
          {recentDocs.unconfigured ? (
            <div className="p-10 border border-ink/20 bg-bone text-left space-y-4">
              <div className="flex items-center gap-3">
                <span className="meta-mono text-oxblood font-semibold">Config 01</span>
                <span className="block h-px w-8 bg-ink/30" />
                <span className="label-eyebrow">Database Connection Required</span>
              </div>
              <h3 className="font-display text-2xl text-ink">Catalog Database Unconfigured</h3>
              <p className="text-sm text-ash leading-relaxed max-w-xl">
                Clio is installed and ready. To display live approved resources from Supabase, configure <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in <code className="meta-mono">.env.local</code>.
              </p>
            </div>
          ) : recentDocs.error ? (
            <div className="p-10 border border-rose-300 bg-rose-50 text-left space-y-4">
              <h3 className="font-display text-2xl text-rose-950">Unable to Load Recent Resources</h3>
              <p className="text-sm text-rose-800 max-w-xl">
                A database query exception occurred. Please verify your table schema and Supabase connectivity.
              </p>
            </div>
          ) : recentDocs.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentDocs.data.map((doc, idx) => (
                <DocumentCard key={doc.id} document={doc} index={idx + 1} />
              ))}
            </div>
          ) : (
            <div className="p-14 text-center border border-dashed border-ink/20 bg-card space-y-4">
              <p className="meta-mono text-ash">Archive Inception</p>
              <h3 className="font-display text-2xl sm:text-3xl text-ink">
                Be the first to deposit notes for this semester
              </h3>
              <p className="text-sm text-ash max-w-md mx-auto leading-relaxed">
                No verified folios have been indexed in the catalog yet. Deposit lecture notes, exam papers, or lab records to initiate your college archive.
              </p>
              <div className="pt-4">
                <Link
                  href="/upload"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper hover:bg-oxblood transition-colors text-sm font-medium tracking-tight"
                >
                  <span>Upload Academic PDF</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. SECTION 03 — SYLLABUS ARCHITECTURE & DEPARTMENTS
          Matching Reference Section 03 ("A studio that prefers restraint to spectacle")
          ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-bone border-t border-ink/15">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Department Directory */}
            <div className="lg:col-span-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="meta-mono text-oxblood font-semibold">03</span>
                <span className="block h-px w-10 bg-ink/40" />
                <span className="label-eyebrow">Academic Faculties</span>
              </div>

              <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] tracking-[-0.025em] text-balance text-ink">
                An archive arranged with <span className="display-italic">discipline</span> &amp; care.
              </h2>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-ash max-w-prose">
                Every undergraduate and postgraduate branch maintains its dedicated repository. Materials are strictly classified under official university course codes, units, and semester schemes.
              </p>

              <ul className="mt-8 grid grid-cols-1 gap-4">
                {DEPARTMENTS.slice(0, 4).map((dept, idx) => (
                  <li key={dept} className="grid grid-cols-12 gap-4 border-t border-ink/15 pt-4">
                    <span className="col-span-2 sm:col-span-1 meta-mono text-oxblood pt-0.5">
                      0{idx + 1}
                    </span>
                    <div className="col-span-10 sm:col-span-11">
                      <h4 className="font-display text-lg text-ink leading-tight">
                        <Link href={`/documents?department=${encodeURIComponent(dept)}`} className="hover:text-oxblood transition-colors">
                          {dept}
                        </Link>
                      </h4>
                      <p className="mt-1 text-xs text-ash">
                        Core theory notes, lab manuals, and end-sem solutions →
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href="/documents"
                  className="group inline-flex items-center gap-3 meta-mono text-ink"
                >
                  <span className="link-underline">View all 8 department archives</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>

            {/* Right Column: Complete Department Cards Grid */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DEPARTMENTS.map((dept, idx) => (
                <Link
                  key={dept}
                  href={`/documents?department=${encodeURIComponent(dept)}`}
                  className="p-5 bg-paper border border-ink/15 hover:border-ink transition-colors flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between meta-mono text-ash mb-3">
                    <span className="text-oxblood">DEP {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h4 className="font-display text-base font-semibold text-ink group-hover:text-oxblood transition-colors leading-snug">
                      {dept}
                    </h4>
                    <p className="meta-mono text-[11px] text-ash mt-1">Explore Syllabus →</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. SECTION 04 — FOUR CURATED RESOURCE FORMATS
          Matching Reference Section 04 ("Four ways to commission our work")
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-paper border-t border-ink/15">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 sm:mb-18">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-4 mb-4">
                <span className="meta-mono text-oxblood font-semibold">04</span>
                <span className="block h-px w-10 bg-ink/40" />
                <span className="label-eyebrow">Curated Formats</span>
              </div>
              <h2 className="text-[clamp(2rem,4.5vw,3.75rem)] font-display font-normal leading-[0.96] tracking-[-0.03em] text-ink text-balance">
                Four formats to master <span className="display-italic text-ink/85">your semester.</span>
              </h2>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-ash max-w-2xl">
                Every study material undergoes format standardization. The list below outlines the foundational documents preserved in our repository.
              </p>
            </div>

            <div className="lg:col-span-4 lg:col-start-9 flex lg:items-end">
              <Link
                href="/upload"
                className="group inline-flex items-center gap-3"
              >
                <span className="link-underline meta-mono text-ink text-sm">Submit New Material</span>
                <span className="flex h-10 w-10 items-center justify-center border border-ink/30 group-hover:bg-ink group-hover:text-paper transition-colors duration-300">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>

          {/* Accordion / Structured Rows matching Reference */}
          <ul className="border-t border-ink/15">
            {[
              {
                num: 'Nº 01',
                title: 'The Unit Note Folio',
                italic: 'Comprehensive handwritten & typed module notes',
                desc: 'A complete syllabus exposition for an entire unit: conceptual definitions, theorem derivations, step-by-step algorithms, and worked examples.',
                details: ['All 5 Syllabus Units', 'Includes Derivations & Diagrams', 'Verified Against University Scheme'],
                matType: 'unit_notes',
              },
              {
                num: 'Nº 02',
                title: 'Previous-Year Exam Archive',
                italic: 'Past question papers with verified solutions',
                desc: 'Five years of mid-term and end-semester university examinations, categorized by year, question patterns, and marking schemes.',
                details: ['5-Year Historical Papers', 'Full Step-by-Step Markings', 'Repeated Question Frequency Tagged'],
                matType: 'previous_year_questions',
              },
              {
                num: 'Nº 03',
                title: 'Laboratory Manuals & Records',
                italic: 'Experimental setups, apparatus & observations',
                desc: 'Exemplary laboratory documentation featuring circuit schematics, apparatus specifications, procedure steps, tabular observations, and code listings.',
                details: ['Standard Apparatus Readings', 'Includes Circuit / Flowchart Layouts', 'Lab Exam Viva Questions'],
                matType: 'lab_manuals',
              },
              {
                num: 'Nº 04',
                title: 'Semester Revision Digest',
                italic: 'High-yield formula cards & exam-eve summaries',
                desc: 'Condensed study aids crafted for quick review before examinations: essential equations, key definitions, and concept roadmaps.',
                details: ['One-Page Formula Cheat-Sheets', 'Key Concept Maps', 'Rapid Recall Checklists'],
                matType: 'revision_notes',
              },
            ].map((format) => (
              <li key={format.num} className="border-b border-ink/15 py-7 sm:py-9">
                <div className="grid grid-cols-12 gap-4 sm:gap-8 items-start">
                  <span className="col-span-2 sm:col-span-1 meta-mono text-ash pt-1">
                    {format.num}
                  </span>

                  <div className="col-span-10 sm:col-span-6 lg:col-span-5">
                    <h3 className="font-display text-2xl sm:text-3xl tracking-[-0.025em] text-ink leading-[1.05]">
                      {format.title}
                    </h3>
                    <p className="font-display italic text-base sm:text-lg text-ash mt-1">
                      {format.italic}
                    </p>
                    <p className="text-sm text-ash mt-3 leading-relaxed">
                      {format.desc}
                    </p>
                  </div>

                  <div className="col-span-12 sm:col-span-4 lg:col-span-4 mt-4 sm:mt-0">
                    <ul className="space-y-1.5">
                      {format.details.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-ash meta-mono">
                          <span className="text-oxblood">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="col-span-12 sm:col-span-1 lg:col-span-2 flex sm:justify-end items-center mt-3 sm:mt-0">
                    <Link
                      href={`/documents?material_type=${format.matType}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink/20 hover:border-ink hover:bg-ink hover:text-paper transition-colors text-xs meta-mono"
                    >
                      <span>Explore</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. SECTION 05 — THE CLIO ECOSYSTEM (3D SOLAR SYSTEM)
          Interactive planetary orbit visualization of Clio's connected
          academic resources, institutions, and student community.
         ───────────────────────────────────────────────────────────── */}
      <section id="academic-ecosystem" className="py-20 sm:py-28 bg-paper border-t border-ink/15 overflow-hidden">
        <div className="container-editorial">
          <SolarSystem
            eyebrow="THE CLIO ECOSYSTEM"
            title="An archive of connected knowledge."
            description="Discover how academic resources, subjects, collections, and student contributions come together in one searchable archive."
            className="w-full"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. SECTION 06 — ACADEMIC PULLQUOTE
          Matching Reference Section 05 Pullquote
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-bone border-t border-ink/15">
        <div className="container-editorial max-w-4xl">
          <figure className="relative mx-auto text-center">
            <span
              aria-hidden="true"
              className="absolute -top-8 -left-4 sm:-top-12 sm:-left-8 font-display text-8xl sm:text-9xl text-oxblood/15 leading-none select-none pointer-events-none"
            >
              “
            </span>
            <blockquote className="relative">
              <p className="font-display italic font-light text-balance text-ink leading-[1.15] tracking-tight text-[clamp(1.65rem,3.4vw,2.5rem)] mx-auto max-w-3xl">
                An academic resource at rest is scholarship at its most legible. The proofs are honest. The derivations have room to breathe. The student has time to learn.
              </p>
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 justify-center">
              <span className="block h-px w-10 bg-ink/40" aria-hidden="true" />
              <span className="meta-mono text-ink">
                Academic Moderation Board <span className="text-ash">· Clio Archive</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
