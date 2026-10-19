'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerOnlineSnapshot() {
  return true;
}

export default function OfflinePage() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = () => {
    setIsRetrying(true);
    if (navigator.onLine) {
      window.location.reload();
    } else {
      setTimeout(() => {
        setIsRetrying(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl mx-auto text-center space-y-8">
        {/* Disconnected Emblem */}
        <div className="inline-flex items-center justify-center p-4 bg-card border border-ink/15 shadow-sm rounded-none">
          <div className="relative">
            <WifiOff className="w-12 h-12 text-oxblood stroke-[1.5]" />
            <span
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-paper transition-colors ${
                isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-oxblood'
              }`}
            />
          </div>
        </div>

        {/* Editorial Text */}
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-widest text-ash uppercase">
            Archival Connection Offline
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-medium tracking-tight">
            Connection Required
          </h1>
          <p className="text-sm sm:text-base text-ink/75 max-w-md mx-auto leading-relaxed">
            To preserve academic document authenticity and enforce student access permissions, Clio requires an active internet connection to load the catalogue, preview folios, and sync submissions.
          </p>
        </div>

        {/* Live Status Notification */}
        <div
          className={`px-4 py-3 border text-xs font-mono transition-colors ${
            isOnline
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-card border-ink/15 text-ash'
          }`}
          role="status"
          aria-live="polite"
        >
          {isOnline ? (
            <span className="flex items-center justify-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              Connection detected! Reloading academic archive...
            </span>
          ) : (
            <span>Network status: Disconnected. Private folios remain securely protected.</span>
          )}
        </div>

        {/* Safety Callout */}
        <div className="p-4 bg-paper border border-ink/10 text-left text-xs text-ink/70 space-y-2">
          <div className="flex items-center gap-2 text-ink font-medium">
            <ShieldAlert className="w-4 h-4 text-oxblood" />
            <span>Document Security Notice</span>
          </div>
          <p className="leading-relaxed">
            Clio does not store private academic papers or password-protected examination folios in unauthenticated offline browser caches. Once reconnected, your session will be verified instantly.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-ink text-paper text-xs font-medium uppercase tracking-wider hover:bg-oxblood transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking Network...' : 'Reconnect & Retry'}</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-card border border-ink/20 text-ink text-xs font-medium uppercase tracking-wider hover:bg-bone transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cover</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
