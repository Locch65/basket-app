let LIVE_OFFSET = 5;
let REFRESH_TIME = 300;

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
let punteggioA = 0;
let punteggioB = 0;
let lastScoreStr = "";
let isUserLive = true;
let oraInizioDiretta = null;
let orarioVisualizzato = null;
let orarioVisualizzatoFormattato = null;
let fullMatchHistory = []; // Qui salviamo tutto il liveData ricevuto

const hudLabel = document.getElementById("hud-label");
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
const videoId = localStorage.getItem("videoId");
const matchStartTime = parseInt(localStorage.getItem("matchStartTime") || "0", 10);


caricaAnagraficaSingolaPartita(matchId);

const teamA = localStorage.getItem("teamA"); // ATTENZIONE: da leggere da google sheet in funzione del matchId
const teamB = localStorage.getItem("teamB");

initTeamNames();

//
let initTimeout;

window.onYouTubeIframeAPIReady = function () {
  if (!videoId) { 
    mostraErrore("⚠️ Nessun videoId trovato"); 
    return; 
  }

  // Avvia un timeout di sicurezza: se dopo 8 secondi il player non è pronto, 
  // forziamo l'avvio delle funzioni di rete (tickTimeline)
  initTimeout = setTimeout(() => {
    console.warn("L'evento onReady di YT non è scattato in tempo. Avvio forzato.");
    mostraErrore("Il player ha difficoltà a caricarsi, ma i dati verranno aggiornati.");
    tickTimeline(); 
  }, 8000);

  player = new YT.Player('ytplayer', {
    videoId: videoId,
    playerVars: { origin: window.location.origin, rel: 0, modestbranding: 1, playsinline: 1, fs: 0 },
    events: { 
      'onReady': (e) => {
        clearTimeout(initTimeout); // Cancella il timeout se risponde in tempo
        nascondiErrore();
        onPlayerReady(e);
      },
      'onError': onPlayerError 
    }
  });
};

function onPlayerReady() {
  console.log("Player pronto");
  player.seekTo(matchStartTime, true);
  player.playVideo();
  tickTimeline();
}

// Funzioni di supporto per l'interfaccia
function mostraErrore(msg) {
  const overlay = document.getElementById("player-error-overlay");
  const text = document.getElementById("error-message");
  if (overlay && text) {
    overlay.classList.remove("hidden");
    text.textContent = msg;
  }
}

function nascondiErrore() {
  const overlay = document.getElementById("player-error-overlay");
  if (overlay) overlay.classList.add("hidden");
}

