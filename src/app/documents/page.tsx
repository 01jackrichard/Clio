import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AlertCircle,
  BookOpen,
  Layers,
  FileText,
} from 'lucide-react';
import {
  getDocuments,
  getCollections,
  getSemesterDiscoveryData,
  getDiscoveryOverview,
} from '@/lib/services/document-service';
import { getCatalogueMetrics, CatalogueAuthStats } from '@/lib/services/catalogue-stats-service';
import { resolveInstitutionFilter } from '@/lib/services/institution-service';
import { DocumentCard } from '@/components/document-card';
import { CatalogueWelcome } from '@/components/catalogue-welcome';
import { InstitutionSelector } from '@/components/discovery/institution-selector';
import { BrowseModeSelector } from '@/components/discovery/browse-mode-selector';
import { DiscoveryFilterBar } from '@/components/discovery/discovery-filter-bar';
import { CollectionCard } from '@/components/discovery/collection-card';
import { SemesterBrowser } from '@/components/discovery/semester-browser';
import { Container, buttonVariants } from '@/components/ui';
import { DocumentFilterParams, PaginatedResult, AcademicYearGroup, DiscoveryOverview } from '@/types';
import { DocumentRecord, CollectionRecord } from '@/types/database';

export const dynamic = 'force-dynamic';

