/**
 * sw.js — Service Worker for Digital Detox PWA
 * Enables offline use and install-to-homescreen
 */

const CACHE_NAME   = 'digital-detox-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/progress.css',
  '/css/settings.css',
  '/css/modal.css',
  '/js/storage.js',
  '/js/modal.js',
  '/js/timer.js',
  '/js/progress.js',
  '/js/settings.js',
  '/js/app.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

// ---- Install: cache all static assets ----
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache what we can, ignore failures for missing icons
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Could not cache:', url, e.message);
        }
      }
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: Cache-first for local, Network-first for external ----
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // External CDN (Chart.js) — network first, fallback to cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Local assets — cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
