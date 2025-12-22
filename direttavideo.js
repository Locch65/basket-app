let LIVE_OFFSET = 5;
let REFRESH_TIME = 1000;
let url = 
"https://script.google.com/macros/s/AKfycbyVX3yXW_PwRBeUgJKqFeS7MMWtHroHa0qRlgx6w7zX52tw0Arp1r-OIqpsN7obZF8SqA/exec"

//"https://script.google.com/macros/s/AKfycbyg-5Tvq7hRZWAhjlHlz9Z3q-zJblWhRGRLg8jQomNBxxDjkvDkEBml-oOCUFPDvc40tA/exec"
//"https://script.google.com/macros/s/AKfycbzmBxzYOwNhcw4yyn1W03tUDRd1hO5htCh0XEEpVWBORyFhu1uJOEMDyq1sSjLbLZjWHA/exec"
//"https://script.google.com/macros/s/AKfycbx8dqSRUD2GvEDj2H-s9Z845uEjbfEFVSVs2plzN_D1Cu_IXkCla6no1tuCEE-wsUFcUQ/exec";

const myAPIKey = "AIzaSyCoKusDWEguLJI19btAeqyCCM2txLaouMI";

const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor","C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
];
const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "26", "41", "29", "99"];

// Inizializzazione con supporto al tracciamento dei cambiamenti
let giocatoriObj = giocatoriA.map((nomeCompleto, index) => {
  const [nome, cognome] = nomeCompleto.split(" ");
  return {
    numero: numeriMaglia[index],
    displayName: `${cognome} ${nome}`,
    punteggio: 0,
    contatori: {1:0, 2:0, 3:0},
    stato: "Out",
    lastPunteggio: 0 // Per rilevare cambiamenti
  };
});

let player;
let timelineInterval;
let punteggioB = 0;
let lastScoreStr = "";
let isUserLive = true;

let orarioInizioPartita = null; // Valore di default
let syncDelay = 0; // Valore predefinito in secondi
let eventBuffer = [];

const hudLabel = document.getElementById("hud-label");
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
const videoId = localStorage.getItem("videoId");
const startTime = parseInt(localStorage.getItem("videoStartTime") || "0", 10);


caricaAnagraficaSingolaPartita(matchId);

const teamA = localStorage.getItem("teamA"); // ATTENZIONE: da leggere da google sheet in funzione del matchId
const teamB = localStorage.getItem("teamB");

initTeamNames();

window.onYouTubeIframeAPIReady = function () {
  if (!videoId) { hudLabel.textContent = "⚠️ Nessun videoId"; return; }
  player = new YT.Player('ytplayer', {
    videoId: videoId,
    playerVars: { origin: window.location.origin, rel: 0, modestbranding: 1, playsinline: 1, fs: 0 },
    events: { 'onReady': onPlayerReady }
  });
};

function onPlayerReady() {
  player.seekTo(startTime, true);
  player.playVideo();
  tickTimeline();
}

function onPlayerError(e) {
  hudLabel.textContent = `⚠️ Errore player (${e?.data ?? "sconosciuto"})`;
  if (timelineInterval) clearInterval(timelineInterval);
}

function extractYoutubeTime(input) {
  try {
    const urlObj = new URL(input);

    if (urlObj.searchParams.has("t")) {
      const t = urlObj.searchParams.get("t");

      // Gestione formati: solo numeri (es. "60") o con suffissi (es. "1m30s")
      const match = t.match(/(?:(\d+)m)?(?:(\d+)s)?$/);
      if (match) {
        const minutes = parseInt(match[1] || "0", 10);
        const seconds = parseInt(match[2] || "0", 10);
        return minutes * 60 + seconds;
      }

      // Se è solo un numero (es. "120")
      return parseInt(t, 10);
    }

    return 0; // default: inizio da 0
  } catch (e) {
    console.error("Input non valido:", e);
    return 0;
  }
}


