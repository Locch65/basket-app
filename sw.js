// =====================
// VERSIONE SERVICE WORKER
// =====================
// Legge la versione passata dinamicamente tramite query string durante la registrazione
const urlParams = new URLSearchParams(self.location.search);
const SW_VERSION = urlParams.get('v') || '2.0.0'; // Fallback di sicurezza se manca il parametro

// Recupera la lista delle squadre per cui l'utente è registrato (es. "[T-001, T-002]") dai parametri dell'URL del SW
const userTeamsParam = urlParams.get('teams') || '';
const userTeams = userTeamsParam ? userTeamsParam.split(/\s+/) : [];

const CACHE_NAME = "basket-app-cache-" + SW_VERSION;
// Usa percorsi RELATIVI per GitHub Pages (niente "/" iniziale)
// const FILES_TO_CACHE = [
//   "./index.html?v=" + SW_VERSION,
//   "./calendario.html?v=" + SW_VERSION,
//   "./match.html?v=" + SW_VERSION,
//   "./direttavideo.html?v=" + SW_VERSION,
//   "./roster.html?v=" + SW_VERSION,
//   "./anagrafica.html?v=" + SW_VERSION,

//   "./calendario.css?v=" + SW_VERSION,
//   "./match.css?v=" + SW_VERSION,
//   "./direttavideo.css?v=" + SW_VERSION,

//   "./calendario.js?v=" + SW_VERSION,
//   "./match.js?v=" + SW_VERSION,
//   "./direttavideo.js?v=" + SW_VERSION,
//   "./common.js?v=" + SW_VERSION,
//   "./myTeamConfig.js?v=" + SW_VERSION,

//   "./icon-192.png",
//   "./icon-512.png"
// ];

// // Install: cache i file della nuova versione
// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
//   );
//   self.skipWaiting();
// });

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usiamo add all'interno di un catch o facciamo un add di file sicuri
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        console.error("Errore durante il caching dei file:", err);
      });
    })
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
    //??event.respondWith(fetch(req));
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


// ==========================================================
// GESTIONE WEB PUSH NOTIFICATIONS (Firebase Cloud Messaging)
// ==========================================================

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Basket App", body: event.data ? event.data.text() : "" };
  }

  let rawTitle = data.notification?.title || data.title || "Basket App";
  let targetTeam = null;
  let cleanTitle = rawTitle;

  // Verifica se il titolo è nel formato "T-XXX: Nome squadra"
  const match = rawTitle.match(/^(T-\d+):\s*(.*)$/);
  if (match) {
    targetTeam = match[1]; // Es. "T-001"
    cleanTitle = match[2]; // Es. "Nome squadra"
  }

  // Se è specificata una squadra nel titolo, controlla se l'utente è registrato per quella squadra
  if (targetTeam) {
    // Se l'utente non è registrato per questa squadra, interrompi e non mostrare la notifica
    if (!userTeams.includes(targetTeam)) {
      return;
    }
  }

  const title = cleanTitle;
  const options = {
    body: data.notification?.body || data.body || "Hai un nuovo aggiornamento.",
    icon: "./icon-192.png",      // Icona principale che compare nel banner della notifica
    badge: "./icon-192.png",     // Iconcina piccola che compare nella status bar del telefono
    vibrate: [200, 100, 200],    // Pattern di vibrazione (attiva anche il feedback sonoro associato alle notifiche di sistema)
    tag: 'basket-app-notifica',  // Evita che le notifiche si sovrappongano inutilmente raggruppandole
    renotify: true,
    data: data.data || {}
  };

  // 1. Attiva il pallino rosso (App Badge) sull'icona della PWA nella Home Screen
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch((error) => {
      console.error("Errore nell'impostazione del badge sull'icona:", error);
    });
  }

  // 2. Mostra la notifica nella status bar del dispositivo
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


// Gestione del clic sulla notifica (apre o porta in primo piano la PWA)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se l'app è già aperta, focalizzala
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Altrimenti apri una nuova finestra della PWA (es. alla home o calendario)
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});