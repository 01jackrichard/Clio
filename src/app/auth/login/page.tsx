'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { sanitizeRedirectUrl } from '@/lib/utils';
import { Button, Input, Card, CardContent, ClioEmblem } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectUrl(searchParams.get('redirectTo'), '/dashboard');
  const registeredMsg = searchParams.get('registered');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    // Check configuration
    if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
      setError(
        'Authentication service is not configured. The administrator must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError(
          'Unable to reach authentication server. Please verify that your Supabase service is active and your network connection is online.'
        );
      } else if (err instanceof Error) {
        if (err.message.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid email or password. Please verify your credentials and try again.');
        } else if (err.message.toLowerCase().includes('email not confirmed')) {
          setError('Your email has not been verified yet. Please check your inbox for the confirmation link.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred during sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-card border-ink/15 shadow-none">
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
            <span className="meta-mono text-oxblood">Access Folio</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-display text-2xl text-ink font-medium tracking-tight">
              Sign In to Archive
            </h1>
            <p className="text-xs text-ash leading-relaxed">
              Knowledge, preserved. Consult verified course syllabi and examination papers for{' '}
              <strong className="text-ink font-medium">{config.app.collegeName}</strong>.
            </p>
          </div>
        </div>

        {/* Registered Success Banner */}
        {registeredMsg && (
          <div
            role="status"
            className="p-3.5 bg-emerald-950/5 border border-emerald-900/20 text-emerald-900 text-xs flex items-start gap-2.5 leading-relaxed"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Registration submitted! Please verify your student email inbox before signing in.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-3.5 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate={false}>
          <Input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            label="Institutional Email"
            placeholder={`scholar@${config.app.collegeDomain}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-mono uppercase tracking-wider text-ash font-medium"
              >
                Password <span className="text-oxblood" aria-hidden="true">*</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="meta-mono text-[11px] text-ash hover:text-oxblood transition-colors link-underline"
              >
                Forgot password?
              </Link>
            </div>

            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              }
            />
          </div>

          <Button
            type="submit"
            size="md"
            variant="primary"
            loading={loading}
            disabled={loading}
            className="w-full mt-2 font-medium"
            rightIcon={<ArrowUpRight className="w-4 h-4" />}
          >
            Authenticate & Open Library
          </Button>
        </form>

        {/* Footer Link */}
        <div className="pt-4 border-t border-ink/10 flex items-baseline justify-between text-xs">
          <span className="text-ash">New scholar to Clio?</span>
          <Link
            href={
              redirectTo && redirectTo !== '/dashboard'
                ? `/auth/register?redirectTo=${encodeURIComponent(redirectTo)}`
                : '/auth/register'
            }
            className="font-medium text-ink hover:text-oxblood transition-colors link-underline"
          >
            Register student account →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 bg-paper">
      <Suspense
        fallback={
          <div className="meta-mono text-xs text-ash animate-pulse">
            Loading repository authentication...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
