//#region VARIABILI GLOBALI
// @ts-check
let LIVE_OFFSET = 5;
let REFRESH_TIME = 300;
let ACCEPTABLE_DELAY_FOR_TOAST = 2; // secondi di ritardo accettabili per visualizzare il toast del punto realizzato

let player;
let timelineInterval;
let punteggioA = 0;
let punteggioB = 0;
let lastScoreStr = "";
let isUserLive = true;
let orarioVisualizzato = null;
let orarioVisualizzatoFormattato = null;
let fullMatchHistory = []; // Qui salviamo tutto il liveData ricevuto
let videoId = null;
let dettagliGara = null;
let matchStartTime = 0;
let matchIsLive = false;
let isReviewMode = false;
let maxCurrentTime = 0;
let wasPaused = false;
let pauseStartTime = null;
let tickCounter = 0;
let SYNC_TIME = null;
let userIsBehindBecauseOfPause = false;
let currentHighlightIndex = -1; // -1 significa che nessun highlight è ancora selezionato
let highlightsAvailable = false; // Di default la sezione è nascosta
let isFetching = false; // Impedisce chiamate sovrapposte
let bloccoSincronizzazioneManuale = false;
let hudPositionIndex = 1; // Partiamo dal 50% (centro)
let timePositionIndex = 0; // in alto a sinistra
let userNavigatedToEnd = false;
let isFirstLoad = true; 
let isToastRunning = false; // Variabile di controllo per la durata del flash
let isSyncPending = false; // Indica se c'è un evento SYNC già visualizzato ma non ancora gestito
let adminSortMode = 'cognome'; // Valori: 'numero', 'cognome', 'punti'
let convocazioni = "";
let puntiSquadraA = 0;
let puntiSquadraB = 0;
let puntiSquadraA_NelTempo = 0;
let puntiSquadraB_NelTempo = 0;
let historyB = [];
let contatoriB = { 0: 0, 1: 0, 2: 0, 3: 0 }; // Aggiunto 0
let ultimoOrdinamento = "numero";
let score = 0;
let scoreB = 0;
let listaGiocatoriCorrente = []; // per ricaricare la lista dopo login
let matchId = null;
let teamA = "";
let teamB = "";
let squadraAvversaria = "";
let isLive = false;
let oraInizioDiretta = "";
let statoPartita = "";
let lastScoreState = "";
let lastQuartoState = "";
let quartoAttuale = ""; // Variabile globale per il quarto attuale
let googleApiKey = "";

let refreshTimer = null; // variabile globale per l'ID del timer


const hudLabel = document.getElementById("hud-label");
const urlParams = new URLSearchParams(window.location.search);

matchId = urlParams.get("matchId");

let giocatoriObj = [];
giocatoriObj = giocatoriA.map((nomeCompleto, index) => {
  const [nome, cognome] = nomeCompleto.split(" ");
  return {
    id: `${cognome}_${nome}`,
    numero: numeriMaglia[index],
    nome,
    cognome,
    displayName: `${cognome} ${nome}`,
    punti: 0,
    contatori: { 0: 0, 1: 0, 2: 0, 3: 0 }, // Aggiunto 0 qui
    history: [], // Qui verranno inseriti oggetti {punti: X, ora: "HH:mm:ss"}
    stato: "Out"
  };
});

//#endregion

function registerToFirebaseEvents() {
  if (!USE_FIREBASE) return;

  console.log("Connessione alla partita in corso...");

  // Ci mettiamo in ascolto sul percorso 'partite/matchId'
  db.ref('partite/' + matchId).on('value', (snapshot) => {
    const data = snapshot.val();

    let videoURLChanged = false;
    if (dettagliGara !== null) {
      videoURLChanged = (dettagliGara?.videoURL ?? "") !== (data?.videoURL ?? "");    
    }

    if (data) {
      dettagliGara = data;
      quartoAttuale = dettagliGara.statoPartita;

      console.log("Dati ricevuti:", data);
    } else {
      dettagliGara = null;
      console.warn("Nessun dato trovato per questa partita.");
    }

    const struct = {
      statisticheGiocatori: giocatoriObj,
      dettagliGara: dettagliGara,
      liveData: fullMatchHistory
    }

    updateDatiPartita("match", struct)

    // se è cambiato il videoURL (ad es. perchè prima era vuoto e adesso è definito), fai il reload dell'interfaccia
    if (videoURLChanged)
    {
      location.reload();
    }

  }, (error) => {
    console.error("Errore di lettura:", error);
  });

  db.ref('statistiche/' + matchId).on('value', (snapshot) => {
    const data = snapshot.val();

    if (data) {
      giocatoriObj = data;
      console.log("Dati ricevuti:", data);
    } else {
      giocatoriObj = [];
      console.warn("Nessun dato trovato per questa partita.");
    }

    const struct = {
      statisticheGiocatori: giocatoriObj,
      dettagliGara: dettagliGara,
      liveData: fullMatchHistory
    }

    updateDatiPartita("stats", struct)

  }, (error) => {
    console.error("Errore di lettura:", error);
  });

  db.ref('events/' + matchId).on('value', (snapshot) => {
    const data = snapshot.val();

    if (data) {
      fullMatchHistory = data;
      console.log("Dati ricevuti:", data);
    } else {
      fullMatchHistory = [];
      console.warn("Nessun dato trovato per questa partita.");
    }

    const struct = {
      statisticheGiocatori: giocatoriObj,
      dettagliGara: dettagliGara,
      liveData: fullMatchHistory
    }

    updateDatiPartita("events", struct)

  }, (error) => {
    console.error("Errore di lettura:", error);
  });

}

//#region GESTIONE PLAYER YOUTUBE

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

  player.mute(); // se il video non è muto, su iphone non va l'autoplay
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

