'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isInstalled: boolean;
  isInstallable: boolean;
  canPromptDirectly: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'manual'>;
  showInstructionsModal: boolean;
  setShowInstructionsModal: (show: boolean) => void;
  justInstalled: boolean;
}

const PwaContext = createContext<PwaContextType>({
  isInstalled: false,
  isInstallable: false,
  canPromptDirectly: false,
  isIOS: false,
  promptInstall: async () => 'manual',
  showInstructionsModal: false,
  setShowInstructionsModal: () => {},
  justInstalled: false,
});

function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    media.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  const isIOSStandalone =
    typeof navigator !== 'undefined' &&
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandaloneMedia || isIOSStandalone;
}

function getServerStandaloneSnapshot(): boolean {
  return false;
}

function subscribeNoop() {
  return () => {};
}

function getIOSSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getServerIOSSnapshot(): boolean {
  return false;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getServerStandaloneSnapshot);
  const isIOS = useSyncExternalStore(subscribeNoop, getIOSSnapshot, getServerIOSSnapshot);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  const isInstalled = isStandalone || justInstalled;

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch((err) => {
            console.warn('[Clio PWA] Service worker registration notice:', err);
          });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === 'accepted') {
          setJustInstalled(true);
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.error('[Clio PWA] Error triggering install prompt:', err);
        setShowInstructionsModal(true);
        return 'manual';
      }
    } else {
      // If native programmatic prompt is not supported (e.g. iOS or manual install)
      setShowInstructionsModal(true);
      return 'manual';
    }
  }, [deferredPrompt]);

  const canPromptDirectly = Boolean(deferredPrompt);
  // Installable if not already installed, and either native prompt is ready or it's a mobile/desktop browser where user can install
  const isInstallable = !isInstalled;

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        isInstallable,
        canPromptDirectly,
        isIOS,
        promptInstall,
        showInstructionsModal,
        setShowInstructionsModal,
        justInstalled,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}
