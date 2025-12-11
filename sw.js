// =====================
// VERSIONE SERVICE WORKER
// =====================
const SW_VERSION = "1.0.57"; // incrementa sempre ad ogni release
const CACHE_NAME = "basket-app-cache-" + SW_VERSION;

// Usa percorsi RELATIVI per GitHub Pages (niente "/" iniziale)
const FILES_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./script.js?v=" + SW_VERSION,
  "./manifest.json"
];

// Install: cache i file della nuova versione
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: elimina tutte le cache diverse dalla corrente
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first con bypass della cache HTTP di Chrome
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Non gestire richieste non-GET o cross-origin
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Per HTML e root, forza 'reload' per saltare cache HTTP
  const isHTML = req.headers.get("accept")?.includes("text/html");

  event.respondWith(
    fetch(isHTML ? new Request(req.url, { cache: "reload" }) : req)
      .then((networkRes) => {
        // Cache solo risposte OK
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      })
      .catch(() => {
        // Fallback offline dalla cache
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // Fallback per HTML: servi l'index
          if (isHTML) return caches.match("./index.html");
          return Promise.reject("No cache match");
        });
      })
  );
});

// Notifica i client quando c’è un SW nuovo (facilita l’auto-reload)
self.addEventListener("message", (event) => {
  // placeholder se vuoi gestire comandi dal client
});












































