// =====================
// VERSIONE SERVICE WORKER
// =====================
const SW_VERSION = "1.0.0";  // Deve corrispondere o seguire SCRIPT_VERSION

const CACHE_NAME = "basket-app-cache-" + SW_VERSION;
const FILES_TO_CACHE = [
  "/",              // index.html
  "/style.css",
  "/script.js?v=" + SW_VERSION, // cache-buster
];

// Installazione: cache nuovi file
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // forza l’attivazione immediata
});

// Attivazione: elimina vecchie cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // aggiorna subito le pagine aperte
});

// Fetch: serve da cache o rete
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
