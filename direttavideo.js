let LIVE_OFFSET = 5;
let REFRESH_TIME = 300;
let ACCEPTABLE_DELAY_FOR_TOAST = 2; // secondi di ritardo accettabili per visualizzare il toast del punto realizzato

let giocatoriObj = [];
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
let videoId = null;
let matchStartTime = 0;
let matchIsLive = false;
let isReviewMode = false;
let currentHighlightIndex = -1; // -1 significa che nessun highlight è ancora selezionato
let highlightsAvailable = false; // Di default la sezione è nascosta
let isAdmin = false;
let isFetching = false; // Impedisce chiamate sovrapposte
let bloccoSincronizzazioneManuale = false;
let userNavigatedToEnd = false;
let isSyncPending = false; // Indica se c'è un evento SYNC già visualizzato ma non ancora gestito
let eventosync  = null;

const hudLabel = document.getElementById("hud-label");
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get("matchId");
const teamA = localStorage.getItem("teamA");
const teamB = localStorage.getItem("teamB");

initTeamNames();

function inizializzaGiocatoriConvocati() {
  const stringaConvocati = localStorage.getItem("convocazioni");

  giocatoriObj = giocatoriA.map((nomeCompleto, index) => {
    const [nome, cognome] = nomeCompleto.split(" ");
    return {
      numero: numeriMaglia[index],
      displayName: `${cognome} ${nome}`,
      punteggio: 0,
      contatori: {1:0, 2:0, 3:0},
      stato: "Out",
      lastPunteggio: 0 
    };
  }).filter(g => {
    // Se la lista convocati è vuota, li teniamo tutti
    if (!stringaConvocati || stringaConvocati.trim() === "" || stringaConvocati === "[ALL]") {
      return true;
    }
    
    // Trasformiamo la stringa in array e confrontiamo i numeri
    // 1. Rimuoviamo eventuali parentesi quadre [ ]
    // 2. Rimuoviamo tutti i tipi di apici (singoli ' e doppi ")
    const stringaPulita = stringaConvocati.replace(/[\[\]'" ]/g, "");
    
    // 3. Creiamo l'array dividendo per virgola
    const convocatiIds = stringaPulita.split(",");	const isConvocato = convocatiIds.includes(String(g.numero));
    return convocatiIds.includes(String(g.numero));
  });
  
  console.log("Giocatori pronti (filtrati):", giocatoriObj);
}

window.onYouTubeIframeAPIReady = function () {
  console.log("YouTube API Ready");
};

function onPlayerReady() {
  console.log("Player pronto");
  
  // NASCONDI LO SPINNER DEL VIDEO
  const videoSpinner = document.getElementById("video-loading");
  if (videoSpinner) {
    videoSpinner.classList.add("hidden");
  }

  player.seekTo(matchStartTime, true);
  player.playVideo();
  tickTimeline();
  if (timelineInterval) clearInterval(timelineInterval); // Sicurezza anti-doppioni
  timelineInterval = setInterval(tickTimeline, REFRESH_TIME);
}

function creaIlPlayer(vId) {
    if (!vId) return;
    
    player = new YT.Player('ytplayer', {
        height: '100%', 
        width: '100%',  
        videoId: vId,
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'rel': 0,
            'modestbranding': 1,
            'playsinline': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function caricaAnagraficaSingolaPartita(targetMatchId) {
  if (!targetMatchId) return;

  localStorage.removeItem("videoId");
  
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

let isFirstLoad = true; // Variabile di stato globale (fuori dalla funzione)

function generaHistory(liveDataDalBackend) {
    let scoreA = 0;
    let scoreB = 0;


    // Se i dati dal backend sono vuoti o non validi, inizializziamo con i convocati a 0
    if (!liveDataDalBackend || liveDataDalBackend.length === 0) {
        console.log("Nessun evento live trovato. Inizializzazione cronologia con i convocati.");
        
        fullMatchHistory = giocatoriObj.map(g => {
            return {
                idGiocatore: g.numero,
                puntiRealizzati: 0,
                squadra: 'Polismile A', // Assumiamo squadra A per i convocati in giocatoriObj
                timestampReale: "00:00:00",
                secondiReali: 0,
                punteggioA: 0,
                punteggioB: 0
            };
        });
		highlightsAvailable = false;
        return; // Usciamo dalla funzione
    }

    fullMatchHistory = liveDataDalBackend
	  // Filtra gli eventi: tieni solo quelli con puntiRealizzati maggiore di 0. quelli con punteggio = 0 sono usati per l'autosync del tempo
//      .filter(evento => parseInt(evento.puntiRealizzati || 0) > 0)
      .filter(evento => evento.squadra !== "SYNC")
	  .map(evento => {
        // Accumulo punti
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
	highlightsAvailable = true;
}

function caricaDatiPartita(mId) {
  if (!mId) return;
  
  // Se una chiamata è già in corso, esci subito
  if (isFetching) {
    //console.log("Caricamento in corso... salto questo tick.");
    return;
  }

  isFetching = true;

  // 1. Facciamo partire il cronometro
  const startTime = performance.now();
  
  fetch(url + "?matchId=" + encodeURIComponent(mId))
    .then(function(response) {
      if (!response.ok) throw new Error("Errore network");
      return response.json();
    })
    .then(function(data) {

      // 2. Calcoliamo la fine e stampiamo in console
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2); // Arrotonda a 2 decimali
	  // Aggiornamento della label HTML
      const timeLabel = document.getElementById("fetch-time");
      if (timeLabel) {
        timeLabel.textContent = duration;
        
        // Opzionale: cambia colore se è troppo lenta (es. > 500ms)
        timeLabel.style.color = duration > 2000 ? "#ff4d4d" : "#888";
      }
      console.log("CaricaDatiPartita() " + duration + " ms");


      // 1. Estrazione dati
      const rows = data.statisticheGiocatori || [];
      const dettagli = data.dettagliGara || {};
      matchIsLive = dettagli.isLive;
      oraInizioDiretta = dettagli.oraInizioDiretta;
      isUserLive = matchIsLive;

      generaHistory(data.liveData);
	  
	  showSyncTime(data.liveData);
      
      controllaDisponibilitaHighlights(); 

      // 2. Aggiornamento giocatori
      rows.forEach(function(r) {
        const g = giocatoriObj.find(function(x) { 
          return String(x.numero) === String(r.numero); 
        });
        if (g) {
          const nuoviPunti = parseInt(r.punti, 10) || 0;
          g.punteggio = nuoviPunti;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
          try {
            g.contatori = JSON.parse(r.dettagli || '{"1":0,"2":0,"3":0}');
          } catch (e) {}
      } else if (r.giocatore === "Squadra B" && !matchIsLive && ! isReviewMode) { // in ReviewMode il punteggio e' calcolato in base al tempo visualizzato
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });

    // GESTIONE QUARTO/PERIODO
    const periodo = data.dettagliGara?.statoPartita;
      const hudPeriodEl = document.getElementById("hud-period");
      const gamePeriodEl = document.getElementById("game-period");

      [hudPeriodEl, gamePeriodEl].forEach(function(el) {
        if (el && periodo) {
          el.textContent = periodo;
          el.classList.remove("hidden");
          if (periodo.toLowerCase().includes("terminata")) {
            el.style.backgroundColor = "#666";
            el.style.borderColor = "#999";
          } else {
            el.style.backgroundColor = "#ff0000";
            el.style.borderColor = "#ff4d4d";
          }
        }
      });

      isFirstLoad = false;

      updateScoreboard(matchIsLive || isReviewMode);
      if (matchIsLive || isReviewMode) {
        renderPlayerListLive();
      } else {
        renderPlayerList();
      }

      // IMPORTANTE: Reset del flag alla fine del successo
      isFetching = false;
    })
    .catch(function(err) {
      document.getElementById("players-grid").innerHTML = "Errore: " + err;
      console.error("Errore nel caricamento dati partita:", err);
      // IMPORTANTE: Reset del flag anche in caso di errore
      isFetching = false;
    });
}

// Aggiungiamo 'async' per gestire l'attesa del server

let isToastRunning = false; // Variabile di controllo per la durata del flash

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
	if (points === 0) {
      isSyncPending = false;
      eventosync = null;
      console.log("SYNC scaduto e rimosso");
    }
  }, points === 0 ? 30000 : 2000); // mostralo per più tempo se è un messaggio di SYNC (in tal caso points==0)
}


let maxCurrentTime = 0;
let wasPaused = false;
let pauseStartTime = null;
let userIsBehindBecauseOfPause = false;

function isLiveStream() {
  const data = player.getVideoData();
  return data.isLive === true;
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PAUSED) {
    wasPaused = true;
    pauseStartTime = performance.now();
  }

  if (event.data === YT.PlayerState.PLAYING) {
    // Se riprendi dopo una pausa lunga, sei indietro
    if (wasPaused && pauseStartTime) {
      const pausedFor = (performance.now() - pauseStartTime) / 1000;
      if (pausedFor > 2) {
        // segna che sei indietro
        userIsBehindBecauseOfPause = true;
      }
    }
    wasPaused = false;
  }
}

function updateLiveEdge() {
  const current = player.getCurrentTime();
  if (current > maxCurrentTime) {
    maxCurrentTime = current;
	userIsBehindBecauseOfPause = false;
  }
}

function isBehindLiveEdge(threshold = 3) {
  const current = player.getCurrentTime();
  return (maxCurrentTime - current) > threshold;
}

function isUserBehindLive() {
  // Caso 1: sei in pausa
  if (player.getPlayerState() === YT.PlayerState.PAUSED) {
    return true;
  }

  // Caso 2: eri in pausa e hai appena ripreso
  if (userIsBehindBecauseOfPause) {
    return true;
  }

  // Caso 3: sei indietro rispetto al live edge
  return isBehindLiveEdge();
}

function checkLiveStatus() {
  const liveStatusBadge = document.getElementById("hud-live-status");
  if (!player || !liveStatusBadge || typeof player.getDuration !== "function") return;
  
  updateLiveEdge();
  
  const isLive = !isUserBehindLive();
  
  if (isLiveStream()) {	  
    liveStatusBadge.classList.remove("hidden");
    if (isLive) {
      liveStatusBadge.classList.remove("is-delayed");
      liveStatusBadge.classList.add("is-live");
      liveStatusBadge.innerHTML = "●"; 	
    } else {
      liveStatusBadge.classList.remove("is-live");
      liveStatusBadge.classList.add("is-delayed");
      liveStatusBadge.innerHTML = "🕒"; 	  
    }
  } else {
    liveStatusBadge.classList.add("hidden");
  }
  
  if (oraInizioDiretta) {
    const parti = oraInizioDiretta.split(":");
    const orarioInizioVideo = new Date();
    orarioInizioVideo.setHours(parseInt(parti[0], 10), parseInt(parti[1], 10), parseInt(parti[2] || 0, 10), 0);

    // --- CORREZIONE QUI ---
    let currentTime = player.getCurrentTime();
    const durataTotale = player.getDuration();
    const statoPlayer = player.getPlayerState();

    // Se il video è finito (Stato 0), forziamo il tempo alla durata totale
    if (statoPlayer === YT.PlayerState.ENDED || (durataTotale > 0 && currentTime < 1 && userNavigatedToEnd)) {
        currentTime = durataTotale;
    }

    orarioVisualizzato = new Date(orarioInizioVideo.getTime() + (currentTime * 1000));
    // -----------------------

    const vHH = String(orarioVisualizzato.getHours()).padStart(2, '0');
    const vMM = String(orarioVisualizzato.getMinutes()).padStart(2, '0');
    const vSS = String(orarioVisualizzato.getSeconds()).padStart(2, '0');

    orarioVisualizzatoFormattato = `${vHH}:${vMM}:${vSS}`;

    const clockEl = document.getElementById("hud-video-time");
    if (clockEl) {
      clockEl.textContent = orarioVisualizzatoFormattato;
    }
  }
}

function OLDcheckLiveStatus() {
  const liveStatusBadge = document.getElementById("hud-live-status");
  if (!player || !liveStatusBadge || typeof player.getDuration !== "function") return;
  
  updateLiveEdge();
  
  const isLive = !isUserBehindLive();
  
  //if (isLive !== isUserLive) {
  if (isLiveStream()) {	  
    liveStatusBadge.classList.remove("hidden");
    if (isLive) {
      //isUserLive = isLive;
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
  }
  else {
	// NASCONDE il badge se non è un video live (è un caricamento differito/VOD)
    liveStatusBadge.classList.add("hidden");
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
    const currentTime = player.getCurrentTime();
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
        updateScoreboard(matchIsLive || isReviewMode);
		if ((isUserLive || isReviewMode) && secondiVisualizzati - eventoCorrente.secondiReali < ACCEPTABLE_DELAY_FOR_TOAST ) {
			tmpId = GetCognome(eventoCorrente.idGiocatore);
			showBasketToast(tmpId, eventoCorrente.puntiRealizzati);
		}
    }
	else {
		// se non ci sono eventi da visualizzare è perchè siamo ancora "0 - 0"
		punteggioA = 0;
		punteggioB = 0;
	}
}

// Inizializza il contatore fuori dalla funzione
let tickCounter = 0;

async function tickTimeline() {
    // Se c'è il player, gestiamo la parte video
    if (player && typeof player.getCurrentTime === "function") {
        checkLiveStatus();
		
		// AGGIUNTA: Se l'utente sta guardando gli highlight, 
        // allinea l'indice alla posizione del video
        if (isReviewMode) {
            sincronizzaIndiceHighlightColVideo();
        }
    } else {
        // Logica di fallback se non c'è il video: 
        // usiamo l'orario reale del computer per far scorrere gli eventi live
        const oraAttuale = new Date();
        const vHH = String(oraAttuale.getHours()).padStart(2, '0');
        const vMM = String(oraAttuale.getMinutes()).padStart(2, '0');
        const vSS = String(oraAttuale.getSeconds()).padStart(2, '0');
        orarioVisualizzatoFormattato = `${vHH}:${vMM}:${vSS}`;
    }

    tickCounter++;

    // Carica i dati dal server ogni 7 tick (circa 2.1 secondi)
    if (tickCounter % 7 === 0) {
        //await caricaDatiPartita(matchId);
        caricaDatiPartita(matchId);
    }
    
    processEventBuffer(); // Gestisce la visualizzazione dei punti nel tempo
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

//function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

function controllaDisponibilitaHighlights() {
// Questa funzione serve a mostrare/nascondere l'INTERA sezione in base alla variabile globale
	if (highlightsAvailable == false) return;
	
	if (fullMatchHistory.length === 0) return;
    
    const section = document.getElementById('highlights-section');
    if (highlightsAvailable) {
        section.style.display = "flex";
    } else {
        section.style.display = "none";
    }
}

function toggleHighlights() {
    const btnToggle = document.getElementById('toggle-highlights');
    const controls = document.getElementById('highlights-controls');
    const label = document.getElementById('highlight-label');
	
    // Toggle restituisce true se ha aggiunto la classe, false se l'ha rimossa
    const isNowVisible = controls.classList.toggle('show');
    
    if (isNowVisible) {
        // APERTURA
        btnToggle.classList.replace('btn-toggle-off', 'btn-toggle-on');
        // Mostriamo la label solo se i controlli sono aperti
        if (label) {
            label.style.display = 'block';
            label.innerText = "Seleziona un'azione"; // Testo iniziale per evitare buchi
        }
        inizializzaHighlights();
		isReviewMode = true;
    } else {
        // CHIUSURA
        btnToggle.classList.replace('btn-toggle-on', 'btn-toggle-off');
		label.style.display = 'none';  // <--- NASCONDE LA LABEL
        currentHighlightIndex = -1;

        // Nascondiamo la label quando chiudiamo i controlli
        if (label) {
            label.style.display = 'none';
            label.innerText = ""; 
        }
		isReviewMode = false;
    }
}

function inizializzaHighlights() {
    // Rimosso il controllo if (currentHighlightIndex >= 0) per permettere il reset
    if (fullMatchHistory && fullMatchHistory.length > 0) {
        highlightsAvailable = true;
        currentHighlightIndex = (matchStartTime > 0) ? -2 : -1;; // Indichiamo che siamo prima del primo evento
        controllaDisponibilitaHighlights();
        aggiornaUIHighlight(); 
    }
}

function gestisciHighlight(azione) {
    if (!fullMatchHistory) return;
    
    // Resettiamo il flag ogni volta che si preme un tasto
    userNavigatedToEnd = false; 

    switch(azione) {
        case 'start': currentHighlightIndex = (matchStartTime > 0) ? -2 : -1; break;
        case 'prev': if (currentHighlightIndex > -2) currentHighlightIndex--; break;
        case 'next': if (currentHighlightIndex < fullMatchHistory.length) currentHighlightIndex++; break;
        case 'end': 
            currentHighlightIndex = fullMatchHistory.length; 
            userNavigatedToEnd = true; // <--- MARCIAMO L'INTENZIONE
            break;
    }

    bloccoSincronizzazioneManuale = true;
    aggiornaUIHighlight(true);

    setTimeout(() => {
        bloccoSincronizzazioneManuale = false;
        // Non resettiamo userNavigatedToEnd qui, lo farà la prima sync valida
    }, 1000); // Alziamo a 3 secondi per sicurezza
}

function sincronizzaIndiceHighlightColVideo() {
    if (!isReviewMode || !fullMatchHistory.length || !player || bloccoSincronizzazioneManuale) return;

    const state = player.getPlayerState();
    if (state === YT.PlayerState.BUFFERING) return;

    const secondiVisualizzati = player.getCurrentTime();
    const durataTotale = player.getDuration();
    const secondiInizioDiretta = hmsToSeconds(oraInizioDiretta);
    
    // 1. GESTIONE SPECIALE END
    if (userNavigatedToEnd) {
        // Se l'utente ha premuto END, forziamo l'indice a restare alla fine 
        // finché il video non è quasi arrivato (tolleranza 5 secondi dalla fine)
        if (durataTotale > 0 && secondiVisualizzati < (durataTotale - 5)) {
            currentHighlightIndex = fullMatchHistory.length;
            aggiornaUIHighlight(false);
			if (player.getPlayerState() === YT.PlayerState.ENDED)
              return; // Blocca il resto della sincronizzazione
        } else {
            // Se siamo arrivati a destinazione, liberiamo il flag
            userNavigatedToEnd = false;
        }
    }

    let nuovoIndice = -2;
    const inputShift = document.getElementById('highlight-duration');
    const SHIFT_VIDEO_TIME = inputShift ? parseInt(inputShift.value) : 10;

    // 2. Calcolo standard (Inizio Partita / Eventi)
    if (matchStartTime > 0 && secondiVisualizzati >= (matchStartTime - 0.5)) {
        nuovoIndice = -1;
    }

    fullMatchHistory.forEach((ev, idx) => {
        const offsetEvento = hmsToSeconds(ev.timestampReale) - secondiInizioDiretta;
        if (secondiVisualizzati >= (offsetEvento - SHIFT_VIDEO_TIME - 0.5)) {
            nuovoIndice = idx;
        }
    });

    // 3. Controllo Fine Video (per sincronizzazione automatica durante il play)
    if (durataTotale > 0 && secondiVisualizzati >= (durataTotale - 3)) {
        nuovoIndice = fullMatchHistory.length;
    }

    // 4. Applica cambio se necessario
    if (nuovoIndice !== currentHighlightIndex) {
        currentHighlightIndex = nuovoIndice;
        aggiornaUIHighlight(false);
    }
}

function aggiornaUIHighlight(eseguiSeek = true) {
    const label = document.getElementById('highlight-label');
    if (!label) return;

    const timeline = [];

    // Indice -2
    timeline.push({ 
        tipo: 'DIRETTA', 
        testo: `INIZIO DIRETTA - ${oraInizioDiretta || "00:00:00"}`, 
        seek: 0,
        idLogico: -2
    });

    // Indice -1 (se presente)
    if (matchStartTime > 0) {
        timeline.push({ 
            tipo: 'PARTITA', 
            testo: `INIZIO PARTITA - ${aggiungiSecondiAOrario(oraInizioDiretta, matchStartTime)}`, 
            seek: matchStartTime,
            idLogico: -1
        });
    }

    // Indici 0, 1, 2...
    fullMatchHistory.forEach((ev, idx) => {
        if (ev.timestampReale !== '00:00:00') {
            const contatore = `(${idx + 1}/${fullMatchHistory.length})`.padEnd(7, ' ');
            const pStr = ev.puntiRealizzati ? `+${ev.puntiRealizzati}` : "  ";
            const cStr = GetCognome(ev.idGiocatore).substring(0, 12).padEnd(12, ' ');
            timeline.push({
                tipo: 'EVENTO',
                testo: `${contatore} ${pStr} ${cStr} - ${ev.timestampReale || '00:00:00'}`,
                seek: ev,
                isEventoReale: true,
                idLogico: idx
            });
        }
    });

    // Indice finale (N)
    const durataVideo = typeof player.getDuration === 'function' ? player.getDuration() : 0;
    timeline.push({ 
        tipo: 'FINE', 
        testo: `FINE DIRETTA   - ${durataVideo > 0 ? aggiungiSecondiAOrario(oraInizioDiretta, durataVideo) : "--:--:--" }`, 
        seek: durataVideo,
        idLogico: fullMatchHistory.length
    });

    // --- TROVA L'INDICE REALE NELLA TIMELINE ---
    // Invece di calcolare vIndex matematicamente, cerchiamo l'oggetto che ha l'idLogico corrispondente
    const vIndex = timeline.findIndex(t => t.idLogico === currentHighlightIndex);

    if (vIndex === -1) return;

    const getRiga = (index, isCorrente) => {
        if (index < 0 || index >= timeline.length) return "";
        return (isCorrente ? "===> " : "     ") + timeline[index].testo;
    };

    label.innerText = [
        getRiga(vIndex - 1, false), 
        getRiga(vIndex, true), 
        getRiga(vIndex + 1, false)
    ].filter(r => r !== "").join("\n");

    if (eseguiSeek) {
        const attuale = timeline[vIndex];
        if (attuale) {
            if (attuale.isEventoReale) {
                eseguiSeekHighlight(attuale.seek);
            } else {
                player.seekTo(attuale.seek, true);
            }
        }
    }
}

// Aggiungi il parametro 'eseguiSeek = true' (default)
function eseguiSeekHighlight(evento) {
	if (evento) {

        const input = document.getElementById('highlight-duration');     
        const SHIFT_VIDEO_TIME = input ? parseInt(input.value) : 10; // Ritorna 10 se il campo è vuoto
        // Logica standard per gli highlights (canestri)
        const secondiInizioVideo = hmsToSeconds(oraInizioDiretta);
        const secondiEvento = hmsToSeconds(evento.timestampReale);
        const diffSecondi = secondiEvento - secondiInizioVideo - SHIFT_VIDEO_TIME;
        
        if (diffSecondi > 0) {
            player.seekTo(diffSecondi, true);
        }
    }
    player.playVideo();
}

function updateScoreboard(matchIsLive) {
  const scoreEl = document.getElementById("game-score");
  //const puntiA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
  let currentScore = "";
  if (!matchIsLive) {
    //punteggioA = giocatoriObj.reduce((acc, g) => acc + g.punteggio, 0);
	punteggioA = localStorage.getItem("puntiSquadraA");
	punteggioB = localStorage.getItem("puntiSquadraB");
	currentScore = `${punteggioA} - ${punteggioB}`;
  }
  else {
    currentScore = (teamA === "Polismile A") ? `${punteggioA} - ${punteggioB}` : `${punteggioB} - ${punteggioA}`;
  }
  
  // Aggiorna l'HUD in alto nel video
  const scoreText = document.getElementById("score-text");
  if (scoreText) scoreText.textContent = currentScore;
  
  if (currentScore !== lastScoreStr) {
    if (isMobile()) { 
      if (navigator.vibrate) navigator.vibrate(100); // Funziona solo su Android/Chrome
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

function requestFullscreen() {
  // --- FUNZIONI FULLSCREEN ---
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


// Gestisci Fullscreen in landscape
window.screen.orientation.addEventListener("change", function() {
  if (window.screen.orientation.type.startsWith("portrait")) {
    // Se siamo in verticale e il fullscreen è attivo, lo chiudiamo
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } else if (window.screen.orientation.type.startsWith("landscape")) {
    // Opzionale: attiva fullscreen quando ruoti in orizzontale
    const elem = document.querySelector(".video-container");
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  }
}, { passive: true });

// Opzionale: aggiungi un controllo anche al resize per sicurezza su alcuni Android
window.addEventListener("resize", () => {
    // Se la larghezza supera l'altezza, siamo probabilmente in landscape
    if (window.innerWidth > window.innerHeight) {
        requestFullscreen();
    }
}, { passive: true });

function avviaTickSenzaVideo() {
    if (timelineInterval) clearInterval(timelineInterval);
    // Avviamo subito il primo tick per non aspettare 300ms
    tickTimeline(); 
    timelineInterval = setInterval(tickTimeline, REFRESH_TIME);
}

function sendSyncTime() {
  console.log("SendSyncTime() chiamata");
  if (isMobile()) { 
      if (navigator.vibrate) navigator.vibrate(100); // Funziona solo su Android/Chrome
  }
  
  // Logica futura qui
  const oraCorrente = new Date().toLocaleTimeString('it-IT');
  salvaEventoLive("", 1, oraCorrente, "SYNC");
}

function showSyncTime(events) {
  if (isSyncPending) return;
  
  // Cerca l'esistenza di un messaggio di SYNC
  eventosync = events.findLast(e => e.squadra === "SYNC" && e.puntiRealizzati > 0);
  // cancella il messaggio di sync dal database
  if (eventosync) {
    isSyncPending = true;
    if (isMobile()) { 
      if (navigator.vibrate) navigator.vibrate(100); // Funziona solo su Android/Chrome
    }

    showBasketToast("SYNC: " + eventosync.timestampReale, 0);
    salvaEventoLive("", -eventosync.puntiRealizzati, eventosync.timestampReale, "SYNC");
  }
}
function checkSyncTime(events) {
  const basketToast = document.getElementById('basket-toast');
  if (basketToast) {
    basketToast.classList.add("hidden");
  }
  isToastRunning = false;

  // Se non c'è un evento attivo, resettiamo ed usciamo
  if (!eventosync) {
    isSyncPending = false;
    return;
  }
  
  // 1. Calcolo l'offset tra realtà e video
  const offsetEvento = hmsToSeconds(eventosync.timestampReale.replace("*", "")) - hmsToSeconds(orarioVisualizzatoFormattato);
  
  // 2. Calcolo la nuova Ora Inizio
  // Sottraendo l'offset: se l'offset è 10s (video in ritardo), 
  // l'ora di inizio reale deve essere 10s prima di quella attuale.
  const oraInizioAttualeSecondi = hmsToSeconds(oraInizioDiretta);
  const nuovaOraInizioSecondi = oraInizioAttualeSecondi - offsetEvento;
  const nuovaOraInizioHms = secondsToHms(nuovaOraInizioSecondi);

  const messaggio = `SYNC INFO:
Differenza:             ${offsetEvento} secondi
Attuale Inizio:         ${oraInizioDiretta}
Nuovo Inizio Suggerito: ${nuovaOraInizioHms}

${offsetEvento < 0 ? "Ritardo video eccessivo (Sposta AVANTI)" : "Video troppo avanti (Sposta INDIETRO)"}

Vuoi applicare la nuova sincronizzazione?`;

  // Resettiamo i flag PRIMA del confirm o del reload per sicurezza
  const tempSync = eventosync; // Teniamo una referenza locale
  isSyncPending = false;
  eventosync = null;

  if (confirm(messaggio)) {
    // 3. Salvo e ricarico
    oraInizioDiretta = nuovaOraInizioHms;
    localStorage.setItem("oraInizioDiretta", nuovaOraInizioHms);
    
    // Opzionale: ricarica la pagina o resetta il tick per vedere i cambiamenti
    location.reload(); 
  }
}

function OLDcheckSyncTime(events) {
  const basketToast = document.getElementById('basket-toast');
  basketToast.classList.add("hidden");
  isToastRunning = false;

  if (eventosync) {
    const offsetEvento = hmsToSeconds(eventosync.timestampReale) - hmsToSeconds(orarioVisualizzatoFormattato);
    alert(`SYNC: numero secondi di differenza: ${offsetEvento}
          ${offsetEvento < 0 ? "Sposta in avanti OraInizioDiretta" : "Sposta indietro OraInizioDiretta"}`);
  }
}

function init() {

  isAdmin = localStorage.getItem("isAdmin");
	
  const urlParams = new URLSearchParams(window.location.search);
  const currentMatchId = urlParams.get("matchId");

  if (currentMatchId) {
    // Carichiamo i dati freschi dal server prima di mostrare il video
    caricaAnagraficaSingolaPartita(matchId).then(() => {
            
      inizializzaGiocatoriConvocati();
	  
      videoId = localStorage.getItem("videoId");
      matchStartTime = parseInt(localStorage.getItem("matchStartTime") || "0", 10);

      // Crea il player (questo poi chiamerà onPlayerReady in automatico)
      if (videoId && videoId !== "null" && videoId !== "") {
        // Se c'è un video, creiamo il player (che chiamerà tickTimeline al caricamento)
        creaIlPlayer(videoId);
      } else {
        // Se NON c'è un video, nascondiamo lo spinner e avviamo il tick manualmente
        const videoSpinner = document.getElementById("video-loading");
        if (videoSpinner) videoSpinner.classList.add("hidden");
        
        console.log("Nessun video trovato, avvio tickTimeline per sole statistiche.");
        avviaTickSenzaVideo();
      }
	  
      console.log("Timeline avviata per il match:", matchId);
    });
  }	
	
  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");
  // Seleziona l'elemento dello score
  const hudScoreElement = document.getElementById('hud-score');
  
  // Aggiunge l'ascoltatore per il click
  if (hudScoreElement) {
    hudScoreElement.style.pointerEvents = 'auto'; // Importante: abilita i click sull'elemento
    hudScoreElement.style.cursor = 'pointer';      // Cambia il cursore per far capire che è cliccabile
    
    hudScoreElement.addEventListener('click', () => {
      scambiaPosizioniHUD();
    }, { passive: true });
  }
  
  const hudClockElement = document.getElementById('hud-video-time');
  if (isAdmin && hudClockElement) {
    hudClockElement.style.pointerEvents = 'auto'; // Abilita i click
    hudClockElement.style.cursor = 'pointer';      // Mostra la manina al passaggio del mouse
    
    hudClockElement.addEventListener('click', () => {
      sendSyncTime();
    }, { passive: true });
  }
  
  const basketToast = document.getElementById('basket-toast');
  if (isAdmin && basketToast) {
    basketToast.addEventListener('click', () => {
	if (isSyncPending) {
      checkSyncTime();
	}
    }, { passive: true });
  }
  
  const hudLiveStatus = document.getElementById("hud-live-status");
  if (hudLiveStatus) {
	  hudLiveStatus.addEventListener('click', () => {
        const durataTotale = player.getDuration();
        player.seekTo(durataTotale - 1, true);
        player.playVideo();		  
	  }, { passive: true });
  }
}

document.addEventListener("DOMContentLoaded", init, { passive: true });