function isLiveStream() {
  const data = player.getVideoData();
  return data.isLive === true;
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

//#endregion

function aggiornaPunteggio(target, valore) {
  const isNumeric = !isNaN(parseFloat(valore)) && isFinite(valore);
  const oraCorrente = new Date().toLocaleTimeString('it-IT');

  if (isNumeric) {
    const punti = parseInt(valore);
    target.punti += punti;

    // Gestione contatori (solo per i punti)
    if (target.contatori[punti] === undefined) target.contatori[punti] = 0;
    target.contatori[punti]++;

    target.history.push({ punti: punti, ora: oraCorrente, type: "punto" });
  } else if (valore === "Fallo") {
    // Calcola quanti falli ha già commesso il giocatore e aggiunge 1
    const falliAttuali = target.history.filter(ev => ev.type === "Fallo").length;
    const falliTotali = falliAttuali + 1;
    target.falliTotaliCorrenti = falliTotali;

    // Registra l'evento Fallo con il nuovo campo falliTotali
    target.history.push({ stato: valore, ora: oraCorrente, type: "Fallo", falliTotali: falliTotali });
  } else {
    // Gestione eventi In / Out
    target.history.push({ stato: valore, ora: oraCorrente, type: "InOut" });
  }
}

function AddPuntiGiocatore(id, valore) {
  const g = giocatoriObj.find(x => x.id === id);
  aggiornaPunteggio(g, valore);

  const ultimaAzione = g.history[g.history.length - 1];
  const timestampReale = ultimaAzione.ora;

  // Il valore salvato sarà il numero o la stringa specifica (In/Out/Fallo)
  const datoDaSalvare = (ultimaAzione.type === "punto") ? valore : ultimaAzione.stato;

  saveToServerEventoLive(g.numero, datoDaSalvare, timestampReale, getTeamName(), "save");

  console.log(`Evento ${ultimaAzione.type} registrato per ${g.cognome}:`, datoDaSalvare);
}

function undoPunteggio(target, eventToRemove) {
  if (!eventToRemove || target.history.length === 0) return;



  // Cerchiamo l'indice dell'evento specifico basandoci sull'oggetto passato
  // (che solitamente contiene l'ora e il tipo di evento per essere identificato)
  const index = target.history.findIndex(ev => 
    ev.ora === eventToRemove.ora && 
    ev.type === eventToRemove.type &&
    (ev.punti === eventToRemove.punti || ev.stato === eventToRemove.stato)
  );

  if (index !== -1) {
    const removedEvent = target.history.splice(index, 1)[0];

    // Se l'evento rimosso era un "punto", dobbiamo scalare il punteggio totale e il contatore
    if (removedEvent.type === "punto") {
      const punti = removedEvent.punti;
      target.punti -= punti;
      if (target.contatori[punti] > 0) {
        target.contatori[punti]--;
      }
    } else if (removedEvent.type === "Fallo") {
      target.falliTotaliCorrenti--;
    }
    
    return true; // Indica che la rimozione è avvenuta con successo
  }
  
  return false;
}

function undoPuntiGiocatore(id, evento) {
  const g = giocatoriObj.find(x => x.id === id);
  if (!g || g.history.length <= 0) return 0;

  // Se l'evento non è passato, prendiamo l'ultimo dalla history del giocatore
  const azioneDaAnnullare = (evento !== undefined) ? evento : g.history[g.history.length - 1];
  const timestampReale = azioneDaAnnullare.ora;
  
  let valorePerServer;

  // Gestione dinamica del valore in base al nuovo campo "type"
  if (azioneDaAnnullare.type === "punto") {
      // Per i punti, inviamo il valore negativo per sottrarli sul server
      valorePerServer = -azioneDaAnnullare.punti;
  } else if (azioneDaAnnullare.type === "Fallo" || azioneDaAnnullare.type === "InOut" || azioneDaAnnullare.type === "stato") {
      // Per i falli e gli stati, inviamo la stringa originale (es. "Fallo", "In", "Out")
      // Il server gestirà l'eliminazione basandosi sulla stringa e sul timestamp
      valorePerServer = azioneDaAnnullare.stato || azioneDaAnnullare.punti; 
  }

  // Chiamata alla logica locale per decrementare i contatori (inclusi i falli nel contatore [0])
  undoPunteggio(g, azioneDaAnnullare); 
  
  // Sincronizzazione con il server
  saveToServerEventoLive(g.numero, valorePerServer, timestampReale, getTeamName(), "undo");

  console.log(`Annullato evento ${azioneDaAnnullare.type} per ${g.cognome}`);

  return azioneDaAnnullare.type === "punto" ? azioneDaAnnullare.punti : 0;
}

function AddPuntiSquadraB(valore, memorizzaOrario) {
  const isNumeric = !isNaN(parseFloat(valore)) && isFinite(valore);
  const oraCorrente = memorizzaOrario ? new Date().toLocaleTimeString('it-IT') : "??";
  
  let tipoEvento = "punto";
  if (!isNumeric) {
    if (valore === "Fallo") tipoEvento = "Fallo";
    else if (valore === "In" || valore === "Out") tipoEvento = "InOut";
    else tipoEvento = "stato";
  }

  if (tipoEvento === "punto") {
    const punti = parseInt(valore);
    puntiSquadraB += punti;
    if (contatoriB[punti] !== undefined) contatoriB[punti]++;
    
    historyB.push({ punti: punti, ora: oraCorrente, type: "punto" });
    saveToServerEventoLive("", punti, oraCorrente, "Squadra B", "save");
  } else {
    // // Gestione Fallo, InOut o altri stati
    // if (tipoEvento === "Fallo") {
    //    if (contatoriB[0] !== undefined) contatoriB[0]++;
    // }
    
    historyB.push({ punti: valore, ora: oraCorrente, type: tipoEvento });
    saveToServerEventoLive("", valore, oraCorrente, "Squadra B", "save");
  }
}

function undoPuntiSquadraB(eventToRemove) {
  if (historyB.length === 0) return;

  const azioneDaAnnullare = (eventToRemove !== undefined) ? eventToRemove : historyB[historyB.length - 1];
  
  const index = historyB.findIndex(ev => 
    ev.ora === azioneDaAnnullare.ora && ev.punti === azioneDaAnnullare.punti && ev.type === azioneDaAnnullare.type
  );

  if (index !== -1) {
    const removedEntry = historyB.splice(index, 1)[0];

    if (removedEntry.type === "punto") {
      const puntiDaTogliere = parseInt(removedEntry.punti);
      puntiSquadraB -= puntiDaTogliere;
      if (contatoriB[puntiDaTogliere] !== undefined) contatoriB[puntiDaTogliere]--;
      
      saveToServerEventoLive("", -puntiDaTogliere, removedEntry.ora, "Squadra B", "undo");
    } else {
      // if (removedEntry.type === "Fallo") {
      //   if (contatoriB[0] !== undefined) contatoriB[0]--;
      // }
      // Per gli stati (Fallo, InOut), inviamo il valore originale per l'undo
      saveToServerEventoLive("", removedEntry.type, removedEntry.ora, "Squadra B", "undo");
    }
    console.log(`Rimosso evento ${removedEntry.type} Squadra B`);
  }
}

//#region GESTIONE DATABASE & HISTORY
function generaHistory(liveDataDalBackend) {
  let scoreA = 0;
  let scoreB = 0;

  // Reset strutture locali
  historyB = [];
  contatoriB = { 0: 0, 1: 0, 2: 0, 3: 0 };
  giocatoriObj.forEach(g => { 
    g.history = []; 
    g.falliTotaliCorrenti = 0; // Supporto temporaneo per il calcolo progressivo
  });
  let falliSquadraBProgressivi = 0;

  if (!liveDataDalBackend || liveDataDalBackend.length === 0) {
    fullMatchHistory = giocatoriObj.map(g => ({
      idGiocatore: g.numero,
      puntiRealizzati: 0,
      falliTotali: 0,       // Nuovo campo inizializzato a 0
      eventType: "punto",   // Default per inizializzazione
      squadra: 'Polismile A',
      timestampReale: "00:00:00",
      secondiReali: 0,
      punteggioA: 0,
      punteggioB: 0
    }));
    highlightsAvailable = false;
    return;
  }

  fullMatchHistory = liveDataDalBackend
    .filter(evento => evento.squadra !== "SYNC")
    .map(evento => {
      const valRaw = evento.puntiRealizzati;
      const isNumeric = !isNaN(parseFloat(valRaw)) && isFinite(valRaw);
      
      // NUOVA LOGICA DI DETERMINAZIONE TIPO
      let type = "InOut";
      if (isNumeric) {
        type = "punto";
      } else if (valRaw === "Fallo") {
        type = "Fallo";
      }

      const punti = isNumeric ? parseInt(valRaw) : 0;
      let falliTotaliEvento = 0;

      if (evento.squadra === 'Squadra B') {
        scoreB += punti;
        if (type === "punto") {
          historyB.push({ punti: punti, ora: evento.timestampReale, type: "punto" });
          if (contatoriB[punti] !== undefined) contatoriB[punti]++;
        } else if (type === "Fallo") {
          falliSquadraBProgressivi++;
          falliTotaliEvento = falliSquadraBProgressivi;
          historyB.push({ stato: valRaw, ora: evento.timestampReale, type: "Fallo", falliTotali: falliTotaliEvento });
        } else {
          historyB.push({ stato: valRaw, ora: evento.timestampReale, type: "InOut" });
        }
      } else {
        scoreA += punti;
        const giocatore = giocatoriObj.find(g => String(g.numero) === String(evento.idGiocatore));
        if (giocatore) {
          if (type === "punto") {
            giocatore.history.push({ punti: punti, ora: evento.timestampReale, type: "punto" });
          } else if (type === "Fallo") {
            giocatore.falliTotaliCorrenti++;
            falliTotaliEvento = giocatore.falliTotaliCorrenti;
            giocatore.history.push({ stato: valRaw, ora: evento.timestampReale, type: "Fallo", falliTotali: falliTotaliEvento });
          } else {
            giocatore.history.push({ stato: valRaw, ora: evento.timestampReale, type: "InOut" });
          }
        }
      }

      return {
        ...evento,
        eventType: type,
        puntiRealizzati: valRaw,
        falliTotali: falliTotaliEvento > 0 ? falliTotaliEvento : 0,
        secondiReali: hmsToSeconds(evento.timestampReale.replace("*", "")),
        punteggioA: scoreA,
        punteggioB: scoreB
      };
    });

  highlightsAvailable = true;
}

function modifyHistory() {
  let allEvents = [];
  let tempFalliGiocatori = {}; // Per ricalcolare i progressivi durante l'unione
  let falliB = 0;

  // 1. Raccogli eventi della Squadra A
  giocatoriObj.forEach(g => {
    if (!tempFalliGiocatori[g.numero]) tempFalliGiocatori[g.numero] = 0;
    
    if (g.history && g.history.length > 0) {
      g.history.forEach(ev => {
        let ft = 0;
        if (ev.type === "Fallo") {
          tempFalliGiocatori[g.numero]++;
          ft = tempFalliGiocatori[g.numero];
        }

        allEvents.push({
          idGiocatore: g.numero,
          puntiRealizzati: ev.type === "punto" ? ev.punti : ev.stato,
          eventType: ev.type,
          falliTotali: ft > 0 ? ft : 0,
          squadra: 'Polismile A',
          timestampReale: ev.ora,
          secondiReali: hmsToSeconds(ev.ora.replace("*", ""))
        });
      });
    }
  });

  // 2. Raccogli eventi della Squadra B
  if (typeof historyB !== 'undefined' && historyB.length > 0) {
    historyB.forEach(ev => {
      let ft = 0;
      if (ev.type === "Fallo") {
        falliB++;
        ft = falliB;
      }

      allEvents.push({
        idGiocatore: "Squadra B",
        puntiRealizzati: ev.type === "punto" ? ev.punti : ev.type,
        eventType: ev.type,
        falliTotali: ft > 0 ? ft : 0,
        squadra: 'Squadra B',
        timestampReale: ev.ora,
        secondiReali: hmsToSeconds(ev.ora.replace("*", ""))
      });
    });
  }

  // 3. Ordina per tempo
  allEvents.sort((a, b) => a.secondiReali - b.secondiReali);

  // 4. Ricalcola i punteggi progressivi
  let runningScoreA = 0;
  let runningScoreB = 0;

  fullMatchHistory = allEvents.map(evento => {
    if (evento.eventType === "punto") {
      const p = parseInt(evento.puntiRealizzati) || 0;
      if (evento.squadra === 'Squadra B') runningScoreB += p;
      else runningScoreA += p;
    }

    return {
      ...evento,
      punteggioA: runningScoreA,
      punteggioB: runningScoreB
    };
  });

  punteggioA = runningScoreA;
  punteggioB = runningScoreB;

  console.log("History rigenerata. Eventi totali:", fullMatchHistory.length);
  highlightsAvailable = fullMatchHistory.length > 0;
}

function updateDatiPartita(what, data) {

  if (what === "all" || what === "match") {
      // 1. Estrazione dati
      dettagliGara = data.dettagliGara || {}
      matchIsLive = dettagliGara.isLive;
      oraInizioDiretta = dettagliGara.oraInizioDiretta;
      const config = JSON.parse(dettagliGara.note || '{}');
      // 2. Lettura posizioni HUD (Score e Clock)
      if (config['hud-score'] !== undefined) {
          changeHUDLayout('hud-score', parseInt(config['hud-score']));
      }
      
      if (config['hud-clock'] !== undefined) {
          changeHUDLayout('hud-time', parseInt(config['hud-clock']));
      }      

      isUserLive = matchIsLive;
      // GESTIONE QUARTO/PERIODO
      quartoAttuale = dettagliGara?.statoPartita;
      localStorage.setItem("statoPartita", quartoAttuale);

      if (dettagliGara.convocazioni !== convocazioni) {
        convocazioni = dettagliGara.convocazioni;
        localStorage.setItem("convocazioni", convocazioni);
        setTimeout(() => location.reload(), 1000);
      }
  }

  if (what === "all" || what === "events") {
      generaHistory(data.liveData);

      if (isAdmin && matchIsLive) { // Solo se l'utente è admin e i bottoni esistono
        mostraControlliSquadraB();
      }

      controllaDisponibilitaHighlights();
  }

  if (what === "all" || what === "stats") {
   // 2. Aggiornamento giocatori
      const rows = data.statisticheGiocatori || [];
      rows.forEach(function (r) {
        const g = giocatoriObj.find(function (x) {
          return String(x.numero) === String(r.numero);
        });
        if (g) {
          const nuoviPunti = parseInt(r.punti, 10) || 0;
          g.punti = nuoviPunti;
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";

          try {
            // 1. Controllo: se è già un oggetto/array, lo usiamo direttamente. 
            // Altrimenti, proviamo il parse della stringa o usiamo il default.
            if (r.contatori && typeof r.contatori === 'object') {
              g.contatori = r.contatori;
            } else {
              g.contatori = JSON.parse(r.contatori || '{"0":0,"1":0,"2":0,"3":0}');
            }

            // 2. Garantiamo che la chiave "0" esista (es. per il cronometro o falli)
            if (g.contatori["0"] === undefined) {
              g.contatori["0"] = 0;
            }
            
          } catch (e) { 
            console.error("Errore nel parsing dei contatori, reset al default:", e);
            g.contatori = {"0":0,"1":0,"2":0,"3":0};
          }

          // try {
          //   g.contatori = JSON.parse(r.contatori || '{"0":0,"1":0,"2":0,"3":0}');
          //   // Se il JSON esiste ma non ha il tasto "0", lo aggiungiamo
          //   if (g.contatori["0"] === undefined) {
          //     g.contatori["0"] = 0;
          //   }
          // } catch (e) { 
          //   g.contatori = {"0":0,"1":0,"2":0,"3":0};
          // }

        } else if (r.giocatore === "Squadra B" && !matchIsLive && !isReviewMode) { // in ReviewMode il punteggio e' calcolato in base al tempo visualizzato
          punteggioB = parseInt(r.punti, 10) || 0;
        }
      });
  }

  if (matchIsLive || isReviewMode) {
    renderPlayerListLive();
    if (isAdmin || isFirstLoad) {
      modifyHistory();
      saveToFirebaseAll();
    }
  } else {
    renderPlayerList();
  }

  updateScoreboard(matchIsLive || isReviewMode);
  isFirstLoad = false;

  // IMPORTANTE: Reset del flag alla fine del successo
  isFetching = false;

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

  const params = new URLSearchParams({
    sheet: "Statistiche",
    userId: userId,
    action: "Carica Partita (" + mId + ")",
    details: JSON.stringify(getDeviceData),
    matchId: mId // Aggiungilo direttamente qui
  });

  fetch(`${url}?${params.toString()}`)
  // fetch(url + "?matchId=" + encodeURIComponent(mId))
    .then(function (response) {
      if (!response.ok) throw new Error("Errore network");
      return response.json();
    })
    .then(function (data) {

      // 2. Calcoliamo la fine e stampiamo in console
      const endTime = performance.now();
      updateDebugFooter(Math.round(endTime - startTime));
      console.log("CaricaDatiPartita() " + Math.round(endTime - startTime) + " ms");

      updateDatiPartita("all", data);

    })
    .catch(function (err) {
      document.getElementById("players-grid").innerHTML = "Errore: " + err;
      console.error("Errore nel caricamento dati partita:", err);
      // IMPORTANTE: Reset del flag anche in caso di errore
      isFetching = false;
    });
}

function caricaAnagraficaSingolaPartita(targetMatchId) {
  if (!targetMatchId) return;

  localStorage.removeItem("videoId");

  // Mostra un feedback di caricamento se necessario (opzionale)
  console.log("Caricamento dati per il match:", targetMatchId);

  const params = new URLSearchParams({
    sheet: "Partite",
    userId: userId,
    action: "Get Singola Partita",
    details: JSON.stringify(getDeviceData)
  });

  return fetch(`${url}?${params.toString()}`)
  //return fetch(url + "?sheet=Partite")
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
//#endregion

function processEventBuffer() {
  if (!orarioVisualizzatoFormattato) return;

  // Convertiamo l'orario che l'utente sta vedendo nel video in secondi
  const secondiVisualizzati = hmsToSeconds(orarioVisualizzatoFormattato);

  // Cerchiamo l'ultimo evento accaduto prima o in quel momento
  const eventoCorrente = fullMatchHistory.findLast(e => e.secondiReali <= secondiVisualizzati);

  if (!(matchIsLive || isReviewMode)) return;

  renderPlayerListLive();

  if (eventoCorrente) {
    // Aggiorna l'HUD con i dati dell'evento trovato
    punteggioA = eventoCorrente.punteggioA;
    punteggioB = eventoCorrente.punteggioB;
    updateScoreboard(matchIsLive || isReviewMode);
    if ((isUserLive || isReviewMode) && (eventoCorrente.secondiReali !== 0) && (secondiVisualizzati - eventoCorrente.secondiReali < ACCEPTABLE_DELAY_FOR_TOAST) &&
        eventoCorrente.puntiRealizzati > 0) {
      const tmpId = GetCognome(eventoCorrente.idGiocatore);
      showBasketToast(tmpId, eventoCorrente.puntiRealizzati);
    }
  }
  else {
    // se non ci sono eventi da visualizzare è perchè siamo ancora "0 - 0"
//    if (isReviewMode) {
      punteggioA = 0;  // ATTENZIONE: A CHE SERVE?
      punteggioB = 0;
      updateScoreboard(matchIsLive || isReviewMode);
//    }
  }
}

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


  // Carica i dati dal server ogni 7 tick (circa 2.1 secondi)
  if (tickCounter % 7 === 0) {
    if (!USE_FIREBASE) {
      // vecchia implementazione
      if (!isAdmin || tickCounter === 0) { // la prima volta aggiorna i dati anche per admin
          caricaDatiPartita(matchId);
      }
    }
    else {
      // in questo caso solo admin usa caricaDatiPartita, gli altri aspettano gli eventi Firebase
      if (tickCounter === 0){ // la prima volta aggiorna i dati anche per admin
//      if (isAdmin && tickCounter === 0){ // la prima volta aggiorna i dati anche per admin
          caricaDatiPartita(matchId);
      }
    }
  }
  tickCounter++;

  if (!isAdmin) {
    processEventBuffer(); // Gestisce la visualizzazione dei punti nel tempo
  }
}

function avviaTickSenzaVideo() {
  if (timelineInterval) clearInterval(timelineInterval);
  // Avviamo subito il primo tick per non aspettare 300ms
  tickTimeline();
  timelineInterval = setInterval(tickTimeline, REFRESH_TIME);
}

function initTeamNames() {
  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
  squadraAvversaria = (teamA === "Polismile A") ? teamB : teamA

  const elA = document.getElementById("label-team-A");
  const elB = document.getElementById("label-team-B");
  if (elA) elA.textContent = teamA;
  if (elB) elB.textContent = teamB;

  const opponent = document.getElementById("opponent");
  if (opponent) opponent.textContent = squadraAvversaria;
}

function gestisciHud() {
  const pop = document.getElementById('popup-hud-opts');
  if (pop) {
    // Forza lo spostamento alla fine del body per evitare che i padri lo nascondano
    document.body.appendChild(pop); 
    
    pop.classList.remove('hidden');
  }
}

function chiudiPopupHud() {
  const pop = document.getElementById('popup-hud-opts');
  if (pop) pop.classList.add('hidden');
  document.body.style.overflow = '';

  const nuovaConfig = {
        "stats": dettagliGara.note['stats'] || false,
        "highlights": dettagliGara.note['highlights'] || false,
        "hud-score": hudPositionIndex,
        "hud-clock": timePositionIndex
  };
  // 2. Trasformiamo l'oggetto in una stringa JSON
  const note = JSON.stringify(nuovaConfig);
  dettagliGara.note = note;

  if (isAdmin) {
    saveToFirebaseHistory('partite/', dettagliGara); 

    saveToServerMatchData(); // La tua funzione esistente per salvare su Google Sheets
  }

}

function changeHUDLayout(elementId, newPos) {
  /**
   * Sposta ciclicamente la posizione degli elementi HUD
   * @param {string} elementId - L'ID dell'elemento ('hud-score' o 'time-container')
   */
   vibrate(100);

  const elem = document.getElementById(elementId);
  if (!elem) return;

  // Definiamo i 6 stati possibili (gli stessi per entrambi)
  const states = [
    { top: '0px', bottom: 'auto', left: '1%',  transform: 'none' },               // 0: Alto Sinistra
    { top: '0px', bottom: 'auto', left: '50%', transform: 'translateX(-50%)' },    // 1: Alto Centro
    { top: '0px', bottom: 'auto', left: '99%', transform: 'translateX(-100%)' },   // 2: Alto Destra
    { top: 'auto', bottom: '0px', left: '99%', transform: 'translateX(-100%)' },   // 3: Basso Destra
    { top: 'auto', bottom: '0px', left: '50%', transform: 'translateX(-50%)' },    // 4: Basso Centro
    { top: 'auto', bottom: '0px', left: '1%',  transform: 'none' }                // 5: Basso Sinistra
  ];

  // Identifichiamo quale indice incrementare
  if (elementId === 'hud-score') {
    if (newPos === undefined)
      hudPositionIndex = (hudPositionIndex + 1) % states.length;
    else
      hudPositionIndex = newPos;

    // sposta il periodo alla sinistra dello score per evitare che esca fuori dallo schermo
    if (hudPositionIndex === 2 || hudPositionIndex === 3) {
      elem.classList.add('anchor-right');
    } else {
      elem.classList.remove('anchor-right');
    }

    const nextPos = states[hudPositionIndex];
    applicaStilePosizione(elem, nextPos);
    // Se lo score finisce in basso, sposta i messaggi Toast in alto
    if (typeof gestisciToast === "function") gestisciToast(nextPos.bottom !== 'auto');
    
  } else if (elementId === 'hud-time') {
    if (newPos === undefined)
      timePositionIndex = (timePositionIndex + 1) % states.length;
    else
      timePositionIndex = newPos;

    const nextPos = states[timePositionIndex];
    applicaStilePosizione(elem, nextPos);
  }
}

function applicaStilePosizione(elem, pos) {
  Object.assign(elem.style, {
    position: 'absolute',
    top: pos.top,
    bottom: pos.bottom,
    left: pos.left,
    transform: pos.transform,
    zIndex: '1000' // Assicuriamoci che stia sopra il video
  });
}

function gestisciToast(isHudAtBottom) {
  const basketToast = document.querySelector('.toast');
  if (!basketToast) return;

  if (isHudAtBottom) {
    basketToast.style.top = '10px';
    basketToast.style.bottom = 'auto';
  } else {
    basketToast.style.top = 'auto';
    basketToast.style.bottom = '10px';
  }
}

function showBasketToast(name, points) {
  const toast = document.getElementById("basket-toast");
  if (!toast) return;

  isToastRunning = true;
  toast.classList.remove("hidden");
  void toast.offsetWidth; // Reset dell'animazione nel DOM

  // Genera i palloni in base ai punti (1, 2 o 3)
  const balls = "🏀".repeat(Math.min(Math.max(points, 1), 3));

  // NUOVO ORDINE: Palloni prima del nome
  toast.textContent = `${balls} ${name}`;

  // Rimuove lo stato di blocco dopo 2 secondi
  setTimeout(() => {
    //toast.classList.remove("toast-active");
    toast.classList.add("hidden");
    isToastRunning = false;
    if (points === 0) {
      isSyncPending = false;
      SYNC_TIME = null;
      console.log("SYNC scaduto e rimosso");
    }
  }, points === 0 ? 30000 : 2000); // mostralo per più tempo se è un messaggio di SYNC (in tal caso points==0)
}

//#region GESTIONE HIGHLIGHTS
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
  
  // Recuperiamo lo span che contiene il testo dentro il bottone
  const btnText = btnToggle.querySelector('.text-label');

  // Toggle restituisce true se ha aggiunto la classe 'show', false se l'ha rimossa
  const isNowVisible = controls.classList.toggle('show');

  if (isNowVisible) {
    // --- APERTURA ---
    btnToggle.classList.replace('btn-toggle-off', 'btn-toggle-on');
    
    // RIMUOVI IL TESTO DAL BOTTONE
    if (btnText) btnText.textContent = ""; 

    if (label) {
      label.style.display = 'block';
      label.innerText = "Seleziona un'azione";
    }
    
    inizializzaHighlights();
    isReviewMode = true;
  } else {
    // --- CHIUSURA ---
    btnToggle.classList.replace('btn-toggle-on', 'btn-toggle-off');
    
    // RIPRISTINA IL TESTO NEL BOTTONE
    if (btnText) btnText.textContent = "Highlights";

    currentHighlightIndex = -1;

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

  userNavigatedToEnd = false;

  switch (azione) {
    case 'start': 
      currentHighlightIndex = (matchStartTime > 0) ? -2 : -1; 
      break;

    case 'prev':
      // Cerchiamo all'indietro il primo evento di tipo "punto"
      let prevIdx = currentHighlightIndex - 1;
      while (prevIdx >= 0) {
        if (fullMatchHistory[prevIdx].eventType === "punto") {
          break;
        }
        prevIdx--;
      }
      // Se non trova punti, decidiamo se fermarci a -1 o restare dove siamo
      // Qui lo impostiamo al punto trovato o al limite minimo (-2/-1)
      currentHighlightIndex = (prevIdx < 0) ? ((matchStartTime > 0) ? -2 : -1) : prevIdx;
      break;

    case 'next':
      // Cerchiamo in avanti il primo evento di tipo "punto"
      let nextIdx = currentHighlightIndex + 1;
      let trovatoNext = false;
      while (nextIdx < fullMatchHistory.length) {
        if (fullMatchHistory[nextIdx].eventType === "punto") {
          trovatoNext = true;
          break;
        }
        nextIdx++;
      }
      // Se trova un punto lo assegna, altrimenti va alla fine (end)
      currentHighlightIndex = trovatoNext ? nextIdx : fullMatchHistory.length;
      if (!trovatoNext) userNavigatedToEnd = true;
      break;

    case 'end':
      currentHighlightIndex = fullMatchHistory.length;
      userNavigatedToEnd = true;
      break;
  }

  bloccoSincronizzazioneManuale = true;
  aggiornaUIHighlight(true);

  setTimeout(() => {
    bloccoSincronizzazioneManuale = false;
  }, 1000);
}

function OLDgestisciHighlight(azione) {
  if (!fullMatchHistory) return;

  // Resettiamo il flag ogni volta che si preme un tasto
  userNavigatedToEnd = false;

  switch (azione) {
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
    squadra: "",
    seek: 0,
    isEventoReale: false,
    idLogico: -2
  });

  // Indice -1 (se presente)
  if (matchStartTime > 0) {
    timeline.push({
      tipo: 'PARTITA',
      testo: `INIZIO PARTITA - ${aggiungiSecondiAOrario(oraInizioDiretta, matchStartTime)}`,
      squadra: "",
      seek: matchStartTime,
      isEventoReale: false,
      idLogico: -1
    });
  }

  // Indici 0, 1, 2...
  fullMatchHistory.forEach((ev, idx) => {
    if (ev.eventType === "punto" && ev.timestampReale !== '00:00:00') {
      const contatore = `(${idx + 1}/${fullMatchHistory.length})`.padEnd(8, ' ');
      const pStr = ev.puntiRealizzati ? `+${ev.puntiRealizzati}` : "  ";
      const cStr = GetCognome(ev.idGiocatore).substring(0, 12).padEnd(12, ' ');
      const tmpSquadra = ev.idGiocatore === "" ? "Avversaria" : "";
      timeline.push({
        tipo: 'EVENTO',
        testo: `${contatore} ${pStr} ${cStr} - ${ev.timestampReale || '00:00:00'}`,
        squadra: tmpSquadra,
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
    testo: `FINE DIRETTA   - ${durataVideo > 0 ? aggiungiSecondiAOrario(oraInizioDiretta, durataVideo) : "--:--:--"}`,
    squadra: "",
    seek: durataVideo,
    isEventoReale: false,
    idLogico: fullMatchHistory.length
  });

  // --- TROVA L'INDICE REALE NELLA TIMELINE ---
  // Invece di calcolare vIndex matematicamente, cerchiamo l'oggetto che ha l'idLogico corrispondente
  const vIndex = timeline.findIndex(t => t.idLogico === currentHighlightIndex);

  if (vIndex === -1) return;


  const getRigaHTML = (index, isCorrente) => {
    if (index < 0 || index >= timeline.length) return "";
    const item = timeline[index];
    const classeSquadra = item.squadra === 'Avversaria' ? 'highlight-squadra-b' : 'highlight-squadra-a';
    const classeCorrente = isCorrente ? 'highlight-current' : '';
    const indicatore = isCorrente ? "===> " : "     "; // 5 spazi per pareggiare "===> "

    // Sostituiamo gli spazi con &nbsp; per l'HTML così l'allineamento rimane fisso
    const testoFormattato = item.testo.replace(/ /g, '&nbsp;');
    return `<div class="${classeSquadra} ${classeCorrente}">${indicatore}${testoFormattato}</div>`;
  };


  // Aggiornamento della label
  label.innerHTML = [
      getRigaHTML(vIndex - 1, false),
      getRigaHTML(vIndex, true),
      getRigaHTML(vIndex + 1, false)
  ].filter(html => html !== "").join("");

  if (eseguiSeek) {
    const attuale = timeline[vIndex];
    if (attuale) {
      if (attuale.isEventoReale) {  // ATTENZIONE: errore da correggere
        eseguiSeekHighlight(attuale.seek);
      } else {
        player.seekTo(attuale.seek, true);
      }
    }
  }
}

function eseguiSeekHighlight(evento) {
  if (evento) {
    const input = document.getElementById('highlight-duration');
    const SHIFT_VIDEO_TIME = input ? parseInt(input.value) : 10;
    
    const secondiInizioVideo = hmsToSeconds(oraInizioDiretta);
    const secondiEvento = hmsToSeconds(evento.timestampReale);
    
    // Calcolo della differenza grezza
    let diffSecondi = secondiEvento - secondiInizioVideo;

    // --- GESTIONE MEZZANOTTE ---
    // Se la differenza è negativa, l'evento è dopo la mezzanotte
    if (diffSecondi < 0) {
      diffSecondi += 86400; // Aggiunge i secondi di 24 ore
    }
    
    // Applichiamo l'offset (SHIFT_VIDEO_TIME) solo dopo aver corretto la mezzanotte
    const seekTime = diffSecondi - SHIFT_VIDEO_TIME;

    // Eseguiamo il seek solo se il tempo calcolato è valido (positivo)
    if (seekTime >= 0) {
      player.seekTo(seekTime, true);
    } else {
      // Se l'offset ci manda sotto zero, andiamo all'inizio del video (0)
      player.seekTo(0, true);
    }
  }
  player.playVideo();
}
//#endregion

function aggiornaFalliSquadra() {
  // 1. Recuperiamo il tempo corrente del video in secondi
  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);

  // 2. Recuperiamo gli orari di inizio dei quarti dalle note
  let config;
  try {
    config = typeof dettagliGara.note === 'string' ? JSON.parse(dettagliGara.note) : dettagliGara.note;
  } catch (e) {
    console.error("Errore nel parsing delle note:", e);
    return;
  }

  // 3. Determiniamo l'inizio del quarto attuale (es: Q1, Q2...)
  const inizioQuartoStr = quartoAttuale !== "Terminata" ? config[quartoAttuale] : "00:00:00";
  if (!inizioQuartoStr) {
    console.warn(`Orario di inizio per Q${quartoAttuale} non trovato.`);
    // Se non c'è l'orario, potresti voler azzerare i contatori o uscire
    return;
  }
  
  const secondiInizioQuarto = hmsToSeconds(inizioQuartoStr);

  // 4. Filtriamo la fullMatchHistory
  const eventiFinoAdOra = fullMatchHistory.filter(evento => {
    // Il fallo deve essere:
    // - Un evento di tipo "Fallo"
    // - Avvenuto dopo l'inizio del quarto attuale
    // - Avvenuto prima o uguale al secondo corrente del video
    return (
      evento.eventType === "Fallo" && 
      evento.secondiReali >= secondiInizioQuarto && 
      (evento.secondiReali <= secondiCorrentiVideo || isAdmin) // se isAdmin deve mostrare il fallo indipendentemente da dove è arrivato il video youtube
    );
  });

  // 5. Calcolo Falli Squadra A e B
  const totalFoulsA = eventiFinoAdOra.filter(ev => ev.squadra === 'Polismile A').length;
  const totalFoulsB = eventiFinoAdOra.filter(ev => ev.squadra === 'Squadra B').length;

  // 6. Aggiornamento DOM
  const elA = document.getElementById("team-fouls-A");
  const elB = document.getElementById("team-fouls-B");
  
  if (teamA === "Polismile A") {
    if (elA) elA.textContent = totalFoulsA;
    if (elB) elB.textContent = totalFoulsB;
  } else {
    if (elA) elA.textContent = totalFoulsB;
    if (elB) elB.textContent = totalFoulsA;
  }
}

function OLD2aggiornaFalliSquadra() {
  // 1. Recuperiamo il tempo corrente del video in secondi
  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);

  // 2. Filtriamo la fullMatchHistory
  const eventiFinoAdOra = fullMatchHistory.filter(evento => {
    // Verifichiamo che sia un fallo e nel tempo corretto
    if (evento.eventType !== "Fallo" || evento.secondiReali > secondiCorrentiVideo) {
      return false;
    }

    // Parifichiamo le note per estrarre il quarto
    try {
      // Nota: assicurati che gli eventi abbiano il campo note popolato
      const noteData = evento.note ? JSON.parse(evento.note) : {};
      
      // Filtriamo solo se il quarto corrisponde a quello attuale
      return noteData.quarto === quartoAttuale;
    } catch (e) {
      console.error("Errore nel parsing delle note:", e);
      return false;
    }
  });


  // 3. Calcolo Falli Squadra A
  // Contiamo quanti di questi eventi appartengono alla Squadra A
  const totalFoulsA = eventiFinoAdOra.filter(ev => ev.squadra === 'Polismile A').length;

  // 4. Calcolo Falli Squadra B
  // Contiamo quanti di questi eventi appartengono alla Squadra B
  const totalFoulsB = eventiFinoAdOra.filter(ev => ev.squadra === 'Squadra B').length;

  // 5. Aggiornamento DOM
  const elA = document.getElementById("team-fouls-A");
  const elB = document.getElementById("team-fouls-B");
  
  if (teamA === "Polismile A") {
    if (elA) elA.textContent = totalFoulsA;
    if (elB) elB.textContent = totalFoulsB;
  }
  else {
    if (elA) elA.textContent = totalFoulsB;
    if (elB) elB.textContent = totalFoulsA;
  }
}

function OLDORIGINALEaggiornaFalliSquadra() {
  // 1. Recuperiamo il tempo corrente del video in secondi
  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);

  // 2. Filtriamo la fullMatchHistory per prendere solo i falli 
  // avvenuti fino al secondo corrente (escludendo i SYNC)
  const eventiFinoAdOra = fullMatchHistory.filter(evento => 
    evento.eventType === "Fallo" && 
    evento.secondiReali <= secondiCorrentiVideo
  );

  // 3. Calcolo Falli Squadra A
  // Contiamo quanti di questi eventi appartengono alla Squadra A
  const totalFoulsA = eventiFinoAdOra.filter(ev => ev.squadra === 'Polismile A').length;

  // 4. Calcolo Falli Squadra B
  // Contiamo quanti di questi eventi appartengono alla Squadra B
  const totalFoulsB = eventiFinoAdOra.filter(ev => ev.squadra === 'Squadra B').length;

  // 5. Aggiornamento DOM
  const elA = document.getElementById("team-fouls-A");
  const elB = document.getElementById("team-fouls-B");
  
  if (teamA === "Polismile A") {
    if (elA) elA.textContent = totalFoulsA;
    if (elB) elB.textContent = totalFoulsB;
  }
  else {
    if (elA) elA.textContent = totalFoulsB;
    if (elB) elB.textContent = totalFoulsA;
  }
}

