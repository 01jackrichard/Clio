'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ArrowUpRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Card, CardContent, ClioEmblem } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidSession, setInvalidSession] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  // Validate that the user reached here via a valid recovery session
  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If no session exists, the recovery link might have expired or not been clicked
        if (!session) {
          // Listen for auth state change in case the token is still parsing from hash
          const { data: authListener } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'PASSWORD_RECOVERY' || s) {
              setInvalidSession(false);
              setSessionChecking(false);
            }
          });

          // Allow a brief moment for hash token exchange
          const timeout = setTimeout(() => {
            setInvalidSession(true);
            setSessionChecking(false);
          }, 300);

          return () => {
            authListener.subscription.unsubscribe();
            clearTimeout(timeout);
          };
        } else {
          setInvalidSession(false);
          setSessionChecking(false);
        }
      } catch {
        setInvalidSession(true);
        setSessionChecking(false);
      }
    }

    checkRecoverySession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2500);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update account password. Your recovery link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 bg-paper">
      <Card className="w-full max-w-md bg-card border-ink/15 shadow-none">
        <CardContent className="p-8 sm:p-10 space-y-7">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <ClioEmblem size={28} className="text-oxblood" />
                <span className="font-display text-3xl text-ink font-medium tracking-tight">
                  Clio
                </span>
              </div>
              <span className="meta-mono text-oxblood">Security</span>
            </div>
            <h1 className="font-display text-2xl text-ink font-medium tracking-tight">
              Set New Password
            </h1>
            <p className="text-xs text-ash leading-relaxed">
              Create a strong new password for your Clio academic repository account.
            </p>
          </div>

          {sessionChecking ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-oxblood border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="meta-mono text-xs text-ash">Verifying security token...</p>
            </div>
          ) : invalidSession ? (
            <div
              role="alert"
              className="p-6 bg-paper border border-ink/15 space-y-4 text-center"
            >
              <AlertCircle className="w-8 h-8 text-oxblood mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="font-display text-lg text-ink font-medium">
                  Recovery Session Expired
                </h2>
                <p className="text-xs text-ash leading-relaxed">
                  This password reset link has expired or has already been used. Please request a new
                  link to continue.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Request New Reset Link</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/auth/login"
                  className="text-xs text-ash hover:text-ink meta-mono transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : success ? (
            <div
              role="status"
              className="p-6 bg-paper border border-ink/15 space-y-4 text-center"
            >
              <CheckCircle2 className="w-9 h-9 text-oxblood mx-auto" aria-hidden="true" />
              <div className="space-y-1">
                <h2 className="font-display text-xl text-ink font-medium">
                  Password Updated
                </h2>
                <p className="text-xs text-ash leading-relaxed">
                  Your credentials have been securely updated. Redirecting you to the sign-in page...
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5" noValidate={false}>
              {error && (
                <div
                  role="alert"
                  className="p-3.5 bg-oxblood/5 border border-oxblood/20 text-oxblood text-xs flex items-start gap-2.5 leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                label="New Password"
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

              <Input
                id="reset-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password confirmation'
                        : 'Show password confirmation'
                    }
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
                Update Account Password
              </Button>
            </form>
          )}

          {/* Return link */}
          <div className="pt-4 border-t border-ink/10 flex items-center justify-between text-xs">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-ash hover:text-ink meta-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
