'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { Button, Input, Card, CardContent, ClioEmblem } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
      setError(
        'Authentication service is not configured. The administrator must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) throw resetError;

      setSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError('Unable to reach authentication server. Please check your network connection.');
      } else {
        // Generic message to avoid leaking user existence
        setError(err instanceof Error ? err.message : 'Error requesting password reset link');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16 bg-paper">
      <Card className="w-full max-w-md bg-card border-ink/15 shadow-none">
        <CardContent className="p-8 sm:p-10 space-y-7">
          {/* Back link */}
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 meta-mono text-[11px] text-ash hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>

          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <ClioEmblem size={28} className="text-oxblood" />
                <span className="font-display text-3xl text-ink font-medium tracking-tight">
                  Clio
                </span>
              </div>
              <span className="meta-mono text-oxblood">Recovery</span>
            </div>
            <h1 className="font-display text-2xl text-ink font-medium tracking-tight">
              Password Recovery
            </h1>
            <p className="text-xs text-ash leading-relaxed">
              Enter the institutional email registered to your account. We will dispatch secure
              instructions to reset your credentials.
            </p>
          </div>

          {submitted ? (
            <div
              role="status"
              className="p-6 bg-paper border border-ink/15 space-y-4 text-center"
            >
              <CheckCircle2 className="w-9 h-9 text-oxblood mx-auto" aria-hidden="true" />
              <div className="space-y-1.5">
                <h2 className="font-display text-xl text-ink font-medium">
                  Instructions Dispatched
                </h2>
                <p className="text-xs text-ash leading-relaxed max-w-sm mx-auto">
                  If an active account exists for{' '}
                  <strong className="text-ink font-mono font-medium">{email}</strong>, a secure
                  password recovery link has been dispatched to your inbox.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-ink text-paper text-xs font-medium hover:bg-oxblood transition-colors"
                >
                  <span>Return to Sign In</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
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
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                label="Registered Institutional Email"
                placeholder={`scholar@${config.app.collegeDomain}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Check your junk/spam folder if the message does not appear within 2 minutes."
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
                Send Password Reset Link
              </Button>
            </form>
          )}

          {/* Footer Assistance */}
          <div className="pt-4 border-t border-ink/10 flex items-baseline justify-between text-xs">
            <span className="text-ash">Remembered credentials?</span>
            <Link
              href="/auth/login"
              className="font-medium text-ink hover:text-oxblood transition-colors link-underline"
            >
              Sign in now →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
