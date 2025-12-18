let LIVE_OFFSET = 5;
let REFRESH_TIME = 2000;

let url = 
"https://script.google.com/macros/s/AKfycbx8dqSRUD2GvEDj2H-s9Z845uEjbfEFVSVs2plzN_D1Cu_IXkCla6no1tuCEE-wsUFcUQ/exec"


let player;
let timelineInterval;
const hudLabel = document.getElementById("hud-label");

const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
const videoId = urlParams.get("videoId");
const startTime = parseInt(localStorage.getItem("videoStartTime") || "0", 10);

console.log("Youtube videoId= ", videoId);

const hudMessages = [];

window.onYouTubeIframeAPIReady = function () {
  if (!videoId) {
    hudLabel.textContent = "⚠️ Nessun videoId fornito";
    return;
  }
  
  player = new YT.Player('ytplayer', {
    videoId: videoId,
    playerVars: {
      origin: window.location.origin,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      fs: 0 
    },
    events: {
      'onReady': onPlayerReady,
      'onError': onPlayerError
    }
  });

  setTimeout(() => {
    if (!player || typeof player.getCurrentTime !== "function") {
      hudLabel.textContent = "❌ Video non disponibile";
      if (timelineInterval) clearInterval(timelineInterval);
    }
  }, 10000);
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

// Aggiungi questa variabile per monitorare lo stato
let isUserLive = true;

function caricaDatiPartita(matchId) {
  const url_1 = url + "?matchId=" + encodeURIComponent(matchId);
  console.log("URL: " + url_1)
  fetch(url_1)
    .then(res => res.json())
    .then(rows => {
      console.log("Dati caricati:", rows);


      // … poi aggiorni i giocatori
      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          g.punteggio = parseInt(r.punti, 10) || 0;
          g.contatori = JSON.parse(r.dettagli || "{}");
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
        } else if (r.giocatore === "Squadra B") {
          puntiSquadraB = parseInt(r.punti, 10) || 0;
          contatoriB = JSON.parse(r.dettagli || "{}");
        }
      });
      //aggiornaTitoli();
      //renderGiocatori(giocatoriObj);
      //aggiornaScoreboard();
      //ordinaGiocatori(ultimoOrdinamento);
    });
}

// Funzione per aggiornare l'interfaccia (opzionale)
function updateHUDStatus(msg) {
  const statusBadge = document.getElementById("hud-label");
  if (statusBadge) {
    statusBadge.textContent = msg;
    statusBadge.style.borderColor = isUserLive ? "red" : "rgba(108,255,108,.4)";
  }
}

function checkLiveStatus() {
  if (!player || typeof player.getDuration !== "function") return;

  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  
  // YouTube considera "Live" se il cursore è molto vicino alla fine della durata totale
  // Usiamo un margine di 5-10 secondi per compensare il buffering. è definito in una variabile globale LIVE_OFFSET
  
  if (duration - currentTime <= LIVE_OFFSET) {
    if (!isUserLive) {
      console.log("L'utente è tornato in DIRETTA");
      isUserLive = true;
      updateHUDStatus("🔴 LIVE");
    }
  } else {
    if (isUserLive) {
      console.log("L'utente sta guardando il PASSATO");
      isUserLive = false;
      updateHUDStatus("⏳ DVR (Passato)");
    }
  }
}

function tickTimeline() {
  let lastShownAt = -1;
  timelineInterval = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== "function") return;
    
	// Controlla se è live o passato
    checkLiveStatus();
	
	//caricaDatiPartita(matchId);
	
    const t = Math.floor(player.getCurrentTime());
    if (t === lastShownAt) return;
    
    const hit = hudMessages.find(m => m.time === t);
	console.log("Refresh partita...");
    if (hit) {
      hudLabel.textContent = hit.text;
      hudLabel.classList.add("pulse");
      setTimeout(() => hudLabel.classList.remove("pulse"), 900);
      lastShownAt = t;
    }
  }, REFRESH_TIME);
}

function requestFullscreen() {
  const el = document.querySelector(".video-container");
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

window.addEventListener("orientationchange", () => {
  if (screen.orientation && screen.orientation.type.startsWith("landscape")) {
    requestFullscreen();
  } else if (screen.orientation && screen.orientation.type.startsWith("portrait")) {
    exitFullscreen();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  //tickTimeline();
});