function extractYouTubeId(input) {
  try {
    // Caso 0: input già un videoId (11 caratteri alfanumerici tipici di YouTube)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    const urlObj = new URL(input);

    // Caso 1: URL classico con parametro ?v=...
    if (urlObj.searchParams.has("v")) {
      return urlObj.searchParams.get("v");
    }

    // Caso 2: URL corto youtu.be/ID
    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1);
    }

    // Caso 3: URL embed /embed/ID
    if (urlObj.pathname.includes("/embed/")) {
      return urlObj.pathname.split("/embed/")[1].split(/[?&]/)[0];
    }

    // Caso 4: URL live /live/ID
    if (urlObj.pathname.includes("/live/")) {
      return urlObj.pathname.split("/live/")[1].split(/[?&]/)[0];
    }

    // Caso 5: altri formati non previsti
    return "";
  } catch (e) {
    console.error("Input non valido:", e);
    return "";
  }
}


function caricaAnagraficaSingolaPartita(targetMatchId) {
  if (!targetMatchId) return;

  // Mostra un feedback di caricamento se necessario (opzionale)
  console.log("Caricamento dati per il match:", targetMatchId);

  return fetch(url + "?sheet=Partite")
    .then(res => res.json())
    .then(data => {
      const partite = Array.isArray(data) ? data : data.data;
      
      // Cerchiamo il match specifico tramite matchId
      const partita = partite.find(p => String(p.matchId) === String(targetMatchId));

      if (!partita) {
        throw new Error("Partita non trovata");
      }

      // --- ESTRAZIONE E SALVATAGGIO DATI ---
      // Ripetiamo la logica di pulizia e salvataggio che avevi nel click
      
      const datiPartita = {
        matchId: partita.matchId,
        teamA: partita.squadraA,
        teamB: partita.squadraB,
        puntiSquadraA: partita.punteggioA === "" ? 0 : partita.punteggioA,
        puntiSquadraB: partita.punteggioB === "" ? 0 : partita.punteggioB,
        convocazioni: partita.convocazioni,
		videoURL: partita.videoId,
		videoId: extractYouTubeId(partita.videoId),
		startTime: extractYoutubeTime(partita.videoId),
		//YouTubeVideoStartTime : getLiveStartTime(partita.videoId, myAPIKey),
        isLive: partita.isLive
      };

      // Se ti serve salvarli subito nel localStorage:
      Object.keys(datiPartita).forEach(key => {
        localStorage.setItem(key, datiPartita[key]);
      });

      console.log("Dati partita caricati con successo:", datiPartita);
      return datiPartita; 
    })
    .catch(err => {
      console.error("Errore nel recupero della partita:", err);
    });
}

// Variabile di stato globale (fuori dalla funzione)
let isFirstLoad = true;

function caricaDatiPartita(mId) {
  fetch(`${url}?matchId=${encodeURIComponent(mId)}`)
    .then(res => res.json())
    .then(rows => {
	  const currentVideoTime = player && typeof player.getCurrentTime === "function" ? player.getCurrentTime() : 0;
      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          const nuoviPunti = parseInt(r.punti, 10) || 0;
          
          // RILEVAZIONE CANESTRO: 
          // Mostra il toast solo se NON è il primo caricamento E il punteggio è aumentato
          if (!isFirstLoad && nuoviPunti > g.punteggio) {
            const incremento = nuoviPunti - g.punteggio;
			console.log("Ricevuto punteggio: ", g.displayName);
			// Usiamo la variabile globale syncDelay
            eventBuffer.push({
              name: g.displayName,
              points: incremento,
              timestamp: currentVideoTime + syncDelay 
            });
          }

          g.punteggio = nuoviPunti;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
          try { 
            g.contatori = JSON.parse(r.dettagli || '{"1":0,"2":0,"3":0}'); 
          } catch(e) {}
        } else if (r.giocatore === "Squadra B") {
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });

      // Dopo aver elaborato tutti i dati per la prima volta, impostiamo il flag a false
      isFirstLoad = false;

      updateScoreboard();
      renderPlayerList();
    });
}

