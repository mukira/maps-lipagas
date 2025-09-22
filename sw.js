// Lightweight PWA service worker with offline fallback + runtime caching
const VERSION = 'v2.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// Core assets to pre-cache (small & local only)
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './index.js',
  './manifest.json',
  './offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Strategy:
// - Navigation requests: network-first, fall back to offline.html
// - Same-origin static assets: cache-first
// - Cross-origin (e.g., Google Maps): try network, fall back to cache if present
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Handle navigations (HTML pages)
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          // Try cache, then offline page
          const cached = await caches.match(req);
          return cached || caches.match('./offline.html');
        })
    );
    return;
  }

  // Same-origin static assets -> cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          // Cache JS/CSS/Images
          const shouldCache = ['script','style','image','font'].includes(req.destination);
          if (shouldCache) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Cross-origin (Google Maps, Fonts, etc.) -> network with fallback to cache if available
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache opaque responses too (best-effort) for repeat views
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});