import React, { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, X, ArrowUpRight, AlertCircle, BookOpen } from 'lucide-react';
import { getDocuments } from '@/lib/services/document-service';
import { DocumentFilters } from '@/components/document-filters';
import { DocumentCard } from '@/components/document-card';
import { config } from '@/lib/config';
import { Badge, Container, buttonVariants } from '@/components/ui';

export const dynamic = 'force-dynamic';

interface DocumentsPageProps {
  searchParams: Promise<{
    q?: string;
    department?: string;
    academic_year?: string;
    semester?: string;
    subject?: string;
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
    params.academic_year && { key: 'academic_year', label: params.academic_year },
    params.semester && { key: 'semester', label: params.semester },
    params.subject && { key: 'subject', label: `Subject: ${params.subject}` },
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
      {/* Running Masthead Header Line */}
      <div className="border-b border-ink/15 py-3.5 bg-paper">
        <Container>
          <div className="grid grid-cols-12 gap-x-4 sm:gap-x-6 items-baseline meta-mono text-ash">
            <span className="col-span-3 sm:col-span-2 text-ink font-semibold tracking-wider">CLIO</span>
            <span className="hidden sm:block sm:col-span-3 text-ink/70">Archive Catalogue · Index</span>
            <span className="hidden md:block md:col-span-4 text-ink/70">
              {config.app.collegeName} · Hub
            </span>
            <span className="col-span-9 sm:col-span-7 md:col-span-3 text-right text-ink">
              PAGE {page} OF {Math.max(1, result.totalPages)}
            </span>
          </div>
        </Container>
      </div>

      <Container className="pt-10 sm:pt-14 pb-20">
        {/* Section Title & Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 pb-8 border-b border-ink/15">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="meta-mono text-oxblood font-semibold">Catalogue</span>
              <span className="block h-px w-8 bg-ink/40" aria-hidden="true" />
              <span className="label-eyebrow">Academic Archive</span>
              {result.total > 0 && (
                <>
                  <span className="block h-px w-4 bg-ink/30" aria-hidden="true" />
                  <Badge variant="oxblood" size="sm" dot>
                    {result.total} {result.total === 1 ? 'Folio' : 'Folios'} Preserved
                  </Badge>
                </>
              )}
            </div>

            <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-display font-normal leading-[0.96] tracking-[-0.03em] text-ink text-balance">
              The Document Archive, <span className="display-italic text-ink/85">indexed & verified.</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-ash max-w-2xl leading-relaxed">
              Examine lecture notes, syllabus folios, past examination solutions, and laboratory manuals verified for {config.app.collegeName}.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/upload"
              className={buttonVariants({
                variant: 'primary',
                size: 'md',
                className: 'gap-2 group',
              })}
            >
              <span>Contribute PDF</span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>
          </div>
        </div>

        {/* Main Grid: Filters + Document Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Filter Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-24">
              <Suspense fallback={<div className="meta-mono text-ash">Loading archive filters...</div>}>
                <DocumentFilters />
              </Suspense>
            </div>
          </aside>

          {/* Right Column: Search Results */}
          <main className="lg:col-span-8 space-y-6">
            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3.5 bg-card border border-ink/15">
                <span className="meta-mono text-ash text-xs mr-1">Active Criteria:</span>
                {activeFilters.map((f) => (
                  <Link
                    key={f.key}
                    href={buildRemoveFilterUrl(f.key)}
                    className="group inline-flex items-center gap-1.5 px-2.5 py-1 bg-bone border border-ink/20 meta-mono text-ink hover:border-oxblood hover:text-oxblood transition-colors text-xs"
                    title={`Remove ${f.label} filter`}
                  >
                    <span>{f.label}</span>
                    <X className="w-3 h-3 text-ash group-hover:text-oxblood transition-colors" />
                  </Link>
                ))}
                <Link
                  href="/documents"
                  className="link-underline meta-mono text-oxblood ml-auto text-xs"
                >
                  Clear All Filters
                </Link>
              </div>
            )}

            {/* Results Counter Header */}
            <div className="flex items-center justify-between meta-mono text-ash border-b border-ink/10 pb-3">
              <span>
                {result.total === 0
                  ? '0 folios matching classification'
                  : `Folios ${(result.page - 1) * result.limit + 1}–${Math.min(
                      result.page * result.limit,
                      result.total
                    )} of ${result.total}`}
              </span>
              <span>Ordering: {params.sort || 'newest'}</span>
            </div>

            {/* Content States */}
            {result.unconfigured ? (
              <div className="p-8 sm:p-10 border border-ink/20 bg-card text-left space-y-4">
                <div className="flex items-center gap-3">
                  <span className="meta-mono text-oxblood font-semibold">Config Notice</span>
                  <span className="block h-px w-8 bg-ink/30" aria-hidden="true" />
                  <span className="label-eyebrow">Database Connection Required</span>
                </div>
                <h2 className="font-display text-2xl text-ink">Catalog Database Unconfigured</h2>
                <p className="text-sm text-ash leading-relaxed max-w-xl">
                  Clio is ready. To display live approved resources from Supabase, configure{' '}
                  <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{' '}
                  and{' '}
                  <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </code>{' '}
                  in <code className="meta-mono">.env.local</code>.
                </p>
              </div>
            ) : result.error ? (
              <div className="p-8 sm:p-10 border border-oxblood/30 bg-card text-left space-y-4">
                <div className="flex items-center gap-2 text-oxblood meta-mono">
                  <AlertCircle className="w-4 h-4" />
                  <span>Repository Exception</span>
                </div>
                <h2 className="font-display text-2xl text-ink">Unable to Retrieve Archive Folios</h2>
                <p className="text-sm text-ash leading-relaxed max-w-xl">
                  A network or schema connectivity issue occurred while querying the document table.
                  Please verify database status.
                </p>
                <div>
                  <Link
                    href="/documents"
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                  >
                    Retry Query
                  </Link>
                </div>
              </div>
            ) : result.data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.data.map((doc, idx) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    index={(page - 1) * result.limit + idx + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 sm:p-16 text-center border border-dashed border-ink/20 bg-card space-y-4">
                <div className="w-10 h-10 border border-ink/20 bg-bone flex items-center justify-center mx-auto text-ash">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="meta-mono text-oxblood">Archive Classification Empty</p>
                  <h2 className="font-display text-2xl text-ink">
                    No matching folios found in the library
                  </h2>
                </div>
                <p className="text-sm text-ash max-w-md mx-auto leading-relaxed">
                  No verified materials match your active criteria. Try broadening your keywords, clearing
                  specific module units, or contribute notes for this subject.
                </p>
                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/documents"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Reset All Filters
                  </Link>
                  <Link
                    href="/upload"
                    className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-1.5' })}
                  >
                    <span>Contribute Notes for Subject</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {result.totalPages > 1 && (
              <nav aria-label="Pagination Navigation" className="pt-8 border-t border-ink/15 flex items-center justify-between">
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
  );
}