// Funzione per estrarre l'orario di inizio dall'URL
function recuperaOrarioInizio() {
    const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('start')) {
    orarioInizioPartita = urlParams.get('start');
    // Se c'è un orario, facciamo un primo calcolo automatico all'avvio
    // (opzionale, puoi anche aspettare il click su AUTO)
} else {
    console.log("Orario inizio non specificato: sync impostato a 0s");
}
}

function calcolaLatenzaAutomatica() {
    if (!orarioInizioPartita) {
        alert("Attenzione: orario di inizio partita non specificato nel link. Impossibile calcolare il sync automatico.");
        syncDelay = 0;
        document.getElementById("sync-value").textContent = "0s";
        return;
    }

    if (!player || typeof player.getCurrentTime !== "function") {
        alert("Il video non è ancora pronto");
        return;
    }

    const oraAttuale = new Date();
    const parti = orarioInizioPartita.split(":");
    
    const inizio = new Date();
    inizio.setHours(
        parseInt(parti[0], 10), 
        parseInt(parti[1], 10), 
        parseInt(parti[2] || 0, 10), 
        0
    );

    const secondiDallInizioReali = (oraAttuale - inizio) / 1000;
    const secondoAttualePlayer = player.getCurrentTime();
    const latenzaCalcolata = secondiDallInizioReali - secondoAttualePlayer;

    if (latenzaCalcolata > 0) {
        syncDelay = Math.floor(latenzaCalcolata);
    } else {
        // Se l'orario è nel futuro o il calcolo è errato, resettiamo a 0
        syncDelay = 0;
    }
    
    document.getElementById("sync-value").textContent = syncDelay + "s";
}

// Funzione per cambiare il ritardo dall'interfaccia
function cambiaSync(valore) {
    syncDelay = Math.max(0, syncDelay + valore);
    document.getElementById("sync-value").textContent = syncDelay + "s";

    console.log("Ritardo sincronizzazione impostato a:", syncDelay);
} 


// Funzione Flash Semplificata (Durata 2 secondi)

// Variabile di controllo per la durata del flash
let isToastRunning = false;

function showBasketToast(name, points) {
  const toast = document.getElementById("basket-toast");
  if (!toast) return;

  // Evita che il refresh dei dati resetti l'animazione se è lo stesso evento
  if (isToastRunning && toast.textContent.includes(name.toUpperCase())) {
    return;
  }

  isToastRunning = true;
  toast.classList.remove("toast-active");
  void toast.offsetWidth; // Reset dell'animazione nel DOM

  // Genera i palloni in base ai punti (1, 2 o 3)
  const balls = "🏀".repeat(Math.min(Math.max(points, 1), 3));
  
  // NUOVO ORDINE: Palloni prima del nome
  toast.textContent = `${balls} ${name}`;
  
  toast.classList.add("toast-active");

  // Rimuove lo stato di blocco dopo 2 secondi
  setTimeout(() => {
    toast.classList.remove("toast-active");
    isToastRunning = false;
  }, 2000);
}

function updateHUDStatus() {
  const liveLabel = document.getElementById("hud-live-status");
  if (liveLabel) {
    // Aggiorna solo il testo e il colore in base allo stato
    liveLabel.textContent = isUserLive ? "🔴 LIVE" : "";
    liveLabel.style.color = isUserLive ? "#ff4d4d" : "#aaa";
    // Il bordo rimane rimosso grazie al CSS
  }
}

function checkLiveStatus() {
  if (!player || typeof player.getDuration !== "function") return;
  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  const isLive = (duration - currentTime <= LIVE_OFFSET);
  
  if (isLive !== isUserLive) {
    isUserLive = isLive;
    updateHUDStatus(isLive ? "🔴 LIVE" : "⏳ DVR (Passato)");
  }
}

function processEventBuffer() {
  if (!player || typeof player.getCurrentTime !== "function") return;
  
  const currentTime = player.getCurrentTime();

  // Filtriamo gli eventi: mostriamo quelli il cui timestamp è <= al tempo attuale del video
  eventBuffer = eventBuffer.filter(event => {
    if (currentTime >= event.timestamp) {
      showBasketToast(event.name, event.points);
      return false; // Rimuove l'evento dal buffer dopo averlo mostrato
    }
    return true; // Mantiene l'evento nel buffer se il video non ci è ancora arrivato
  });
}

