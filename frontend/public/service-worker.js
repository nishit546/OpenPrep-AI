// Service Worker for OpenPrep AI - Offline-First PWA with Workbox Caching & Background Sync

const STATIC_CACHE_NAME = 'openprep-static-v2';
const METADATA_CACHE_NAME = 'openprep-metadata-v2';
const API_CACHE_NAME = 'openprep-api-v2';

// Core static assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.webmanifest',
];

// Import Web Push handlers if present
try {
  importScripts('/push-sw.js');
} catch (e) {
  // Push handler script optional
}

// ── Workbox Integration (with Graceful Native Fallback) ──
let hasWorkbox = false;
try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');
  if (self.workbox) {
    hasWorkbox = true;
    workbox.setConfig({ debug: false });

    // 1. Static Assets: Cache-First Strategy (Vite build chunks, styles, icons, fonts)
    workbox.routing.registerRoute(
      ({ request, url }) =>
        url.pathname.startsWith('/assets/') ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        request.destination === 'image' ||
        /\.(?:js|css|woff2|woff|ttf|svg|png|jpg|jpeg|gif|ico)$/i.test(url.pathname),
      new workbox.strategies.CacheFirst({
        cacheName: STATIC_CACHE_NAME,
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 150,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          }),
        ],
      })
    );

    // 2. Syllabus & Deck Metadata: Stale-While-Revalidate Strategy
    workbox.routing.registerRoute(
      ({ url }) =>
        url.pathname.startsWith('/api/syllabus') ||
        url.pathname.startsWith('/api/flashcards/decks') ||
        url.pathname.startsWith('/api/subjects') ||
        url.pathname.startsWith('/api/topics') ||
        url.pathname.startsWith('/api/flashcards/analytics'),
      new workbox.strategies.StaleWhileRevalidate({
        cacheName: METADATA_CACHE_NAME,
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
          }),
        ],
      })
    );

    // 3. Other API Requests: Network-First with Timeout
    workbox.routing.registerRoute(
      ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
      new workbox.strategies.NetworkFirst({
        cacheName: API_CACHE_NAME,
        networkTimeoutSeconds: 4,
      })
    );
  }
} catch (err) {
  hasWorkbox = false;
}

// ── Service Worker Lifecycle ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache addAll encountered minor issue:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (
            name !== STATIC_CACHE_NAME &&
            name !== METADATA_CACHE_NAME &&
            name !== API_CACHE_NAME
          ) {
            return caches.delete(name);
          }
          return null;
        })
      );
    })
  );
  self.clients.claim();
});

// ── Native Fetch Handler (Active when Workbox is not registered or for direct handling) ──
if (!hasWorkbox) {
  self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only process GET requests
    if (request.method !== 'GET') return;

    // Pattern A: Syllabus & Deck Metadata -> Stale-While-Revalidate
    const isMetadata =
      url.pathname.startsWith('/api/syllabus') ||
      url.pathname.startsWith('/api/flashcards/decks') ||
      url.pathname.startsWith('/api/subjects') ||
      url.pathname.startsWith('/api/topics') ||
      url.pathname.startsWith('/api/flashcards/analytics');

    if (isMetadata) {
      event.respondWith(
        caches.open(METADATA_CACHE_NAME).then(async (cache) => {
          const cachedResponse = await cache.match(request);
          const networkFetch = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => null);

          // Return cached immediately if present, otherwise await network
          return cachedResponse || (await networkFetch);
        })
      );
      return;
    }

    // Pattern B: Other API endpoints -> Network-First
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(async () => {
            const cached = await caches.match(request);
            if (cached) return cached;
            return new Response(
              JSON.stringify({
                success: false,
                offline: true,
                error: 'Network connection unavailable. Operating in offline mode.',
              }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          })
      );
      return;
    }

    // Pattern C: Static Assets & App Bundles -> Cache-First
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback to index.html for SPA client navigation
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
    );
  });
}

// ── Background Sync Listener ──
self.addEventListener('sync', (event) => {
  if (
    event.tag === 'openprep-background-sync' ||
    event.tag === 'openprep-sync-queue' ||
    event.tag === 'sync-mutations'
  ) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC', tag: event.tag });
        });
      })
    );
  }
});
