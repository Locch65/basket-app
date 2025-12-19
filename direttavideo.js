let LIVE_OFFSET = 5;
let REFRESH_TIME = 2000;
let url = "https://script.google.com/macros/s/AKfycbx8dqSRUD2GvEDj2H-s9Z845uEjbfEFVSVs2plzN_D1Cu_IXkCla6no1tuCEE-wsUFcUQ/exec";

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

const hudLabel = document.getElementById("hud-label");
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
const videoId = urlParams.get("videoId");
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

function OLDcaricaDatiPartita(mId) {
  fetch(`${url}?matchId=${encodeURIComponent(mId)}`)
    .then(res => res.json())
    .then(rows => {
      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          g.lastPunteggio = g.punteggio; // Salva il vecchio
          g.punteggio = parseInt(r.punti, 10) || 0;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
          try { g.contatori = JSON.parse(r.dettagli || '{"1":0,"2":0,"3":0}'); } catch(e) {}
        } else if (r.giocatore === "Squadra B") {
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });
      updateScoreboard();
      renderPlayerList();
    });
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

function caricaDatiPartita(mId) {
  fetch(`${url}?matchId=${encodeURIComponent(mId)}`)
    .then(res => res.json())
    .then(rows => {
      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          const nuoviPunti = parseInt(r.punti, 10) || 0;
          
          // RILEVAZIONE CANESTRO SENZA CODA
          if (nuoviPunti > g.punteggio) {
            const incremento = nuoviPunti - g.punteggio;
            showBasketToast(g.displayName, incremento);
          }

          g.punteggio = nuoviPunti;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
          try { g.contatori = JSON.parse(r.dettagli || '{"1":0,"2":0,"3":0}'); } catch(e) {}
        } else if (r.giocatore === "Squadra B") {
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });
      updateScoreboard();
      renderPlayerList();
    });
}

// Funzione Flash Semplificata (Durata 2 secondi)
function OLDshowBasketToast(name, points) {
  const toast = document.getElementById("basket-toast");
  if (!toast) return;

  // Sovrascrive immediatamente qualsiasi messaggio precedente
  toast.textContent = `${name.toUpperCase()} +${points}`;
  toast.classList.remove("hidden");
  toast.classList.add("toast-active");

  // Reset dopo 2 secondi esatti
  setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("toast-active");
  }, 2500);
}

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

function tickTimeline() {
  timelineInterval = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== "function") return;
    checkLiveStatus();
    caricaDatiPartita(matchId);
  }, REFRESH_TIME);
}

function initTeamNames() {
  const elA = document.getElementById("label-team-A");
  const elB = document.getElementById("label-team-B");
  if (elA) elA.textContent = teamA;
  if (elB) elB.textContent = teamB;
}

function updateScoreboard() {
  const scoreEl = document.getElementById("game-score");
  const puntiA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
  const currentScore = (teamA === "Polismile A") ? `${puntiA} - ${punteggioB}` : `${punteggioB} - ${puntiA}`;

  // Aggiorna l'HUD in alto nel video
  const hudScore = document.getElementById("hud-score");
  if (hudScore) hudScore.textContent = currentScore;
  
  if (currentScore !== lastScoreStr) {
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

// Fullscreen & Orientation
function requestFullscreen() {
  const el = document.querySelector(".video-container");
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
}

function exitFullscreen() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
}

window.addEventListener("orientationchange", () => {
  if (screen.orientation && screen.orientation.type.startsWith("landscape")) {
    requestFullscreen();
  } else if (screen.orientation && screen.orientation.type.startsWith("portrait")) {
    exitFullscreen();
  }
});