function tickTimeline() {
  timelineInterval = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== "function") return;
    checkLiveStatus();
    caricaDatiPartita(matchId);
	// Controlliamo il buffer più frequentemente (es. ogni secondo)
    processEventBuffer();
  }, REFRESH_TIME);
}

function initTeamNames() {
  const elA = document.getElementById("label-team-A");
  const elB = document.getElementById("label-team-B");
  if (elA) elA.textContent = teamA;
  if (elB) elB.textContent = teamB;
}

/**
 * Scambia le posizioni verticali di HUD Score e Basket Toast.
 * Se lo score è in alto, lo sposta in basso e viceversa.
 */
function scambiaPosizioniHUD() {
  const hudScore = document.getElementById('hud-score');
  const basketToast = document.querySelector('.toast');

  if (!hudScore || !basketToast) return;

  // Controlliamo la posizione attuale dello score
  const isScoreAtTop = hudScore.style.top === '0px' || getComputedStyle(hudScore).top === '0px';

  if (isScoreAtTop) {
    // Sposta Score in basso e Toast in alto
    hudScore.style.top = 'auto';
    hudScore.style.bottom = '10px';
    
    basketToast.style.bottom = 'auto';
    basketToast.style.top = '20px';
  } else {
    // Ripristina Score in alto e Toast in basso (valori originali CSS)
    hudScore.style.bottom = 'auto';
    hudScore.style.top = '0px';
    
    basketToast.style.top = 'auto';
    basketToast.style.bottom = '5px';
  }
}

function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

function updateScoreboard() {
  const scoreEl = document.getElementById("game-score");
  const puntiA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
  const currentScore = (teamA === "Polismile A") ? `${puntiA} - ${punteggioB}` : `${punteggioB} - ${puntiA}`;

  // Aggiorna l'HUD in alto nel video
  const hudScore = document.getElementById("hud-score");
  if (hudScore) hudScore.textContent = currentScore;
  
  if (currentScore !== lastScoreStr) {
    if (isMobile()) { 
	  navigator.vibrate(100);
	}
	  
    scoreEl.textContent = currentScore;
    scoreEl.classList.remove("flash");
    void scoreEl.offsetWidth; 
    scoreEl.classList.add("flash");
    lastScoreStr = currentScore;
  }
}

function renderPlayerList() {
  const container = document.getElementById("players-grid");
  if (!container) return;

  // ORDINAMENTO: 1. Stato (In > Out), 2. Punteggio (Decrescente)
  const sorted = [...giocatoriObj].sort((a, b) => {
    if (a.stato === 'In' && b.stato !== 'In') return -1;
    if (a.stato !== 'In' && b.stato === 'In') return 1;
    return b.punteggio - a.punteggio; 
  });

  container.innerHTML = sorted.map(g => {
    const c = g.contatori;
    //const stats = `1pt:${c[1]||0} 2pt:${c[2]||0} 3pt:${c[3]||0}`;
    const stats = `[${c[1]||0}, ${c[2]||0}, ${c[3]||0}]`;
    
    // Verifica se attivare il flash (punteggio aumentato)
    const hasChanged = g.punteggio !== g.lastPunteggio;
    const flashClass = hasChanged ? 'flash-update' : '';

    return `
      <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}">
        <div>
          <span class="player-num">#${g.numero}</span>
          <span class="player-name">${g.displayName}</span>
        </div>
        <div class="player-stats">
          ${stats} 
          <span class="player-points">${g.punteggio}</span>
        </div>
      </div>
        `;
  }).join('');
}

// --- FUNZIONI FULLSCREEN ---
function requestFullscreen() {
  // Seleziona il contenitore del video o l'intero documento se preferisci
  const el = document.querySelector(".video-container") || document.documentElement;

  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen(); // Per Safari e vecchi Chrome
  } else if (el.msRequestFullscreen) {
    el.msRequestFullscreen(); // Per IE/Edge
  }
}

function exitFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

