// Offline support for The Great Art Race.
// Bump CACHE_VERSION whenever a cached file changes.
const CACHE_VERSION = 'artrace-v20-20261101-colonyscene1';
const AUCTION_CACHE_SUFFIX = '-auctionnosort1';
const CORE_CACHE = `${CACHE_VERSION}${AUCTION_CACHE_SUFFIX}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}${AUCTION_CACHE_SUFFIX}-runtime`;

// Small code and core assets are cached on install so the game runs offline.
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './data.js',
  './cities-extra.js',
  './works-extra.js',
  './engine.js',
  './art-tiers.js',
  './images.js',
  './artwork-images.js',
  './world-geo.js',
  './vendor/pixi.min.js',
  './map.js',
  './app-state.js',
  './app-crew.js',
  './app-colonies.js',
  './app-core.js',
  './art-notes.js',
  './app-art.js',
  './art-i18n.js',
  './app-artview.js',
  './app-map.js',
  './app-trade.js',
  './app-shell.js',
  './app-missions.js',
  './app-weekly.js',
  './app-audio.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('artrace-') && ![CORE_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Music and images are large: cache them on first use, not on install.
  const isLarge = /\/(music|images)\//.test(url.pathname);
  if (isLarge) {
    event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    return;
  }

  // Everything else: network first (fresh code when online), cache as fallback.
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CORE_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    throw err;
  }
}