interface DocumentsPageProps {
  searchParams: Promise<{
    q?: string;
    institution?: string;
    mode?: 'all' | 'files' | 'collections' | 'semester';
    department?: string;
    regulation?: string;
    academic_year?: string;
    semester?: string;
    subject?: string;
    subject_code?: string;
    unit?: string;
    material_type?: string;
    sort?: 'newest' | 'downloads' | 'title';
    layout?: 'grid' | 'list';
    page?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;

  // 1. Resolve Active Discovery State
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const mode = params.mode || 'all';
  const layout = params.layout || 'grid';
  const isAllInstitutions = !params.institution || params.institution.toLowerCase() === 'all';

  const filterParams: DocumentFilterParams = {
    ...params,
    page,
    limit: 12,
  };

  // 2. Concurrently fetch metrics, overview counts, and mode-specific data in parallel
  let filesResult: PaginatedResult<DocumentRecord> = {
    data: [],
    total: 0,
    page,
    limit: 12,
    totalPages: 0,
  };
  let collectionsResult: PaginatedResult<CollectionRecord> = {
    data: [],
    total: 0,
    page,
    limit: 12,
    totalPages: 0,
  };
  let semesterData: AcademicYearGroup[] = [];
  let overview: DiscoveryOverview = {
    totalAll: 0,
    totalFiles: 0,
    totalCollections: 0,
    activeInstitution: resolveInstitutionFilter(params.institution) || 'All Institutions',
  };
  let catalogueStats: CatalogueAuthStats;

  if (mode === 'semester') {
    const [stats, ov, sem] = await Promise.all([
      getCatalogueMetrics(),
      getDiscoveryOverview(filterParams),
      getSemesterDiscoveryData(filterParams),
    ]);
    catalogueStats = stats;
    overview = ov;
    semesterData = sem;
  } else if (mode === 'collections') {
    const [stats, cols, docsCountRes] = await Promise.all([
      getCatalogueMetrics(),
      getCollections(filterParams),
      getDocuments({ ...filterParams, page: 1, limit: 1 }),
    ]);
    catalogueStats = stats;
    collectionsResult = cols;
    overview = {
      totalAll: docsCountRes.total + cols.total,
      totalFiles: docsCountRes.total,
      totalCollections: cols.total,
      activeInstitution: resolveInstitutionFilter(params.institution) || 'All Institutions',
    };
  } else if (mode === 'files') {
    const [stats, docs, colsCountRes] = await Promise.all([
      getCatalogueMetrics(),
      getDocuments(filterParams),
      getCollections({ ...filterParams, page: 1, limit: 1 }),
    ]);
    catalogueStats = stats;
    filesResult = docs;
    overview = {
      totalAll: docs.total + colsCountRes.total,
      totalFiles: docs.total,
      totalCollections: colsCountRes.total,
      activeInstitution: resolveInstitutionFilter(params.institution) || 'All Institutions',
    };
  } else {
    // Mode 'all': fetch documents, collections, and stats concurrently in a single round-trip
    const [stats, docs, cols] = await Promise.all([
      getCatalogueMetrics(),
      getDocuments(filterParams),
      getCollections({ ...filterParams, limit: 6, page: 1 }),
    ]);
    catalogueStats = stats;
    filesResult = docs;
    collectionsResult = cols;
    overview = {
      totalAll: docs.total + cols.total,
      totalFiles: docs.total,
      totalCollections: cols.total,
      activeInstitution: resolveInstitutionFilter(params.institution) || 'All Institutions',
    };
  }

  const userDisplayName = catalogueStats.displayName;

  const isUnconfigured = filesResult.unconfigured || collectionsResult.unconfigured;
  const errorMsg = filesResult.error || collectionsResult.error;

  // Total results and pagination target
  const activeTotal =
    mode === 'collections'
      ? collectionsResult.total
      : mode === 'files'
      ? filesResult.total
      : overview.totalAll;

  const totalPages =
    mode === 'collections'
      ? collectionsResult.totalPages
      : mode === 'files'
      ? filesResult.totalPages
      : filesResult.totalPages;

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
      {/* 1. Personalized Wave Grid & Editorial Folio Welcome */}
      <CatalogueWelcome
        displayName={userDisplayName}
        initialStats={catalogueStats}
        totalPreserved={overview.totalAll}
      />

      {/* 2. Main Discovery Experience: Institution Selector + Tabs + Filter Bar + Results */}
      <div id="archive-catalogue" className="py-6 sm:py-10">
        <Container className="space-y-6">
          {/* Institution Explorer Bar */}
          <Suspense fallback={<div className="h-14 bg-card border border-ink/10 animate-pulse" />}>
            <InstitutionSelector currentInstitution={params.institution} />
          </Suspense>

          {/* 4. Gooey Search and Academic Filters */}
          <Suspense fallback={<div className="h-20 bg-card border border-ink/10 animate-pulse" />}>
            <DiscoveryFilterBar currentMode={mode} currentLayout={layout} />
          </Suspense>

          {/* 5. Browse-Mode Selector and Results */}
          <Suspense fallback={<div className="h-12 bg-card border border-ink/10 animate-pulse" />}>
            <BrowseModeSelector
              currentMode={mode}
              totalAll={overview.totalAll}
              totalFiles={overview.totalFiles}
              totalCollections={overview.totalCollections}
            />
          </Suspense>

          {/* Results Summary Header */}
          {mode !== 'semester' && (
            <div className="flex items-center justify-between meta-mono text-xs text-ash border-b border-ink/10 pb-2.5">
              <span>
                {activeTotal === 0
                  ? '0 resources matching classification'
                  : `Showing ${(page - 1) * 12 + 1}–${Math.min(
                      page * 12,
                      activeTotal
                    )} of ${activeTotal} ${
                      mode === 'collections'
                        ? activeTotal === 1 ? 'collection' : 'collections'
                        : activeTotal === 1 ? 'folio' : 'folios'
                    }`}
              </span>
              <span className="hidden sm:inline">
                Ordering: {params.sort === 'downloads' ? 'Most Downloaded' : params.sort === 'title' ? 'Title (A-Z)' : 'Newest Additions'}
              </span>
            </div>
          )}

          {/* Content States: Unconfigured, Error, Semester Browser, Collections, Files, or Unified */}
          {isUnconfigured ? (
            <div className="p-6 sm:p-8 border border-ink/20 bg-card text-left space-y-3">
              <div className="flex items-center gap-2 text-oxblood meta-mono text-xs font-semibold">
                <span className="uppercase">Configuration Notice</span>
                <span className="text-ink/30">•</span>
                <span className="text-ash font-normal">Database Connection Required</span>
              </div>
              <h3 className="font-display text-xl text-ink font-medium">Catalogue Database Unconfigured</h3>
              <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-lg">
                Clio is ready. To display live approved folios and collections from Supabase, configure your environment credentials in <code className="meta-mono bg-paper px-1.5 py-0.5 border border-ink/20">.env.local</code>.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 sm:p-8 border border-oxblood/30 bg-card text-left space-y-3">
              <div className="flex items-center gap-2 text-oxblood meta-mono text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Unable to Retrieve Catalogue Folios</span>
              </div>
              <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-lg">
                {errorMsg}
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
          ) : mode === 'semester' ? (
            /* Mode 4: Semester Syllabus Tree */
            <SemesterBrowser years={semesterData} institutionName={overview.activeInstitution} />
          ) : mode === 'collections' ? (
            /* Mode 3: Collections Only */
            collectionsResult.data.length > 0 ? (
              <div
                className={
                  layout === 'list'
                    ? 'space-y-3.5'
                    : collectionsResult.data.length <= 2
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                }
              >
                {collectionsResult.data.map((col, idx) => (
                  <CollectionCard
                    key={col.id}
                    collection={col}
                    layout={layout}
                    index={(page - 1) * 12 + idx + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center border border-ink/15 bg-card space-y-3.5">
                <div className="w-9 h-9 border border-ink/15 bg-bone flex items-center justify-center mx-auto text-ash">
                  <Layers className="w-4 h-4 text-oxblood" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xl text-ink font-medium">
                    No curated collections found
                  </h3>
                  <p className="text-xs sm:text-sm text-ash max-w-md mx-auto leading-relaxed">
                    No course packs or semester bundles match the current criteria. Try resetting your search filters or assemble the first collection.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <Link
                    href="/documents?mode=collections"
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Reset Filters
                  </Link>
                  <Link
                    href="/upload"
                    className={buttonVariants({ variant: 'primary', size: 'sm', className: 'gap-1.5' })}
                  >
                    <span>Create Collection</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          ) : mode === 'files' ? (
            /* Mode 2: Individual Files Only */
            filesResult.data.length > 0 ? (
              <div
                className={
                  layout === 'list'
                    ? 'space-y-3.5'
                    : filesResult.data.length <= 2
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                }
              >
                {filesResult.data.map((doc, idx) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    layout={layout}
                    showInstitution={isAllInstitutions}
                    index={(page - 1) * 12 + idx + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 sm:p-12 text-center border border-ink/15 bg-card space-y-3.5">
                <div className="w-9 h-9 border border-ink/15 bg-bone flex items-center justify-center mx-auto text-ash">
                  <BookOpen className="w-4 h-4 text-oxblood" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xl text-ink font-medium">
                    No matching folios found
                  </h3>
                  <p className="text-xs sm:text-sm text-ash max-w-md mx-auto leading-relaxed">
                    No academic materials currently match your search criteria. Try adjusting your keywords or contribute the first document.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <Link
                    href="/documents?mode=files"
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
            )
          ) : (
            /* Mode 1: All Materials (Unified View) */
            filesResult.data.length === 0 && collectionsResult.data.length === 0 ? (
              <div className="p-8 sm:p-12 text-center border border-ink/15 bg-card space-y-3.5">
                <div className="w-9 h-9 border border-ink/15 bg-bone flex items-center justify-center mx-auto text-ash">
                  <BookOpen className="w-4 h-4 text-oxblood" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-xl text-ink font-medium">
                    No matching resources found
                  </h3>
                  <p className="text-xs sm:text-sm text-ash max-w-md mx-auto leading-relaxed">
                    No academic materials currently match your criteria. Try adjusting your keywords, switching institutions, or contribute notes.
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
            ) : (
              <div className="space-y-8">
                {/* Featured Collections Section (if any match) */}
                {collectionsResult.data.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-ink/10">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-oxblood" />
                        <h4 className="font-display text-base sm:text-lg font-medium text-ink">
                          Curated Academic Collections
                        </h4>
                        <span className="meta-mono text-[11px] text-ash bg-paper px-2 py-0.5 border border-ink/15">
                          {collectionsResult.total} Course {collectionsResult.total === 1 ? 'Pack' : 'Packs'}
                        </span>
                      </div>
                      <Link
                        href={`/documents?mode=collections${params.institution ? `&institution=${params.institution}` : ''}`}
                        className="meta-mono text-xs text-oxblood hover:underline flex items-center gap-1"
                      >
                        <span>View all collections</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div
                      className={
                        layout === 'list'
                          ? 'space-y-3.5'
                          : collectionsResult.data.length <= 2
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      }
                    >
                      {collectionsResult.data.map((col, idx) => (
                        <CollectionCard
                          key={col.id}
                          collection={col}
                          layout={layout}
                          index={idx + 1}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Academic Folios */}
                {filesResult.data.length > 0 && (
                  <div className="space-y-4">
                    {collectionsResult.data.length > 0 && (
                      <div className="flex items-center justify-between pb-2 border-b border-ink/10 pt-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-ash" />
                          <h4 className="font-display text-base sm:text-lg font-medium text-ink">
                            Individual Academic Folios
                          </h4>
                          <span className="meta-mono text-[11px] text-ash bg-paper px-2 py-0.5 border border-ink/15">
                            {filesResult.total} {filesResult.total === 1 ? 'Folio' : 'Folios'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className={
                        layout === 'list'
                          ? 'space-y-3.5'
                          : filesResult.data.length <= 2
                          ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
                          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      }
                    >
                      {filesResult.data.map((doc, idx) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          layout={layout}
                          showInstitution={isAllInstitutions}
                          index={(page - 1) * 12 + idx + 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Pagination Controls */}
          {mode !== 'semester' && totalPages > 1 && (
            <nav
              aria-label="Pagination Navigation"
              className="pt-6 border-t border-ink/15 flex items-center justify-between"
            >
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1)}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'gap-1.5 meta-mono',
                  })}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Link>
              ) : (
                <span className="opacity-0 pointer-events-none">Prev</span>
              )}

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  if (
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                  ) {
                    return (
                      <Link
                        key={p}
                        href={buildPageUrl(p)}
                        className={`w-8 h-8 flex items-center justify-center meta-mono text-xs transition-colors border ${
                          p === page
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

              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1)}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                    className: 'gap-1.5 meta-mono',
                  })}
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="opacity-0 pointer-events-none">Next</span>
              )}
            </nav>
          )}
        </Container>
      </div>
    </div>
  );
}