// --- GESTORE ORIENTAMENTO INTEGRATO ---
function gestisciRotazione() {
  // Metodo moderno
  if (window.screen && screen.orientation) {
    const type = screen.orientation.type;
    if (type.includes("landscape")) {
      requestFullscreen();
    } else {
      exitFullscreen();
    }
  } 
  // Fallback per dispositivi che non supportano screen.orientation
  else {
    const orientation = window.orientation; // 90 o -90 è landscape
    if (Math.abs(orientation) === 90) {
      requestFullscreen();
    } else {
      exitFullscreen();
    }
  }
}

// Ascolta il cambio di orientamento
window.addEventListener("orientationchange", gestisciRotazione);

// Opzionale: aggiungi un controllo anche al resize per sicurezza su alcuni Android
window.addEventListener("resize", () => {
    // Se la larghezza supera l'altezza, siamo probabilmente in landscape
    if (window.innerWidth > window.innerHeight) {
        requestFullscreen();
    }
});

/**
 * Accetta l'URL di un video YouTube e restituisce l'ora di inizio reale.
 * @param {string} youtubeUrl - L'indirizzo completo del video.
 * @param {string} apiKey - La tua YouTube Data API Key.
 * @returns {Promise<string>} - Una stringa con la data/ora o l'errore.
 */

function getLiveStartTimeById(youtubeUrl, apiKey) {
    //// 1. Estrazione ID Video
    //var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    //var match = youtubeUrl.match(regExp);
    //var videoId = (match && match[2].length === 11) ? match[2] : null;
	//
    //if (!videoId) {
    //    return Promise.reject("URL YouTube non valido");
    //}

    var apiUrl = "https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=" + videoId + "&key=" + apiKey;

    // Usiamo fetch con le Promises (.then) invece di await
    return fetch(apiUrl)
        .then(function(response) {
            if (!response.ok) throw new Error("Errore API: " + response.status);
            return response.json();
        })
        .then(function(data) {
            if (!data.items || data.items.length === 0) {
                throw new Error("Video non trovato");
            }

            var live = data.items[0].liveStreamingDetails;
            if (!live) {
                throw new Error("Questo non è un video live");
            }

            // Restituiamo l'ora reale di inizio (o quella programmata se non è ancora partito)
            return live.actualStartTime || live.scheduledStartTime || "Data non disponibile";
        });
}

function eseguiRicercaESalva(videoId, miaApiKey) {
    if (!videoId) {
        console.error("ID video mancante");
        return;
    }

    // 1. Controlliamo se il dato è già in memoria
    var datoSalvato = localStorage.getItem("yt_start_" + videoId);

    if (datoSalvato) {
        console.log("Dato recuperato dal localStorage (quota risparmiata!):", datoSalvato);
        return; // Usciamo dalla funzione, non serve chiamare l'API
    }

    // 2. Se non c'è, procediamo con la chiamata API
    console.log("Dato non trovato. Chiamata all'API di YouTube per l'ID: " + videoId);

    getLiveStartTimeById(videoId, miaApiKey)
        .then(function(startTime) {
            // Salvataggio per usi futuri
            localStorage.setItem("yt_start_" + videoId, startTime);
            console.log("Successo! Data scaricata e salvata.");
            
        })
        .catch(function(errore) {
            console.error("Errore durante l'operazione:", errore);
        });
}

function init() {
  // Seleziona l'elemento dello score
  const hudScoreElement = document.getElementById('hud-score');
  
  // Aggiunge l'ascoltatore per il click
  if (hudScoreElement) {
    hudScoreElement.style.pointerEvents = 'auto'; // Importante: abilita i click sull'elemento
    hudScoreElement.style.cursor = 'pointer';      // Cambia il cursore per far capire che è cliccabile
    
    hudScoreElement.addEventListener('click', () => {
      scambiaPosizioniHUD();
    });
  }

  //const miaKey = "LA_TUA_CHIAVE";
  //  
  //const startTime = getLiveStartTime(urlUtente, miaKey);
  //console.log("Lo start time è:", startTime);
  eseguiRicercaESalva(videoId, myAPIKey);
}

document.addEventListener("DOMContentLoaded", init);
