// platforms/web/service-worker.js — Version 1.0
// Responsibility: cache same-origin static assets for network-first offline fallback.

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
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isCacheableStaticRequest(request, url) {
  if (request.method !== "GET") return false;
  if (url.origin !== self.location.origin) return false;
  if (!STATIC_DESTINATIONS.has(request.destination)) return false;
  if (!STATIC_FILE_PATTERN.test(url.pathname)) return false;

  // Defense in depth: never cache known API, auth, or storage paths.
  if (/\/(?:auth|rest|functions|storage|realtime|rpc|api)(?:\/|$)/i.test(url.pathname)) {
    return false;
  }

  return true;
}

function mayStoreResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  if (response.headers.has("set-cookie")) return false;

  const cacheControl = response.headers.get("cache-control") || "";
  if (/(?:^|,)\s*(?:private|no-store|no-cache)\b/i.test(cacheControl)) return false;

  const vary = response.headers.get("vary") || "";
  return vary.trim() !== "*";
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (!isCacheableStaticRequest(request, url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    try {
      const response = await fetch(request);
      if (mayStoreResponse(response)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw error;
    }
  })());
});
