// -----------------------------------------------------------------------------------
// TODO List:
//
//  Calendario.html
//    - Aggiungere in hamburger le voci: "Anagrafica", "Classifiche", "Impostazioni", 
//    - abilitare update automatico punteggi solo se c'è una partita live
//
//  Match.html
//    - sistemare i font su browser, sono troppo grandi. i bottoni si sovrappongoni
//    - leggere lista giocatori da Google Sheet
//    - inserire hamburger menu con le voci: "Go Live", "Salva", "Annulla", "Anagrafica", "Calendario", "Classifiche", "Impostazioni", 
//    - bottone "Video" cambia colore e testo (in "Live") se c'e' una live attiva. inoltre, ogni volta che fa il refresh della pagina verifica l'esistenza del video per mostrare il bottone
//    - quando non esistono punteggi per un una partita, creare un giocare fittizio "Polismile A", e assegnare tutti i punti a lui.
//    - password Admin da crittografare
//    - implementare dark mode
//
//  DirettaVideo.html
//    - inserire punteggio e ultimo marcatore in sovraimpressione (quando in orizzontale)
//    - inserire lista giocatori con relativi punti e punteggio partita sotto al video (quando in verticale)
//
//  Angrafica.html
//    - 1) mostrare lista Roster. Quando si clicca su un nome
//         1.1) si apre dettaglio anagrafica e statistiche    
//
//
//  Statistiche.html
//    - mostrare tabella con "#, Nome, Punti Totali, Punti da 1, da 2, da 3, Media per Partita, #Partite"
//    - le intestazioni delle colonne della tabella sono bottoni che permettono il sort
//
//
//  Impostazioni. html
//    - pagina dedicata per abilitare/disabilitare, settare:
//       - Dark Mode (toggle)
//       - refresh rate dei punteggi live (di default 5 secondi)
//
//
//
// -----------------------------------------------------------------------------------


// =====================
// VERSIONE SERVICE WORKER
// =====================
const SW_VERSION = "1.0.59"; // incrementa sempre ad ogni release
const CACHE_NAME = "basket-app-cache-" + SW_VERSION;

// Usa percorsi RELATIVI per GitHub Pages (niente "/" iniziale)
const FILES_TO_CACHE = [
  "./index.html",
  "./calendario.css",
  "./match.css",
  "./calendaio.js?v=" + SW_VERSION,
  "./match.js?v=" + SW_VERSION,
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













