function onPlayerError(e) {
  hudLabel.textContent = `⚠️ Errore player (${e?.data ?? "sconosciuto"})`;
  if (timelineInterval) clearInterval(timelineInterval);
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
		videoURL: partita.videoURL,
		videoId: extractYouTubeId(partita.videoURL),
		matchStartTime: extractYoutubeTime(partita.videoURL),
		// ATTENZIONE: dobbiamo salvare l'ora di inizio della live, ancora da definire dentro il DB
		//YouTubeVideoStartTime : partita.oraInizioVideoYoutube,
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

function generaHistory(liveDataDalBackend) {
    let scoreA = 0;
    let scoreB = 0;

    fullMatchHistory = liveDataDalBackend.map(evento => {
        // Accumulo punti
        //if (evento.squadra === 'A' || evento.squadra === teamA) {
        if (evento.squadra === 'Squadra B') {
            scoreB += parseInt(evento.puntiRealizzati || 0);
        } else {
            scoreA += parseInt(evento.puntiRealizzati || 0);
        }

        return {
            ...evento,
            secondiReali: hmsToSeconds(evento.timestampReale.replace("*","")), // es: "14:00:00" -> 50400 Potrebbe esserci un * alla fine per indicare che il punteggio è stato modificato da popoup
            punteggioA: scoreA,
            punteggioB: scoreB
        };
    });
}

function caricaDatiPartita(mId) {
  fetch(`${url}?matchId=${encodeURIComponent(mId)}`)
    .then(res => res.json())
    .then(data => {
		// 1. Estrazione dati dai nuovi campi indicati
      const rows = data.statisticheGiocatori || []; 
      const dettagli = data.dettagliGara || {};
	  
	  const matchIsLive = dettagli.isLive;
	  
	  generaHistory(data.liveData);

	  const currentVideoTime = player && typeof player.getCurrentTime === "function" ? player.getCurrentTime() : 0;
      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          const nuoviPunti = parseInt(r.punti, 10) || 0;
          
          //?? // RILEVAZIONE CANESTRO: 
          //?? // Mostra il toast solo se NON è il primo caricamento E il punteggio è aumentato
          //?? if (!isFirstLoad && nuoviPunti > g.punteggio) {
          //??   const incremento = nuoviPunti - g.punteggio;
		  //?? //console.log("Ricevuto punteggio: ", g.displayName);
          //?? }

          g.punteggio = nuoviPunti;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
          try { 
            g.contatori = JSON.parse(r.dettagli || '{"1":0,"2":0,"3":0}'); 
          } catch(e) {}
        } 
		else if (r.giocatore === "Squadra B" && !matchIsLive) {
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });

      // GESTIONE QUARTO/PERIODO
      const periodo = data.dettagliGara?.statoPartita;
      
      const hudPeriodEl = document.getElementById("hud-period"); // Box nel video
      const gamePeriodEl = document.getElementById("game-period"); // Box nella scoreboard

      //[hudPeriodEl, gamePeriodEl].forEach(el => {
      [gamePeriodEl].forEach(el => {
        if (el && periodo) {
          el.textContent = periodo;
          el.classList.remove("hidden");

          // Colore grigio se terminata, rosso se in corso
          if (periodo.toLowerCase().includes("terminata")) {
            el.style.backgroundColor = "#666";
            el.style.borderColor = "#999";
          } else {
            el.style.backgroundColor = "#ff0000";
            el.style.borderColor = "#ff4d4d";
          }
        }
      });
	  
      // Dopo aver elaborato tutti i dati per la prima volta, impostiamo il flag a false
      isFirstLoad = false;

      updateScoreboard(matchIsLive);
      if (!matchIsLive) {
        renderPlayerList();
	  }
	  else {
		  renderPlayerListLive();
	  }
	  
    });
}


// Variabile di controllo per la durata del flash
let isToastRunning = false;

function showBasketToast(name, points) {
  const toast = document.getElementById("basket-toast");
  if (!toast) return;

  // Evita che il refresh dei dati resetti l'animazione se è lo stesso evento
  //if (isToastRunning && toast.textContent.includes(name.toUpperCase())) {
  //  return;
  //}

  isToastRunning = true;
  //toast.classList.remove("toast-active");
  toast.classList.remove("hidden");
  void toast.offsetWidth; // Reset dell'animazione nel DOM

  // Genera i palloni in base ai punti (1, 2 o 3)
  const balls = "🏀".repeat(Math.min(Math.max(points, 1), 3));
  
  // NUOVO ORDINE: Palloni prima del nome
  toast.textContent = `${balls} ${name}`;
  
  //toast.classList.add("toast-active");
  //toast.classList.add("hidden");

  // Rimuove lo stato di blocco dopo 2 secondi
  setTimeout(() => {
    //toast.classList.remove("toast-active");
    toast.classList.add("hidden");
    isToastRunning = false;
  }, 2000);
}

function OLDupdateHUDStatus() {
  const liveLabel = document.getElementById("hud-live-status");
  if (liveLabel ) {
    // Aggiorna solo il testo e il colore in base allo stato
    liveLabel.textContent = isUserLive ? "🔴 LIVE" : "";
    liveLabel.style.color = isUserLive ? "#ff4d4d" : "#aaa";
    // Il bordo rimane rimosso grazie al CSS
  }
}

