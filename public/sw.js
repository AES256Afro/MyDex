// Service worker for PWA install capability
// Network-first for all navigation and API requests
// Cache static assets (JS, CSS, images) as fallback only
const CACHE_NAME = "mydex-v2";

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clear ALL old caches on activation (including v1 with stale /dashboard)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache-intercept navigation requests (HTML pages)
  // Always go to network for pages so server components render fresh
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Offline fallback: return a simple offline page
        return new Response(
          "<html><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>",
          { headers: { "Content-Type": "text/html" } }
        );
      })
    );
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets (JS, CSS, images): network-first with cache fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: network only
  event.respondWith(fetch(event.request));
});
