'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { sanitizeRedirectUrl, cn } from '@/lib/utils';

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  redirectTo?: string;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Genuine Google Brand "G" Mark per Google Identity Branding Guidelines.
 * Size: 20x20px with precise brand vector paths.
 */
export function GoogleBrandIcon({ className = 'w-5 h-5 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Editorial Divider with Clio typography and styling.
 */
export function AuthMethodDivider({ label = 'Or continue with' }: { label?: string }) {
  return (
    <div className="relative flex items-center justify-center my-6" aria-hidden="true">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-ink/10" />
      </div>
      <span className="relative px-3.5 bg-card text-[10.5px] font-mono uppercase tracking-widest text-ash select-none">
        {label}
      </span>
    </div>
  );
}

export function GoogleAuthButton({
  mode = 'login',
  redirectTo,
  onError,
  disabled = false,
  className = '',
}: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Explicitly prevent form submission if wrapped inside a form
    e.preventDefault();
    e.stopPropagation();

    if (loading || disabled) return;

    setLoading(true);

    if (!config.supabase.url || config.supabase.url.includes('placeholder')) {
      onError?.(
        'Authentication service is not configured. The administrator must set Supabase credentials in .env.local.'
      );
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const safeDestination = sanitizeRedirectUrl(redirectTo, '/documents');

      const callbackUrl = new URL('/auth/callback', origin);
      if (safeDestination && safeDestination !== '/documents') {
        callbackUrl.searchParams.set('next', safeDestination);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error) {
        throw error;
      }

      // If data.url is returned, navigate to Google's consent screen
      if (data?.url && typeof window !== 'undefined') {
        window.location.assign(data.url);
      }
    } catch (err: unknown) {
      setLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to initiate Google authentication. Please try again.';
      onError?.(message);
    }
  };

  const label = loading
    ? 'Connecting to Google...'
    : mode === 'register'
      ? 'Continue with Google'
      : 'Continue with Google';

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      aria-label={`${label} to Clio`}
      className={cn(
        'group relative w-full h-12 sm:h-[50px] px-5 py-3',
        'flex flex-row items-center justify-center gap-3',
        'rounded-xs border border-ink/20 hover:border-ink/40 active:border-ink/60',
        'bg-card hover:bg-bone/45 active:bg-bone/80',
        'text-ink font-sans text-[13.5px] sm:text-sm font-medium tracking-tight whitespace-nowrap',
        'transition-all duration-150 select-none cursor-pointer shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-oxblood focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:translate-y-px',
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ash shrink-0" aria-hidden="true" />
      ) : (
        <GoogleBrandIcon className="w-5 h-5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
      )}
      <span className="leading-none text-[13.5px] sm:text-sm font-medium tracking-tight">
        {label}
      </span>
    </button>
  );
}
