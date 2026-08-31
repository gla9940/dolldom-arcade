const CACHE_NAME = 'dolldom-arcade-v1.5.0';
const APP_ROOT = new URL('./', self.location.href).pathname;
const APP_SHELL = [
  APP_ROOT,
  `${APP_ROOT}manifest.webmanifest`,
  `${APP_ROOT}favicon.png`,
  `${APP_ROOT}icon-180.png`,
  `${APP_ROOT}icon-192.png`,
  `${APP_ROOT}icon-512.png`,
  `${APP_ROOT}icon-maskable-512.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const rootResponse = await fetch(APP_ROOT, { cache: 'reload' });
    await cache.put(APP_ROOT, rootResponse.clone());
    const html = await rootResponse.text();
    const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(([, path]) => new URL(path, new URL(APP_ROOT, self.location.origin)))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith(APP_ROOT))
      .map((url) => url.href);
    await cache.addAll([...new Set(assetUrls)]);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(APP_ROOT)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, copy));
          return response;
        })
        .catch(() => caches.match(APP_ROOT)),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })),
  );
});
