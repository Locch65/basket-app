const USE_FIREBASE = true;

//------------------------------------------------------------------------------------------------------------------
// 1. Configurazione (copiala dalla console di Firebase: Impostazioni Progetto)
const firebaseConfig = {
  databaseURL: "https://locch65-basketapp-default-rtdb.europe-west1.firebasedatabase.app/",
};

// 2. Inizializzazione
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function saveToFirebaseAll() {
  if (isAdmin) {
    saveToFirebaseHistory('partite/', dettagliGara); 
    saveToFirebaseHistory('statistiche/', giocatoriObj);
    saveToFirebaseHistory('events/', fullMatchHistory);
  }
}

// ---------------------------------------------------------------------------------------------
function saveToFirebaseHistory(path, data) {
// ---------------------------------------------------------------------------------------------
  if (history.length < 0) return;
  // Scrittura su Firebase
  db.ref(path + matchId).set(data)
    .then(() => {
      console.log("Firebase aggiornato:  " + path);
      
      // // SOLO DOPO Firebase, chiami GAS per lo storico su Sheets
      // google.script.run
      //   .withSuccessHandler(() => console.log("Copia su Sheets salvata!"))
      //   .tuaFunzioneGAS(datiPartita);
    })
    .catch((error) => {
      console.error("Errore Firebase:", error);
    });
}

