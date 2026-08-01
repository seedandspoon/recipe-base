// Minimal offline cache for the app shell. Static, no build step —
// bump CACHE_NAME whenever you want clients to fetch fresh files.
const CACHE_NAME = 'recipe-book-v1';

const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/app.js',
  'js/db.js',
  'js/i18n.js',
  'js/router.js',
  'js/matcher.js',
  'js/match-score.js',
  'js/store.js',
  'js/toast.js',
  'js/ui.js',
  'js/utils.js',
  'js/views/shared.js',
  'js/views/gallery.js',
  'js/views/recipe-detail.js',
  'js/views/recipe-editor.js',
  'js/views/phases.js',
  'js/views/foods.js',
  'js/views/planner.js',
  'js/views/import.js',
  'js/views/settings.js',
  'data/seed-foods.json',
  'data/seed-phases.json',
  'data/seed-recipes.json',
  'bookmarklet/import.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
