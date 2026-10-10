// platforms/web/service-worker.js — Version 1.1
// Responsibility: cache same-origin static assets without making Cache Storage a network dependency.

const CACHE_PREFIX = "lifegame-static-";
const CACHE_NAME = "lifegame-static-v1";
const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font"]);
const STATIC_FILE_PATTERN = /\.(?:m?js|css|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|otf)$/i;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (!STATIC_DESTINATIONS.has(request.destination) || !STATIC_FILE_PATTERN.test(url.pathname)) return false;
  if (/\/(?:auth|rest|functions|storage|realtime|rpc|api)(?:\/|$)/i.test(url.pathname)) return false;
  return true;
}

function mayStoreResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const directives = (response.headers.get("cache-control") || "").split(",").map(value => value.trim());
  if (directives.some(value => /^(?:private|no-store|no-cache)(?:\s*=.*)?$/i.test(value))) return false;
  return (response.headers.get("vary") || "").trim() !== "*";
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith((async () => {
    // Cache Storage is best-effort: failure must never block a network request.
    const cachePromise = caches.open(CACHE_NAME).catch(() => null);
    let response;
    try {
      response = await fetch(request);
    } catch (networkError) {
      const cache = await cachePromise;
      if (cache) {
        try {
          const cached = await cache.match(request);
          if (cached) return cached;
        } catch {
          // Preserve the original network error if cache lookup also fails.
        }
      }
      throw networkError;
    }

    // Cache write failures must not replace a successful network response.
    if (mayStoreResponse(response)) {
      const cache = await cachePromise;
      if (cache) {
        try { await cache.put(request, response.clone()); } catch { /* Non-fatal storage failure. */ }
      }
    }
    return response;
  })());
});
