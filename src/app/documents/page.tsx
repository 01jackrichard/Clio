import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, X, ArrowUpRight, AlertCircle, BookOpen, Plus } from 'lucide-react';
import { getDocuments } from '@/lib/services/document-service';
import { DocumentFilters } from '@/components/document-filters';
import { DocumentCard } from '@/components/document-card';
import { config } from '@/lib/config';
import { Container, buttonVariants } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface DocumentsPageProps {
  searchParams: Promise<{
    q?: string;
    department?: string;
    regulation?: string;
    academic_year?: string;
    semester?: string;
    subject?: string;
    subject_code?: string;
    unit?: string;
    material_type?: string;
    sort?: 'newest' | 'downloads' | 'title';
    page?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, parseInt(params.page || '1', 10));
  const result = await getDocuments({
    ...params,
    page,
    limit: 12,
  });

  const activeFilters = [
    params.q && { key: 'q', label: `Keyword: "${params.q}"` },
    params.department && { key: 'department', label: params.department },
    params.regulation && { key: 'regulation', label: `Regulation ${params.regulation}` },
    params.academic_year && { key: 'academic_year', label: params.academic_year },
    params.semester && { key: 'semester', label: params.semester },
    params.subject && { key: 'subject', label: `Subject: ${params.subject}` },
    params.subject_code && { key: 'subject_code', label: `Code: ${params.subject_code}` },
    params.unit && { key: 'unit', label: `Unit: ${params.unit}` },
    params.material_type && { key: 'material_type', label: params.material_type },
  ].filter(Boolean) as { key: string; label: string }[];

  const buildRemoveFilterUrl = (keyToRemove: string) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (key !== keyToRemove && key !== 'page' && val) {
        newParams.set(key, val);
      }
    });
    return `/documents${newParams.toString() ? `?${newParams.toString()}` : ''}`;
  };

  const buildPageUrl = (targetPage: number) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (key !== 'page' && val) {
        newParams.set(key, val);
      }
    });
    newParams.set('page', targetPage.toString());
    return `/documents?${newParams.toString()}`;
  };

  return (
    <div className="bg-paper min-h-screen">
      {/* 1. Refined Catalogue Hero */}
      <header className="border-b border-ink/15 py-10 sm:py-14">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              {/* Eyebrow Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2.5 meta-mono text-xs text-ash">
                <span className="text-oxblood font-semibold tracking-wider uppercase">Catalogue</span>
                <span className="text-ink/20" aria-hidden="true">/</span>
                <span className="tracking-wide uppercase">Academic Archive</span>
                {result.total > 0 && (
                  <>
                    <span className="text-ink/20" aria-hidden="true">/</span>
                    <span className="text-ink font-medium">
                      {result.total} {result.total === 1 ? 'Folio' : 'Folios'} Preserved
                    </span>
                  </>
                )}
              </div>

              {/* Editorial Display Heading */}
              <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-display font-normal leading-[1.15] tracking-tight text-ink text-balance">
                The Document Archive, <span className="display-italic text-ink/80">indexed & verified.</span>
              </h1>

              {/* Scannable Supporting Summary */}
              <p className="text-xs sm:text-sm text-ash max-w-xl leading-relaxed">
                Search and inspect lecture notes, curriculum folios, past examination solutions, and laboratory manuals verified for {config.app.collegeName}.
              </p>
            </div>

            {/* Integrated Hero Action */}
            <Link
              href="/upload"
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'gap-2 shrink-0 self-start sm:self-end font-medium',
              })}
            >
              <Plus className="h-4 w-4" />
              <span>Contribute Folio</span>
            </Link>
          </div>
        </Container>
      </header>

      {/* 2. Main Catalogue Content: Search & Filters -> Results */}
      <div className="py-8 sm:py-12">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Left Column: Filter Sidebar with Search */}
            <aside className="lg:col-span-4">
              <div className="sticky top-20">
                <Suspense fallback={<div className="meta-mono text-xs text-ash">Loading archive filters...</div>}>
                  <DocumentFilters />
                </Suspense>
              </div>
            </aside>

            {/* Right Column: Search Results */}
            <main className="lg:col-span-8 space-y-6">
              {/* Active Filter Chips */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-ink/15 text-xs">
                  <span className="meta-mono text-ash text-[11px] mr-1">Active Criteria:</span>
                  {activeFilters.map((f) => (
                    <Link
                      key={f.key}
                      href={buildRemoveFilterUrl(f.key)}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-bone border border-ink/15 meta-mono text-ink hover:border-oxblood hover:text-oxblood transition-colors text-xs"
                      title={`Remove ${f.label} filter`}
                    >
                      <span>{f.label}</span>
                      <X className="w-3 h-3 text-ash group-hover:text-oxblood transition-colors" />
                    </Link>
                  ))}
                  <Link
                    href="/documents"
                    className="meta-mono text-oxblood hover:underline ml-auto text-xs"
                  >
                    Clear All
                  </Link>
                </div>
              )}

              {/* Results Summary Header */}
              <div className="flex items-center justify-between meta-mono text-xs text-ash border-b border-ink/10 pb-2.5">
                <span>
                  {result.total === 0
                    ? '0 folios matching classification'
                    : `Showing ${(result.page - 1) * result.limit + 1}–${Math.min(
                        result.page * result.limit,
                        result.total
                      )} of ${result.total} ${result.total === 1 ? 'folio' : 'folios'}`}
                </span>
                <span className="hidden sm:inline">
                  Ordering: {params.sort === 'downloads' ? 'Most Downloaded' : params.sort === 'title' ? 'Title (A-Z)' : 'Newest Additions'}
                </span>
              </div>

              {/* Content States: Unconfigured, Error, Data Grid, or Empty */}
              {result.unconfigured ? (
                <div className="p-6 sm:p-8 border border-ink/20 bg-card text-left space-y-3">
                  <div className="flex items-center gap-2 text-oxblood meta-mono text-xs font-semibold">
                    <span className="uppercase">Configuration Notice</span>
                    <span className="text-ink/30">•</span>
                    <span className="text-ash font-normal">Database Connection Required</span>
                  </div>
                  <h2 className="font-display text-xl text-ink font-medium">Catalogue Database Unconfigured</h2>
                  <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-lg">
                    Clio is ready. To display live approved folios from Supabase, configure your environment credentials in <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">.env.local</code>.
                  </p>
                </div>
              ) : result.error ? (
                <div className="p-6 sm:p-8 border border-oxblood/30 bg-card text-left space-y-3">
                  <div className="flex items-center gap-2 text-oxblood meta-mono text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Unable to Retrieve Catalogue Folios</span>
                  </div>
                  <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-lg">
                    {result.error}
                  </p>
                  <div>
                    <Link
                      href="/documents"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Retry Query
                    </Link>
                  </div>
                </div>
              ) : result.data.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  {result.data.map((doc, idx) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      index={(page - 1) * result.limit + idx + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 sm:p-12 text-center border border-ink/15 bg-card space-y-3.5">
                  <div className="w-9 h-9 border border-ink/15 bg-bone flex items-center justify-center mx-auto text-ash">
                    <BookOpen className="w-4 h-4 text-oxblood" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-display text-xl text-ink font-medium">
                      No matching folios found
                    </h2>
                    <p className="text-xs sm:text-sm text-ash max-w-md mx-auto leading-relaxed">
                      No academic materials currently match your search criteria. Try adjusting your keywords, resetting filters, or contribute the first document for this subject.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                    <Link
                      href="/documents"
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Reset Filters
                    </Link>
                    <Link
                      href="/upload"
                      className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-1.5' })}
                    >
                      <span>Contribute Notes</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {result.totalPages > 1 && (
                <nav aria-label="Pagination Navigation" className="pt-6 border-t border-ink/15 flex items-center justify-between">
                  {result.page > 1 ? (
                    <Link
                      href={buildPageUrl(result.page - 1)}
                      className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 meta-mono' })}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span className="opacity-0 pointer-events-none">Prev</span>
                  )}

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => {
                      if (
                        p === 1 ||
                        p === result.totalPages ||
                        (p >= result.page - 1 && p <= result.page + 1)
                      ) {
                        return (
                          <Link
                            key={p}
                            href={buildPageUrl(p)}
                            className={`w-8 h-8 flex items-center justify-center meta-mono text-xs transition-colors border ${
                              p === result.page
                                ? 'bg-ink text-paper border-ink font-semibold'
                                : 'border-ink/20 text-ink hover:border-ink hover:bg-bone/40'
                            }`}
                          >
                            {p}
                          </Link>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {result.page < result.totalPages ? (
                    <Link
                      href={buildPageUrl(result.page + 1)}
                      className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 meta-mono' })}
                    >
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="opacity-0 pointer-events-none">Next</span>
                  )}
                </nav>
              )}
            </main>
          </div>
        </Container>
      </div>
    </div>
  );
}
