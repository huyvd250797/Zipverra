/* Zipverra Pro v2.6: public-asset-only offline shell. Never cache GitHub/auth/API responses. */
const CACHE_NAME = 'zipverra-public-v3.9.8';
const ALLOWED_ASSETS = ['/offline.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
const STATIC_SET = new Set(ALLOWED_ASSETS);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ALLOWED_ASSETS)));
  // Activation must wait for explicit user confirmation from the update banner.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('zipverra-public-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ZIPVERRA_ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // No caching of auth, GitHub responses, source code, Next RSC, or rendered private HTML.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      await caches.match('/offline.html') || Response.error()));
    return;
  }
  if (STATIC_SET.has(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then(cached => cached || fetch(request)));
  }
});
