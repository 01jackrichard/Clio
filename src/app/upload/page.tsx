'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Lock,
  Globe,
  Layers,
  RotateCcw,
  Sparkles,
  Files,
  SlidersHorizontal,
} from 'lucide-react';
import { config } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  SEMESTERS,
  MATERIAL_TYPES,
  UNITS,
  REGULATIONS,
  Department,
  AcademicYear,
  Semester,
  MaterialTypeValue,
  Unit,
} from '@/lib/constants';
import { formatBytes, cn } from '@/lib/utils';
import {
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  Card,
  CardContent,
  Container,
} from '@/components/ui';
import { SubjectAutocomplete } from '@/components/subject-autocomplete';
import { PrivateStoragePanel } from '@/components/storage/private-storage-panel';
import { RadialGlowButton } from '@/components/ui/radial-glow-button';
import { ShareResourceButton } from '@/components/sharing/share-resource-button';

/**
 * Metadata and lifecycle state for each individual file in a multi-file batch.
 */
export interface BatchFileItem {
  id: string;
  file: File;
  title: string;
  subject: string;
  subjectCode: string;
  regulation: string;
  department: Department;
  academicYear: AcademicYear;
  semester: Semester;
  unit: Unit | '';
  materialType: MaterialTypeValue;
  description: string;
  tags: string[];
  isVerifiedSubject: boolean;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  uploadedDocId?: string;
}

