// SAH Microtests — Service Worker
// Strategy: cache-first for app shell, network-first for Sheets API

const CACHE = "sah-v1";

const SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "jszip.min.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "logo.png"
];

// ── Install: pre-cache the app shell ──────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Use { cache: "reload" } to always fetch fresh on install
      Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))))
    )
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ─────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, update in background ─────────────────
self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  // Google Sheets API → network-only (never cache, fail gracefully)
  if (url.includes("script.google.com")) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // External fonts / CDN → network with cache fallback
  if (!url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
    return;
  }

  // App shell → stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((res) => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
