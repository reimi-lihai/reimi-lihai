const CACHE_NAME = "reikai-static-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./stays.html",
  "./booking.html",
  "./properties.html",
  "./contact.html",
  "./offline.html",
  "./styles.css",
  "./src/main.mjs",
  "./src/i18n.mjs",
  "./src/data.mjs",
  "./src/booking-service.mjs",
  "./src/dictionaries/ja.mjs",
  "./src/dictionaries/en.mjs",
  "./src/dictionaries/zh-Hant.mjs",
  "./src/dictionaries/zh-Hans.mjs",
  "./src/dictionaries/ko.mjs",
  "./assets/logo.svg",
  "./assets/icon.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./offline.html"));
    })
  );
});
