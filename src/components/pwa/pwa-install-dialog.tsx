'use client';

import React, { useEffect, useRef } from 'react';
import { X, Share, PlusSquare, Laptop, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePwa } from './pwa-context';

export function PwaInstallDialog() {
  const { showInstructionsModal, setShowInstructionsModal, isIOS, justInstalled } = usePwa();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showInstructionsModal) {
        setShowInstructionsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showInstructionsModal, setShowInstructionsModal]);

  if (!showInstructionsModal && !justInstalled) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowInstructionsModal(false);
        }
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-card border border-ink/20 shadow-2xl p-6 relative space-y-6 text-ink animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setShowInstructionsModal(false)}
          className="absolute top-4 right-4 p-1.5 text-ash hover:text-ink hover:bg-bone transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {justInstalled ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 id="pwa-install-title" className="font-serif text-xl font-medium text-ink">
              Clio Installed Successfully
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed max-w-xs mx-auto">
              Clio is now available as a standalone application on your home screen or application launcher.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Instructions */
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-oxblood font-mono text-[11px] tracking-wider uppercase font-semibold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>iOS Installation Guide</span>
              </div>
              <h2 id="pwa-install-title" className="font-serif text-xl font-medium text-ink">
                Install Clio on iPhone & iPad
              </h2>
              <p className="text-xs text-ink/70 leading-relaxed">
                Add Clio to your iOS Home Screen for instant full-screen reading and an app-like experience.
              </p>
            </div>

            <div className="space-y-3 bg-paper p-4 border border-ink/10 text-xs text-ink/85">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-card border border-ink/20 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-oxblood">
                  1
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p className="font-medium text-ink">Open the Share Menu</p>
                  <p className="text-ink/65 flex items-center gap-1.5">
                    Tap the Safari Share button <Share className="w-3.5 h-3.5 inline text-oxblood" /> in the bottom toolbar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-card border border-ink/20 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-oxblood">
                  2
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p className="font-medium text-ink">Add to Home Screen</p>
                  <p className="text-ink/65 flex items-center gap-1.5">
                    Scroll down and select <PlusSquare className="w-3.5 h-3.5 inline text-oxblood" /> <strong className="font-semibold text-ink">Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-card border border-ink/20 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-oxblood">
                  3
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p className="font-medium text-ink">Confirm Installation</p>
                  <p className="text-ink/65">
                    Tap <strong className="font-semibold text-ink">Add</strong> in the top-right corner to place Clio on your home screen.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="w-full py-2 bg-ink text-paper text-xs font-medium uppercase tracking-wider hover:bg-oxblood transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        ) : (
          /* Desktop / Laptop / Android manual instructions */
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-oxblood font-mono text-[11px] tracking-wider uppercase font-semibold">
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop & Mobile Setup</span>
              </div>
              <h2 id="pwa-install-title" className="font-serif text-xl font-medium text-ink">
                Install Clio Application
              </h2>
              <p className="text-xs text-ink/70 leading-relaxed">
                Launch Clio directly from your desktop, taskbar, or application dock with standalone focus.
              </p>
            </div>

            <div className="space-y-3 bg-paper p-4 border border-ink/10 text-xs text-ink/85">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-card border border-ink/20 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-oxblood">
                  1
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p className="font-medium text-ink">Check Browser Address Bar</p>
                  <p className="text-ink/65">
                    Look for the install icon (usually an app icon or download monitor) located on the right side of your address bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-card border border-ink/20 flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-oxblood">
                  2
                </div>
                <div className="pt-0.5 space-y-0.5">
                  <p className="font-medium text-ink">Or Use Browser Menu</p>
                  <p className="text-ink/65">
                    Open your browser settings menu (&vellip; or &equiv;) and select <strong className="font-semibold text-ink">Install Clio</strong> or <strong className="font-semibold text-ink">Apps &rarr; Install this site as an app</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="w-full py-2 bg-ink text-paper text-xs font-medium uppercase tracking-wider hover:bg-oxblood transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