function updateScoreboard(matchIsLive) {
  // Chiama questa funzione dentro generaHistory() o dopo ogni aggiornamento del punteggio
  const scoreEl = document.getElementById("game-score");
  const scoreTextHUD = document.getElementById("score-text");
  const detailsAEl = document.getElementById("team-details-A");
  const detailsBEl = document.getElementById("team-details-B");

    // --- Calcolo Dettagli Squadra A ---
  let totalA = { 0: 0, 1: 0, 2: 0, 3: 0 };
  giocatoriObj.forEach(g => {
    totalA[0] += (g.contatori[0] || 0);
    totalA[1] += (g.contatori[1] || 0);
    totalA[2] += (g.contatori[2] || 0);
    totalA[3] += (g.contatori[3] || 0);
  });
  
  let statsTLavailable = totalA[0] !== 0;
  const tentativiA = totalA[0] + totalA[1];
  let strA = "";
  let strB = "";
  if (statsTLavailable) {
    strA = `[TL:${totalA[1]}/${tentativiA}, T2:${totalA[2]}, T3:${totalA[3]}]`;
  }
  else {
    strA = `[TL:${totalA[1]}, T2:${totalA[2]}, T3:${totalA[3]}]`;
  }

  // --- Calcolo Dettagli Squadra B ---
  // Assumendo che contatoriB sia aggiornato globalmente (presente in generaHistory)
  statsTLavailable = contatoriB[0] !== 0;
  const tentativiB = (contatoriB[0] || 0) + (contatoriB[1] || 0);
  if (statsTLavailable) {
    strB = `[TL:${contatoriB[1] || 0}/${tentativiB}, T2:${contatoriB[2] || 0}, T3:${contatoriB[3] || 0}]`;
  }
  else {
    strB = `[TL:${contatoriB[1] || 0}, T2:${contatoriB[2] || 0}, T3:${contatoriB[3] || 0}]`;
  }

  if (teamA !== "Polismile A") {
    let temp = strB;
    strB = strA;
    strA = temp;
  }

  if (detailsAEl) detailsAEl.textContent = strA;
  if (detailsBEl) detailsBEl.textContent = strB;
  
  
  if (!scoreEl) return;

  let currentScore = "";
  if (!matchIsLive) {
    punteggioA = localStorage.getItem("puntiSquadraA") || 0; // ATTENZIONE: correggere
    punteggioB = localStorage.getItem("puntiSquadraB") || 0;
    currentScore = `${punteggioA} - ${punteggioB}`;
    
    puntiSquadraA = punteggioA;
    puntiSquadraB = punteggioB;
    dettagliGara.punteggioA = punteggioA;
    dettagliGara.punteggioB = punteggioB;
  } else { // ATTENZIONE: ???
    if (teamA === "Polismile A") {
      currentScore = `${puntiSquadraA_NelTempo} - ${puntiSquadraB_NelTempo}`;
      dettagliGara.punteggioA = punteggioA;
      dettagliGara.punteggioB = punteggioB;
    }
    else {
//      currentScore = `${punteggioB} - ${punteggioA}`;
      currentScore = `${puntiSquadraB_NelTempo} - ${puntiSquadraA_NelTempo}`;
      dettagliGara.punteggioA = punteggioB;
      dettagliGara.punteggioB = punteggioA;

    }
  }

  // --- LOGICA ANIMAZIONE QUANDO IL PUNTEGGIO CAMBIA ---
  if (currentScore !== lastScoreStr) {
    vibrate(100);

    // Aggiorna l'HUD in alto nel video
    if (scoreTextHUD) scoreTextHUD.textContent = currentScore;

    scoreEl.textContent = currentScore;
    
    // Rimuoviamo le classi per resettare l'animazione
    scoreEl.classList.remove("pulse-animation");
    
    // Forza il reflow
    void scoreEl.offsetWidth;
    
    // Aggiungiamo la nuova animazione pulse
    scoreEl.classList.add("pulse-animation");
    
    lastScoreStr = currentScore;

  }

  // Aggiorna anche il periodo
  const hudPeriodEl = document.getElementById("hud-period");
  const gamePeriodEl = document.getElementById("game-period");

  [hudPeriodEl, gamePeriodEl].forEach(function (el) {
    if (el && quartoAttuale) {
      el.textContent = quartoAttuale;
      el.classList.remove("hidden");
      if (quartoAttuale.toLowerCase().includes("terminata")) {
        el.style.backgroundColor = "#666";
        el.style.borderColor = "#999";
      } else {
        el.style.backgroundColor = "#ff0000";
        el.style.borderColor = "#ff4d4d";
      }
    }
  });

  aggiornaFalliSquadra();
}

