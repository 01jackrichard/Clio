/**
 * Clio Service Worker (Progressive Web App)
 * 
 * Strict Security Principles:
 * 1. Safe Static Assets: Pre-caches shell offline page and public brand assets.
 * 2. Navigation: Strictly Network-First. Never persistently caches authenticated HTML pages.
 * 3. Sensitive Data Exclusion: NEVER intercepts or caches Supabase auth, Google Drive resources,
 *    private PDFs, API responses (/api/*), password unlocks, or upload flows.
 * 4. Stale-While-Revalidate only for immutable Next.js static bundles (/_next/static/*).
 */

const CACHE_VERSION = 'clio-pwa-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_FALLBACK_URL = '/offline';

// Explicit list of safe static assets to pre-cache on install
const PRECACHE_ASSETS = [
  OFFLINE_FALLBACK_URL,
  '/favicon.ico',
  '/favicon.svg',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/images/clio-logo-horizontal.svg',
  '/images/clio-logo-stacked.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[Clio SW] Pre-cache partial failure:', err);
        });
      })
      .then(() => {
        // Activate worker immediately
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // Immediately take control of all active clients
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Only process GET requests (POST, PUT, DELETE, etc. pass directly to network)
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // 2. Strict Bypass List: Never intercept or cache sensitive endpoints
  // - Supabase auth, storage, and database calls
  // - Google Drive / Google APIs / streaming proxies
  // - Clio internal APIs (/api/*: documents, sharing, storage quota, password check)
  // - Authentication routes (/auth/*)
  const isExternal = url.origin !== self.location.origin;
  const isApiRoute = url.pathname.startsWith('/api/');
  const isAuthRoute = url.pathname.startsWith('/auth/');
  const isSupabase = url.hostname.includes('supabase.co');
  const isGoogle = url.hostname.includes('googleapis.com') || url.hostname.includes('google.com');

  if (isExternal || isApiRoute || isAuthRoute || isSupabase || isGoogle) {
    // Network-only without service-worker interference
    return;
  }

  // 3. Navigation requests (HTML page visits):
  // Strictly Network-First.
  // NEVER store authenticated HTML pages in cache!
  // If network fails (offline), return the pre-cached static /offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cachedFallback = await cache.match(OFFLINE_FALLBACK_URL);
        return (
          cachedFallback ||
          new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Clio Offline</title></head><body style="background:#F2EFE9;color:#0E0E11;font-family:sans-serif;padding:2rem;text-align:center;"><h1>Clio is offline</h1><p>Please reconnect to the internet to access your academic folios.</p></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html' },
            }
          )
        );
      })
    );
    return;
  }

  // 4. Immutable Next.js static bundles (/_next/static/*):
  // Hashed static files (JS chunks, CSS bundles, font files) are safe to cache.
  // Stale-While-Revalidate strategy.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Approved public static images, icons, and fonts
  const isPublicStatic =
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname.startsWith('/apple-touch-icon') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/icon.png' ||
    url.pathname === '/manifest.webmanifest';

  if (isPublicStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 6. All other requests pass directly to the network without caching
});
