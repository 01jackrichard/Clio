'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { DEPARTMENTS, ACADEMIC_YEARS, Department, AcademicYear } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ProfileFormProps {
  profile: Profile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [department, setDepartment] = useState<Department>(
    profile?.department || DEPARTMENTS[0]
  );
  const [academicYear, setAcademicYear] = useState<AcademicYear>(
    profile?.academic_year || ACADEMIC_YEARS[0]
  );
  const [graduationYear, setGraduationYear] = useState<number | ''>(
    profile?.graduation_year || ''
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setDisplayName(profile?.display_name || '');
    setDepartment(profile?.department || DEPARTMENTS[0]);
    setAcademicYear(profile?.academic_year || ACADEMIC_YEARS[0]);
    setGraduationYear(profile?.graduation_year || '');
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Client-side validation
    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 80) {
      setError('Display name cannot exceed 80 characters.');
      return;
    }

    if (graduationYear !== '') {
      const gradNum = Number(graduationYear);
      if (gradNum < 2020 || gradNum > 2035) {
        setError('Anticipated graduation year must be between 2020 and 2035.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();

      // Explicitly whitelist editable student profile fields to prevent unauthorized elevation
      const updatePayload = {
        display_name: trimmedName,
        department,
        academic_year: academicYear,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      // Preserve the user's entered form values on error
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Encountered an unexpected error while saving profile. Your inputs were preserved.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="default" className="shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Academic Credentials</CardTitle>
          <span className="meta-mono text-ash text-[11px]">* Required Fields</span>
        </div>
        <CardDescription>
          Update your student author attribution and department details for the verified repository.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {success && (
          <div
            role="status"
            className="p-4 bg-emerald-950/10 border border-emerald-900/25 text-emerald-900 text-xs flex items-center gap-2.5 leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Profile credentials updated successfully. Catalogue entries will reflect these changes.</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-4 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <Input
            id="display-name"
            label="Scholar Display Name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder="e.g. Eleanor Vance"
            helperText="The public author name displayed alongside your contributed lecture folios."
          />

          {/* Institutional Email (Read-Only) */}
          <Input
            id="institutional-email"
            label="Institutional Email Address"
            disabled
            value={profile?.email || ''}
            helperText="Bound to your institutional Supabase authentication. Contact college administrators to update."
          />

          {/* Academic Classification: Department & Standing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="academic-department"
              label="Academic Department"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
              disabled={loading}
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>

            <Select
              id="academic-standing"
              label="Academic Standing"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value as AcademicYear)}
              disabled={loading}
            >
              {ACADEMIC_YEARS.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </Select>
          </div>

          {/* Anticipated Graduation Year */}
          <Input
            id="graduation-year"
            label="Anticipated Graduation Year"
            type="number"
            min={2020}
            max={2035}
            value={graduationYear}
            onChange={(e) =>
              setGraduationYear(e.target.value ? Number(e.target.value) : '')
            }
            disabled={loading}
            placeholder="e.g. 2028"
            helperText="Optional 4-digit graduation cohort year (between 2020 and 2035)."
          />

          {/* Actions */}
          <div className="pt-4 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              disabled={loading}
              className="gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Values</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Academic Profile</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
