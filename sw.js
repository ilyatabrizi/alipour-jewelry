/* ==========================================================================
   Alipour — service worker
   Precaches the shell so the app opens instantly from the home screen and
   works offline. The hero frame sequence is ~5.7 MB, so it is NOT precached:
   frames are cached lazily as they are actually fetched, which keeps the
   install cheap and still leaves the arc available offline once seen.
   ========================================================================== */
const VERSION = 'alipour-v1';
const SHELL   = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const PRECACHE = [
  './',
  './index.html',
  './products.html',
  './offline.html',
  './css/app.css',
  './js/app.js',
  './js/jewel.js',
  './manifest.webmanifest',
  './data/catalog.json',
  './data/motion.json',
  './assets/fonts/IRANYekanXFaNum-VF.woff2',
  './assets/fonts/IRANYekanX-VF.woff2',
  './assets/img/favicon.svg',
  './assets/img/mark.svg',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './assets/img/wrist.webp',
  './assets/img/atelier.webp',
  './assets/frames/lg/119.webp',   // hero poster
];

/* keep the lazily-cached frames/products from growing without bound */
const RUNTIME_MAX = 260;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      // addAll rejects the whole install if any single file 404s
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  if (keys.length > max) {
    for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // never touch the client's own store

  /* navigations: network first, fall back to the cached page, then offline */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)
          .then((r) => r || caches.match('./index.html'))
          .then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  /* everything else: cache first, then network, and keep what we fetch */
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => {
          c.put(req, copy);
          trim(RUNTIME, RUNTIME_MAX);
        });
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
