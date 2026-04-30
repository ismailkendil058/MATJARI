const CACHE_NAME = "matjari-pwa-v1";
const APP_SHELL = ["/", "/manifest.json", "/Store Icon - Noun Project (1).jpg"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("/", responseClone));
          return response;
        })
        .catch(() => caches.match("/") || Response.error()),
    );
    return;
  }

  const isStaticAsset = [".js", ".css", ".png", ".svg", ".ico", ".json", ".jpg"].some(ext =>
    requestUrl.pathname.endsWith(ext),
  ) || requestUrl.pathname.startsWith("/assets/");

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const networkFetch = fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || networkFetch;
    }),
  );
});