// ---------------------------------------------------------------------------------------------
function registerToFirebaseEvents() {
// ---------------------------------------------------------------------------------------------
  if (!USE_FIREBASE) return;

  console.log("Connessione alla partita in corso...");

  // Ci mettiamo in ascolto sul percorso 'partite/matchId'
  db.ref('partite/' + matchId).on('value', (snapshot) => {
    const data = snapshot.val();

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
//------------------------------------------------------------------------------------------------------------------

// @ts-check
let LIVE_OFFSET = 5;
let REFRESH_TIME = 300;
let ACCEPTABLE_DELAY_FOR_TOAST = 5; // secondi di ritardo accettabili per visualizzare il toast del punto realizzato

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
let currentHighlightIndex = -1; // -1 significa che nessun highlight è ancora selezionato
let highlightsAvailable = false; // Di default la sezione è nascosta
let isFetching = false; // Impedisce chiamate sovrapposte
let bloccoSincronizzazioneManuale = false;
let userNavigatedToEnd = false;
let isSyncPending = false; // Indica se c'è un evento SYNC già visualizzato ma non ancora gestito

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
let isAdmin = false;
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

initTeamNames();

function inizializzaGiocatoriConvocati() {
  const stringaConvocati = localStorage.getItem("convocazioni");
  
  // 1. Pulizia della stringa dei convocati (array di numeri maglia come stringhe)
  let convocatiIds = [];
  if (stringaConvocati && stringaConvocati.trim() !== "" && stringaConvocati !== "[ALL]") {
    const stringaPulita = stringaConvocati.replace(/[\[\]'" ]/g, "");
    convocatiIds = stringaPulita.split(",");
  }

  // 2. Creiamo la nuova lista basandoci sull'anagrafica totale (giocatoriA)
  const nuoviGiocatoriObj = giocatoriA.map((nomeCompleto, index) => {
    const [nome, cognome] = nomeCompleto.split(" ");
    const numeroMaglia = String(numeriMaglia[index]);

    // Verifica se il giocatore è convocato
    const isConvocato = convocatiIds.length === 0 || convocatiIds.includes(numeroMaglia);
    
    if (!isConvocato) return null;

    // CERCA se il giocatore esisteva già nel vecchio giocatoriObj per non perdere i dati
    const giocatoreEsistente = giocatoriObj.find(g => String(g.numero) === numeroMaglia);

    if (giocatoreEsistente) {
      // Se esiste, lo restituiamo così com'è (mantiene history, punteggio, stato, ecc.)
      return giocatoreEsistente;
    } else {
      // Se è nuovo, creiamo l'oggetto da zero
      return {
        id: `${cognome}_${nome}`,
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

  console.log("GiocatoriObj aggiornato (preservando dati esistenti):", giocatoriObj);
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

function aggiornaPunteggio(target, punti) {
  target.punti += punti;

  // Inizializza se non esiste (per sicurezza su vecchi dati caricati)
  if (target.contatori[punti] === undefined) target.contatori[punti] = 0;

  target.contatori[punti]++;

  // Memorizziamo un oggetto con punti e orario
  const oraCorrente = new Date().toLocaleTimeString('it-IT');
  target.history.push({ punti: punti, ora: oraCorrente });
}

function undoPunteggio(target, eventToRemove) {
  /**
   * Rimuove un evento specifico dalla cronologia del giocatore/squadra
   * @param {Object} target - L'oggetto giocatore o squadra (es. giocatore o historyB)
   * @param {Object} eventToRemove - L'oggetto {punti, ora} da rimuovere
   */
  if (!eventToRemove || target.history.length === 0) return;

  // Trova l'indice dell'evento specifico nella history
  const index = target.history.findIndex(ev => 
    ev.ora === eventToRemove.ora && ev.punti === eventToRemove.punti
  );

  if (index !== -1) {
    // Rimuove l'evento dall'array history
    const removedEntry = target.history.splice(index, 1)[0]; 
    const puntiDaTogliere = removedEntry.punti;

    // Aggiorna il punteggio totale e il contatore specifico
    target.punti -= puntiDaTogliere;
    target.contatori[puntiDaTogliere]--;

    console.log(`Rimosso evento: ${puntiDaTogliere} punti segnati alle ${removedEntry.ora}`);
  }
}

function undoPuntiGiocatore(id, evento) {
  const g = giocatoriObj.find(x => x.id === id);

  if (g.history.length <= 0) return 0;

  // Se 'evento' è passato usa quello, altrimenti usa l'ultima azione della history
  const azioneDaAnnullare = (evento !== undefined) ? evento : g.history[g.history.length - 1];
  
  const timestampReale = azioneDaAnnullare.ora;
  const ultimoPunto = azioneDaAnnullare.punti;

  undoPunteggio(g, azioneDaAnnullare); 
  
  console.log("undoPuntiGiocatore - Azione annullata:", azioneDaAnnullare);
  console.log("Nuovo punteggio g:", g.punti);
  
  saveToServerEventoLive(g.numero, -ultimoPunto, timestampReale, getTeamName(), "undo");

    return ultimoPunto;
}

function AddPuntiGiocatore(id, punti) {
  const g = giocatoriObj.find(x => x.id === id);
  aggiornaPunteggio(g, punti);

  const ultimaAzione = g.history[g.history.length - 1];
  const timestampReale = ultimaAzione.ora;

  saveToServerEventoLive(g.numero, punti, timestampReale, getTeamName(), "save");

  console.log("Salvato punti:", punti);
}

/**
 * Rimuove un evento specifico dalla cronologia della Squadra B
 * @param {Object} eventToRemove - L'oggetto {punti, ora} da rimuovere
 */
function undoPuntiSquadraB(eventToRemove) {

  if (historyB.length === 0) return;

  // Se 'eventToRemove' è passato usa quello, altrimenti usa l'ultima azione della history
  const azioneDaAnnullare = (eventToRemove !== undefined) ? eventToRemove : historyB[historyB.length - 1];
  
  
  // Trova l'indice dell'evento che corrisponde per ora e punti
  const index = historyB.findIndex(ev => 
    ev.ora === azioneDaAnnullare.ora && ev.punti === azioneDaAnnullare.punti
  );

  if (index !== -1) {
    // Rimuove l'evento specifico dall'array
    const removedEntry = historyB.splice(index, 1)[0];
    const puntiDaTogliere = removedEntry.punti;

    // Aggiorna i totali e i contatori globali della Squadra B
    puntiSquadraB -= puntiDaTogliere;
    contatoriB[puntiDaTogliere]--;

    // Registra l'operazione di storno nel log degli eventi live
    // Usiamo l'orario originale dell'evento per coerenza nel log
    saveToServerEventoLive("", -puntiDaTogliere, removedEntry.ora, "Squadra B", "undo");

    console.log(`Rimosso evento Squadra B: +${puntiDaTogliere} (ore ${removedEntry.ora})`);
  } else {
    console.warn("Evento non trovato nella cronologia della Squadra B");
  }
}

function AddPuntiSquadraB(punti, memorizzaOrario) {
  puntiSquadraB = puntiSquadraB + punti;
  contatoriB[punti]++;

  const oraCorrente = memorizzaOrario ? new Date().toLocaleTimeString('it-IT') : "??";
  historyB.push({ punti: punti, ora: oraCorrente }); // Salvataggio oggetto

  saveToServerEventoLive("", punti, oraCorrente, "Squadra B", "save");
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

let isFirstLoad = true; // Variabile di stato globale (fuori dalla funzione)

// ---------------------------------------------------------------------------------------------
function generaHistory(liveDataDalBackend) {
// ---------------------------------------------------------------------------------------------
  let scoreA = 0;
  let scoreB = 0;

  // Reset history e contatori
  historyB = [];
  contatoriB = { 0: 0, 1: 0, 2: 0, 3: 0 };
  giocatoriObj.forEach(g => {
    g.history = [];
  });

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
      const punti = parseInt(evento.puntiRealizzati || 0);
      if (evento.squadra === 'Squadra B') {
        scoreB += punti;
          // Carica HistoryB
          historyB.push({
            punti: punti,
            ora: evento.timestampReale
          });
          
          // Carica ContatoriB (t0, t1, t2, t3)
          if (contatoriB[punti] !== undefined) {
            contatoriB[punti]++;
        }
      } else {
        scoreA += punti;
        // Cerchiamo il giocatore corrispondente in giocatoriObj tramite il numero
        const giocatore = giocatoriObj.find(g => String(g.numero) === String(evento.idGiocatore));
        if (giocatore && punti !== 0) {
          giocatore.history.push({
          punti: punti,
          ora: evento.timestampReale
          });
        } 
      }

      return {
        ...evento,
        secondiReali: hmsToSeconds(evento.timestampReale.replace("*", "")), // es: "14:00:00" -> 50400 Potrebbe esserci un * alla fine per indicare che il punteggio è stato modificato da popoup
        punteggioA: scoreA,
        punteggioB: scoreB
      };
    });

  highlightsAvailable = true;
}

// ---------------------------------------------------------------------------------------------
function modifyHistory() {
// ---------------------------------------------------------------------------------------------
/**
 * Rigenera fullMatchHistory a partire dai dati contenuti in giocatoriObj e historyB.
 * Utile quando vengono effettuate modifiche manuali ai singoli giocatori (es. da popup)
 * e si vuole mantenere l'integrità della timeline e dei punteggi progressivi.
 */
  let allEvents = [];

  // 1. Raccogli eventi della Squadra A (dai singoli giocatori)
  giocatoriObj.forEach(g => {
    if (g.history && g.history.length > 0) {
      g.history.forEach(ev => {
        allEvents.push({
          idGiocatore: g.numero,
          puntiRealizzati: ev.punti,
          squadra: 'Polismile A', // O il nome dinamico teamA
          timestampReale: ev.ora,
          secondiReali: hmsToSeconds(ev.ora.replace("*", ""))
        });
      });
    }
  });

  // 2. Raccogli eventi della Squadra B
  if (typeof historyB !== 'undefined' && historyB.length > 0) {
    historyB.forEach(ev => {
      allEvents.push({
        idGiocatore: "Squadra B",
        puntiRealizzati: ev.punti,
        squadra: 'Squadra B',
        timestampReale: ev.ora,
        secondiReali: hmsToSeconds(ev.ora.replace("*", ""))
      });
    });
  }

  // 3. Ordina tutti gli eventi per tempo (secondiReali)
  allEvents.sort((a, b) => a.secondiReali - b.secondiReali);

  // 4. Ricalcola i punteggi progressivi (punteggioA e punteggioB)
  let runningScoreA = 0;
  let runningScoreB = 0;

  fullMatchHistory = allEvents.map(evento => {
    const punti = parseInt(evento.puntiRealizzati || 0);
    
    if (evento.squadra === 'Squadra B') {
      runningScoreB += punti;
    } else {
      runningScoreA += punti;
    }

    return {
      ...evento,
      punteggioA: runningScoreA,
      punteggioB: runningScoreB
    };
  });

  // 5. Aggiorna le variabili globali del punteggio con gli ultimi valori
  punteggioA = runningScoreA;
  punteggioB = runningScoreB;

  console.log("History rigenerata con successo. Eventi totali:", fullMatchHistory.length);
  
  // Opzionale: attiva la disponibilità degli highlights se ci sono eventi
  highlightsAvailable = fullMatchHistory.length > 0;
}

function updateDatiPartita(what, data) {

  if (what === "all" || what === "match") {
      // 1. Estrazione dati
      dettagliGara = data.dettagliGara || {}
      matchIsLive = dettagliGara.isLive;
      oraInizioDiretta = dettagliGara.oraInizioDiretta;
      isUserLive = matchIsLive;
      // GESTIONE QUARTO/PERIODO
      quartoAttuale = dettagliGara?.statoPartita;
      localStorage.setItem("statoPartita", quartoAttuale);

      if (dettagliGara.convocazioni !== convocazioni) {
        convocazioni = dettagliGara.convocazioni;
        localStorage.setItem("convocazioni", convocazioni);
        location.reload();
      }
  }

  if (what === "all" || what === "events") {
      generaHistory(data.liveData);

      if (isAdmin && matchIsLive) { // Solo se l'utente è admin e i bottoni esistono
        aggiornaBottoniSquadraB();
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

//       // 1. Estrazione dati
//       const rows = data.statisticheGiocatori || [];
//       const dettagli = data.dettagliGara || {};
//       matchIsLive = dettagli.isLive;
//       oraInizioDiretta = dettagli.oraInizioDiretta;
//       isUserLive = matchIsLive;
//       if (dettagli.convocazioni !== convocazioni) {
// //        alert(dettagli.convocazioni + " <> " + convocazioni);
//         convocazioni = dettagli.convocazioni;
//         localStorage.setItem("convocazioni", convocazioni);
//         location.reload();

//         // inizializzaGiocatoriConvocati();
//       }

//       generaHistory(data.liveData);

//       if (isAdmin && matchIsLive) { // Solo se l'utente è admin e i bottoni esistono
//         aggiornaBottoniSquadraB();
//       }

//       controllaDisponibilitaHighlights();

//       // 2. Aggiornamento giocatori
//       rows.forEach(function (r) {
//         const g = giocatoriObj.find(function (x) {
//           return String(x.numero) === String(r.numero);
//         });
//         if (g) {
//           const nuoviPunti = parseInt(r.punti, 10) || 0;
//           g.punteggio = nuoviPunti;
//           g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";

//           try {
//             g.contatori = JSON.parse(r.dettagli || '{"0":0,"1":0,"2":0,"3":0}');
//             // Se il JSON esiste ma non ha il tasto "0", lo aggiungiamo
//             if (g.contatori["0"] === undefined) {
//               g.contatori["0"] = 0;
//             }
//           } catch (e) { 
//             g.contatori = {"0":0,"1":0,"2":0,"3":0};
//           }

//         } else if (r.giocatore === "Squadra B" && !matchIsLive && !isReviewMode) { // in ReviewMode il punteggio e' calcolato in base al tempo visualizzato
//           punteggioB = parseInt(r.punti, 10) || 0;
//         }
//       });

//       // GESTIONE QUARTO/PERIODO
//       quartoAttuale = data.dettagliGara?.statoPartita;
//       localStorage.setItem("statoPartita", quartoAttuale);

//       if (matchIsLive || isReviewMode) {
//         renderPlayerListLive();
//         if (isAdmin || isFirstLoad) modifyHistory();
//       } else {
//         renderPlayerList();
//       }

//       updateScoreboard(matchIsLive || isReviewMode);
//       isFirstLoad = false;

//       // IMPORTANTE: Reset del flag alla fine del successo
//       isFetching = false;
    })
    .catch(function (err) {
      document.getElementById("players-grid").innerHTML = "Errore: " + err;
      console.error("Errore nel caricamento dati partita:", err);
      // IMPORTANTE: Reset del flag anche in caso di errore
      isFetching = false;
    });
}

let isToastRunning = false; // Variabile di controllo per la durata del flash

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

function processEventBuffer() {
  if (!orarioVisualizzatoFormattato) return;
//??  if (!fullMatchHistory.length || !orarioVisualizzatoFormattato) return;

  // Convertiamo l'orario che l'utente sta vedendo nel video in secondi
  const secondiVisualizzati = hmsToSeconds(orarioVisualizzatoFormattato);

  // Cerchiamo l'ultimo evento accaduto prima o in quel momento
  const eventoCorrente = fullMatchHistory.findLast(e => e.secondiReali <= secondiVisualizzati);

  if (!(matchIsLive || isReviewMode)) return;

renderPlayerListLive(); // ATTENZIONE: TEst

  if (eventoCorrente) {
    // Aggiorna l'HUD con i dati dell'evento trovato
    //document.getElementById('hud-score').textContent = `${eventoCorrente.punteggioA} - ${eventoCorrente.punteggioB}`;
    punteggioA = eventoCorrente.punteggioA;
    punteggioB = eventoCorrente.punteggioB;
    updateScoreboard(matchIsLive || isReviewMode);
    //console.log("Ultimo evento: " + eventoCorrente.secondiReali + " now: " + secondiVisualizzati);
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


  // Carica i dati dal server ogni 7 tick (circa 2.1 secondi)
  if (tickCounter % 7 === 0) {
    if (!USE_FIREBASE) {
      // ATTENZIONE: vecchia implementazione
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

function initTeamNames() {
  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
  squadraAvversaria = (teamA === "Polismile A") ? teamB : teamA

  const elA = document.getElementById("label-team-A");
  const elB = document.getElementById("label-team-B");
  if (elA) elA.textContent = teamA;
  if (elB) elB.textContent = teamB;

  const opponent = document.getElementById("opponent");
//  if (opponent) opponent.textContent = (teamA === "Polismile A") ? teamB : teamA;
  if (opponent) opponent.textContent = squadraAvversaria;
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
    basketToast.style.bottom = '0.5rem';
  }
}

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
    if (ev.timestampReale !== '00:00:00') {
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

function updateScoreboard(matchIsLive) {
  const scoreEl = document.getElementById("game-score");
  const hudScoreEl = document.getElementById("hud-score");
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
//??      currentScore = `${punteggioA} - ${punteggioB}`;
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
    if (hudScoreEl) hudScoreEl.textContent = currentScore;

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

    return `
      <div class="player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}">
        <div>
          <span class="player-num">#${g.numero}</span>
          <span class="player-name">${g.displayName}</span>
        </div>
        <div class="player-stats">
          ${stats} 
          <span class="player-points">${g.punti}</span>
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

function NewShowPlayerPopup(giocatore) {
  // 1. Rimuovi eventuali popup aperti e BLOCCA lo scroll
  const existingOverlay = document.querySelector('.player-popup-overlay');
  if (existingOverlay) existingOverlay.remove();
  document.body.style.overflow = 'hidden';

  // 2. Determinazione Sorgente Dati (Giocatore o Squadra B)
  const isSquadraB = (giocatore === undefined || giocatore === null);
  
  // Riferimenti diretti agli oggetti originali per permettere la modifica
  const info = {
    titolo: isSquadraB ? squadraAvversaria : `#${giocatore.numero} - ${giocatore.displayName}`,
    contatori: isSquadraB ? contatoriB : giocatore.contatori,
    history: isSquadraB ? historyB : giocatore.history,
    objOriginale: giocatore // può essere null se Squadra B
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
    renderPlayerListLive(); // Rinfresca la lista principale alla chiusura
  };

  overlay.onclick = (e) => { if(e.target === overlay) closePopup(); };

  const content = document.createElement('div');
  content.className = 'player-popup-content dark-theme';

  // --- FUNZIONE INTERNA PER AGGIORNARE I VALORI NEL POPUP ---
  const refreshPopupUI = () => {
    // Aggiorna Totale Punti
    const nuovoTotale = (info.contatori[1] * 1) + (info.contatori[2] * 2) + (info.contatori[3] * 3);
    totalDisplay.innerHTML = `Totale Punti: <strong>${nuovoTotale}</strong>`;
    
    // Aggiorna le label dei contatori nella griglia
    const labels = content.querySelectorAll('.stat-value strong');
    labels[0].innerText = info.contatori[0];
    labels[1].innerText = info.contatori[1];
    labels[2].innerText = info.contatori[2];
    labels[3].innerText = info.contatori[3];

    updateEventList();
  };

  // Riga 1: Titolo
  const title = document.createElement('h2');
  title.innerText = info.titolo;
  content.appendChild(title);

  // Visualizzazione Totale Punti
  const totalDisplay = document.createElement('div');
  totalDisplay.className = 'player-total-points';
  content.appendChild(totalDisplay);

  // Riga 2 & 3: Griglia Statistiche
const gridContainer = document.createElement('div');
  gridContainer.className = 'player-stats-grid';

  const statsConfig = [
    { label: 'TL Sbagliati',   val: info.contatori[0], pts: 0, extraClass: 'btn-tl-miss' },
    { label: 'TL Segnati',     val: info.contatori[1], pts: 1 },
    { label: '2pt Realizzati', val: info.contatori[2], pts: 2 },
    { label: '3pt Realizzati', val: info.contatori[3], pts: 3 }
  ];

  // Creiamo un wrapper per i Tiri Liberi che starà sulla stessa linea degli altri
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
        syncGiocatoreUI(info.objOriginale);
      }
      modifyHistory();
      refreshPopupUI(); 
      updateScoreboard(matchIsLive || isReviewMode); 
      saveToFirebaseAll();
    };
    col.appendChild(btn);

    // Se sono i TL (index 0 e 1), vanno nel wrapper evidenziato
    if (index < 2) {
      groupTL.appendChild(col);
    } else {
      // Gli altri vanno direttamente nel container principale
      gridContainer.appendChild(col);
    }
  });
  content.appendChild(gridContainer);

  // Riga 4 & 5: Lista Eventi
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
      row.innerHTML = `<span>${ev.ora}</span><strong>${ev.punti} pt</strong>`;
      row.onclick = () => {
        content.querySelectorAll('.event-list-item').forEach(el => el.classList.remove('selected'));
        row.classList.add('selected');
        // Salviamo l'oggetto evento cliccato nella variabile esterna
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
    applyFeedback(undoBtn);
    if (eventoSelezionato ) {
      if (isSquadraB) {
        gestisciPuntiAvversari('undo', eventoSelezionato);
      } else {
        undoPuntiGiocatore(info.objOriginale.id, eventoSelezionato);
        giocatore.punti -= eventoSelezionato.punti;
      }
      if (!isSquadraB) syncGiocatoreUI(info.objOriginale);
      modifyHistory();
      refreshPopupUI();
      updateScoreboard(matchIsLive || isReviewMode);
      eventoSelezionato = undefined;
      saveToFirebaseAll();
    }
  };
  historyRow.appendChild(undoBtn);
  content.appendChild(historyRow);

  // Riga 6: Chiudi
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
  updateEventList();
}

// Aggiungi questa variabile fuori dalla funzione per tenere traccia dei punteggi precedenti
let lastRenderedScores = {};

// Variabile globale da definire a inizio file (direttavideo.js)
let adminSortMode = 'cognome'; // Valori: 'numero', 'cognome', 'punti'

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

  saveToFirebaseHistory('statistiche/', giocatoriObj);

  saveToServerPlayer(g);
}


function renderPlayerListLive() {
  const container = document.getElementById("players-grid");
  if (!container) return;
//  if (!container || !fullMatchHistory.length) return;

  const secondiCorrentiVideo = hmsToSeconds(orarioVisualizzatoFormattato);
  
  // 1. Rileviamo lo stato attuale del match
  const isTerminata = typeof quartoAttuale !== 'undefined' && quartoAttuale.toLowerCase().includes("terminata");
  
  // --- GESTIONE SEZIONE AVVERSARI (SQUADRA B) ---
  const opponentSection = document.getElementById('opponent-score-section');
  if (opponentSection) {
    // La sezione compare SOLO se sei Admin E la partita NON è terminata
    if (isAdmin && !isTerminata) {
      opponentSection.classList.add("section-ready");

    } else {
      opponentSection.classList.remove("section-ready");
    }
  }

  // 2. Mappatura e calcolo statistiche (OTTIMIZZATA)
  const visualizzazioneGiocatori = giocatoriObj.map(g => {
    // Filtriamo gli eventi del giocatore UNA SOLA VOLTA
    const eventiGiocatore = fullMatchHistory.filter(evento =>
      String(evento.idGiocatore) === String(g.numero) &&
      (isAdmin === true || evento.secondiReali <= secondiCorrentiVideo)
    );

    // Inizializziamo i contatori
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0, puntiTotali = 0;

    // Un unico ciclo sugli eventi invece di 5 filter/reduce
    eventiGiocatore.forEach(e => {
      if (e.timestampReale !== "00:00:00") {
        const p = parseInt(e.puntiRealizzati) || 0;
        if (p === 0) n0++;
        else if (p === 1) n1++;
        else if (p === 2) n2++;
        else if (p === 3) n3++;
        puntiTotali += p;
      }
    });

    const tentativiTL = n0 + n1;

    return {
      ...g,
      puntiNelTempo: puntiTotali,
      statsNelTempo: `[TL:${n1}/${tentativiTL}, T2:${n2}, T3:${n3}]`,
      count0: n0, count1: n1, count2: n2, count3: n3
    };
  });

  // --- NUOVO: Calcolo Punteggio Totale Squadra Nel Tempo --- ???
  puntiSquadraA_NelTempo = visualizzazioneGiocatori.reduce((acc, g) => acc + g.puntiNelTempo, 0);

  // --- NUOVO: Calcolo Punteggio Totale Squadra B (Avversari) ---
  // Filtriamo gli eventi dove idGiocatore è una stringa vuota
  const eventiSquadraB = fullMatchHistory.filter(evento => {
    const isSquadraB = (evento.idGiocatore === "Squadra B" || evento.idGiocatore === "" || evento.idGiocatore === null);
    const timeMatch = (isAdmin === true || evento.secondiReali <= secondiCorrentiVideo);
    return isSquadraB && timeMatch;
  });

  puntiSquadraB_NelTempo = eventiSquadraB.reduce((acc, e) => {
    return acc + (parseInt(e.puntiRealizzati) || 0);
  }, 0);

    // 3. Ordinamento
  visualizzazioneGiocatori.sort((a, b) => {
    if (a.stato === 'In' && b.stato !== 'In') return -1;
    if (a.stato !== 'In' && b.stato === 'In') return 1;
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
    
    // Controlliamo se è cambiato lo stato (In/Out) O se è cambiato il blocco (Terminata/Live)
    const statoPrecedente = playerDiv ? playerDiv.getAttribute("data-stato") : null;
    const terminalitaPrecedente = playerDiv ? playerDiv.getAttribute("data-was-terminated") : null;
    
    const isNew = !playerDiv;
    const statoCambiato = statoPrecedente !== g.stato;
    const matchStatusCambiato = terminalitaPrecedente !== String(isTerminata);

    // RIGENERIAMO se qualcosa è cambiato nella struttura
    if (isNew || statoCambiato || matchStatusCambiato) {
      if (!playerDiv) {
        playerDiv = document.createElement("div");
        playerDiv.setAttribute("data-player-num", g.numero);
      }
      playerDiv.setAttribute("data-stato", g.stato);
      playerDiv.setAttribute("data-was-terminated", isTerminata); // ATTENZIONE CORREGGERE ERRORE
      
      // LOGICA DINAMICA: Admin + Partita NON terminata = Controlli Attivi
      if (isAdmin && !isTerminata) {
        playerDiv.innerHTML = `
          <div class="player-row-wrapper no-select" style="display: flex; justify-content: space-between; align-items: center; width: 100%; white-space: nowrap; gap: 8px;">
            <div class="player-main-info" style="display: flex; align-items: center; gap: 6px; flex-grow: 1; overflow: hidden; cursor: pointer;">
              <span class="player-num" style="flex-shrink: 0; min-width: 28px;">#${g.numero}</span>
              <span class="player-name" style="overflow: hidden; text-overflow: ellipsis; flex-grow: 1;">${g.displayName}</span>
            </div>
            <div class="player-stats-actions" style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 12px;">
              <div class="admin-controls" style="display: flex; gap: 3px;"></div>
              <span class="player-points player-points-value">0</span>
            </div>
          </div>`;

        // Click cambio stato In/Out
        playerDiv.querySelector(".player-main-info").onclick = () => {
          vibrate(100);
          const nuovoStato = (g.stato === "In") ? "Out" : "In";
          const p = giocatoriObj.find(item => item.id === g.id);
          if(p) p.stato = nuovoStato;
          setStato(g.id, nuovoStato);
          renderPlayerListLive();
        };

        // Aggiunta bottoni se giocatore è "In"
        if (g.stato === "In") {
          const controls = playerDiv.querySelector(".admin-controls");
          
          const btnDetails = document.createElement("button");
          btnDetails.className = "player-tiro";
          btnDetails.style.backgroundColor = "#007bff";
          btnDetails.textContent = "Details";
          btnDetails.style.marginRight = "2rem";
          btnDetails.onclick = (e) => { e.stopPropagation(); vibrate(100); NewShowPlayerPopup(g); };
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
            
            // Forza il render della lista per vedere il nuovo punteggio e l'eventuale cambio classifica
            renderPlayerListLive();
            updateScoreboard(true);
            saveToFirebaseAll();
          };
          controls.appendChild(btnPlus2);
        }
      } else {
        // LAYOUT SEMPLIFICATO (Utente o Admin con partita Terminata)
        playerDiv.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <span class="player-num">#${g.numero}</span>
              <span class="player-name">${g.displayName}</span>
            </div>
            <div class="player-stats">
              <span class="stats-text"></span> 
              <span class="player-points">0</span>
            </div>
          </div>`;
      }
    }

    // --- AGGIORNAMENTO COSTANTE TESTI E ANIMAZIONI ---
    playerDiv.className = `player-item ${g.stato === 'In' ? 'is-in' : 'is-out'}`;
    const scoreSpan = playerDiv.querySelector(".player-points") || playerDiv.querySelector(".player-points-value");
    if (scoreSpan) {
      const pVis = parseInt(scoreSpan.textContent) || 0;
      if (pVis !== g.puntiNelTempo) {
        scoreSpan.textContent = g.puntiNelTempo;
        if (!isNew) {
           playerDiv.classList.add("row-highlight-flash");
           setTimeout(() => playerDiv.classList.remove("row-highlight-flash"), 2000);
        }
      }
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


function aggiornaBottoniSquadraB() {
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
        //console.log("Richiesta annullamento ultimo punteggio Squadra B");
        undoPuntiSquadraB(evento);
    } else {
        //console.log("Aggiunti " + azione + " punti alla Squadra B");
        AddPuntiSquadraB(azione, true);
    }

    // --- ANIMAZIONE RIGA SQUADRA B (Sia per punti che per undo) ---
    const opponentRow = document.getElementById("opponent-score-section");
    if (opponentRow) {
        // Rimuoviamo la classe per poter resettare l'animazione se chiamata in rapida successione
        opponentRow.classList.remove("row-highlight-flash");
        
        // Forza il reflow (necessario per far ripartire l'animazione CSS)
        void opponentRow.offsetWidth; 
        
        // Applichiamo la classe definita nel CSS
        opponentRow.classList.add("row-highlight-flash");
    }
    // -------------------------------------------------------------

    punteggioB = puntiSquadraB;
    
    if (isAdmin && matchIsLive) { 
      aggiornaBottoniSquadraB();
    }
//    updateScoreboard(matchIsLive || isReviewMode); non serve, è chiamato dal chiamante
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

function avviaTickSenzaVideo() {
  if (timelineInterval) clearInterval(timelineInterval);
  // Avviamo subito il primo tick per non aspettare 300ms
  tickTimeline();
  timelineInterval = setInterval(tickTimeline, REFRESH_TIME);
}

let SYNC_TIME = null;

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

    // Opzionale: ricarica la pagina o resetta il tick per vedere i cambiamenti
    location.reload();
  }
}

// Funzione per gestire la visibilità del menu in base ai permessi
function gestisciVisibilitaMenu() {
  const menuIcon = document.getElementById("hamburgerMenu");

  if (menuIcon) {
    if (isAdmin === true || isAdmin === "true") {
      // Se è admin, mostriamo il menu
      menuIcon.style.display = "block";
    } else {
      // Se non è admin, lo nascondiamo completamente
      menuIcon.style.display = "none";
    }
  }
}

function toggleMenu() {
  const menu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");

  if (menu && overlay) {
    menu.classList.toggle("open");
    overlay.classList.toggle("active");
  }
}

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
    // Estraiamo solo il numero o "Extra Time" (es: "1" invece di "1° Quarto")
    quartoAttuale = statoPartita.replace("° Quarto", "").trim();
  }
  localStorage.setItem("statoPartita", statoPartita);
  localStorage.setItem("isLive", isLive);

  dettagliGara.statoPartita = statoPartita;
  dettagliGara.isLive = isLive;
  matchIsLive = isLive;
  saveToFirebaseHistory('partite/', dettagliGara); 

  saveToServerMatchData();
}


// ---------------------------------------------------------------------------------------------------- //
function init() {
// ---------------------------------------------------------------------------------------------------- //

  registerUserId();

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
      });
    }
    //gestisciVisibilitaMenu();

    if (typeof createAdminPopup === "function") {
      createAdminPopup(); // Inizializza il popup se la funzione esiste
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
            location.reload(); // Ricarica per aggiornare i permessi
          }
        }
      });

    }

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
}

document.addEventListener("DOMContentLoaded", init, { passive: true });
