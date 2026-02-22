const CACHE_NAME = "j4f-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/js/j4f-sdk.js",
  "/js/firebase-config.js",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/games/pallanguzhi/index.html",
  "/games/raaja-raani/index.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first for API/Firebase, cache-first for static assets
  if (e.request.url.includes("firebaseio.com") || e.request.url.includes("googleapis.com")) {
    return; // let Firebase handle its own requests
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