function renderPlayerList() {
  const container = document.getElementById("players-grid");
  if (!container) return;

  // ORDINAMENTO: 1. Stato (In > Out), 2. Punteggio (Decrescente)
  const sorted = [...giocatoriObj].sort((a, b) => {
    if (a.stato === 'In' && b.stato !== 'In') return -1;
    if (a.stato !== 'In' && b.stato === 'In') return 1;
    return b.punti - a.punti;
  });

  container.innerHTML = sorted.map(g => {
    const c = g.contatori;
    /// CALCOLO FRAZIONE TIRI LIBERI (es. 4/5)
    // I tentativi totali sono la somma di quelli segnati (n1) e quelli sbagliati (n0)
    // per le vecchie partite non erano segnati i tiri liberi sbagliati
    const tentativiTL = c[0] + c[1];
    const frazioneTL = c[0] === 0 ? `${c[1]}` : `${c[1]}/${tentativiTL}`;

    const stats = `[TL:${frazioneTL}, T2:${c[2]}, T3:${c[3]}]`;

    // Verifica se attivare il flash (punteggio aumentato)
    const hasChanged = g.punti !== g.lastPunteggio;
    const flashClass = hasChanged ? 'flash-update' : '';

    // return `
    //   <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}" data-player-num="${g.numero}">
    //     <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
    //       <div>
    //         <span class="player-num">#${g.numero}</span>
    //         <span class="player-name">${g.displayName}</span>
    //       </div>
    //       <div class="player-stats" style="display: flex; align-items: center; gap: 10px;">
    //         <span class="stats-text">${stats}</span>
            
    //         <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 10px; text-align: center;">
    //           ${g.falliTotaliCorrenti > 0 ? g.falliTotaliCorrenti : ''}
    //         </span>

    //         <span class="player-points">${g.punti}</span>
    //       </div>
    //     </div>
    //   </div>
    // `;
    return `
      <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}" data-player-num="${g.numero}">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div>
            <span class="player-num">#${g.numero}</span>
            <span class="player-name">${g.cognome}</span>
          </div>
          <div class="player-stats" style="display: flex; align-items: center; gap: 10px;">
            <span class="stats-text">${stats}</span>
            
            <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 10px; text-align: center;">
              ${g.falliTotaliCorrenti > 0 ? g.falliTotaliCorrenti : ''}
            </span>

            <span class="player-points">${g.punti}</span>
          </div>
        </div>
      </div>
    `;

  }).join('');
}

