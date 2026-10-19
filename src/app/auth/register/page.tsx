'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import {
  DEPARTMENTS,
  ACADEMIC_YEARS,
  Department,
  AcademicYear,
} from '@/lib/constants';
import { registerSchema } from '@/lib/validations/auth';
import { sanitizeRedirectUrl } from '@/lib/utils';
import { Button, Input, Select, Card, CardContent, ClioEmblem } from '@/components/ui';

function RegisterForm() {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirectTo') || searchParams.get('redirect') || '';
  const redirectTo = rawRedirect ? sanitizeRedirectUrl(rawRedirect, '') : '';
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);
  const [academicYear, setAcademicYear] = useState<AcademicYear>(ACADEMIC_YEARS[0]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Live password requirements
  const passwordCriteria = [
    { label: '8 or more characters', valid: password.length >= 8 },
    { label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'One number', valid: /[0-9]/.test(password) },
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    // 1. Password confirmation check
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      setLoading(false);
      return;
    }

    // 2. Comprehensive schema validation (domain, complexity, length)
    const validationResult = registerSchema.safeParse({
      email: email.trim(),
      password,
      display_name: displayName.trim(),
      department,
      academic_year: academicYear,
    });

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      setError(firstIssue?.message || 'Invalid registration details.');
      setLoading(false);
      return;
    }

    // 3. Check Supabase environment before initiating network call
    if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
      setError(
        'Authentication service is not configured. The administrator must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local to enable student registration.'
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            department,
            academic_year: academicYear,
          },
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.user) {
        setSuccess(true);
      }
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError(
          'Unable to reach authentication server. Please check your network connection and verify that your Supabase instance is active and reachable.'
        );
      } else if (err instanceof Error) {
        if (err.message.toLowerCase().includes('already registered')) {
          setError('An account with this email address already exists. Please sign in instead.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 bg-paper">
      <Card className="w-full max-w-lg bg-card border-ink/15 shadow-none">
        <CardContent className="p-8 sm:p-10 space-y-7">
          {/* Brand Header */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-2 group" aria-label="Clio home">
                <ClioEmblem size={28} className="text-oxblood transition-transform duration-200 group-hover:scale-105" />
                <span className="font-display text-3xl text-ink font-medium tracking-tight">
                  Clio
                </span>
              </Link>
              <span className="meta-mono text-oxblood">Scholar Registration</span>
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl text-ink font-medium tracking-tight">
                Join the Academic Archive
              </h1>
              <p className="text-xs text-ash leading-relaxed">
                Register as a student or faculty contributor for{' '}
                <strong className="text-ink font-medium">{config.app.collegeName}</strong>.
              </p>
            </div>
          </div>

          {success ? (
            <div
              role="status"
              className="p-6 bg-paper border border-ink/15 space-y-4 text-center"
            >
              <CheckCircle2 className="w-9 h-9 text-oxblood mx-auto" aria-hidden="true" />
              <div className="space-y-1.5">
                <h2 className="font-display text-xl text-ink font-medium">
                  Verification Email Dispatched
                </h2>
                <p className="text-xs text-ash leading-relaxed max-w-md mx-auto">
                  We have sent an activation link to{' '}
                  <strong className="text-ink font-mono font-medium">{email}</strong>.
                  You must confirm your institutional email before your account becomes active.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={
                    redirectTo
                      ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`
                      : '/auth/login'
                  }
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5" noValidate={false}>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Display Name */}
              <Input
                id="reg-display-name"
                type="text"
                required
                autoComplete="name"
                label="Full Display Name"
                placeholder="e.g. Eleanor Vance"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                leftIcon={<User className="w-4 h-4" />}
                helperText="Will appear on course notes you contribute."
              />

              {/* Institutional Email */}
              <Input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                label="Institutional Email"
                placeholder={`scholar@${config.app.collegeDomain}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                leftIcon={<Mail className="w-4 h-4" />}
                helperText={
                  config.auth.allowedDomains.length > 0
                    ? `Restricted to: @${config.auth.allowedDomains.join(', @')}`
                    : undefined
                }
              />

              {/* Department & Academic Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="reg-department"
                  label="Academic Department"
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
                  id="reg-academic-year"
                  label="Academic Standing"
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

              {/* Password */}
              <div className="space-y-1.5">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  label="Password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 text-ash hover:text-ink transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  }
                />

                {/* Password Requirements Checklist */}
                <div className="p-2.5 bg-paper border border-ink/10 grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  {passwordCriteria.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 transition-colors ${
                        c.valid ? 'text-ink font-medium' : 'text-ash/70'
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                          c.valid ? 'bg-oxblood text-paper' : 'border border-ink/20'
                        }`}
                      >
                        {c.valid && <Check className="w-2 h-2 stroke-[3]" />}
                      </span>
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <Input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    className="p-1 text-ash hover:text-ink transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <Button
                type="submit"
                size="md"
                variant="primary"
                loading={loading}
                disabled={loading}
                className="w-full mt-2 font-medium"
                rightIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Create Scholar Account
              </Button>
            </form>
          )}

          {/* Footer Link */}
          <div className="pt-4 border-t border-ink/10 flex items-baseline justify-between text-xs">
            <span className="text-ash">Already registered with Clio?</span>
            <Link
              href={
                redirectTo
                  ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`
                  : '/auth/login'
              }
              className="font-medium text-ink hover:text-oxblood transition-colors link-underline"
            >
              Sign in to your account →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 bg-paper meta-mono text-xs text-ash">
          Loading scholar registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
