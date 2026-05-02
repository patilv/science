/* Atomic Lab — Service Worker
   Stale-while-revalidate: returns cached version instantly,
   refreshes from network in the background, falls back to
   cache when offline. */

const CACHE = 'atomic-lab-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => { /* keep going if any asset is missing */ })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Don't try to cache cross-origin POSTs/streams etc.
  const url = new URL(req.url);
  const isHTTP = url.protocol === 'http:' || url.protocol === 'https:';
  if (!isHTTP) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((response) => {
        if (response && response.ok && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