function syncGiocatoreUI(g) {
  if (!g || !g.numero) return;

  // 1. Trova il contenitore del giocatore nella griglia usando il numero di maglia
  const allPlayers = document.querySelectorAll('.player-item');
  let playerRow = null;
  
  allPlayers.forEach(item => {
    const numSpan = item.querySelector('.player-num');
    if (numSpan && numSpan.textContent === `#${g.numero}`) {
      playerRow = item;
    }
  });

  if (!playerRow) return;

  // 2. Aggiorna lo span del punteggio totale
  const scoreSpan = playerRow.querySelector('.player-points');
  if (scoreSpan) {
    // Se il punteggio è effettivamente cambiato, avvia l'animazione sulla riga
    if (parseInt(scoreSpan.textContent) !== g.punti) {
      scoreSpan.textContent = g.punti;

      // ANIMAZIONE SULLA RIGA
      playerRow.classList.remove("row-highlight-flash");
      void playerRow.offsetWidth; // Trigger reflow per riavviare l'animazione CSS
      playerRow.classList.add("row-highlight-flash");
    }
  }
}

function ShowPlayerPopup(giocatore) {
  const existingOverlay = document.querySelector('.player-popup-overlay');
  if (existingOverlay) existingOverlay.remove();
  document.body.style.overflow = 'hidden';

  const isSquadraB = (giocatore === undefined || giocatore === null);
  
  const info = {
    titolo: isSquadraB ? squadraAvversaria : `#${giocatore.numero} - ${giocatore.displayName}`,
    contatori: isSquadraB ? contatoriB : giocatore.contatori,
    history: isSquadraB ? historyB : giocatore.history,
    objOriginale: giocatore 
  };

  const overlay = document.createElement('div');
  overlay.className = 'player-popup-overlay';
  
  const applyFeedback = (el) => {
    el.classList.add('btn-feedback-active');
    if (typeof vibrate === 'function') vibrate(100);
    setTimeout(() => el.classList.remove('btn-feedback-active'), 150);
  };

  const closePopup = () => {
    document.body.style.overflow = '';
    overlay.remove();
    renderPlayerListLive(); 
  };

  overlay.onclick = (e) => { if(e.target === overlay) closePopup(); };

  const content = document.createElement('div');
  content.className = 'player-popup-content dark-theme';

  // --- AGGIORNAMENTO UI POPUP ---
  const refreshPopupUI = () => {
    // Calcolo basato sui contatori (1, 2, 3 punti)
    const nuovoTotale = (info.contatori[1] * 1) + (info.contatori[2] * 2) + (info.contatori[3] * 3);
    totalDisplay.innerHTML = `Totale Punti: <strong>${nuovoTotale}</strong>`;
    
    const labels = content.querySelectorAll('.stat-value strong');
    if (labels.length >= 4) {
        labels[0].innerText = info.contatori[0] || 0;
        labels[1].innerText = info.contatori[1] || 0;
        labels[2].innerText = info.contatori[2] || 0;
        labels[3].innerText = info.contatori[3] || 0;
    }

    // Conteggio Falli basato sul campo "type"
    const numFalli = info.history.filter(ev => ev.type === "Fallo").length;
    
    const foulDisplay = content.querySelector('.foul-count-badge');
    if (foulDisplay) {
      foulDisplay.innerText = numFalli;
      // Alert visivo: rosso se 5 falli
      foulDisplay.style.backgroundColor = numFalli >= 5 ? "#ff0000" : "#444";
    }

    updateEventList();
  };

  const title = document.createElement('h2');
  title.innerText = info.titolo;
  content.appendChild(title);

  const totalDisplay = document.createElement('div');
  totalDisplay.className = 'player-total-points';
  content.appendChild(totalDisplay);

  const gridContainer = document.createElement('div');
  gridContainer.className = 'player-stats-grid';

  // Configurazione coerente con i bottoni +0, +1, +2, +3
  const statsConfig = [
    { label: 'TL Sbagliati', val: info.contatori[0], pts: 0, extraClass: 'btn-tl-miss' },
    { label: 'TL Segnati',   val: info.contatori[1], pts: 1 },
    { label: '2pt Realizzati', val: info.contatori[2], pts: 2 },
    { label: '3pt Realizzati', val: info.contatori[3], pts: 3 }
  ];

  const groupTL = document.createElement('div');
  groupTL.className = 'group-tl-inline';
  gridContainer.appendChild(groupTL);

  statsConfig.forEach((item, index) => {
    const col = document.createElement('div');
    col.className = 'grid-column';
    col.innerHTML = `<div class="stat-value"><span>${item.label}</span><strong>${item.val || 0}</strong></div>`;
    
    const btn = document.createElement('button');
    btn.className = 'btn-pts-action' + (item.extraClass ? ' ' + item.extraClass : '');
    btn.innerText = `+${item.pts}`;
    
    btn.onclick = () => {
      applyFeedback(btn);
      if (isSquadraB) {
        gestisciPuntiAvversari(item.pts);
      } else {
        AddPuntiGiocatore(info.objOriginale.id, item.pts);
//        syncGiocatoreUI(info.objOriginale);
      }
      modifyHistory();
      refreshPopupUI(); 
      updateScoreboard(matchIsLive || isReviewMode); 
      saveToFirebaseAll();
    };
    col.appendChild(btn);

    if (index < 2) groupTL.appendChild(col);
    else gridContainer.appendChild(col);
  });
  content.appendChild(gridContainer);

  // --- SEZIONE FALLI UNIVERSALE (Ora anche per Squadra B) ---
  const foulRow = document.createElement('div');
  foulRow.style.display = 'flex';
  foulRow.style.alignItems = 'center';
  foulRow.style.gap = '15px';
  foulRow.style.marginTop = '15px';
  foulRow.style.padding = '10px';
  foulRow.style.backgroundColor = 'rgba(255,255,255,0.05)';
  foulRow.style.borderRadius = '8px';

  const falloBtn = document.createElement('button');
  falloBtn.className = 'btn-pts-action btn-fallo-action';
  falloBtn.style.flex = "1";
  falloBtn.style.margin = "0";
  falloBtn.style.height = "40px";
  falloBtn.style.fontSize = "14px";
  falloBtn.style.backgroundColor = "#dc3545";
  falloBtn.innerText = "FALLO";
  falloBtn.onclick = () => {
      applyFeedback(falloBtn);
      if (isSquadraB) {
          gestisciPuntiAvversari("Fallo");
      } else {
          AddPuntiGiocatore(info.objOriginale.id, "Fallo");
//          syncGiocatoreUI(info.objOriginale);
      }
      modifyHistory();
      refreshPopupUI();
      saveToFirebaseAll();
  };

  const foulLabel = document.createElement('div');
  foulLabel.style.textAlign = 'center';
  foulLabel.innerHTML = `<span style="display:block; font-size:10px; color:#aaa; text-transform:uppercase;">Tot Falli</span>
                         <span class="foul-count-badge" style="display:inline-block; min-width:30px; padding:4px 8px; background:#444; color:#fff; border-radius:4px; font-weight:bold; font-size:18px;">0</span>`;

  foulRow.appendChild(falloBtn);
  foulRow.appendChild(foulLabel);
  content.appendChild(foulRow);

  // --- LISTA EVENTI (Migliorata per distinguere Punto vs Fallo) ---
  let eventoSelezionato = null;
  const historyRow = document.createElement('div');
  historyRow.className = 'history-row-container';
  const list = document.createElement('div');
  list.className = 'events-scroll-list';
  
  const updateEventList = () => {
    list.innerHTML = '';
    [...info.history].reverse().forEach(ev => {
      const row = document.createElement('div');
      row.className = 'event-list-item';
      
      let labelEvento = "";
      let colorEvento = "#fff";

      if (ev.type === "Fallo") {
        labelEvento = `FALLO`;
//        labelEvento = `FALLO (${ev.falliTotali || ''})`;
        colorEvento = "#ffc107";
      } else if (ev.type === "punto") {
        labelEvento = `${ev.punti} pt`;
        colorEvento = ev.punti === 3 ? "#00d1b2" : "#fff";
      } else {
        labelEvento = ev.stato || "Evento";
      }

      row.innerHTML = `<span>${ev.ora}</span><strong style="color:${colorEvento}">${labelEvento}</strong>`;
      
      row.onclick = () => {
        content.querySelectorAll('.event-list-item').forEach(el => el.classList.remove('selected'));
        row.classList.add('selected');
        eventoSelezionato = ev;
      };
      list.appendChild(row);
    });
  };
  
  historyRow.appendChild(list);

  const undoBtn = document.createElement('button');
  undoBtn.className = 'btn-undo-popup';
  undoBtn.innerHTML = '<i class="fas fa-undo"></i><br>Undo';
  undoBtn.onclick = () => {
    if (!eventoSelezionato) return;
    applyFeedback(undoBtn);
    
    if (isSquadraB) {
        gestisciPuntiAvversari('undo', eventoSelezionato);
    } else {
        const puntiRimossi = undoPuntiGiocatore(info.objOriginale.id, eventoSelezionato);
        if (eventoSelezionato.type === "punto") {
            giocatore.punti -= puntiRimossi;
        }
    }
    if (!isSquadraB) syncGiocatoreUI(info.objOriginale);
    modifyHistory();
    refreshPopupUI();
    updateScoreboard(matchIsLive || isReviewMode);
    eventoSelezionato = null;
    saveToFirebaseAll();
  };
  
  historyRow.appendChild(undoBtn);
  content.appendChild(historyRow);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-close-popup';
  closeBtn.innerText = 'Chiudi';
  closeBtn.onclick = () => { 
    closePopup();
    updateScoreboard(matchIsLive || isReviewMode);
};
  content.appendChild(closeBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  refreshPopupUI();
}

function setSortMode(mode) {
    // Funzione per cambiare la modalità e rinfrescare la lista
    adminSortMode = mode;
    
    // Chiude il menu dopo la scelta
    const menu = document.getElementById("menu");
    if (menu) menu.classList.add("hidden");
    
    // Riesegue il rendering della lista per applicare l'ordinamento
    if (matchIsLive || isReviewMode) {
        renderPlayerListLive();
    } else {
        renderPlayerList();
    }
}

function setStato(id, stato) {
  const g = giocatoriObj.find(x => x.id === id);
  if (!g) return;
  g.stato = stato;

  AddPuntiGiocatore(id, stato);

  // salva nello sheet Statistiche. IN futuro si potrà togliere se usiamo solo lo sheet Live contenenti gli eventi
  saveToServerPlayer(g);
}

function renderPlayerListLive() {
  const container = document.getElementById("players-grid");
  if (!container) return;

  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);
  
  // 1. Rileviamo lo stato attuale del match
  const isTerminata = typeof quartoAttuale !== 'undefined' && quartoAttuale.toLowerCase().includes("terminata");
  
  // --- GESTIONE SEZIONE AVVERSARI (SQUADRA B) ---
  const opponentSection = document.getElementById('opponent-score-section');
  if (opponentSection) {
    if (isAdmin && !isTerminata) {
      opponentSection.classList.add("section-ready");
    } else {
      opponentSection.classList.remove("section-ready");
    }
  }

  // 2. Mappatura e calcolo statistiche
  const visualizzazioneGiocatori = giocatoriObj.map(g => {
    const eventiGiocatore = fullMatchHistory.filter(evento =>
      String(evento.idGiocatore) === String(g.numero) &&
      (isAdmin === true || evento.secondiReali <= secondiCorrentiVideo)
    );

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0, puntiTotali = 0, nFalli = 0;
    // Calcolo dello stato nel tempo in base agli eventi InOut
    let statoNelTempo = g.stato; 
    
    eventiGiocatore.forEach(e => {
      if (e.timestampReale !== "00:00:00") {
        if (e.eventType === "punto") {
          const p = parseInt(e.puntiRealizzati) || 0;
          if (p === 0) n0++;
          else if (p === 1) n1++;
          else if (p === 2) n2++;
          else if (p === 3) n3++;
          puntiTotali += p;
        }
        else if (e.eventType === "Fallo") {
          nFalli++;
        }
        else if (e.eventType === "InOut") {
          // L'ultimo evento InOut determina lo stato al secondo corrente
          statoNelTempo = e.puntiRealizzati; // "In" o "Out"
        }
      }
    });

    const tentativiTL = n0 + n1;

    return {
      ...g,
      // Se admin, usa lo stato reale del DB, altrimenti quello calcolato dagli eventi video
      statoEffettivo: isAdmin ? g.stato : statoNelTempo,
      puntiNelTempo: puntiTotali,
      falliNelTempo: nFalli,
      statsNelTempo: `[TL:${n1}/${tentativiTL}, T2:${n2}, T3:${n3}]`,
      count0: n0, count1: n1, count2: n2, count3: n3
    };
  });

  // --- CALCOLO PUNTEGGI TOTALI ---
  puntiSquadraA_NelTempo = visualizzazioneGiocatori.reduce((acc, g) => acc + g.puntiNelTempo, 0);

  const eventiSquadraB = fullMatchHistory.filter(evento => {
    const isSquadraB = (evento.idGiocatore === "Squadra B" || evento.idGiocatore === "" || evento.idGiocatore === null);
    const timeMatch = (isAdmin === true || evento.secondiReali <= secondiCorrentiVideo);
    return isSquadraB && timeMatch;
  });

  puntiSquadraB_NelTempo = eventiSquadraB.reduce((acc, e) => acc + (parseInt(e.puntiRealizzati) || 0), 0);

  
  const conteggioIn = visualizzazioneGiocatori.filter(g => g.statoEffettivo === 'In').length;
  const coloreAllerta = (isAdmin && conteggioIn !== 5) ? "#FF0000" : "#6CFF6C";

  visualizzazioneGiocatori.sort((a, b) => {
    if (a.statoEffettivo === 'In' && b.statoEffettivo !== 'In') return -1;
    if (a.statoEffettivo !== 'In' && b.statoEffettivo === 'In') return 1;
    if (isAdmin && typeof adminSortMode !== 'undefined') {
      if (adminSortMode === 'numero') return parseInt(a.numero) - parseInt(b.numero);
      if (adminSortMode === 'cognome') return a.displayName.localeCompare(b.displayName);
      return b.puntiNelTempo - a.puntiNelTempo;
    }
    return b.puntiNelTempo - a.puntiNelTempo;
  });

  // 4. Rendering Chirurgico
  visualizzazioneGiocatori.forEach((g, index) => {
    let playerDiv = container.querySelector(`[data-player-num="${g.numero}"]`);
    
    const statoPrecedente = playerDiv ? playerDiv.getAttribute("data-stato") : null;
    const terminalitaPrecedente = playerDiv ? playerDiv.getAttribute("data-was-terminated") : null;
    
    const isNew = !playerDiv;
    const statoCambiato = statoPrecedente !== g.statoEffettivo;
    const matchStatusCambiato = terminalitaPrecedente !== String(isTerminata);

    if (isNew || statoCambiato || matchStatusCambiato) {
      if (!playerDiv) {
        playerDiv = document.createElement("div");
        playerDiv.setAttribute("data-player-num", g.numero);
      }
      playerDiv.setAttribute("data-stato", g.statoEffettivo);
      playerDiv.setAttribute("data-was-terminated", String(isTerminata));
      
      if (isAdmin && !isTerminata) {
        // playerDiv.innerHTML = `
        //   <div class="player-row-wrapper no-select" style="display: flex; justify-content: space-between; align-items: center; width: 100%; white-space: nowrap; gap: 8px;">
        //     <div class="player-main-info" style="display: flex; align-items: center; gap: 2px; flex-grow: 1; overflow: hidden; cursor: pointer;">
        //       <span class="player-num" style="flex-shrink: 0; min-width: 28px;">#${g.numero}</span>
        //       <span class="player-name" style="overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${g.displayName}</span>
        //     </div>
        //     <div class="player-stats-actions" style="display: flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: 12px;">
        //       <div class="admin-controls" style="display: flex; gap: 3px;"></div>
              
        //       <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 20px; text-align: center; font-size: 1.4rem;">
        //         ${g.falliTotaliCorrenti || ''}
        //       </span>

        //       <span class="player-points player-points-value">0</span>
        //     </div>
        //   </div>`;

        playerDiv.innerHTML = `
          <div class="player-row-wrapper no-select" style="display: flex; justify-content: space-between; align-items: center; width: 100%; white-space: nowrap; gap: 8px;">
            <div class="player-main-info" style="display: flex; align-items: center; gap: 2px; flex-grow: 1; overflow: hidden; cursor: pointer;">
              <span class="player-num" style="flex-shrink: 0; min-width: 28px;">#${g.numero}</span>
              <span class="player-name" style="overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${g.cognome}</span>
            </div>
            <div class="player-stats-actions" style="display: flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: 12px;">
              <div class="admin-controls" style="display: flex; gap: 3px;"></div>
              
              <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 20px; text-align: center; font-size: 1.4rem;">
                ${g.falliTotaliCorrenti || ''}
              </span>

              <span class="player-points player-points-value">0</span>
            </div>
          </div>`;


        playerDiv.querySelector(".player-main-info").onclick = () => {
          vibrate(100);
          const nuovoStato = (g.statoEffettivo === "In") ? "Out" : "In";
          const p = giocatoriObj.find(item => item.id === g.id);
          if(p) p.stato = nuovoStato;
          setStato(g.id, nuovoStato);
          modifyHistory();

          // salva il cambio di stato In/Out sul DB degli eventi live
          //const oraCorrente = new Date().toLocaleTimeString('it-IT');
          //saveToServerEventoLive(g.numero, nuovoStato, oraCorrente, getTeamName(), "save");

          renderPlayerListLive();
          saveToFirebaseAll();
        };

        if (g.statoEffettivo === "In") {
          const controls = playerDiv.querySelector(".admin-controls");
          
          const btnDetails = document.createElement("button");
          btnDetails.className = "player-tiro";
          btnDetails.style.backgroundColor = "#007bff";
          btnDetails.textContent = "Details";
          btnDetails.style.marginRight = "1rem";
          btnDetails.onclick = (e) => { e.stopPropagation(); vibrate(100); ShowPlayerPopup(g); };
          controls.appendChild(btnDetails);

          const btnPlus2 = document.createElement("button");
          btnPlus2.className = "player-tiro";
          btnPlus2.textContent = "+2";
          btnPlus2.onclick = (e) => {
            e.stopPropagation();
            vibrate(100);
            punteggioA = giocatoriObj.reduce((sum, g) => sum + g.punti, 0) + 2;
            AddPuntiGiocatore(g.id, 2);
            g.punti += 2;
            modifyHistory();
            renderPlayerListLive();
            updateScoreboard(true);
            saveToFirebaseAll();
          };
          controls.appendChild(btnPlus2);
        }
      } else {
        // playerDiv.innerHTML = `
        //   <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        //     <div>
        //       <span class="player-num">#${g.numero}</span>
        //       <span class="player-name">${g.displayName}</span>
        //     </div>
        //     <div class="player-stats">
        //       <span class="stats-text"></span> 
        //       <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 20px; text-align: center; font-size: 1.4rem;">
        //         ${g.falliNelTempo || ''}
        //       </span>
        //       <span class="player-points">0</span>
        //     </div>
        //   </div>`;
        playerDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <span class="player-num">#${g.numero}</span>
              <span class="player-name">${g.cognome}</span>
            </div>
            <div class="player-stats">
              <span class="stats-text"></span> 
              <span class="player-fouls-display" style="color: #ff4444; font-weight: bold; min-width: 20px; text-align: center; font-size: 1.4rem;">
                ${g.falliNelTempo || ''}
              </span>
              <span class="player-points">0</span>
            </div>
          </div>`;

      }
    }


    playerDiv.className = `player-item ${g.statoEffettivo === 'In' ? 'is-in' : 'is-out'}`;
    
    const numSpan = playerDiv.querySelector(".player-num");

    if (g.statoEffettivo === 'In') {
        playerDiv.style.borderLeft = `4px solid ${coloreAllerta}`;
        if (numSpan) numSpan.style.color = (isAdmin) ? coloreAllerta : ""; 
    } else {
        playerDiv.style.borderLeft = ""; 
        if (numSpan) numSpan.style.color = ""; 
    }

    // 1. Gestione Falli
    const foulsSpan = playerDiv.querySelector('.player-fouls-display');
    let falliCambiati = false;
    if (foulsSpan) {
        const fVis = parseInt(foulsSpan.textContent) || 0;
        // Verifichiamo se il valore attuale nel DOM è diverso dal nuovo calcolo
        if (fVis !== (g.falliNelTempo || 0)) {
            foulsSpan.innerText = g.falliNelTempo || "";
            falliCambiati = true;
        }
    }

    // 2. Gestione Punti
    const scoreSpan = playerDiv.querySelector(".player-points") || playerDiv.querySelector(".player-points-value");
    let puntiCambiati = false;
    if (scoreSpan) {
        const pVis = parseInt(scoreSpan.textContent) || 0;
        if (pVis !== g.puntiNelTempo) {
            scoreSpan.textContent = g.puntiNelTempo;
            puntiCambiati = true;
        }
    }

    // 3. Attivazione Flash
    // Se non è il primo caricamento (isNew) e almeno uno dei due è cambiato
    if (!isNew && (puntiCambiati || falliCambiati)) {
        playerDiv.classList.add("row-highlight-flash");
        setTimeout(() => playerDiv.classList.remove("row-highlight-flash"), 2000);
    }

    const statsSpan = playerDiv.querySelector(".stats-text");
    if (statsSpan) statsSpan.textContent = g.statsNelTempo;

    if (container.children[index] !== playerDiv) {
      container.insertBefore(playerDiv, container.children[index]);
    }
  });

  while (container.children.length > visualizzazioneGiocatori.length) {
    container.removeChild(container.lastChild);
  }
}

function mostraControlliSquadraB() {
    const oppSection = document.getElementById('opponent-score-section');
    if (oppSection) {
      oppSection.classList.add("section-ready");
    }
}

function IncrPuntiSquadraB(points) {
  // chiamato dall'html
  gestisciPuntiAvversari(points, null);
  modifyHistory();
  renderPlayerListLive(); // ATTENZIONE serve solo per "rinfrescare" i punti nel tempo
  updateScoreboard(matchIsLive || isReviewMode); 
  saveToFirebaseAll();
}

function gestisciPuntiAvversari(azione, evento) {
    if (azione === 'undo') {
        undoPuntiSquadraB(evento);
    } else {
        // 'azione' può essere 1, 2, 3 o "Fallo"
        AddPuntiSquadraB(azione, true);
    }

    // Animazione flash
    const opponentRow = document.getElementById("opponent-score-section");
    if (opponentRow) {
        opponentRow.classList.remove("row-highlight-flash");
        void opponentRow.offsetWidth; 
        opponentRow.classList.add("row-highlight-flash");
    }

    punteggioB = puntiSquadraB; // Aggiorna la variabile globale
    
    if (isAdmin && matchIsLive) { 
      mostraControlliSquadraB();
    }
}

//#region GESTIONE FULLSCREEN
function entraInFullscreen() {
  const container = document.querySelector('.video-container');
  const btn = document.getElementById('btn-ios-fullscreen');

  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.webkitRequestFullscreen) {
    // Questa è la riga vitale per iPhone
    container.webkitRequestFullscreen();
  }

  // Nascondi il tasto dopo il click per non coprire il video
  if (btn) btn.style.display = 'none';
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

function toggleIOSFullscreen() {
  if (window.orientation === 90 || window.orientation === -90) {
    // Un piccolo timeout aiuta Safari a ricalcolare gli spazi
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 300);
  }
}

// Ascolta il cambio di orientamento
window.addEventListener("orientationchange", toggleIOSFullscreen);

// Gestisci Fullscreen in landscape
window.screen.orientation.addEventListener("change", function () {
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

//#endregion

function modificaOraInizioDiretta(delta) {
  /**
   * Modifica l'ora di inizio o il timestamp
   * @param {number} incremento - Può essere +1 o -1
   */
  // 2. Converti HH:MM:SS in secondi totali
  if (!isAdmin) return;

  const parti = oraInizioDiretta.split(":");
  let secondiTotali = (+parti[0]) * 3600 + (+parti[1]) * 60 + (+parti[2]);

  // 3. Applica la modifica
  secondiTotali += delta;

  // Evita valori negativi
  if (secondiTotali < 0) secondiTotali = 0;

  // 4. Riconverti in formato HH:MM:SS
  const ore = Math.floor(secondiTotali / 3600).toString().padStart(2, '0');
  const minuti = Math.floor((secondiTotali % 3600) / 60).toString().padStart(2, '0');
  const secondi = (secondiTotali % 60).toString().padStart(2, '0');

  oraInizioDiretta = `${ore}:${minuti}:${secondi}`;

  // Salviamo il nuovo valore
  localStorage.setItem("oraInizioDiretta", oraInizioDiretta);
  dettagliGara.oraInizioDiretta = oraInizioDiretta

  console.log("Nuovo Start Time impostato:", oraInizioDiretta);


  // Se sei Admin, potresti voler inviare questo aggiornamento al server/DB
  if (isAdmin) {
    saveToFirebaseHistory('partite/', dettagliGara); 

    saveToServerMatchData(); // La tua funzione esistente per salvare su Google Sheets
  }
}

//#regione GESTIONE SYNC TIME
function sendSyncTime() {
  console.log("SendSyncTime() chiamata");
  vibrate(100);

  const oraCorrente = new Date().toLocaleTimeString('it-IT');
  SYNC_TIME = oraCorrente;
}

function showSyncTime(events) {
  if (isSyncPending) return;

  if (SYNC_TIME) {
    isSyncPending = true;
    vibrate(100);

    showBasketToast("SYNC: " + SYNC_TIME, 0);
  }
}

function checkSyncTime(events) {
  const basketToast = document.getElementById('basket-toast');
  if (basketToast) {
    basketToast.classList.add("hidden");
  }
  isToastRunning = false;

  if (SYNC_TIME === undefined) {
    isSyncPending = false;
    return;
  }

  // 1. Calcolo l'offset tra realtà e video
  const offsetEvento = - (hmsToSeconds(SYNC_TIME) - hmsToSeconds(orarioVisualizzatoFormattato)); 

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
  const tempSync = SYNC_TIME;
  isSyncPending = false;
  SYNC_TIME = null;

  if (confirm(messaggio)) {
    // 3. Salvo e ricarico
    //oraInizioDiretta = nuovaOraInizioHms;
    //localStorage.setItem("oraInizioDiretta", nuovaOraInizioHms);
    modificaOraInizioDiretta(-offsetEvento);

    // ricarica la pagina per vedere i cambiamenti
    //setTimeout(() => location.reload(), 1000); NON SERVE
  }
}
//#endregion

function updateDebugFooter(serverTime = null) {
  const fetchSpan = document.getElementById("fetch-time");
  const sizeSpan = document.getElementById("display-size");
  const dprSpan = document.getElementById("display-dpr");

  // Aggiorna il tempo del server solo se passato
  if (serverTime !== null && fetchSpan) {
    fetchSpan.textContent = serverTime;
    fetchSpan.style.color = "#ff4d4d";
  }

  // Calcola e inserisce W, H e DPR
  if (sizeSpan) {
    sizeSpan.textContent = `${window.innerWidth}x${window.innerHeight}`;
  }
  if (dprSpan) {
    dprSpan.textContent = window.devicePixelRatio.toFixed(2);
  }
}

//#region SALVATAGGIO SU SERVER
function saveToServerTeamB() {
  // --- Salvataggio cumulativo Squadra B ---
  const formData = new FormData();
  formData.append("matchId", matchId);
  formData.append("squadra", squadraAvversaria);
  formData.append("giocatore", "Squadra B"); // nome fittizio unico
  formData.append("numero", "0");            // opzionale
  formData.append("punti", puntiSquadraB);   // punteggio cumulativo
  formData.append("contatori", JSON.stringify(contatoriB));

  fetch(url, {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => console.log("Salvato cumulativo Squadra B:", data))
    .catch(err => console.error("Errore salvataggio Squadra B:", err));
}

function saveToServerPlayer(g) {
  const squadra = "Polismile A";
  const formData = new FormData();
  formData.append("matchId", matchId);
  formData.append("squadra", squadra);
  formData.append("giocatore", g.displayName);
  formData.append("numero", g.numero);
  formData.append("punti", g.punti);   // 👈 invio punteggio cumulativo
  formData.append("contatori", JSON.stringify(g.contatori)); // 👈 invio contatori cumulativi
  formData.append("stato", g.stato);

  fetch(url, {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => console.log("Salvato cumulativo giocatore:", data))
    .catch(err => console.error("Errore salvataggio giocatore:", err));
}

function saveToServerMatchData() {

  if (!matchId) {
    console.warn("Nessun matchId trovato, non salvo");
    return;
  }

  const formData = new FormData();
  formData.append("matchId", matchId);

  if (teamA === "Polismile A") {
    formData.append("punteggioA", puntiSquadraA);
    formData.append("punteggioB", puntiSquadraB);
  } else {
    formData.append("punteggioA", puntiSquadraB);
    formData.append("punteggioB", puntiSquadraA);
  }

  // Aggiungi altre variabili
  formData.append("convocazioni", convocazioni);
  formData.append("videoURL", videoURL);
  formData.append("oraInizioDiretta", oraInizioDiretta);
  formData.append("isLive", isLive);
  formData.append("statoPartita", statoPartita);
  formData.append("note", dettagliGara.note);

  // Invia al tuo Google Apps Script
  fetch(url, {
    method: "POST",
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      console.log("[SERVER RESPONSE] ", data);
    })
    .catch(error => {
      console.error("Errore nel salvataggio:", error);
    });
}

function salvaStatoLive(dati) {
  console.log("Dati inviati a salvaStatoLive:", dati);
  isLive = (dati.goLive === true);

  // Gestione logica quarto e variabile globale
  if (dati.terminata === true) {
    statoPartita = "Terminata";
    quartoAttuale = "Terminata";
  } else {
    statoPartita = dati.quarto || "1° Quarto";
    quartoAttuale = statoPartita.replace("° Quarto", "").trim();
  }
  
  localStorage.setItem("statoPartita", statoPartita);
  localStorage.setItem("isLive", isLive);

  dettagliGara.statoPartita = statoPartita;
  dettagliGara.isLive = isLive;
  matchIsLive = isLive;

  // --- LOGICA AGGIORNAMENTO CONFIGURAZIONE E TIMESTAMPS QUARTI ---
  
  // 1. Recuperiamo la configurazione esistente dalle note (se è già una stringa, facciamo il parse)
  let configEsistente = {};
  try {
    configEsistente = (typeof dettagliGara.note === 'string') 
      ? JSON.parse(dettagliGara.note) 
      : (dettagliGara.note || {});
  } catch (e) {
    configEsistente = {};
  }

  // 2. Prepariamo la nuova configurazione mantenendo i valori vecchi dei quarti
  const oraAttuale = new Date().toLocaleTimeString(); // Formato "HH:MM:SS"
  
  const nuovaConfig = {
    "stats": configEsistente.stats || false,
    "highlights": configEsistente.highlights || false,
    "hud-score": hudPositionIndex,
    "hud-clock": timePositionIndex,
    // Manteniamo i valori esistenti per Q1, Q2, Q3, Q4
    "Q1": configEsistente.Q1 || "",
    "Q2": configEsistente.Q2 || "",
    "Q3": configEsistente.Q3 || "",
    "Q4": configEsistente.Q4 || ""
  };

  // 3. Aggiorniamo SOLO il campo corrispondente al quarto attuale
  // Usiamo quartoAttuale che contiene "1", "2", "3" o "4"
  const chiaveQuarto = quartoAttuale; 
  if (nuovaConfig.hasOwnProperty(chiaveQuarto)) {
    // Aggiorniamo l'ora solo se non è già stata impostata (opzionale)
    // o se preferisci sovrascriverla ogni volta che salvi lo stato in quel quarto
    nuovaConfig[chiaveQuarto] = oraAttuale;
  }

  // 4. Trasformiamo in JSON e salviamo
  dettagliGara.note = JSON.stringify(nuovaConfig);
  // ------------------------------------------------------------

  saveToFirebaseHistory('partite/', dettagliGara); 
  saveToServerMatchData();
}

function OLDsalvaStatoLive(dati) {
  console.log("Dati inviati a salvaStatoLive:", dati);
  isLive = (dati.goLive === true);


  // Gestione logica quarto e variabile globale
  if (dati.terminata === true) {
    statoPartita = "Terminata";
    quartoAttuale = "Terminata";
  } else {
    statoPartita = dati.quarto || "1° Quarto";
    // Estraiamo solo il numero o "Extra Time" (es: "1" invece di "1° Quarto")
    quartoAttuale = statoPartita.replace("° Quarto", "").trim();
  }
  localStorage.setItem("statoPartita", statoPartita);
  localStorage.setItem("isLive", isLive);

  dettagliGara.statoPartita = statoPartita;
  dettagliGara.isLive = isLive;
  matchIsLive = isLive;

//--------------------------------------
  // ATTENZIONE: TEST
  const nuovaConfig = {
        "stats": dettagliGara.note['stats'] || false,
        "highlights": dettagliGara.note['highlights'] || false,
        "hud-score": hudPositionIndex,
        "hud-clock": timePositionIndex
  };
  // 2. Trasformiamo l'oggetto in una stringa JSON
  const note = JSON.stringify(nuovaConfig);
  dettagliGara.note = note;
//--------------------------------------

  saveToFirebaseHistory('partite/', dettagliGara); 

  saveToServerMatchData();
}

//#endregion

function inizializzaGiocatoriConvocati() {
  const stringaConvocati = localStorage.getItem("convocazioni");
  
  // 1. Pulizia della stringa dei convocati
  let convocatiIds = [];
  if (stringaConvocati && stringaConvocati.trim() !== "" && stringaConvocati !== "[ALL]") {
    const stringaPulita = stringaConvocati.replace(/[\[\]'" ]/g, "");
    convocatiIds = stringaPulita.split(",");
  }

  // 2. Creiamo la nuova lista basandoci sull'anagrafica totale
  const nuoviGiocatoriObj = giocatoriA.map((nomeCompleto, index) => {
    // MODIFICA QUI: Gestione spazi nel nome e cognome
    const parti = nomeCompleto.trim().split(/\s+/); // Divide per uno o più spazi
    const nome = parti[0]; // La prima parola è il nome
    const cognome = parti.slice(1).join(" "); // Tutto il resto è il cognome
    
    const numeroMaglia = String(numeriMaglia[index]);

    // Verifica se il giocatore è convocato
    const isConvocato = convocatiIds.length === 0 || convocatiIds.includes(numeroMaglia);
    
    if (!isConvocato) return null;

    // CERCA se il giocatore esisteva già
    const giocatoreEsistente = giocatoriObj.find(g => String(g.numero) === numeroMaglia);

    if (giocatoreEsistente) {
      // Se esiste, lo restituiamo così com'è (mantiene history, punteggio, stato, ecc.)
      return giocatoreEsistente;
    } else {
      return {
        id: `${cognome.replace(/\s+/g, '_')}_${nome}`, // ID senza spazi per sicurezza
        numero: numeroMaglia,
        displayName: `${cognome} ${nome}`,
        punti: 0,
        contatori: { 0: 0, 1: 0, 2: 0, 3: 0 },
        history: [], 
        stato: "Out",
        lastPunteggio: 0,
        nome: nome,
        cognome: cognome  
      };
    }
  })
  .filter(g => g !== null) // Rimuove i non convocati
  .sort((a, b) => a.cognome.localeCompare(b.cognome)); // Mantiene l'ordinamento

  // 3. Aggiorna la variabile globale
  giocatoriObj = nuoviGiocatoriObj;

  console.log("GiocatoriObj aggiornato:", giocatoriObj);
}

// Funzione per aggiornare l'orario
function updateSystemClock() {
    const clockElement = document.getElementById('systemClock');
    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString('it-IT', { hour12: false });
}

// ---------------------------------------------------------------------------------------------------- //
async function init() {
// ---------------------------------------------------------------------------------------------------- //

  await registerUserId();

  isAdmin = localStorage.getItem("isAdmin") === "true";

  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
  squadraAvversaria = (teamA === "Polismile A") ? teamB : teamA

  convocazioni = localStorage.getItem("convocazioni");
  videoURL = localStorage.getItem("videoURL");
  videoId = localStorage.getItem("videoId");
  matchStartTime = localStorage.getItem("matchStartTime");
  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");
  isLive = localStorage.getItem("isLive");
  statoPartita = localStorage.getItem("statoPartita");
  googleApiKey = localStorage.getItem("googleApiKey") || ""; // Recupera il valore salvato  

  puntiSquadraA = parseInt(localStorage.getItem("puntiSquadraA") || 0);
  puntiSquadraB = parseInt(localStorage.getItem("puntiSquadraB") || 0);

  initTeamNames();

  const urlParams = new URLSearchParams(window.location.search);
  const currentMatchId = urlParams.get("matchId");

  if (currentMatchId) {

    // Carichiamo i dati freschi della partita
    caricaAnagraficaSingolaPartita(matchId).then(() => {
      
      // --- INTEGRAZIONE AGGIORNAMENTO ROSTER E STATS ---
      // Chiamiamo la funzione asincrona con what="all" (o null)
      return aggiornaDatiRosterEStats("roster");
      
    }).then(dati => {
      // Se i dati sono stati scaricati con successo, aggiorniamo le variabili globali
      if (dati && dati.roster) {
        popolaGiocatoriA(dati.roster) 
        if (isAdmin) saveToFirebaseRoster('roster/', dati.roster); 

        console.log("Roster e Statistiche aggiornati globalmente.");
      }

      // Ora procediamo con l'inizializzazione della UI della partita
      inizializzaGiocatoriConvocati();

      videoId = localStorage.getItem("videoId");
      matchStartTime = parseInt(localStorage.getItem("matchStartTime") || "0", 10);

      if (videoId && videoId !== "null" && videoId !== "") {
          creaIlPlayer(videoId);
      } else {
          // 1. Nascondi lo spinner di caricamento
          const videoSpinner = document.getElementById("video-loading");
          if (videoSpinner) videoSpinner.classList.add("hidden");

          // 2. Mostra l'immagine statica di avviso
          const placeholder = document.getElementById("video-placeholder");
          if (placeholder) {
              placeholder.style.display = "block";
          }

          // 3. Log e avvio statistiche
          console.log("Nessun video trovato, mostro placeholder e avvio tickTimeline.");
          avviaTickSenzaVideo();
      }

      console.log("Timeline avviata per il match:", matchId);
    }).catch(err => {
      console.error("Errore durante il caricamento dei dati iniziali:", err);
    });
  }

  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");

  const hudClockElement = document.getElementById('hud-video-time');
  if (isAdmin && hudClockElement) {
    hudClockElement.style.pointerEvents = 'auto'; // Abilita i click
    hudClockElement.style.cursor = 'pointer';      // Mostra la manina al passaggio del mouse

    hudClockElement.addEventListener('click', () => {
      sendSyncTime();
      showSyncTime();
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

  // gestione Hamburger Menu

  if (isAdmin) {
    document.body.classList.add("admin-mode");
    document.body.classList.remove("user-mode");
  } else {
    document.body.classList.add("user-mode");
    document.body.classList.remove("admin-mode");
  }


  if (isAdmin) {
    document.body.classList.add("admin-mode");
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const menu = document.getElementById("menu");

    if (hamburgerBtn && menu) {
      hamburgerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
      });

      // Chiude il menu se si clicca fuori
      document.addEventListener("click", () => {
        menu.classList.add("hidden");
      }, { passive: true });
    }

    const adminBtn = document.getElementById("adminBtn");

    if (isAdmin) {
      document.body.classList.add("admin-mode");
      document.body.classList.remove("user-mode");
    } else {
      document.body.classList.add("user-mode");
      document.body.classList.remove("admin-mode");
    }

    if (isAdmin && adminBtn) {
      adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';

      adminBtn.addEventListener("click", () => {
        const menu = document.getElementById("sideMenu");
        if (menu) menu.classList.remove("open");
        if (localStorage.getItem("isAdmin") === "true") {
          if (confirm("Vuoi uscire dalla modalità Admin?")) {
            localStorage.setItem("isAdmin", "false");
            localStorage.setItem("AdminPassword", "");
           setTimeout(() => location.reload(), 1000);
          }
        }
      }, { passive: true });

    }

  }

  if (isAdmin) {
    const counterDiv = document.getElementById('adminCounter');
    if (counterDiv) {
       counterDiv.style.setProperty('display', 'flex', 'important');
    }

    // Mostra l'orologio
    const clockDiv = document.getElementById('systemClock');
    if (counterDiv) {
      clockDiv.classList.remove('hidden');
    }

    const presenceRef = db.ref("presence/online_users");
    
    // Usiamo il metodo snap.exists() per gestire anche lo 0
    presenceRef.on("value", (snap) => {
        let count = 0;
        if (snap.exists()) {
            count = snap.numChildren();
        }
        // Aggiorna l'interfaccia
        const countSpan = document.getElementById('onlineCount');
        if (countSpan) {
            countSpan.innerText = count;
        }

        // Opzionale: aggiorna il valore globale sul database
        db.ref("presence/user_count").set(count);
    });
  }

  document.addEventListener('contextmenu', function(e) {
    // Elimina il context menu dappertutto tranne se l'elemento cliccato è un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    e.preventDefault();
  }, false);

  // Aggiorna i dati al caricamento e ad ogni ridimensionamento della finestra
  window.addEventListener('resize', () => updateDebugFooter());
  updateDebugFooter();

  if (!isAdmin) {
    registerToFirebaseEvents();
  }
  else {
    // Avvia il timer per aggiornare il system cloc
    setInterval(updateSystemClock, 1000);    
  }
}

document.addEventListener("DOMContentLoaded", init, { passive: true });
