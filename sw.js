/**
 * Service Worker: Facharztprüfung Anästhesiologie Smart Trainer
 * Strategy: Network-First with Cache Fallback for instant updates and reliable offline operation
 */

const CACHE_NAME = 'facharzt-cache-v3.2';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './questions.js',
  './js/storage_idb.js',
  './js/sm2.js',
  './js/voice.js',
  './js/exam_simulation.js',
  './manifest.json',
  './favicon.svg'
];

// 1. Install: Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core shell assets...');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Instantly claim clients and remove obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Removing legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Network-First with Cache Fallback for fresh code & 100% offline support
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // External RESTful API: direct network, graceful JSON fallback if offline
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, message: 'Offline mode active' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Local assets: Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
