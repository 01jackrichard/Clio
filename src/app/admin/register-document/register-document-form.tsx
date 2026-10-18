'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FilePlus2,
  CheckCircle2,
  AlertTriangle,
  X,
  Link2,
  Eye,
  Check,
  FileText,
} from 'lucide-react';
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  SEMESTERS,
  MATERIAL_TYPES,
  UNITS,
  Department,
  AcademicYear,
  Semester,
  MaterialTypeValue,
} from '@/lib/constants';
import { validateDriveInput } from '@/lib/drive/urls';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export function RegisterDocumentForm() {
  // Drive Link & validation state
  const [driveInput, setDriveInput] = useState('');
  const [driveValidation, setDriveValidation] = useState<{
    isValid: boolean;
    fileId?: string;
    embedUrl?: string;
    error?: string;
  } | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Metadata form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [academicYear, setAcademicYear] = useState<AcademicYear>(ACADEMIC_YEARS[0]);
  const [semester, setSemester] = useState<Semester>(SEMESTERS[0]);
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [materialType, setMaterialType] = useState<MaterialTypeValue>(MATERIAL_TYPES[0].value);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Registration state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedDoc, setCompletedDoc] = useState<{
    id: string;
    title: string;
    status: string;
  } | null>(null);

  const handleDriveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDriveInput(val);
    setError(null);

    if (!val.trim()) {
      setDriveValidation(null);
      return;
    }

    const res = validateDriveInput(val);
    setDriveValidation(res);
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

  const resetForm = () => {
    setCompletedDoc(null);
    setDriveInput('');
    setDriveValidation(null);
    setShowLivePreview(false);
    setTitle('');
    setDescription('');
    setSubject('');
    setUnit('');
    setTags([]);
    setPublishImmediately(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const driveCheck = validateDriveInput(driveInput);
    if (!driveCheck.isValid) {
      setError(driveCheck.error || 'Please provide a valid Google Drive link or file ID.');
      return;
    }

    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    if (!subject.trim()) {
      setError('Subject name / course code is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        department,
        academic_year: academicYear,
        semester,
        subject: subject.trim(),
        unit: unit || undefined,
        material_type: materialType,
        tags,
        drive_url_or_id: driveInput.trim(),
        publish_immediately: publishImmediately,
      };

      const res = await fetch('/api/admin/documents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register canonical document');
      }

      setCompletedDoc({
        id: data.documentId,
        title: title.trim(),
        status: data.status,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* SUCCESS CONFIRMATION */}
      {completedDoc ? (
        <Card className="p-8 sm:p-12 text-center space-y-6 bg-card border-ink/15 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="label-eyebrow text-emerald-800">Folio Registered</span>
            <h2 className="font-display text-2xl sm:text-3xl text-ink font-medium">
              Canonical Document Indexed
            </h2>
            <p className="font-body text-xs sm:text-sm text-ash leading-relaxed">
              <strong className="text-ink">{completedDoc.title}</strong> has been registered with status{' '}
              <Badge
                variant={completedDoc.status === 'approved' ? 'success' : 'warning'}
                className="font-mono text-xs uppercase"
              >
                {completedDoc.status}
              </Badge>
              . Scholars can now discover, read, and cite this work directly from institutional Google Drive storage.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/documents/${completedDoc.id}`}>
              <Button variant="primary" size="md">
                <FileText className="w-4 h-4 mr-2" />
                <span>View Document in Catalogue</span>
              </Button>
            </Link>

            <Button variant="outline" size="md" onClick={resetForm}>
              <FilePlus2 className="w-4 h-4 mr-2" />
              <span>Register Another Document</span>
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          {error && (
            <div
              role="alert"
              className="p-4 bg-rose-50 border border-rose-200 rounded-md text-rose-900 text-xs flex items-start gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1 font-body">{error}</div>
            </div>
          )}

          {/* 1. Google Drive Repository File */}
          <Card className="p-6 sm:p-8 bg-card border-ink/10 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-ink/10">
              <div className="space-y-0.5">
                <span className="label-eyebrow text-oxblood">Step 1</span>
                <h2 className="font-display text-lg text-ink font-medium flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-oxblood" />
                  <span>Google Drive Repository File</span>
                </h2>
              </div>
              <span className="meta-mono text-xs text-ash">Institutional Storage</span>
            </div>

            <div className="space-y-3">
              <Input
                label="Google Drive Share URL or File ID"
                required
                value={driveInput}
                onChange={handleDriveInputChange}
                placeholder="https://drive.google.com/file/d/1X9aBcDeFgHiJkLmNoPqRsTuVwXyZ/view?usp=sharing"
                leftIcon={<Link2 className="w-4 h-4" />}
                rightIcon={
                  driveValidation?.isValid ? (
                    <Check className="w-4 h-4 text-emerald-700" />
                  ) : undefined
                }
                helperText="Paste the full link or the 25–45 character Google Drive file identifier."
                className="font-mono text-xs"
              />

              {driveValidation?.isValid && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/60 border border-emerald-200/60 rounded text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-900 meta-mono">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Recognized File ID:</span>
                    <code className="font-mono font-bold bg-white px-1.5 py-0.5 border border-emerald-200 rounded text-emerald-950">
                      {driveValidation.fileId}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="inline-flex items-center gap-1 meta-mono text-xs font-semibold text-ink hover:text-oxblood transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showLivePreview ? 'Hide Embed Preview' : 'Test Drive Embed Preview'}</span>
                  </button>
                </div>
              )}

              {driveValidation && !driveValidation.isValid && (
                <p className="meta-mono text-xs text-oxblood">
                  {driveValidation.error}
                </p>
              )}

              {/* Optional live iframe preview */}
              {showLivePreview && driveValidation?.embedUrl && (
                <div className="mt-4 rounded-md overflow-hidden border border-ink/20 bg-ink/5 h-96">
                  <iframe
                    src={driveValidation.embedUrl}
                    title="Live Google Drive Preview Test"
                    className="w-full h-full border-0 bg-white"
                    allow="autoplay"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* 2. Academic Metadata Form */}
          <Card className="p-6 sm:p-8 bg-card border-ink/10 space-y-6">
            <div className="space-y-0.5 pb-3 border-b border-ink/10">
              <span className="label-eyebrow text-oxblood">Step 2</span>
              <h2 className="font-display text-lg text-ink font-medium flex items-center gap-2">
                <FilePlus2 className="w-4 h-4 text-oxblood" />
                <span>Catalog Metadata & Academic Classification</span>
              </h2>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <Input
                label="Document Title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS302 — Data Structures & Algorithms Comprehensive Lecture Folio"
                helperText="Provide a clear, formal title for discovery in the academic search catalogue."
              />

              {/* Subject & Material Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Subject Name / Course Code"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Data Structures & Algorithms (CS302)"
                />

                <Select
                  label="Material Type"
                  required
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as MaterialTypeValue)}
                  options={MATERIAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
                />
              </div>

              {/* Department, Year, Semester, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label="Department"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  options={DEPARTMENTS.map((dept) => ({ value: dept, label: dept }))}
                />

                <Select
                  label="Academic Year"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value as AcademicYear)}
                  options={ACADEMIC_YEARS.map((yr) => ({ value: yr, label: yr }))}
                />

                <Select
                  label="Semester"
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value as Semester)}
                  options={SEMESTERS.map((sem) => ({ value: sem, label: sem }))}
                />

                <Select
                  label="Syllabus Unit (Optional)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  options={[
                    { value: '', label: 'Full Syllabus / None' },
                    ...UNITS.map((u) => ({ value: u, label: u })),
                  ]}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-ash font-medium mb-1.5">
                  Academic Description & Syllabus Coverage (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Official lecture series, reference bibliography, theorem proofs, and accredited problem set walk-throughs..."
                  rows={3}
                  className="bg-paper"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-ash font-medium">
                  Index Keywords & Topics (Up to 8)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Type keyword and press Enter..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={addTag}
                  >
                    Add Keyword
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="neutral"
                        className="gap-1 font-mono text-xs"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(idx)}
                          className="hover:text-oxblood cursor-pointer ml-0.5"
                          aria-label={`Remove keyword ${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 3. Publication Settings */}
          <Card className="p-6 bg-paper border-ink/15 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="publishToggle" className="text-sm font-display font-medium text-ink cursor-pointer block">
                Publish Immediately to Academic Catalogue
              </label>
              <p className="font-body text-xs text-ash leading-relaxed max-w-xl">
                When activated, this canonical document bypasses the moderation review queue, is marked as approved, and appears instantly in student search queries.
              </p>
            </div>
            <input
              type="checkbox"
              id="publishToggle"
              checked={publishImmediately}
              onChange={(e) => setPublishImmediately(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-ink/30 text-oxblood focus:ring-oxblood cursor-pointer accent-oxblood"
            />
          </Card>

          {/* 4. Action */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              disabled={submitting || !driveInput || Boolean(driveValidation && !driveValidation.isValid)}
              className="w-full sm:w-auto min-w-[280px]"
            >
              <FilePlus2 className="w-4 h-4 mr-2" />
              <span>Register Document in Central Repository</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
