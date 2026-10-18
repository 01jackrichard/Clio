'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router global error:', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20 bg-[#F6F5F1]">
      <div className="w-full max-w-md bg-white border border-[#E5E4DE] rounded-xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#17243A]">
          Something went wrong
        </h1>

        <p className="text-sm text-[#536077] leading-relaxed">
          An unexpected error occurred while processing your request. Please try again or return to the main catalog.
        </p>

        {error.message && (
          <div className="p-3 bg-[#F6F5F1] border border-[#E5E4DE] rounded-lg text-xs font-mono text-[#536077] text-left overflow-x-auto max-h-28">
            {error.message}
          </div>
        )}

        <div className="pt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4263EB] hover:bg-[#364FC7] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F6F5F1] hover:bg-[#EAE8E1] text-[#17243A] text-xs font-semibold rounded-lg border border-[#E5E4DE] transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
