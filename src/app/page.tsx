import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, ShieldCheck, Layers, HardDrive } from 'lucide-react';
import SculptureHero from '@/components/ui/liquid-sculpture-hero';
import { ScrollDissolveReveal } from '@/components/ui/scroll-dissolve-reveal';
import { SolarSystem } from '@/components/ui/solar-system';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="flex flex-col bg-paper text-ink">
      {/* ─────────────────────────────────────────────────────────────
          STAGE 1: EXACT ORIGINAL LIQUID SCULPTURE HERO
          Preserves original WebGL2 GPGPU particle physics, artwork,
          interactive liquid cursor dynamics, and 21st.dev composition.
          Directs scholars straight to the catalogue (/documents).
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
          label: 'Enter the Catalogue',
          href: '/documents',
        }}
        secondaryCta={{
          label: 'Contribute notes',
          href: '/upload',
        }}
        navLinks={[
          { label: 'Catalogue', href: '/documents' },
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
          EDITORIAL RUNNING MASTHEAD
         ───────────────────────────────────────────────────────────── */}
      <div className="border-y border-ink/15 bg-paper py-3.5">
        <div className="container-editorial">
          <div className="grid grid-cols-12 gap-x-4 sm:gap-x-6 items-baseline meta-mono text-ash text-xs">
            <span className="col-span-3 sm:col-span-2 text-ink font-semibold tracking-wider">CLIO</span>
            <span className="hidden sm:block sm:col-span-3 text-ink/70">Vol. I · Academic Monograph</span>
            <span className="hidden md:block md:col-span-4 text-ink/70">
              {config.app.collegeName} · Syllabus Archive
            </span>
            <span className="col-span-9 sm:col-span-7 md:col-span-3 text-right text-ink">
              OCTOBER 2026 EDITION
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STAGE 2: PURPOSE STATEMENT / EDITORIAL OVERVIEW
          Concise, typographic exposition of the archive's mission.
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-paper">
        <div className="container-editorial">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Heading and Thesis */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-4">
                <span className="meta-mono text-oxblood font-semibold">Issue 01</span>
                <span className="block h-px w-10 bg-ink/40" />
                <span className="label-eyebrow">Purpose of the Archive</span>
              </div>

              <h2 className="font-display text-[clamp(2.5rem,5.5vw,4.75rem)] leading-[0.98] tracking-[-0.035em] text-balance text-ink">
                An open academic repository, <span className="display-italic text-ink/80">indexed for scholars.</span>
              </h2>

              <p className="text-base sm:text-lg leading-relaxed text-ash max-w-2xl">
                Clio is dedicated to the preservation, verification, and open circulation of undergraduate and postgraduate scholarship. We curate syllabus folios, lecture annotations, historical examinations, and laboratory manuals into an enduring institutional record.
              </p>

              <div className="pt-2">
                <Link
                  href="/documents"
                  className="group inline-flex items-center gap-3 px-6 py-3.5 bg-ink text-paper hover:bg-oxblood transition-colors text-xs meta-mono uppercase tracking-wider font-medium"
                >
                  <span>Explore Academic Catalogue</span>
                  <ArrowUpRight className="w-4 h-4 text-paper transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: Three Archival Tenets */}
            <div className="lg:col-span-5 space-y-8 lg:border-l lg:border-ink/15 lg:pl-10">
              <div className="space-y-2">
                <span className="meta-mono text-xs text-oxblood font-semibold">01 / Rigorous Verification</span>
                <h3 className="font-display text-xl text-ink font-medium">Curated Against Course Syllabi</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Every deposited manuscript is reviewed for departmental accuracy, correct course coding, and unit alignment before entering the public index.
                </p>
              </div>

              <div className="space-y-2 border-t border-ink/15 pt-6">
                <span className="meta-mono text-xs text-oxblood font-semibold">02 / Format Discipline</span>
                <h3 className="font-display text-xl text-ink font-medium">Structured for Deep Study</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Folios are organized by five syllabus units, complete with derivations, circuit schematics, and worked examination solutions.
                </p>
              </div>

              <div className="space-y-2 border-t border-ink/15 pt-6">
                <span className="meta-mono text-xs text-oxblood font-semibold">03 / Perpetual Open Access</span>
                <h3 className="font-display text-xl text-ink font-medium">Free From Commercial Friction</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  No paywalls, subscription gates, or distracting advertisements. Knowledge preserved by students, for students.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STAGE 3: CONNECTED ACADEMIC ECOSYSTEM (SOLAR SYSTEM)
          Interactive planetary orbit visualization of Clio's connected
          academic resources, subjects, collections, and student folios.
         ───────────────────────────────────────────────────────────── */}
      <section id="academic-ecosystem" className="py-20 sm:py-28 bg-bone border-t border-ink/15 overflow-hidden">
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
          STAGE 4: HISTORICAL ART METAMORPHOSIS (SCROLL DISSOLVE REVEAL)
          Johann Hamza's "The Library" (front) dissolving into
          Edward Lamson Henry's "Library Interior" (back).
         ───────────────────────────────────────────────────────────── */}
      <section id="archive-reveal" className="relative bg-paper pt-16 sm:pt-24 pb-8 sm:pb-12 border-t border-ink/15">
        <div className="container-editorial">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-3">
              <span className="meta-mono text-oxblood font-semibold tracking-widest text-xs uppercase">
                KNOWLEDGE, PRESERVED.
              </span>
              <span className="block h-px w-8 bg-ink/30" />
              <span className="label-eyebrow text-xs">ARCHIVAL REVELATION</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-[-0.03em] text-ink text-balance">
              From the scholar&apos;s desk to the <span className="display-italic text-oxblood">perpetual archive.</span>
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-ash max-w-xl mx-auto">
              Every enduring idea begins in intimate study—with open manuscripts, critical annotations, and deep inquiry. Clio preserves, verifies, and connects each folio into an enduring institutional record.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2 text-xs meta-mono text-ash/80">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-oxblood animate-pulse" />
              <span>Scroll down to experience the visual transition</span>
            </div>
          </div>
        </div>
      </section>

      {/*
        Primary Historical Artwork: "The Library" by Johann Hamza (1850–1927), Oil on panel.
        Secondary Historical Artwork: Edward Lamson Henry (1841–1919), "Library Interior", c. 1900.
      */}
      <ScrollDissolveReveal
        imageFront="/images/clio/johann-hamza-the-library.jpg"
        imageBack="/images/clio/the-archive-lamson-henry.webp"
        frontAlt="Johann Hamza, The Library — a scholar reading in a book-lined study."
        backAlt="The Archive — Edward Lamson Henry (1841–1919), Library Interior, c. 1900"
        containerClassName="h-[230vh] border-b border-ink/15 bg-[#121110]"
        className="h-screen w-full flex items-center justify-center"
        showMuseumOverlay
      />

      {/* ─────────────────────────────────────────────────────────────
          STAGE 5: ARCHIVAL PRINCIPLES & CURATION STANDARDS
          Curated standards of scholarship, formatting, and moderation.
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-paper">
        <div className="container-editorial">
          <div className="max-w-2xl mb-14 sm:mb-18 space-y-3">
            <div className="flex items-center gap-4">
              <span className="meta-mono text-oxblood font-semibold">05</span>
              <span className="block h-px w-10 bg-ink/40" />
              <span className="label-eyebrow">Archival Principles</span>
            </div>
            <h2 className="text-[clamp(2rem,4.5vw,3.75rem)] font-display font-normal leading-[1.02] tracking-[-0.03em] text-ink text-balance">
              Standards of scholarly <span className="display-italic text-ink/85">preservation.</span>
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-ash">
              We uphold strict cataloguing criteria so every downloaded document is immediately ready for study, examination preparation, and laboratory execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-card border border-ink/15 space-y-4">
              <div className="w-10 h-10 border border-ink/20 flex items-center justify-center text-oxblood bg-paper">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <span className="meta-mono text-[11px] text-ash uppercase tracking-wider block">
                  Criterion I
                </span>
                <h3 className="font-display text-xl text-ink font-medium">Syllabus Integrity</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Folios must address established university module units, verified against current semester regulations.
                </p>
              </div>
            </div>

            <div className="p-6 bg-card border border-ink/15 space-y-4">
              <div className="w-10 h-10 border border-ink/20 flex items-center justify-center text-oxblood bg-paper">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <span className="meta-mono text-[11px] text-ash uppercase tracking-wider block">
                  Criterion II
                </span>
                <h3 className="font-display text-xl text-ink font-medium">Peer Moderation</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Every uploaded manuscript is audited for legibility, completeness, and academic honesty before indexation.
                </p>
              </div>
            </div>

            <div className="p-6 bg-card border border-ink/15 space-y-4">
              <div className="w-10 h-10 border border-ink/20 flex items-center justify-center text-oxblood bg-paper">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <span className="meta-mono text-[11px] text-ash uppercase tracking-wider block">
                  Criterion III
                </span>
                <h3 className="font-display text-xl text-ink font-medium">Format Discipline</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Unit notes, solved exams, and lab manuals follow uniform indexing formats with standard metadata and tags.
                </p>
              </div>
            </div>

            <div className="p-6 bg-card border border-ink/15 space-y-4">
              <div className="w-10 h-10 border border-ink/20 flex items-center justify-center text-oxblood bg-paper">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <span className="meta-mono text-[11px] text-ash uppercase tracking-wider block">
                  Criterion IV
                </span>
                <h3 className="font-display text-xl text-ink font-medium">Private Storage Quota</h3>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  Each registered scholar receives a dedicated 50 GB private storage quota for saved folios and personal collections.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STAGE 6: FINAL CALL TO ACTION & MONOGRAPH COLOPHON
          Clean invitation to explore catalogue or deposit materials.
         ───────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-bone border-t border-ink/15">
        <div className="container-editorial">
          {/* Editorial Pullquote */}
          <figure className="relative mx-auto text-center max-w-3xl pb-16 sm:pb-20 border-b border-ink/15">
            <span
              aria-hidden="true"
              className="absolute -top-8 -left-4 sm:-top-12 sm:-left-8 font-display text-8xl sm:text-9xl text-oxblood/15 leading-none select-none pointer-events-none"
            >
              “
            </span>
            <blockquote className="relative">
              <p className="font-display italic font-light text-balance text-ink leading-[1.2] tracking-tight text-[clamp(1.65rem,3.4vw,2.5rem)] mx-auto max-w-2xl">
                An academic resource at rest is scholarship at its most legible. The proofs are honest. The derivations have room to breathe. The student has time to learn.
              </p>
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-4 justify-center">
              <span className="block h-px w-10 bg-ink/40" aria-hidden="true" />
              <span className="meta-mono text-xs sm:text-sm text-ink">
                Academic Moderation Board <span className="text-ash">· Clio Archive</span>
              </span>
            </figcaption>
          </figure>

          {/* Invitation & Dual Actions */}
          <div className="pt-16 sm:pt-20 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <span className="meta-mono text-xs text-oxblood font-semibold tracking-wider uppercase">
                OPEN ACCESS · NO SUBSCRIPTION GATES
              </span>
              <h3 className="font-display text-2xl sm:text-3xl text-ink font-normal">
                Enter the archive or deposit scholarship.
              </h3>
              <p className="text-xs sm:text-sm text-ash max-w-md">
                All course folios, laboratory manuals, and examination papers are freely accessible.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/documents"
                className="px-6 py-3.5 bg-ink text-paper hover:bg-oxblood transition-colors text-xs meta-mono uppercase tracking-wider font-medium flex items-center gap-2"
              >
                <span>Browse Full Catalogue</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-paper" />
              </Link>
              <Link
                href="/upload"
                className="px-6 py-3.5 bg-paper text-ink border border-ink/20 hover:border-ink transition-colors text-xs meta-mono uppercase tracking-wider font-medium flex items-center gap-2"
              >
                <span>Deposit Academic PDF</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Monograph Colophon */}
          <div className="mt-16 sm:mt-20 pt-8 border-t border-ink/15 flex flex-col sm:flex-row items-center justify-between gap-4 meta-mono text-[11px] text-ash">
            <span>CLIO ACADEMIC ARCHIVE · MMXXVI</span>
            <span>INDEXED &amp; PRESERVED FOR {config.app.collegeName.toUpperCase()}</span>
            <span>RESTRICTED TO VERIFIED CURRICULUM</span>
          </div>
        </div>
      </section>
    </div>
  );
}