export default function UploadPage() {
  const formUid = useId();

  // User authorization & admin status
  const [isAdmin, setIsAdmin] = useState(false);

  // Mode selection: 'individual' vs 'collection'
  const [uploadMode, setUploadMode] = useState<'individual' | 'collection'>('individual');

  // Multi-file batch state
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared metadata defaults
  const [sharedDepartment, setSharedDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [sharedAcademicYear, setSharedAcademicYear] = useState<AcademicYear>(ACADEMIC_YEARS[0]);
  const [sharedSemester, setSharedSemester] = useState<Semester>(SEMESTERS[0]);
  const [sharedRegulation, setSharedRegulation] = useState<string>('2021');
  const [sharedMaterialType, setSharedMaterialType] = useState<MaterialTypeValue>(MATERIAL_TYPES[0].value);
  const [sharedSubject, setSharedSubject] = useState('');
  const [sharedSubjectCode, setSharedSubjectCode] = useState('');
  const [sharedIsVerifiedSubject, setSharedIsVerifiedSubject] = useState(true);
  const [sharedUnit, setSharedUnit] = useState<Unit | ''>('');

  // Visibility & Security State
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Collection Pack state
  const [collectionAction, setCollectionAction] = useState<'new' | 'existing'>('new');
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [existingCollections, setExistingCollections] = useState<
    Array<{ id: string; title: string; visibility: string }>
  >([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');

  // Global declarations & submission state
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [quotaErrorData, setQuotaErrorData] = useState<{
    usedBytes: number;
    quotaBytes: number;
    remainingBytes: number;
    incomingBytes: number;
    excessBytes?: number;
    formattedUsed: string;
    formattedRemaining: string;
    formattedQuota: string;
  } | null>(null);
  const [batchCompleted, setBatchCompleted] = useState(false);

  // Check admin role on mount
  useEffect(() => {
    let isMounted = true;
    async function checkRole() {
      if (!config.supabase.url) return;
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !isMounted) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin' && isMounted) {
          setIsAdmin(true);
        }
      } catch {
        // Fallback silently to standard user
      }
    }
    checkRole();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch collections when collection mode is active
  useEffect(() => {
    if (uploadMode !== 'collection') return;
    async function loadCollections() {
      try {
        const res = await fetch('/api/collections?mine=true');
        if (res.ok) {
          const data = await res.json();
          setExistingCollections(data.collections || []);
          if (data.collections?.length > 0 && !selectedCollectionId) {
            setSelectedCollectionId(data.collections[0].id);
          }
        }
      } catch {
        // Silently continue
      }
    }
    loadCollections();
  }, [uploadMode, selectedCollectionId]);

  // Clean filename to human title
  const cleanTitleFromFilename = (filename: string): string => {
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    const cleaned = withoutExt.replace(/[-_]+/g, ' ').trim();
    return cleaned.length >= 3 ? cleaned : filename;
  };

  // Helper to create a new batch item from a File
  const createBatchItem = (file: File): BatchFileItem => {
    return {
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      title: cleanTitleFromFilename(file.name),
      subject: sharedSubject,
      subjectCode: sharedSubjectCode,
      regulation: sharedRegulation,
      department: sharedDepartment,
      academicYear: sharedAcademicYear,
      semester: sharedSemester,
      unit: sharedUnit,
      materialType: sharedMaterialType,
      description: '',
      tags: [],
      isVerifiedSubject: sharedIsVerifiedSubject,
      status: 'idle',
    };
  };

  // Process selected or dropped files with validation and deduplication
  const handleFilesAdded = (incomingFiles: File[]) => {
    setError(null);
    setInfoNotice(null);

    if (!incomingFiles || incomingFiles.length === 0) return;

    const newItems: BatchFileItem[] = [];
    let duplicateCount = 0;
    let oversizedCount = 0;
    let invalidFormatCount = 0;

    for (const file of incomingFiles) {
      // 1. Format check
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
        invalidFormatCount++;
        continue;
      }

      // 2. Size limit check
      if (!isAdmin && file.size > 50 * 1024 * 1024) {
        oversizedCount++;
        continue;
      }

      // 3. Duplicate check within current batch
      const isDuplicate = batchFiles.some(
        (existing) => existing.file.name === file.name && existing.file.size === file.size
      );
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      newItems.push(createBatchItem(file));
    }

    if (invalidFormatCount > 0) {
      setError(
        `${invalidFormatCount} file(s) were skipped. Only PDF, DOC, and DOCX formats are accepted.`
      );
    } else if (oversizedCount > 0) {
      setError(
        'File size exceeds the 50 MB repository limit. Please select a smaller document.'
      );
    }

    if (duplicateCount > 0) {
      setInfoNotice(`${duplicateCount} duplicate file(s) already in selection were skipped.`);
    }

    if (newItems.length > 0) {
      setBatchFiles((prev) => [...prev, ...newItems]);
    }
  };

  // Update a single file item's metadata
  const updateFileItem = (id: string, updates: Partial<BatchFileItem>) => {
    setBatchFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Remove a file from the batch
  const removeFileItem = (id: string) => {
    setBatchFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all files from the batch
  const clearAllFiles = () => {
    setBatchFiles([]);
    setError(null);
    setInfoNotice(null);
    setQuotaErrorData(null);
  };

  // Apply shared subject & classification to all files in the batch
  const applySharedSubjectToAll = () => {
    if (!sharedSubject.trim()) {
      setError('Please specify a shared subject first to apply across all files.');
      return;
    }
    setBatchFiles((prev) =>
      prev.map((item) => ({
        ...item,
        subject: sharedSubject,
        subjectCode: sharedSubjectCode,
        isVerifiedSubject: sharedIsVerifiedSubject,
        regulation: sharedRegulation,
        department: sharedDepartment,
        semester: sharedSemester,
        academicYear: sharedAcademicYear,
      }))
    );
    setInfoNotice(`Subject "${sharedSubject}" applied to all ${batchFiles.length} files.`);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  // Upload an individual batch item via /api/documents/upload
  const uploadSingleItem = async (
    item: BatchFileItem,
    targetCollectionId?: string
  ): Promise<{ success: boolean; docId?: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('title', item.title.trim());
      formData.append('description', item.description.trim());
      formData.append('department', item.department);
      formData.append('academic_year', item.academicYear);
      formData.append('semester', item.semester);
      formData.append('subject', item.subject.trim());
      if (item.subjectCode.trim()) formData.append('subject_code', item.subjectCode.trim());
      formData.append('regulation', item.regulation);
      formData.append('is_verified_subject', item.isVerifiedSubject ? 'true' : 'false');
      if (item.unit) formData.append('unit', item.unit);
      formData.append('material_type', item.materialType);
      formData.append('tags', JSON.stringify(item.tags));
      formData.append('visibility', visibility);
      if (visibility === 'private') {
        formData.append('password', password);
      }
      if (uploadMode === 'collection' && targetCollectionId) {
        formData.append('collection_id', targetCollectionId);
      }
      formData.append('declaration_accepted', 'true');

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'QUOTA_EXCEEDED' && data.quota) {
          setQuotaErrorData(data.quota);
        }
        return { success: false, error: data.error || 'Upload failed' };
      }

      return { success: true, docId: data.document?.id };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network failure during upload',
      };
    }
  };

  // Submit the entire batch or retry failed items
  const handleSubmitBatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (batchFiles.length === 0) {
      setError('Please select at least one document to contribute.');
      return;
    }

    // 1. Validation across all items
    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i];
      if (!item.title.trim()) {
        setError(`Please provide a title for file Nº ${i + 1} (${item.file.name}).`);
        return;
      }
      if (!item.subject.trim()) {
        setError(`Please specify a subject for file Nº ${i + 1} (${item.file.name}).`);
        return;
      }
    }

    // 2. Private password checks
    if (visibility === 'private') {
      if (!password || password.length < 6) {
        setError('Please provide an access password of at least 6 characters for private resources.');
        return;
      }
      if (password !== confirmPassword) {
        setError('The access passwords do not match. Please verify your entry.');
        return;
      }
    }

    // 3. Declaration check
    if (!declarationAccepted) {
      setError('You must accept the academic honesty and fair use declaration to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfoNotice(null);
    setQuotaErrorData(null);

    try {
      let targetCollectionId = selectedCollectionId;

      // Handle new collection creation if applicable
      if (uploadMode === 'collection' && collectionAction === 'new') {
        if (!collectionTitle.trim()) {
          throw new Error('Please specify a title for the new course pack collection.');
        }

        const colRes = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: collectionTitle.trim(),
            description: collectionDescription.trim() || undefined,
            department: sharedDepartment || undefined,
            regulation: sharedRegulation || '2021',
            academic_year: sharedAcademicYear || undefined,
            semester: sharedSemester || undefined,
            visibility,
            password: visibility === 'private' ? password : undefined,
          }),
        });

        const colData = await colRes.json();
        if (!colRes.ok) {
          throw new Error(colData.error || 'Failed to create collection pack');
        }

        targetCollectionId = colData.collection.id;
        setSelectedCollectionId(targetCollectionId);
      }

      // Filter items to upload: skip already successful items
      const itemsToUpload = batchFiles.filter((item) => item.status !== 'success');

      // Process with bounded concurrency (concurrency = 2) to protect server limits
      const concurrencyLimit = 2;
      const executing = new Set<Promise<void>>();

      for (const item of itemsToUpload) {
        // Mark as uploading
        updateFileItem(item.id, { status: 'uploading', errorMessage: undefined });

        const task = (async () => {
          const result = await uploadSingleItem(item, targetCollectionId);
          if (result.success) {
            updateFileItem(item.id, {
              status: 'success',
              uploadedDocId: result.docId,
              errorMessage: undefined,
            });
          } else {
            updateFileItem(item.id, {
              status: 'error',
              errorMessage: result.error,
            });
          }
        })();

        executing.add(task);
        task.finally(() => executing.delete(task));

        if (executing.size >= concurrencyLimit) {
          await Promise.race(executing);
        }
      }

      await Promise.all(executing);
      setBatchCompleted(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Batch submission encountered an error. Please review failed items and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Retry an individual failed item
  const handleRetrySingle = async (id: string) => {
    const item = batchFiles.find((f) => f.id === id);
    if (!item || submitting) return;

    if (!item.title.trim() || !item.subject.trim()) {
      setError('Please provide valid title and subject before retrying.');
      return;
    }

    setSubmitting(true);
    setError(null);
    updateFileItem(id, { status: 'uploading', errorMessage: undefined });

    try {
      const result = await uploadSingleItem(item, selectedCollectionId);
      if (result.success) {
        updateFileItem(id, {
          status: 'success',
          uploadedDocId: result.docId,
          errorMessage: undefined,
        });
      } else {
        updateFileItem(id, {
          status: 'error',
          errorMessage: result.error,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Calculation metrics
  const successfulUploads = batchFiles.filter((f) => f.status === 'success');
  const failedUploads = batchFiles.filter((f) => f.status === 'error');
  const totalBatchBytes = batchFiles.reduce((acc, f) => acc + f.file.size, 0);

  // Single file fallback accessor (for backward compatibility when exactly 1 file is selected)
  const singleItem = batchFiles[0] || null;

  return (
    <div className="bg-paper min-h-screen py-8 sm:py-14">
      <Container className="max-w-4xl space-y-8">
        {/* Editorial Heading */}
        <div className="space-y-3 pb-6 border-b border-ink/15">
          <div className="flex flex-wrap items-center gap-3">
            <span className="meta-mono text-oxblood font-semibold">Contribution Folio</span>
            <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
            <span className="label-eyebrow">Academic Archive</span>
            <Badge variant={isAdmin ? 'oxblood' : 'neutral'} size="sm">
              {isAdmin
                ? 'PDF, DOC, DOCX · Standard Limit: 50 MB (Admin: No Limit)'
                : 'PDF, DOC, DOCX · Max 50 MB'}
            </Badge>
            <Badge variant="neutral" size="sm">
              Anna University Syllabus · CBCS
            </Badge>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink font-medium tracking-tight leading-tight">
            Contribute Academic Notes
          </h1>

          <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-2xl">
            Deposit individual lecture notes, question papers, or comprehensive multi-file study
            packs for <strong className="text-ink font-medium">{config.app.collegeName}</strong>.
            Configure independent academic subjects or apply shared syllabus metadata across your entire batch.
          </p>

          {/* Mode Switcher Tabs */}
          {!batchCompleted && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setUploadMode('individual')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                  uploadMode === 'individual'
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 bg-card text-ink hover:border-ink/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Multi-File Folio Batch</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('collection')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                  uploadMode === 'collection'
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/20 bg-card text-ink hover:border-ink/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Curated Course Pack / Collection</span>
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            COMPLETION SCREEN: BATCH & SINGLE RESULTS
           ========================================================================= */}
        {batchCompleted && successfulUploads.length > 0 ? (
          <Card className="bg-card border-ink/20 shadow-none text-center">
            <CardContent className="p-8 sm:p-12 space-y-8">
              <div className="w-14 h-14 bg-emerald-950/10 border border-emerald-900/20 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Badge variant={visibility === 'private' ? 'oxblood' : 'success'} size="sm" dot>
                    {visibility === 'private' ? 'Protected Vault Folios' : 'Published to Catalogue'}
                  </Badge>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-ink font-medium tracking-tight">
                  {successfulUploads.length === 1
                    ? 'Folio Preserved Successfully'
                    : `${successfulUploads.length} Folios Preserved Successfully`}
                </h2>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  {successfulUploads.length === 1
                    ? `${successfulUploads[0].title} has been catalogued in Clio's repository.`
                    : `Your academic documents have been catalogued and indexed across the library.`}
                  {failedUploads.length > 0 && (
                    <span className="block mt-1 text-oxblood font-semibold">
                      Notice: {failedUploads.length} folio(s) encountered errors and can be retried below.
                    </span>
                  )}
                </p>
              </div>

              {/* Uploaded Documents Ledger */}
              <div className="text-left border border-ink/15 divide-y divide-ink/10 bg-paper">
                <div className="p-3 bg-bone/40 meta-mono text-[11px] font-semibold text-ink flex items-center justify-between">
                  <span>Archived Folio Ledger ({successfulUploads.length})</span>
                  <span>Status: Catalogued</span>
                </div>
                {successfulUploads.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="meta-mono text-[10px] text-ash">Nº {String(idx + 1).padStart(2, '0')}</span>
                        <span className="font-medium text-ink font-display text-sm">{item.title}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 meta-mono text-[11px] text-ash">
                        <span>{item.subject}</span>
                        <span>•</span>
                        <span>{formatBytes(item.file.size)}</span>
                        <span>•</span>
                        <span>{item.department}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.uploadedDocId && (
                        <>
                          <Link
                            href={`/documents/${item.uploadedDocId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                          >
                            <span>Open in Document Reader</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                          <ShareResourceButton
                            resourceType="document"
                            resourceId={item.uploadedDocId}
                            resourceTitle={item.title}
                            isOwner={true}
                            variant="compact"
                            label="Share"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Failed Items Retry Section */}
              {failedUploads.length > 0 && (
                <div className="text-left p-4 bg-oxblood/5 border border-oxblood/20 space-y-3">
                  <div className="flex items-center gap-2 text-oxblood font-semibold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Failed Uploads Requiring Attention ({failedUploads.length})</span>
                  </div>
                  <div className="divide-y divide-oxblood/10">
                    {failedUploads.map((failedItem) => (
                      <div
                        key={failedItem.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-medium text-ink">{failedItem.title}</p>
                          <p className="meta-mono text-[11px] text-oxblood">{failedItem.errorMessage}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetrySingle(failedItem.id)}
                          disabled={submitting}
                          leftIcon={<RotateCcw className="w-3 h-3" />}
                        >
                          Retry
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleSubmitBatch()}
                    loading={submitting}
                    disabled={submitting}
                    className="w-full mt-2"
                  >
                    Retry All Failed Uploads
                  </Button>
                </div>
              )}

              {/* Completion Actions */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Browse Public Catalogue</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/my-submissions"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-ink text-ink text-xs font-medium hover:bg-bone transition-colors"
                >
                  <span>View in My Submissions</span>
                </Link>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setBatchCompleted(false);
                    clearAllFiles();
                    setDeclarationAccepted(false);
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Contribute Another Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* =========================================================================
             MAIN MULTI-FILE UPLOAD FORM
             ========================================================================= */
          <form onSubmit={handleSubmitBatch} className="space-y-7" noValidate={false}>
            {/* Global Errors and Notices */}
            {error && (
              <div
                role="alert"
                className={cn(
                  'p-4 sm:p-5 border text-xs leading-relaxed space-y-3',
                  quotaErrorData
                    ? 'bg-rose-950/5 border-rose-900/30 text-rose-950 shadow-xs'
                    : 'bg-oxblood/5 border-oxblood/20 text-oxblood'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 space-y-1">
                    <span className="font-semibold block">
                      {quotaErrorData ? 'Private Storage Quota Exceeded' : 'Submission Notice'}
                    </span>
                    <span className="text-ash block leading-relaxed">{error}</span>
                  </div>
                </div>

                {quotaErrorData && (
                  <div className="pt-3 border-t border-ink/10 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 meta-mono text-[11px] p-3 bg-paper border border-ink/10">
                      <div>
                        <span className="text-ash block">Used Storage:</span>
                        <span className="font-medium text-ink">{quotaErrorData.formattedUsed}</span>
                      </div>
                      <div>
                        <span className="text-ash block">Remaining:</span>
                        <span className="font-medium text-oxblood">{quotaErrorData.formattedRemaining}</span>
                      </div>
                      <div>
                        <span className="text-ash block">Total Quota:</span>
                        <span className="font-medium text-ink">{quotaErrorData.formattedQuota || '50 GB'}</span>
                      </div>
                      <div>
                        <span className="text-ash block">Batch Size:</span>
                        <span className="font-medium text-ink">{formatBytes(quotaErrorData.incomingBytes)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-[11px] text-ash max-w-md">
                        Switching this upload to <strong>Public Catalogue</strong> allows free deposit without counting against your private 50 GB allowance.
                      </p>
                      <Link href="/upgrade">
                        <RadialGlowButton className="min-w-[140px] min-h-[36px] py-1.5 px-3.5 text-xs">
                          Upgrade to Clio Plus ↗
                        </RadialGlowButton>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {infoNotice && (
              <div
                role="status"
                className="p-3 bg-bone border border-ink/20 text-xs text-ink flex items-center justify-between gap-3"
              >
                <span>{infoNotice}</span>
                <button
                  type="button"
                  onClick={() => setInfoNotice(null)}
                  className="text-ash hover:text-ink cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Course Pack Collection Configuration (If Collection mode active) */}
            {uploadMode === 'collection' && (
              <Card className="bg-card border-ink/15 shadow-none">
                <CardContent className="p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-oxblood" />
                      <span className="label-eyebrow text-ink">Course Pack / Collection Assignment</span>
                    </div>
                    <Badge variant="neutral" size="sm">
                      Multi-Folio Pack
                    </Badge>
                  </div>

                  <div className="flex gap-4 border-b border-ink/10 pb-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="radio"
                        name="collectionAction"
                        checked={collectionAction === 'new'}
                        onChange={() => setCollectionAction('new')}
                        className="text-oxblood focus:ring-oxblood"
                      />
                      <span>Create New Course Pack</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                      <input
                        type="radio"
                        name="collectionAction"
                        checked={collectionAction === 'existing'}
                        onChange={() => setCollectionAction('existing')}
                        className="text-oxblood focus:ring-oxblood"
                      />
                      <span>Add to Existing Pack ({existingCollections.length})</span>
                    </label>
                  </div>

                  {collectionAction === 'new' ? (
                    <div className="space-y-4">
                      <Input
                        id="collection-title"
                        label="Course Pack Title"
                        required
                        placeholder="e.g. CS3351 Digital Principles Complete Study Pack 2026"
                        value={collectionTitle}
                        onChange={(e) => setCollectionTitle(e.target.value)}
                        disabled={submitting}
                        helperText="The overarching group title for this syllabus collection."
                      />

                      <Textarea
                        id="collection-description"
                        label="Course Pack Overview (Optional)"
                        rows={2}
                        value={collectionDescription}
                        onChange={(e) => setCollectionDescription(e.target.value)}
                        placeholder="Comprehensive archive covering Units 1-5, lab manuals, and previous Anna University question papers..."
                        disabled={submitting}
                      />
                    </div>
                  ) : (
                    <div>
                      {existingCollections.length > 0 ? (
                        <Select
                          id="existing-collection-select"
                          label="Select Target Collection"
                          value={selectedCollectionId}
                          onChange={(e) => setSelectedCollectionId(e.target.value)}
                          disabled={submitting}
                        >
                          {existingCollections.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title} ({col.visibility})
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <p className="text-xs text-ash">
                          You do not have any existing collections yet. Please choose &ldquo;Create New Course Pack&rdquo; above.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 1. Multi-File Selection & Dropzone */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">
                      {batchFiles.length > 0
                        ? `01. Selected Folios (${batchFiles.length} files · ${formatBytes(totalBatchBytes)})`
                        : '01. Select Academic Documents'}
                    </span>
                  </div>
                  {batchFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFiles}
                      disabled={submitting}
                      className="meta-mono text-xs text-oxblood hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Hidden Multi-File Input */}
                <input
                  id="academic-file-input"
                  aria-label="Choose academic document file"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesAdded(Array.from(e.target.files));
                    }
                    // Reset input so same file can be picked again if removed
                    e.target.value = '';
                  }}
                />

                {/* Dropzone Container */}
                <div
                  tabIndex={0}
                  role="button"
                  aria-label="Click or drag and drop to select documents"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed p-6 sm:p-9 text-center cursor-pointer transition-colors select-none ${
                    dragOver
                      ? 'border-oxblood bg-bone/40'
                      : 'border-ink/20 bg-paper hover:border-ink hover:bg-bone/20'
                  }`}
                >
                  <div className="w-11 h-11 border border-ink/15 bg-bone flex items-center justify-center mx-auto mb-2.5 text-ash">
                    <UploadCloud className="w-5 h-5 text-oxblood" />
                  </div>
                  <p className="font-display text-base text-ink font-medium">
                    {batchFiles.length === 0
                      ? 'Select a folio or drag and drop file here'
                      : 'Add more files or drag and drop here'}
                  </p>
                  <p className="text-xs text-ash mt-1">
                    {isAdmin
                      ? 'Select multiple PDF, DOC, or DOCX files · Standard limit: 50 MB (No limit for Admin)'
                      : 'Select multiple PDF, DOC, or DOCX files (up to 50 MB each)'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Shared Batch Metadata Card */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">02. Academic Context & Curriculum</span>
                  </div>
                  <span className="meta-mono text-ash text-[11px]">* Required Fields</span>
                </div>

                {/* Single-file primary Title Input (Maintains 100% contract for single-file & unit tests) */}
                {batchFiles.length <= 1 && (
                  <Input
                    id="doc-title"
                    label="Document Title"
                    required
                    placeholder="e.g. CS3351 — Unit 1 Combinational Logic Notes"
                    value={singleItem ? singleItem.title : ''}
                    onChange={(e) => {
                      if (singleItem) {
                        updateFileItem(singleItem.id, { title: e.target.value });
                      }
                    }}
                    disabled={submitting}
                    helperText="Official title under which this folio will appear in the library index."
                  />
                )}

                {/* Intelligent Subject Autocomplete */}
                <div className="space-y-2">
                  <SubjectAutocomplete
                    selectedSubject={batchFiles.length === 1 ? batchFiles[0].subject : sharedSubject}
                    selectedCode={batchFiles.length === 1 ? batchFiles[0].subjectCode : sharedSubjectCode}
                    selectedRegulation={sharedRegulation}
                    selectedDepartment={sharedDepartment}
                    selectedSemester={sharedSemester}
                    isVerified={batchFiles.length === 1 ? batchFiles[0].isVerifiedSubject : sharedIsVerifiedSubject}
                    onSubjectChange={({
                      subject: newSub,
                      subject_code: newCode,
                      regulation: newReg,
                      department: newDept,
                      semester: newSem,
                      isVerified,
                    }) => {
                      setSharedSubject(newSub);
                      setSharedSubjectCode(newCode);
                      setSharedRegulation(newReg);
                      setSharedIsVerifiedSubject(isVerified);
                      if (newDept && DEPARTMENTS.includes(newDept)) {
                        setSharedDepartment(newDept);
                      }
                      if (newSem && SEMESTERS.includes(newSem)) {
                        setSharedSemester(newSem);
                      }

                      // If exactly 1 file, also sync it immediately
                      if (batchFiles.length === 1) {
                        updateFileItem(batchFiles[0].id, {
                          subject: newSub,
                          subjectCode: newCode,
                          regulation: newReg,
                          department: newDept || sharedDepartment,
                          semester: newSem || sharedSemester,
                          isVerifiedSubject: isVerified,
                        });
                      }
                    }}
                  />

                  {/* Batch Subject Quick-Apply Button */}
                  {batchFiles.length > 1 && (
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-ash">
                        Apply this subject to all {batchFiles.length} selected files:
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applySharedSubjectToAll}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-oxblood" />}
                      >
                        Apply Subject to All Files
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    id="doc-material-type"
                    label="Resource Format"
                    required
                    value={batchFiles.length === 1 ? batchFiles[0].materialType : sharedMaterialType}
                    onChange={(e) => {
                      const val = e.target.value as MaterialTypeValue;
                      setSharedMaterialType(val);
                      if (batchFiles.length === 1) {
                        updateFileItem(batchFiles[0].id, { materialType: val });
                      }
                    }}
                    disabled={submitting}
                  >
                    {MATERIAL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="doc-regulation"
                    label="Academic Regulation"
                    required
                    value={sharedRegulation}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSharedRegulation(val);
                      setBatchFiles((prev) => prev.map((f) => ({ ...f, regulation: val })));
                    }}
                    disabled={submitting}
                  >
                    {REGULATIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        Regulation {reg}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    id="doc-department"
                    label="Department"
                    required
                    value={sharedDepartment}
                    onChange={(e) => {
                      const val = e.target.value as Department;
                      setSharedDepartment(val);
                      setBatchFiles((prev) => prev.map((f) => ({ ...f, department: val })));
                    }}
                    disabled={submitting}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="doc-academic-year"
                    label="Academic Standing"
                    required
                    value={sharedAcademicYear}
                    onChange={(e) => {
                      const val = e.target.value as AcademicYear;
                      setSharedAcademicYear(val);
                      setBatchFiles((prev) => prev.map((f) => ({ ...f, academicYear: val })));
                    }}
                    disabled={submitting}
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </Select>

                  <Select
                    id="doc-semester"
                    label="Semester"
                    required
                    value={sharedSemester}
                    onChange={(e) => {
                      const val = e.target.value as Semester;
                      setSharedSemester(val);
                      setBatchFiles((prev) => prev.map((f) => ({ ...f, semester: val })));
                    }}
                    disabled={submitting}
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </Select>
                </div>

                {batchFiles.length <= 1 && (
                  <Select
                    id="doc-unit"
                    label="Syllabus Unit (Optional)"
                    value={singleItem ? singleItem.unit : sharedUnit}
                    onChange={(e) => {
                      const val = e.target.value as Unit | '';
                      setSharedUnit(val);
                      if (singleItem) {
                        updateFileItem(singleItem.id, { unit: val });
                      }
                    }}
                    disabled={submitting}
                  >
                    <option value="">General Syllabus / Multiple Units</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* 3. Batch Items Multi-File Ledger (Rendered when 1 or more files are selected) */}
            {batchFiles.length > 0 && (
              <Card className="bg-card border-ink/15 shadow-none">
                <CardContent className="p-6 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                    <div className="flex items-center gap-2">
                      <Files className="w-4 h-4 text-oxblood" />
                      <span className="label-eyebrow text-ink">
                        03. Folio Batch Ledger & Per-Document Customization ({batchFiles.length})
                      </span>
                    </div>
                    <span className="meta-mono text-ash text-[11px]">
                      {batchFiles.length > 1
                        ? 'Customize individual titles & subjects below'
                        : 'Selected file details'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {batchFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          'p-4 sm:p-5 border transition-all text-ink space-y-3',
                          item.status === 'error'
                            ? 'border-oxblood/50 bg-oxblood/5'
                            : item.status === 'success'
                            ? 'border-emerald-900/30 bg-emerald-950/5'
                            : 'border-ink/15 bg-paper hover:border-ink/30'
                        )}
                      >
                        {/* File Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 truncate">
                            <div className="w-9 h-9 border border-ink/15 bg-bone flex items-center justify-center text-oxblood shrink-0 mt-0.5">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="meta-mono text-[10px] text-ash font-semibold">
                                  Nº {String(idx + 1).padStart(2, '0')}
                                </span>
                                <p className="text-sm font-medium text-ink truncate">{item.file.name}</p>
                              </div>
                              <p className="meta-mono text-ash text-[11px]">
                                {formatBytes(item.file.size)}
                                {isAdmin && item.file.size > 50 * 1024 * 1024 && (
                                  <span className="text-oxblood font-semibold ml-1.5">
                                    (Admin Unlimited Folio)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.status === 'uploading' && (
                              <Badge variant="warning" size="sm">
                                Uploading...
                              </Badge>
                            )}
                            {item.status === 'success' && (
                              <Badge variant="success" size="sm" dot>
                                Catalogued
                              </Badge>
                            )}
                            {item.status === 'error' && (
                              <Badge variant="oxblood" size="sm" dot>
                                Failed
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeFileItem(item.id)}
                              disabled={submitting}
                              aria-label={`Remove file ${item.file.name}`}
                              title="Remove file from batch"
                              className="text-ash hover:text-oxblood"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Error Notice on item if failed */}
                        {item.status === 'error' && item.errorMessage && (
                          <div className="p-2.5 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs meta-mono leading-relaxed">
                            {item.errorMessage}
                          </div>
                        )}

                        {/* Per-File Editable Metadata (Shown on multi-file batches) */}
                        {batchFiles.length > 1 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ink/10">
                            <div>
                              <label
                                htmlFor={`title-${formUid}-${item.id}`}
                                className="block text-[11px] font-mono uppercase tracking-wider text-ash font-medium mb-1"
                              >
                                Folio Title <span className="text-oxblood">*</span>
                              </label>
                              <Input
                                id={`title-${formUid}-${item.id}`}
                                aria-label={`Title for ${item.file.name}`}
                                value={item.title}
                                onChange={(e) => updateFileItem(item.id, { title: e.target.value })}
                                placeholder="Folio Title"
                                disabled={submitting || item.status === 'success'}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`subject-${formUid}-${item.id}`}
                                className="block text-[11px] font-mono uppercase tracking-wider text-ash font-medium mb-1"
                              >
                                Subject / Course Name <span className="text-oxblood">*</span>
                              </label>
                              <Input
                                id={`subject-${formUid}-${item.id}`}
                                aria-label={`Subject for ${item.file.name}`}
                                value={item.subject}
                                onChange={(e) => updateFileItem(item.id, { subject: e.target.value })}
                                placeholder="e.g. Object Oriented Programming"
                                disabled={submitting || item.status === 'success'}
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`unit-${formUid}-${item.id}`}
                                className="block text-[11px] font-mono uppercase tracking-wider text-ash font-medium mb-1"
                              >
                                Syllabus Unit
                              </label>
                              <Select
                                id={`unit-${formUid}-${item.id}`}
                                aria-label={`Unit for ${item.file.name}`}
                                value={item.unit}
                                onChange={(e) => updateFileItem(item.id, { unit: e.target.value as Unit | '' })}
                                disabled={submitting || item.status === 'success'}
                              >
                                <option value="">General Syllabus / Multiple Units</option>
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            <div>
                              <label
                                htmlFor={`type-${formUid}-${item.id}`}
                                className="block text-[11px] font-mono uppercase tracking-wider text-ash font-medium mb-1"
                              >
                                Resource Format
                              </label>
                              <Select
                                id={`type-${formUid}-${item.id}`}
                                aria-label={`Format for ${item.file.name}`}
                                value={item.materialType}
                                onChange={(e) =>
                                  updateFileItem(item.id, {
                                    materialType: e.target.value as MaterialTypeValue,
                                  })
                                }
                                disabled={submitting || item.status === 'success'}
                              >
                                {MATERIAL_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add more files footer trigger */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add More Files to Batch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 4. Access Privacy & Password Protection */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">04. Access Governance & Privacy</span>
                  </div>
                  <Badge variant={visibility === 'private' ? 'oxblood' : 'neutral'} size="sm">
                    {visibility === 'private' ? 'Encrypted / Private' : 'Open Archive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Public Option */}
                  <div
                    tabIndex={0}
                    role="button"
                    onClick={() => setVisibility('public')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setVisibility('public');
                      }
                    }}
                    className={`p-4 border text-left cursor-pointer transition-colors ${
                      visibility === 'public'
                        ? 'border-ink bg-paper ring-1 ring-ink'
                        : 'border-ink/15 bg-card hover:border-ink/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-ink" />
                        <span className="font-display text-sm font-medium text-ink">
                          Public Catalogue
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === 'public'}
                        onChange={() => setVisibility('public')}
                        className="text-oxblood focus:ring-oxblood"
                      />
                    </div>
                    <p className="text-xs text-ash leading-relaxed">
                      Indexed in Clio catalogue, discoverable by all scholars, and open for instant reading.
                    </p>
                  </div>

                  {/* Private Option */}
                  <div
                    tabIndex={0}
                    role="button"
                    onClick={() => setVisibility('private')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setVisibility('private');
                      }
                    }}
                    className={`p-4 border text-left cursor-pointer transition-colors ${
                      visibility === 'private'
                        ? 'border-oxblood bg-paper ring-1 ring-oxblood'
                        : 'border-ink/15 bg-card hover:border-ink/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-oxblood" />
                        <span className="font-display text-sm font-medium text-ink">
                          Private Study Group
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === 'private'}
                        onChange={() => setVisibility('private')}
                        className="text-oxblood focus:ring-oxblood"
                      />
                    </div>
                    <p className="text-xs text-ash leading-relaxed">
                      Unlisted from catalogue search. Accessible only by direct URL and a private password.
                    </p>
                  </div>
                </div>

                {/* Password Fields & Quota Meter when Private */}
                {visibility === 'private' && (
                  <div className="space-y-4">
                    <PrivateStoragePanel compact={true} />

                    <div className="p-4 bg-oxblood/5 border border-oxblood/20 space-y-4">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                        <p className="text-xs text-ash leading-relaxed">
                          Private assets are protected using salted PBKDF2-SHA512. Access links remain
                          confidential and files stream securely via authenticated session or password unlock.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          id="doc-password"
                          label="Access Password (min 6 chars)"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={submitting}
                        />

                        <Input
                          id="doc-confirm-password"
                          label="Confirm Password"
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={submitting}
                          error={
                            confirmPassword && password !== confirmPassword
                              ? 'Passwords do not match'
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Academic Fair Use Declaration */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    id="declarationCheckbox"
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    disabled={submitting}
                    className="mt-0.5 h-4 w-4 rounded-none border-ink/30 text-ink focus:ring-oxblood cursor-pointer"
                  />
                  <label
                    htmlFor="declarationCheckbox"
                    className="text-xs text-ash leading-relaxed cursor-pointer select-none space-y-1"
                  >
                    <span className="font-medium text-ink flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-oxblood shrink-0" />
                      Academic Fair Use & Document Sharing Declaration
                    </span>
                    <p>
                      I confirm that {batchFiles.length > 1 ? 'these documents represent' : 'this document represents'}{' '}
                      legitimate academic study notes, previous-year question papers, or authorized coursework materials.
                      It contains no confidential exam materials or unauthorized commercial copyrighted textbooks.
                    </p>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Submit Action */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={submitting || batchFiles.length === 0}
                className="w-full gap-2 font-medium"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                {submitting
                  ? `Uploading & Cataloguing ${batchFiles.length} Folio(s)...`
                  : visibility === 'private'
                  ? batchFiles.length > 1
                    ? `Deposit & Protect Batch (${batchFiles.length} Folios)`
                    : 'Deposit & Protect Private Folio'
                  : batchFiles.length > 1
                  ? `Deposit & Publish Batch (${batchFiles.length} Folios)`
                  : 'Deposit & Publish to Catalog'}
              </Button>

              {submitting && (
                <p className="meta-mono text-center text-xs text-ash animate-pulse">
                  Please keep this window open while the documents are uploaded and catalogued.
                </p>
              )}
            </div>
          </form>
        )}
      </Container>
    </div>
  );
}
