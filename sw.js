const cacheName = "jd-tvs-business-v38";
const assets = [
  "./",
  "./login.html",
  "./dashboard.html",
  "./admin.html",
  "./sales.html",
  "./rto-insurance.html",
  "./customer.html",
  "./parts.html",
  "./lists.html",
  "./settings.html",
  "./business.css",
  "./business.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./assets/jd-logo.jpeg",
  "./assets/app-icon-192.jpg",
  "./assets/app-icon-512.jpg",
  "./assets/apple-touch-icon.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }
  const networkFirst = event.request.mode === "navigate" || /\.(html|css|js|webmanifest)$/i.test(url.pathname);
  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(cacheName).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
