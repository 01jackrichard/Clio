'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Copy,
  Check,
} from 'lucide-react';
import { config } from '@/lib/config';
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
import { formatBytes } from '@/lib/utils';
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

export default function UploadPage() {
  // Mode selection: 'individual' vs 'collection'
  const [uploadMode, setUploadMode] = useState<'individual' | 'collection'>('individual');

  // File selection state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [academicYear, setAcademicYear] = useState<AcademicYear>(ACADEMIC_YEARS[0]);
  const [semester, setSemester] = useState<Semester>(SEMESTERS[0]);
  const [subject, setSubject] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [regulation, setRegulation] = useState<string>('2021');
  const [isVerifiedSubject, setIsVerifiedSubject] = useState(true);
  const [unit, setUnit] = useState<Unit | ''>('');
  const [materialType, setMaterialType] = useState<MaterialTypeValue>(MATERIAL_TYPES[0].value);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Visibility & Security State
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Collection Pack state
  const [collectionAction, setCollectionAction] = useState<'new' | 'existing'>('new');
  const [collectionTitle, setCollectionTitle] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [existingCollections, setExistingCollections] = useState<Array<{ id: string; title: string; visibility: string }>>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [completedDoc, setCompletedDoc] = useState<{
    id: string;
    title: string;
    visibility: string;
    collectionId?: string;
  } | null>(null);

  // Fetch user's existing collections when in collection mode
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

  // Staged progress messaging
  const stagedMessages = [
    'Validating academic document signature...',
    'Authorizing Google Drive central repository...',
    'Transferring file to institutional library...',
    'Registering folio metadata in catalogue...',
  ];

  useEffect(() => {
    if (!submitting) return;

    const timer = setInterval(() => {
      setSubmitStage((prev) => (prev < stagedMessages.length - 1 ? prev + 1 : prev));
    }, 1400);

    return () => clearInterval(timer);
  }, [submitting, stagedMessages.length]);

  const handleFileChange = (file: File | null) => {
    setError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Size limit check: 50 MB
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50 MB repository limit. Please select a smaller document.');
      return;
    }

    // Extension check
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
      setError('Invalid file format. Please upload a PDF, DOC, or DOCX document.');
      return;
    }

    setSelectedFile(file);

    // Auto-populate title if empty
    if (!title.trim()) {
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      if (cleanTitle.length >= 3) {
        setTitle(cleanTitle);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const addTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean) && tags.length < 8) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!selectedFile) {
      setError('Please select a PDF, DOC, or DOCX document to contribute.');
      return;
    }

    if (!subject.trim()) {
      setError('Please provide or search for a subject name / Anna University course code.');
      return;
    }

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

    if (!declarationAccepted) {
      setError('You must accept the academic honesty and fair use declaration to proceed.');
      return;
    }

    setSubmitStage(0);
    setSubmitting(true);
    setError(null);

    try {
      let targetCollectionId = selectedCollectionId;

      // If in collection mode and creating a new collection first
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
            department: department || undefined,
            regulation: regulation || '2021',
            academic_year: academicYear || undefined,
            semester: semester || undefined,
            visibility,
            password: visibility === 'private' ? password : undefined,
          }),
        });

        const colData = await colRes.json();
        if (!colRes.ok) {
          throw new Error(colData.error || 'Failed to create collection pack');
        }

        targetCollectionId = colData.collection.id;
      }

      // Upload the document
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('department', department);
      formData.append('academic_year', academicYear);
      formData.append('semester', semester);
      formData.append('subject', subject.trim());
      if (subjectCode.trim()) formData.append('subject_code', subjectCode.trim());
      formData.append('regulation', regulation);
      formData.append('is_verified_subject', isVerifiedSubject ? 'true' : 'false');
      if (unit) formData.append('unit', unit);
      formData.append('material_type', materialType);
      formData.append('tags', JSON.stringify(tags));
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
        throw new Error(data.error || 'Failed to upload document');
      }

      setCompletedDoc({
        id: data.document.id,
        title: data.document.title,
        visibility: visibility,
        collectionId: uploadMode === 'collection' ? targetCollectionId : undefined,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Submission failed. Please check your network connection and retry.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-paper min-h-screen py-8 sm:py-14">
      <Container className="max-w-3xl space-y-8">
        {/* Editorial Heading */}
        <div className="space-y-3 pb-6 border-b border-ink/15">
          <div className="flex flex-wrap items-center gap-3">
            <span className="meta-mono text-oxblood font-semibold">Contribution Folio</span>
            <span className="block h-px w-6 bg-ink/30" aria-hidden="true" />
            <span className="label-eyebrow">Academic Archive</span>
            <Badge variant="neutral" size="sm">
              PDF, DOC, DOCX · Max 50 MB
            </Badge>
            <Badge variant="neutral" size="sm">
              Anna University Syllabus · CBCS
            </Badge>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-ink font-medium tracking-tight leading-tight">
            Contribute Academic Notes
          </h1>

          <p className="text-xs sm:text-sm text-ash leading-relaxed max-w-2xl">
            Deposit lecture notes, question banks, or complete course packs for{' '}
            <strong className="text-ink font-medium">{config.app.collegeName}</strong>. Documents are
            preserved in the institutional Google Drive repository with optional password-protected group sharing.
          </p>

          {/* Mode Switcher Tabs */}
          {!completedDoc && (
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
                <span>Individual Document Folio</span>
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

        {completedDoc ? (
          <Card className="bg-card border-ink/20 shadow-none text-center">
            <CardContent className="p-8 sm:p-12 space-y-6">
              <div className="w-14 h-14 bg-oxblood/10 border border-oxblood/20 text-oxblood flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Badge
                    variant={completedDoc.visibility === 'private' ? 'oxblood' : 'neutral'}
                    size="sm"
                    dot
                  >
                    {completedDoc.visibility === 'private' ? 'Protected Access' : 'Published to Catalogue'}
                  </Badge>
                </div>
                <h2 className="font-display text-2xl text-ink font-medium tracking-tight">
                  Folio Preserved Successfully
                </h2>
                <p className="text-xs sm:text-sm text-ash leading-relaxed">
                  <strong className="text-ink font-medium">{completedDoc.title}</strong> has been secured
                  and registered in Clio’s academic catalogue.
                  {completedDoc.visibility === 'private' && (
                    <span className="block mt-1 text-oxblood font-mono text-xs">
                      Locked with your access password. Readers require password to view or download.
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/documents/${completedDoc.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Open in Document Reader</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                {completedDoc.collectionId && (
                  <Link
                    href={`/collections/${completedDoc.collectionId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-ink text-ink text-xs font-medium hover:bg-bone transition-colors"
                  >
                    <Layers className="w-4 h-4" />
                    <span>View Course Pack</span>
                  </Link>
                )}

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      handleCopyLink(`${window.location.origin}/documents/${completedDoc.id}`);
                    }
                  }}
                  leftIcon={copiedLink ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedLink ? 'Link Copied' : 'Copy Direct Link'}
                </Button>

                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setCompletedDoc(null);
                    setSelectedFile(null);
                    setTitle('');
                    setDescription('');
                    setSubject('');
                    setSubjectCode('');
                    setUnit('');
                    setTags([]);
                    setPassword('');
                    setConfirmPassword('');
                    setDeclarationAccepted(false);
                  }}
                >
                  Contribute Another Folio
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7" noValidate={false}>
            {error && (
              <div
                role="alert"
                className="p-4 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" aria-hidden="true" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Collection Group Section (if Collection mode is active) */}
            {uploadMode === 'collection' && (
              <Card className="bg-card border-ink/15 shadow-none">
                <CardContent className="p-6 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-oxblood" />
                      <span className="label-eyebrow text-ink">Course Pack / Collection Assignment</span>
                    </div>
                    <Badge variant="neutral" size="sm">
                      Multi-file Pack
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

            {/* 1. File Selection & Dropzone */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">
                      {uploadMode === 'collection' ? '01. Select Document File for Pack' : '01. Select Academic Document'}
                    </span>
                  </div>
                  <span className="meta-mono text-ash text-[11px]">Direct Drive Deposit</span>
                </div>

                <input
                  id="academic-file-input"
                  aria-label="Choose academic document file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                />

                {!selectedFile ? (
                  <div
                    tabIndex={0}
                    role="button"
                    aria-label="Click or drag and drop to select document"
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
                    className={`border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-colors select-none ${
                      dragOver
                        ? 'border-oxblood bg-bone/40'
                        : 'border-ink/20 bg-paper hover:border-ink hover:bg-bone/20'
                    }`}
                  >
                    <div className="w-12 h-12 border border-ink/15 bg-bone flex items-center justify-center mx-auto mb-3.5 text-ash">
                      <UploadCloud className="w-6 h-6 text-oxblood" />
                    </div>
                    <p className="font-display text-base text-ink font-medium">
                      Select a folio or drag and drop file here
                    </p>
                    <p className="text-xs text-ash mt-1">
                      PDF, DOC, or DOCX formats accepted up to 50 MB
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-paper border border-ink/20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 truncate">
                      <div className="w-10 h-10 border border-ink/15 bg-bone flex items-center justify-center text-oxblood shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-ink truncate">
                          {selectedFile.name}
                        </p>
                        <p className="meta-mono text-ash text-[11px]">
                          {formatBytes(selectedFile.size)} · Google Drive Repository
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleFileChange(null)}
                      disabled={submitting}
                      aria-label="Remove selected file"
                      title="Remove file"
                      className="text-ash hover:text-oxblood shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Academic Classification & Intelligent Subject Matching */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">02. Academic Metadata & Curriculum</span>
                  </div>
                  <span className="meta-mono text-ash text-[11px]">* Required Fields</span>
                </div>

                <Input
                  id="doc-title"
                  label="Document Title"
                  required
                  placeholder="e.g. CS3351 — Unit 1 Combinational Logic Notes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  helperText="Official title under which this folio will appear in the library index."
                />

                {/* Intelligent Subject Autocomplete */}
                <SubjectAutocomplete
                  selectedSubject={subject}
                  selectedCode={subjectCode}
                  selectedRegulation={regulation}
                  selectedDepartment={department}
                  selectedSemester={semester}
                  isVerified={isVerifiedSubject}
                  onSubjectChange={({ subject: newSub, subject_code: newCode, regulation: newReg, department: newDept, semester: newSem, isVerified }) => {
                    setSubject(newSub);
                    setSubjectCode(newCode);
                    setRegulation(newReg);
                    setIsVerifiedSubject(isVerified);
                    if (newDept && DEPARTMENTS.includes(newDept)) {
                      setDepartment(newDept);
                    }
                    if (newSem && SEMESTERS.includes(newSem)) {
                      setSemester(newSem);
                    }
                  }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    id="doc-material-type"
                    label="Resource Format"
                    required
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialTypeValue)}
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
                    value={regulation}
                    onChange={(e) => setRegulation(e.target.value)}
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
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
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
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value as AcademicYear)}
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
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as Semester)}
                    disabled={submitting}
                  >
                    {SEMESTERS.map((sem) => (
                      <option key={sem} value={sem}>
                        {sem}
                      </option>
                    ))}
                  </Select>
                </div>

                <Select
                  id="doc-unit"
                  label="Syllabus Unit (Optional)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit | '')}
                  disabled={submitting}
                >
                  <option value="">General Syllabus / Multiple Units</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>

                <Textarea
                  id="doc-description"
                  label="Folio Abstract & Context (Optional)"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize key theorems, formulas, examination topics, or laboratory objectives..."
                  disabled={submitting}
                />

                {/* Tags */}
                <div className="space-y-2">
                  <label
                    htmlFor="tag-input"
                    className="block text-xs font-mono uppercase tracking-wider text-ash font-medium"
                  >
                    Topic Index Tags (Optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="tag-input"
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add keyword and press Enter (e.g. thermodynamics, paging)"
                      disabled={submitting}
                      wrapperClassName="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={addTag}
                      disabled={submitting || !tagInput.trim()}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((tag, idx) => (
                        <Badge key={idx} variant="neutral" size="sm" className="gap-1 pr-1">
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx)}
                            aria-label={`Remove tag ${tag}`}
                            className="hover:text-oxblood cursor-pointer p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 3. Access Privacy & Password Protection */}
            <Card className="bg-card border-ink/15 shadow-none">
              <CardContent className="p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-oxblood" />
                    <span className="label-eyebrow text-ink">03. Access Governance & Privacy</span>
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

                {/* Password Fields when Private */}
                {visibility === 'private' && (
                  <div className="p-4 bg-oxblood/5 border border-oxblood/20 space-y-4">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
                      <p className="text-xs text-ash leading-relaxed">
                        Private assets are encrypted using salted PBKDF2-SHA512. Drive access links remain
                        confidential and files stream securely via server proxy upon password unlock.
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
                )}
              </CardContent>
            </Card>

            {/* 4. Academic Fair Use Declaration */}
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
                      I confirm that this document represents legitimate academic study notes,
                      previous-year question papers, or authorized coursework materials. It contains no
                      confidential exam materials or unauthorized commercial copyrighted textbooks.
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
                disabled={submitting || !selectedFile}
                className="w-full gap-2 font-medium"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                {submitting
                  ? stagedMessages[submitStage]
                  : visibility === 'private'
                  ? 'Deposit & Protect Private Folio'
                  : 'Deposit & Publish to Catalog'}
              </Button>

              {submitting && (
                <p className="meta-mono text-center text-xs text-ash animate-pulse">
                  Please keep this window open while the document is uploaded to Google Drive.
                </p>
              )}
            </div>
          </form>
        )}
      </Container>
    </div>
  );
}
