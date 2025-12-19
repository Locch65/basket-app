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

function caricaDatiPartita(mId) {
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

function updateHUDStatus(msg) {
  if (hudLabel) {
    hudLabel.textContent = msg;
    hudLabel.style.borderColor = isUserLive ? "red" : "rgba(108,255,108,.4)";
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
    const stats = `1pt:${c[1]||0} 2pt:${c[2]||0} 3pt:${c[3]||0}`;
    
    // Verifica se attivare il flash (punteggio aumentato)
    const hasChanged = g.punteggio !== g.lastPunteggio;
    const flashClass = hasChanged ? 'flash-update' : '';

    return `
      <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'} ${flashClass}">
        <div>
          <span class="player-num">#${g.numero}</span>
          <span class="player-name">${g.displayName}</span>
        </div>
        <div class="player-stats">
          ${stats} <span class="player-points">${g.punteggio} pts</span>
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
