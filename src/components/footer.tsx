import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { config } from '@/lib/config';

export function Footer() {
  return (
    <footer className="bg-ink text-paper mt-auto">
      <div className="container-editorial py-18 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Column 1: Brand & Academic Mission */}
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-baseline gap-2.5 group"
              aria-label="Clio home"
            >
              <span className="font-display text-4xl sm:text-5xl text-paper tracking-tight font-medium leading-none">
                Clio
              </span>
            </Link>
            <p className="mt-3 text-xs meta-mono text-paper/60 uppercase tracking-widest">
              {config.app.tagline}
            </p>
            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-paper/70">
              The verified academic digital library for {config.app.collegeName}. Dedicated to preserving, organizing, and distributing syllabus notes, unit folios, and examination solutions for the student community.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span className="meta-mono text-paper/60">Archive</span>
              <span className="block h-px w-8 bg-paper/30"></span>
              <span className="meta-mono text-paper">Academic Hub · Vol. I</span>
            </div>
          </div>

          {/* Column 2: Indexed Navigation */}
          <div className="lg:col-span-3 lg:col-start-7">
            <span className="meta-mono text-paper/60">Index</span>
            <ul className="mt-5 flex flex-col gap-3">
              {[
                { label: 'Library Catalog', href: '/documents', num: '01' },
                { label: 'Upload PDF', href: '/upload', num: '02' },
                { label: 'My Submissions', href: '/my-submissions', num: '03' },
                { label: 'Saved Bookmarks', href: '/favorites', num: '04' },
                { label: 'Moderation Queue', href: '/admin', num: '05' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-baseline justify-between text-paper/85 hover:text-paper transition-colors"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="meta-mono text-paper/50">{link.num}</span>
                      <span className="text-sm font-medium tracking-tight">{link.label}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-paper" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Academic Standards & Policies */}
          <div className="lg:col-span-3 lg:col-start-10">
            <span className="meta-mono text-paper/60">Honor & Compliance</span>
            <ul className="mt-5 flex flex-col gap-3 text-paper/85">
              <li>
                <Link href="/upload#declaration" className="link-underline text-sm">
                  Academic Integrity Code
                </Link>
              </li>
              <li>
                <Link href="/documents" className="link-underline text-sm">
                  Peer Moderation Protocol
                </Link>
              </li>
              <li>
                <Link href="/documents" className="link-underline text-sm">
                  Report Copyright or Abuse
                </Link>
              </li>
              <li className="text-paper/70 text-xs pt-3 leading-relaxed">
                <span className="block font-medium text-paper">{config.app.collegeName}</span>
                <span className="block mt-0.5">Undergraduate & Research Division</span>
                <span className="block meta-mono text-paper/50 mt-1">Google Drive Embedded PDF Library</span>
              </li>
            </ul>

          </div>
        </div>

        {/* Bottom Bar with Metadata and Copyright */}
        <div className="mt-16 sm:mt-20 pt-8 border-t border-paper/15 grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
          <p className="md:col-span-6 text-xs text-paper/60 leading-relaxed">
            © {new Date().getFullYear()} {config.app.collegeName}. All academic course notes belong to their respective student and faculty contributors.
          </p>
          <div className="md:col-span-3 md:col-start-7 flex items-center gap-3">
            <span className="meta-mono text-paper/50">Edition</span>
            <span className="meta-mono text-paper">VOL. I — 2026</span>
          </div>
          <div className="md:col-span-3 md:col-start-10 flex md:justify-end items-center gap-6">
            <span className="meta-mono text-paper/50">Verified Academic Hub</span>
          </div>
        </div>
      </div>

      {/* Giant Editorial Watermark Banner at Bottom */}
      <div className="overflow-hidden border-t border-paper/10">
        <div className="container-editorial py-6">
          <div className="font-display text-paper/10 leading-none tracking-[-0.04em] text-[clamp(3.5rem,15vw,14rem)] select-none whitespace-nowrap text-center">
            CLIO <span className="display-italic">·</span> ARCHIVE
          </div>
        </div>
      </div>
    </footer>
  );
}
