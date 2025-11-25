// =====================
// VERSIONE SERVICE WORKER
// =====================
const SW_VERSION = "1.0.1";  // aggiorna ad ogni release
const CACHE_NAME = "basket-app-cache-" + SW_VERSION;

const FILES_TO_CACHE = [
  "/index.html",
  "/style.css",
  "/script.js?v=" + SW_VERSION,
  "/manifest.json"
];

// Installazione: cache nuovi file
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // forza subito l’attivazione
});

// Attivazione: elimina vecchie cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim(); // aggiorna subito le pagine aperte
});

// Fetch: sempre rete prima, cache fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
