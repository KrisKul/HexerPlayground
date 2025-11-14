// sw.js — GitHub Pages friendly (subpath), supports multi-file app + data
// Works for https://<user>.github.io/Hexer/  (BASE inferred from scope)

const BASE = (self.registration && new URL(self.registration.scope).pathname) || '/Hexer/';
const CACHE = 'hexer-v4-2025-11-14'; // bump on deploy

// Precached app shell. Add/remove as repo changes.
const APP_SHELL = [
  '',                // resolves to `${BASE}`
  'index.html',
  'manifest.webmanifest',
  'icons/192.png',
  'icons/512.png',
  'icons/maskable-192.png',
  'icons/maskable-512.png',
  // JS modules
  'js/data.js',
  'js/game-core.js',
  'js/ui.js',
  'js/expansion.js',
  // Data
  'data/monsters.json',
  'data/balance.json'
].map(p => BASE + p).map(u => u.replace(/\/+$/, '/')); // ensure BASE '' → '/Hexer/'

// ---- helpers ----
function isSameOrigin(req) {
  try { return new URL(req.url).origin === location.origin; } catch { return false; }
}
function pathname(req) { try { return new URL(req.url).pathname; } catch { return ''; } }

// Allow page to trigger immediate activation
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

// Install: pre-cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)));
  // Don't call skipWaiting here; let page request it after it’s ready.
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch strategies:
// - Navigations: network-first → fallback cached index.html
// - /data/*: network-first (fresh balance), fallback cache
// - /js/*: stale-while-revalidate, **ignoreSearch** so '?v=' still hits cache
// - other same-origin: cache-first, then network, **ignoreSearch** for versioned assets
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (!isSameOrigin(req)) return;

  const urlPath = pathname(req);
  const isNav = req.mode === 'navigate';

  // 1) SPA navigations
  if (isNav) {
    e.respondWith(
      fetch(req).then((r) => {
        caches.open(CACHE).then(c => c.put(BASE + 'index.html', r.clone())).catch(() => {});
        return r;
      }).catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // 2) Data: network-first
  if (urlPath.startsWith(BASE + 'data/')) {
    e.respondWith(
      fetch(req).then((r) => {
        caches.open(CACHE).then(c => c.put(req, r.clone())).catch(() => {});
        return r;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  // 3) JS: SWR (fast boot), ignoreSearch so '/js/x.js?v=1' hits cached '/js/x.js'
  if (urlPath.startsWith(BASE + 'js/')) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((r) => {
          caches.open(CACHE).then(c => c.put(req, r.clone())).catch(() => {});
          return r;
        }).catch(() => hit || Promise.reject(new Error('Network failed')));
        return hit || net;
      })
    );
    return;
  }

  // 4) Everything else: cache-first, then network (ignoreSearch for '?v=')
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then((r) => {
      caches.open(CACHE).then(c => c.put(req, r.clone())).catch(() => {});
      return r;
    }))
  );
});