function checkLiveStatus() {
  const liveStatusBadge = document.getElementById("hud-live-status");
  if (!player || !liveStatusBadge || typeof player.getDuration !== "function") return;
  
  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  const isLive = (duration - currentTime <= LIVE_OFFSET);
  
  
  //if (isLive !== isUserLive) {
  if (isLive) {
    //isUserLive = isLive;
    //updateHUDStatus();
    liveStatusBadge.classList.remove("is-delayed");
    liveStatusBadge.classList.add("is-live");
    liveStatusBadge.innerHTML = "●"; // Pallino rosso	
  }
  else
  {
    liveStatusBadge.classList.remove("is-live");
    liveStatusBadge.classList.add("is-delayed");
    liveStatusBadge.innerHTML = "🕒"; // Simbolo orologio per tornare al live	  
  }

  // --- LOGICA PER ORARIO VIDEO ---
  if (oraInizioDiretta) {
    const parti = oraInizioDiretta.split(":");
    const orarioInizioVideo = new Date();
    orarioInizioVideo.setHours(
        parseInt(parti[0], 10), 
        parseInt(parti[1], 10), 
        parseInt(parti[2] || 0, 10), 
        0
    );

    // Calcolo l'orario effettivo sommando i secondi correnti del player
    orarioVisualizzato = new Date(orarioInizioVideo.getTime() + (currentTime * 1000));

    // Formattazione HH:mm:ss
    const vHH = String(orarioVisualizzato.getHours()).padStart(2, '0');
    const vMM = String(orarioVisualizzato.getMinutes()).padStart(2, '0');
    const vSS = String(orarioVisualizzato.getSeconds()).padStart(2, '0');

    orarioVisualizzatoFormattato = `${vHH}:${vMM}:${vSS}`;

    // Aggiorna l'HUD a video
    const clockEl = document.getElementById("hud-video-time");
    if (clockEl) {
      clockEl.textContent = orarioVisualizzatoFormattato;
    }
  }
}
function processEventBuffer() {
    if (!fullMatchHistory.length || !orarioVisualizzatoFormattato) return;

    // Convertiamo l'orario che l'utente sta vedendo nel video in secondi
    const secondiVisualizzati = hmsToSeconds(orarioVisualizzatoFormattato);

    // Cerchiamo l'ultimo evento accaduto prima o in quel momento
    const eventoCorrente = fullMatchHistory.findLast(e => e.secondiReali <= secondiVisualizzati);

    if (eventoCorrente) {
        // Aggiorna l'HUD con i dati dell'evento trovato
        //document.getElementById('hud-score').textContent = `${eventoCorrente.punteggioA} - ${eventoCorrente.punteggioB}`;
        punteggioA =  eventoCorrente.punteggioA;
		punteggioB = eventoCorrente.punteggioB;
		updateScoreboard(true);
		if (secondiVisualizzati - eventoCorrente.secondiReali < 1 ) {
			showBasketToast(GetCognome(eventoCorrente.idGiocatore), eventoCorrente.puntiRealizzati);
		}

    }
	else {
		// se non ci sono eventi da visualizzare è perchè siamo ancora "0 - 0"
		punteggioA = 0;
		punteggioB = 0;
	}
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


// Variabile globale per tenere traccia della posizione attuale (0, 1 o 2)
let hudPositionIndex = 1; // Partiamo dal 50% (centro)

function scambiaPosizioniHUD() {
  const hudScore = document.getElementById('hud-score');
  const basketToast = document.querySelector('.toast');

  if (!hudScore) return;

  // Incrementiamo l'indice della posizione (ciclo tra 0, 1, 2)
  hudPositionIndex = (hudPositionIndex + 1) % 3;

  // Applichiamo le proprietà base per tenerlo sempre in alto
  hudScore.style.top = '0px';
  hudScore.style.bottom = 'auto';
  hudScore.style.transform = 'translateX(-50%)';
  hudScore.style.position = 'absolute'; // Assicurati che sia absolute o fixed

  // Ruotiamo solo le posizioni orizzontali
  switch (hudPositionIndex) {
    case 0: // Sinistra (25%)
      hudScore.style.left = '30%';
      break;
    case 1: // Centro (50%)
      hudScore.style.left = '50%';
      break;
    case 2: // Destra (75%)
      hudScore.style.left = '70%';
      break;
  }

  // Poiché lo score è ora SEMPRE in alto, il toast rimane sempre in basso
  if (basketToast) {
    basketToast.style.top = 'auto';
    basketToast.style.bottom = '5px';
  }
}

/**
 * Scambia le posizioni verticali di HUD Score e Basket Toast.
 * Se lo score è in alto, lo sposta in basso e viceversa.
 */
function OLDscambiaPosizioniHUD() {
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

function updateScoreboard(matchIsLive) {
  const scoreEl = document.getElementById("game-score");
  //const puntiA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
  if (!matchIsLive) {
    punteggioA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
  }
  
  //const currentScore = (teamA === "Polismile A") ? `${puntiA} - ${punteggioB}` : `${punteggioB} - ${puntiA}`;
  const currentScore = (teamA === "Polismile A") ? `${punteggioA} - ${punteggioB}` : `${punteggioB} - ${punteggioA}`;

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
function renderPlayerListLive() {
  const container = document.getElementById("players-grid");
  if (!container || !fullMatchHistory.length) return;

  // 1. Convertiamo l'orario attuale del video in secondi per il confronto
  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);

  // 2. Creiamo una lista temporanea di giocatori con i punti ricalcolati "nel tempo"
  const visualizzazioneGiocatori = giocatoriObj.map(g => {
    // Filtriamo la storia: prendiamo solo i canestri di QUESTO giocatore
    // avvenuti prima o durante il secondo visualizzato
    const eventiGiocatore = fullMatchHistory.filter(evento => 
      String(evento.idGiocatore) === String(g.numero) && 
      evento.secondiReali <= secondiCorrentiVideo
    );

    // Calcoliamo i totali parziali per i canestri da 1, 2 e 3 punti
    const parziale1 = eventiGiocatore.filter(e => parseInt(e.puntiRealizzati) === 1).length;
    const parziale2 = eventiGiocatore.filter(e => parseInt(e.puntiRealizzati) === 2).length;
    const parziale3 = eventiGiocatore.filter(e => parseInt(e.puntiRealizzati) === 3).length;
    
    const puntiTotaliNelTempo = eventiGiocatore.reduce((acc, e) => acc + (parseInt(e.puntiRealizzati) || 0), 0);

    return {
      ...g,
      puntiNelTempo: puntiTotaliNelTempo,
      statsNelTempo: `[${parziale1}, ${parziale2}, ${parziale3}]`
    };
  });

  // 3. ORDINAMENTO: In campo prima, poi per punti fatti (nel tempo visualizzato)
  visualizzazioneGiocatori.sort((a, b) => {
    if (a.stato === 'In' && b.stato !== 'In') return -1;
    if (a.stato !== 'In' && b.stato === 'In') return 1;
    return b.puntiNelTempo - a.puntiNelTempo;
  });

  // 4. RENDERING HTML
  container.innerHTML = visualizzazioneGiocatori.map(g => {
    return `
      <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}">
        <div>
          <span class="player-num">#${g.numero}</span>
          <span class="player-name">${g.displayName}</span>
        </div>
        <div class="player-stats">
          ${g.statsNelTempo} 
          <span class="player-points">${g.puntiNelTempo}</span>
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

function init() {
  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");
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

  const hudLiveStatus = document.getElementById("hud-live-status");
  if (hudLiveStatus) {
	  hudLiveStatus.addEventListener('click', () => {
        const durataTotale = player.getDuration();
        player.seekTo(durataTotale - 1, true);
        player.playVideo();		  
	  });
  }
}

document.addEventListener("DOMContentLoaded", init);

