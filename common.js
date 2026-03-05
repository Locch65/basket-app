// common.js - Funzioni e variabili condivise
const url =
"https://script.google.com/macros/s/AKfycbzkD1HLaAuinmcTq6uFrhocYAcoput1P4oQ-yO99l28ciuawuUFjHDCDAiUdqAjsfgluQ/exec"

// ULTIMA FUNZIONANANTE "https://script.google.com/macros/s/AKfycbwFXpOEaJPS5VmqVgBbeiZd76giOcqISRiV2GdCBa2Xmfy_wTuk_CP_iXD3mqqHw7Yqbw/exec"

// "https://script.google.com/macros/s/AKfycbwqV1ACwwbM8U2nHlGY1dWAA1vcDQSwOF-TblS8r0eDtyWCo1gyvTfNze8Rp5oGE6WnJg/exec"
// "https://script.google.com/macros/s/AKfycbxNezGpflHNVJsWkhn_MV0wKf3sHyKahFk3GNZDxYXYyQmixYAaLVzjniXUYZ_P8nDY2g/exec"
// "https://script.google.com/macros/s/AKfycbzV27rlhFPmBdlIOjTNAC44LDnhdhM3GtGOaaY9_CXXMxgQBffBlnK5uEWLJLMh3L_0uQ/exec"
// "https://script.google.com/macros/s/AKfycbwXbljXTz-YAIeWRsGXAqsz1NT-ff3eleTP5OBrKgn3XzivFG89AE_3uulg9N75_Nql8g/exec"
// "https://script.google.com/macros/s/AKfycby3XUCWXpplbU1mtmA1c4iEAHNjOmOm-yyUBz8VmK8VuJROa0uyimpKcat65oObFxk3mA/exec"
// "https://script.google.com/macros/s/AKfycbw5x9ia8BuKiBQI4OYVyzzDSSqs_gsVvSljWXn7xCDEaPBf1FEYsgePOIkDFVeeWlVR6w/exec"
// "https://script.google.com/macros/s/AKfycbyy6uWQYmuXcOa0D-3Ca61hIMXFEgwiYVjaruQOqRVlTTRq2OgCL8bXFvQAJETBwI-WKw/exec"
// "https://script.google.com/macros/s/AKfycbxgrkXvfXs-cFLwSwC4VKOHfFqeucUfuMs4Q7R_epU6TskqIc9CwPjWL2tqAhU_tYLa3Q/exec"
// "https://script.google.com/macros/s/AKfycbyqydQs1oF1P0eFud0uAYgWiHfjkKBcKi2488TybV6CwY4WCGbbcH3VS4BGBVV7pi18DA/exec"
// "https://script.google.com/macros/s/AKfycbw4AW8USh3Cp6VJIZPWyDqqHfG8mixzjP9n9emjuvdgHAW4ZEocABAgrq8yQhoGps1MUw/exec"

// const giocatoriA = [
//   "C. Marasco", "E. Carfora", "K. Popa", "G. Giacco", "H. Taylor", "C. Licata", "L. Migliari", "F. Piazzano", "V. Occhipinti",
//   "A. Salvatore", "R. Bontempi", "L. Ostuni", "L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
// ];

// const numeriMaglia = ["55", "5", "18", "4", "21", "15", "34", "20", "31", "25", "11", "23", "17", "9", "26", "41", "29", "99"];

let isAdmin = false;
let giocatoriA = [];
let numeriMaglia = [];
const USE_FIREBASE = true;

//------------------------------------------------------------------------------------------------------------------
// 1. Configurazione (copiala dalla console di Firebase: Impostazioni Progetto)
const firebaseConfig = {
  databaseURL: "https://locch65-basketapp-default-rtdb.europe-west1.firebasedatabase.app/",
};

// 1. Inizializzazione
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 1. Riferimenti
const connectedRef = db.ref(".info/connected");
const presenceRef = db.ref("presence/online_users"); // Nodo che conterrà gli utenti
const userRef = presenceRef.push(); // Crea un ID univoco per questa sessione
const countDisplayRef = db.ref("presence/user_count"); // Dove salveremo il numero finale

// 2. Gestione Connessione/Disconnessione
connectedRef.on("value", (snap) => {
  if (snap.val() === true) {
    // Quando mi disconnetto, rimuovi il mio ID univoco
    userRef.onDisconnect().remove();
    
    // Segnala che sono online
    userRef.set(true);
    
    console.log("Connesso al server!");
  }
});

// 2. Questa funzione gestisce il conteggio anche quando il nodo è vuoto
// presenceRef.on("value", (snap) => {
//   let conteggioAttuale = 0;

//   if (snap.exists()) {
//     conteggioAttuale = snap.numChildren();
//   }

//   // Aggiorna il valore globale nel database
//   // Questo assicura che se l'ultimo esce, user_count diventi effettivamente 0
//   countDisplayRef.set(conteggioAttuale);
  
//   console.log("Utenti online:", conteggioAttuale);
// });
//------------------------------------------------------------------------------------------------------------------

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
  // Scrittura su Firebase
  db.ref(path + matchId).set(data)
    .then(() => {
      console.log("Firebase aggiornato:  " + path);
    })
    .catch((error) => {
      console.error("Errore Firebase: ", error);
    });
}

// ---------------------------------------------------------------------------------------------
function saveToFirebaseRoster(path, data) {
// ---------------------------------------------------------------------------------------------
  // Scrittura su Firebase
  db.ref(path).set(data)
    .then(() => {
      console.log("Firebase aggiornato: " + path);
    })
    .catch((error) => {
      console.error("Errore Firebase: ", error);
    });
}

function getTeamName() {
  return (teamA === "Polismile A") ? teamA : teamB;
}

let userId = undefined;

let getDeviceData = undefined;

// Aggiungi 'async' qui
async function registerUserId() {
  // 1. Inizializzazione base (opzionale se sovrascritta dopo)
  getDeviceData = {
    os: navigator.platform,
    userAgent: navigator.userAgent,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language
  };

  // 2. Gestione User ID
  userId = localStorage.getItem('webapp_user_id') || crypto.randomUUID();
  if (!localStorage.getItem('webapp_user_id')) {
    localStorage.setItem('webapp_user_id', userId);
  }

  // 3. ASPETTA il completamento delle statistiche
  // Usiamo await per bloccare l'esecuzione finché collectDeviceStats non ha finito
  const stats = await collectDeviceStats(); 
  
  // Ora getDeviceData conterrà i dati reali ritornati dalla funzione
  getDeviceData = stats;

  console.log("Registrazione completata per l'utente:", userId);
  console.log("Dati dispositivo:", getDeviceData);
  
  return { userId, getDeviceData }; // Opzionale: ritorna i dati per usarli altrove
}

async function collectDeviceStats() {
    let info = {
        os: "Unknown",
        model: "Unknown",
        screenSize: `${window.screen.width}x${window.screen.height}`,
        isTouch: ('ontouchstart' in window || navigator.maxTouchPoints > 0),
        browser: navigator.userAgent
    };

    // 1. TENTATIVO CON API MODERNE (Client Hints)
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        try {
            const highEntropy = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
            info.model = highEntropy.model || "Unknown";
            info.os = `${highEntropy.platform} ${highEntropy.platformVersion}`;
        } catch (e) { 
            // Fallback al parsing manuale
        }
    }

    // 2. ANALISI STRINGA USER AGENT (Fallback o Raffinamento)
    const ua = navigator.userAgent;

    if (info.model === "Unknown" || info.model === "") {
        // --- ANDROID ---
        if (/android/i.test(ua)) {
            info.os = "Android";
            // Regex migliorata: cerca il testo dopo la versione di Android, fermandosi al primo punto e virgola o alla fine della parentesi
            // Esempio: "Mozilla/5.0 (Linux; Android 13; Pixel 6) ..." -> Pixel 6
            const androidMatch = ua.match(/Android\s+[^;]+;\s+([^;)]+)/);
            if (androidMatch) {
                info.model = androidMatch[1].split('Build/')[0].trim();
            } else {
                info.model = "Android Device";
            }
        } 
        // --- iOS (iPhone/iPad) ---
        else if (/iPhone|iPad|iPod/i.test(ua)) {
            info.os = "iOS";
            // Apple nasconde il modello esatto (es. iPhone 15) per privacy.
            // Possiamo però distinguere tra iPhone e iPad.
            if (/iPad/.test(ua)) {
                info.model = "iPad";
            } else if (/iPhone/.test(ua)) {
                info.model = "iPhone";
            }
            // Aggiungiamo la risoluzione per aiutare l'identificazione manuale
            info.model += ` (${info.screenSize})`;
        }
        // --- DESKTOP ---
        else if (/Windows/i.test(ua)) {
            info.os = "Windows";
            info.model = "PC Desktop";
        }
        else if (/Macintosh/i.test(ua)) {
            info.os = "MacOS";
            info.model = "Mac";
        }
    }

    return info;
}

function popolaGiocatoriA(datiRoster) {
  if (!datiRoster || !Array.isArray(datiRoster)) return;

  // Ordiniamo il roster per numero di maglia (opzionale, ma consigliato per consistenza)
  const rosterOrdinato = [...datiRoster].sort((a, b) => 
    parseInt(a["Numero Maglia"]) - parseInt(b["Numero Maglia"])
  );

  // Mappiamo i nomi nel formato "I. Cognome"
  giocatoriA = rosterOrdinato.map(p => {
    const iniziale = p.Nome ? p.Nome.charAt(0).toUpperCase() + ". " : "";
    return iniziale + p.Cognome;
  });

  // Mappiamo i numeri (come stringhe)
  numeriMaglia = rosterOrdinato.map(p => String(p["Numero Maglia"]));

  console.log("Roster mappato con successo:", giocatoriA.length, "giocatori.");
}

function isQuintettoCompleto() {
    return giocatoriObj.filter(g => g.stato === "In").length === 5;
}

function GetCognome(idGiocatore) {
  // 1. Troviamo l'indice del giocatore cercando l'ID (convertito in stringa) 
  // nell'array numeriMaglia
  const index = numeriMaglia.findIndex(n => String(n) === String(idGiocatore));

  // 2. Se l'ID non viene trovato, restituiamo il nome della squadra avversaria
  if (index === -1) return ((teamA === "Polismile A") ? teamB : teamA);

  // 3. Recuperiamo la stringa completa (es: "N. Cognome") dall'array giocatoriA
  const nomeCompleto = giocatoriA[index];

  // 4. Dividiamo la stringa: il primo elemento è l'iniziale del nome, 
  // il resto (gestendo cognomi composti) è il cognome
  const parti = nomeCompleto.split(" ");

  // Rimuoviamo il primo elemento (iniziale del nome) e riuniamo il resto
  const cognome = parti.slice(1).join(" ");

  return cognome;
}

function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

function vibrate(milliseconds) {
  if (isMobile()) {
      if (navigator.vibrate) navigator.vibrate(milliseconds); // Funziona solo su Android/Chrome
  }
}

function hmsToSeconds(hms) {
  if (!hms || typeof hms !== 'string') return 0;
  const [h, m, s] = hms.split(':').map(Number);
  return (h * 3600) + (m * 60) + s;
}

function secondsToHms(d) {
  d = Number(d);
  
  // 1. Definiamo i secondi totali in un giorno
  const SECONDI_IN_24H = 86400;

  // 2. Applichiamo il modulo matematico per restare nel range 0 - 86399
  // Questa formula gestisce correttamente anche i numeri negativi
  var secondiNormalizzati = ((d % SECONDI_IN_24H) + SECONDI_IN_24H) % SECONDI_IN_24H;

  // 3. Calcoliamo ore, minuti e secondi sui secondi normalizzati
  var h = Math.floor(secondiNormalizzati / 3600);
  var m = Math.floor((secondiNormalizzati % 3600) / 60);
  var s = Math.floor(secondiNormalizzati % 60);

  // 4. Formattazione con zero iniziale (pad)
  return (h < 10 ? "0" + h : h) + ":" + 
         (m < 10 ? "0" + m : m) + ":" + 
         (s < 10 ? "0" + s : s);
}

function aggiungiSecondiAOrario(orarioStr, secondiDaAggiungere) {
  if (!orarioStr) return "00:00:00";
  let totalSeconds = hmsToSeconds(orarioStr) + parseInt(secondiDaAggiungere || 0);

  // Riconversione in HH:MM:SS
  let h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  let m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  let s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Restituisce l'ID del video attualmente in live streaming sul canale @ItIsPolitime.
 * @param {string} apiKey - La tua YouTube Data API Key.
 * @returns {Promise<string>} - L'ID del video live o un messaggio di errore.
 */
function getCurrentLiveIdByChannel(apiKey) {

//  var channelId = "UCQfwfsi5VrQ8yKZ-UWmAEFg";   // L'ID del canale per France 24 English è UCQfwfsi5VrQ8yKZ-UWmAEFg
  var channelId = "UCZFhQQaIv8Uv59c_4WnlBPA";   // L'ID del canale per @ItIsPolitime è UCZFhQQaIv8Uv59c_4WnlBPA
  
  // Endpoint search filtrato per tipo 'video' ed eventType 'live'
  var apiUrl = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=" + 
               channelId + "&type=video&eventType=live&key=" + apiKey;

  return fetch(apiUrl)
    .then(function (response) {
      if (!response.ok) throw new Error("Errore API YouTube: " + response.status);
      return response.json();
    })
    .then(function (data) {
      if (data.items && data.items.length > 0) {
        // Restituisce l'ID del primo (e solitamente unico) video in diretta
        return data.items[0].id.videoId;
      } else {
        throw new Error("Il canale non è attualmente in live streaming.");
      }
    })
    .catch(function (error) {
      console.error("Errore:", error.message);
      throw error;
    });
}

// Esempio di utilizzo:
// getCurrentLiveIdByChannel("LA_TUA_API_KEY")
//   .then(id => console.log("ID del video live attuale: " + id))
//   .catch(err => console.log(err.message));

function getLiveStartTimeById(youtubeUrl, apiKey) {
  // 
  // Accetta l'URL di un video YouTube e restituisce l'ora di inizio reale.
  // @param {string} youtubeUrl - L'indirizzo completo del video.
  // @param {string} apiKey - La tua YouTube Data API Key.
  // @returns {Promise<string>} - Una stringa con la data/ora o l'errore.
  // 

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
    .then(function (response) {
      if (!response.ok) throw new Error("Errore API: " + response.status);
      return response.json();
    })
    .then(function (data) {
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

function formattaOrarioRoma(isoString) {
  try {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return "00:00:00";

    // Converte e formatta per il fuso orario di Roma (gestisce ora legale/solare)
    return data.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    return "00:00:00";
  }
}

function CheckYoutubeAndASave(videoId, myApiKey) {
  /**
   * Controlla l'orario di inizio, lo salva localmente in formato HH:MM:SS (Roma)
   * usando la chiave yt_start_. In caso di errore restituisce "00:00:00".
   */


  if (!videoId) {
    return Promise.resolve("00:00:00");
  }

  // 1. Controllo LocalStorage con la chiave richiesta
  var datoSalvato = localStorage.getItem("yt_start_" + videoId);

  if (datoSalvato) {
    // Se il dato è già un orario HH:MM:SS lo restituisce, 
    // se fosse ancora in formato ISO lo formatta al volo
    if (datoSalvato.includes("T") || datoSalvato.includes("Z")) {
      return Promise.resolve(formattaOrarioRoma(datoSalvato));
    }
    console.log("Dato recuperato dalla memoria locale (yt_start_):", datoSalvato);
    return Promise.resolve(datoSalvato);
  }

  // 2. Se non c'è, procediamo con la chiamata API YouTube
  return getLiveStartTimeById(videoId, myApiKey)
    .then(function (startTimeISO) {
      // Trasformiamo l'ora ISO ricevuta da YouTube in ora di Roma
      const oraRoma = formattaOrarioRoma(startTimeISO);

      // Salviamo l'ora di Roma nel localStorage con la chiave yt_start_
      localStorage.setItem("yt_start_" + videoId, oraRoma);

      console.log("Successo! Ora salvata in yt_start_:", oraRoma);
      return oraRoma;
    })
    .catch(function (errore) {
      throw new Error("Errore durante il recupero da YouTube: " + errore);
      //alert("Errore durante il recupero da YouTube:", errore);
      //return "00:00:00";
    });
}

function extractYouTubeId(input) {
  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const urlObj = new URL(input);
    if (urlObj.searchParams.has("v")) return urlObj.searchParams.get("v");
    if (urlObj.hostname.includes("youtu.be")) return urlObj.pathname.slice(1);
    if (urlObj.pathname.includes("/embed/")) return urlObj.pathname.split("/embed/")[1].split(/[?&]/)[0];
    if (urlObj.pathname.includes("/live/")) return urlObj.pathname.split("/live/")[1].split(/[?&]/)[0];
    return "";
  } catch (e) {
    return "";
  }
}

function extractYoutubeTime(input) {
  try {
    if (input === "") return 0;
    const urlObj = new URL(input);
    if (urlObj.searchParams.has("t")) {
      const t = urlObj.searchParams.get("t");
      const match = t.match(/(?:(\d+)m)?(?:(\d+)s)?$/);
      if (match) {
        const minutes = parseInt(match[1] || "0", 10);
        const seconds = parseInt(match[2] || "0", 10);
        return minutes * 60 + seconds;
      }
      return parseInt(t, 10);
    }
    return 1; // ATTENZIONE: PEZZA altrimenti non funzionano gli highlights. Prima era 0
  } catch (e) {
    console.error("Input non valido:", e);
    return 1; // ATTENZIONE: PEZZA altrimenti non funzionano gli highlights. Prima era 0
  }
}

function createAdminPopup() {
  // 1. Verifica se esiste già
  let popup = document.getElementById("adminPopup");

  if (popup) {
    popup.style.display = "flex";
    const inputPass = document.getElementById("adminPassword");
    setTimeout(() => inputPass.focus(), 50);
    return;
  }

  // 2. Iniezione degli STILI INLINE (CSS-in-JS)
  const style = document.createElement('style');
  style.textContent = `
    #adminPopup {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.85); /* Fallback per var(--overlay) */
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }
    #adminPopup .popup-content {
      background-color: #1e1e1e; /* Fallback per var(--card-color) */
      border: 2px solid #ffcc00; /* Fallback per var(--primary) */
      border-radius: 20px;
      padding: 3rem;
      width: 85%;
      max-width: 32rem;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }
    #adminPopup h3 {
      margin: 0 0 1.5rem 0;
      color: #ffcc00;
      font-size: 2.2rem;
      font-family: sans-serif;
    }
    #adminPassword {
      width: 100%;
      padding: 1.2rem;
      margin-bottom: 2rem;
      border-radius: 10px;
      border: 1px solid #444;
      background: #2a2a2a;
      color: white;
      font-size: 1.8rem;
      text-align: center;
      box-sizing: border-box;
    }
    .popup-buttons {
      display: flex;
      gap: 1rem;
    }
    #confirmAdmin, #closeAdmin {
      flex: 1;
      padding: 1.2rem;
      border-radius: 10px;
      border: none;
      font-weight: bold;
      font-size: 1.4rem;
      cursor: pointer;
      text-transform: uppercase;
    }
    #confirmAdmin { background-color: #ffcc00; color: black; }
    #closeAdmin { background-color: #444; color: white; }
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);

  // 3. Creazione dell'elemento POPUP
  popup = document.createElement("div");
  popup.id = "adminPopup";
  popup.innerHTML = `
    <div class="popup-content">
      <h3>Accesso Admin</h3>
      <input type="password" id="adminPassword" placeholder="Password" />
      <div class="popup-buttons">
        <button id="confirmAdmin">Conferma</button>
        <button id="closeAdmin">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const inputPass = document.getElementById("adminPassword");
  setTimeout(() => inputPass.focus(), 50);

  // --- LOGICA FUNZIONALE ---

  const closePopup = () => {
    popup.style.display = "none";
    inputPass.value = ""; // Pulisce la pass alla chiusura
  };

  const handleLogin = () => {
    const pass = inputPass.value;
    if (pass === "007") {
      isAdmin = true;
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("AdminPassword", pass);

      const adminBtn = document.getElementById("adminBtn");
      if (adminBtn) {
        adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      }
      closePopup();
    } else {
      alert("Password errata!");
    }
  };

  // Event Listeners
  document.getElementById("closeAdmin").onclick = closePopup;
  document.getElementById("confirmAdmin").onclick = handleLogin;

  inputPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  });

  popup.addEventListener("click", (e) => {
    if (e.target === popup) closePopup();
  });
}

function Login() {
    // 1. Se l'utente è già Admin, gestiamo il Logout
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (isAdmin) {
        if (confirm("Vuoi uscire dalla modalità Admin?")) {
            localStorage.setItem("isAdmin", "false");
            localStorage.setItem("AdminPassword", "");
            location.reload();
        }
        return;
    }

    // 2. Se non è admin, mostriamo il popup di login
    if (typeof createAdminPopup === "function") {
        createAdminPopup();
        // Assicuriamoci che sia visibile
        const p = document.getElementById("adminPopup");
        p.classList.remove("hidden");
        p.style.display = "flex";
    }
}

async function aggiornaDatiRosterEStats(what = "all") {
    /**
     * Carica Roster e/o Statistiche in base al parametro 'what' e li salva nel localStorage.
     * @param {string} what - "all", "roster", "stats" o null.
     * @returns {Promise<object|null>} I dati caricati o null in caso di errore.
     */
    const loadingEl = document.getElementById("loading");
    
    try {
        const promises = [];
        const types = [];

        // Definiamo cosa caricare
        const caricaRoster = (what === "all" || what === "roster" || what === null);
        const caricaStats = (what === "all" || what === "stats" || what === null);

        // Prepariamo la fetch per il Roster
        if (caricaRoster) {
            const paramsRoster = new URLSearchParams({
                sheet: "Roster",
                userId: userId,
                action: "Get Roster",
                details: JSON.stringify(getDeviceData)
            });
            promises.push(fetch(`${url}?${paramsRoster.toString()}`).then(res => res.json()));
            types.push("roster");
        }

        // Prepariamo la fetch per le Statistiche
        if (caricaStats) {
            const paramsStats = new URLSearchParams({
                getAllStats: "1",
                userId: userId,
                action: "Get All Stats",
                details: JSON.stringify(getDeviceData)
            });
            promises.push(fetch(`${url}?${paramsStats.toString()}`).then(res => res.json()));
            types.push("stats");
        }

        // Esecuzione delle fetch (parallele se più di una)
        const risultati = await Promise.all(promises);
        const dataResponse = {};

        risultati.forEach((data, index) => {
            const type = types[index];
            if (type === "roster") {
                localStorage.setItem("datiRoster", JSON.stringify(data));
                dataResponse.roster = data;
            } else if (type === "stats") {
                localStorage.setItem("datiTutteLeStats", JSON.stringify(data));
                dataResponse.stats = data;
            }
        });

        return dataResponse;

    } catch (e) {
        console.error("Errore fetch:", e);
        if (loadingEl) {
            loadingEl.innerText = "Errore nel caricamento dati dal server.";
        }
        return null;
    }
}

function salvaDatiMappa(partite) {
    /**
     * Elabora l'elenco delle partite e salva i luoghi univoci nel localStorage.
    *  @param {Array} partite - Array di oggetti partita.
    */
    if (!partite || !Array.isArray(partite)) return;

    const datiLocali = [];
    const setLuoghiUnici = new Set();

    partite.forEach(p => {
        // Verifica che esistano luogo e coordinate validi
        const haLuogo = p.luogo && p.luogo.trim() !== "";
        const haCoordinate = p.coordinate && p.coordinate.trim() !== "";

        if (haLuogo && haCoordinate) {
            // Gestione logica Avversario
            let avversario = "";
            const sA = p.squadraA ? p.squadraA.trim() : "";
            const sB = p.squadraB ? p.squadraB.trim() : "";

            if (sA === "Polismile A") {
                avversario = sB;
            } else if (sB === "Polismile A") {
                avversario = sA;
            } else {
                avversario = `${sA} vs ${sB}`;
            }

            // Identificazione Campionato (U14 se matchId contiene "14", altrimenti U15)
            const campionatoMatch = p.matchId?.toString().includes("14") ? "U14" : "U15";
            
            // Chiave per evitare duplicati nello stesso luogo e data
            const chiaveUnica = (p.luogo.trim() + p.data).toLowerCase();

            if (!setLuoghiUnici.has(chiaveUnica)) {
                setLuoghiUnici.add(chiaveUnica);
                
                datiLocali.push({
                    campionato: campionatoMatch,
                    dataPartita: p.data,
                    orario: p.orario,
                    luogo: p.luogo.trim(),
                    coordinate: p.coordinate.trim(),
                    avversario: avversario
                });
            }
        }
    });

    // Salvataggio finale
    localStorage.setItem("mappaLuoghi", JSON.stringify(datiLocali));
}

function saveToServerEventoLive(idGiocatore, puntiRealizzati, timestampReale, team, action) {
  if (!matchId) {
    console.error("Errore: matchId non trovato.");
    return;
  }

  // Controllo validità quintetto per i cambi
  if ((action !== "undo") && (puntiRealizzati === "In" || puntiRealizzati === "Out") && !isQuintettoCompleto()) return;

  // --- COSTRUZIONE DEL JSON PER IL CAMPO NOTE ---
  const noteObj = {
    quintetto: getNumeriGiocatoriIn(), // I numeri dei giocatori attualmente in campo
    quarto: quartoAttuale        
  };
  
  // Trasformiamo l'oggetto in una stringa JSON
  const noteJSON = JSON.stringify(noteObj);
  // ----------------------------------------------

  const formData = new FormData();

  formData.append("live", "1");
  formData.append("matchId", matchId);
  formData.append("idGiocatore", idGiocatore);
  formData.append("puntiRealizzati", puntiRealizzati);
  formData.append("action", action);
  formData.append("squadra", team);

  let AoB = "";
  if (teamA === "Polismile A") {
    AoB = (team === teamA) ? "A" : "B";
  } else {
    AoB = (team === teamB) ? "B" : "A";
  }
  formData.append("AoB", AoB);
  formData.append("timestampReale", timestampReale);

  // Inseriamo la stringa JSON nel campo note
  formData.append("note", noteJSON);

  fetch(url, {
    method: "POST",
    body: formData
  })
  .then(response => {
    if (!response.ok) throw new Error('Errore di rete');
    return response.json();
  })
  .then(data => {
    console.log(`[SERVER RESPONSE] Status: ${data.status}, Message: ${data.message}`);
    console.log(`[LIVE] Elaborato: ${idGiocatore} -> ${puntiRealizzati}`);
  })
  .catch(error => {
    console.error("Errore nell'invio o nella lettura della risposta:", error);
  });
}

// Funzione che crea l'HTML del popup al caricamento della pagina
function injectUniversalPopup() {
    const popupHTML = `
    <div id="universalPopup" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.85); z-index: 9999; display: none; justify-content: center; align-items: center; padding: 10px;">
        <div class="popup-content" style="background: #1e1e1e; border: 2px solid #27ae60; border-radius: 15px; padding: 2rem; width: 90%; max-width: 280px; text-align: center; box-sizing: border-box; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <i id="uPopupIcon" class="fas fa-info-circle" style="font-size: 4rem; color: #27ae60; margin-bottom: 1rem;"></i>
            <div id="uPopupMessage" style="font-size: 1.6rem; margin: 1.5rem 0; color: white; line-height: 1.4; word-wrap: break-word; max-height: 60vh; overflow-y: auto;"></div>
            <button class="popup-btn" onclick="closeUniversalPopup()" style="background: #27ae60; color: white; border: none; padding: 1rem 3rem; border-radius: 8px; font-weight: bold; cursor: pointer; text-transform: uppercase; width: 100%; max-width: 150px;">OK</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

// Funzione per mostrare il popup
function alertCustom(messaggio, icona = 'fa-info-circle') {
    const popup = document.getElementById('universalPopup');
    if (!popup) return; // Sicurezza se non ancora iniettato
    
    document.getElementById('uPopupMessage').innerText = messaggio;
    document.getElementById('uPopupIcon').className = 'fas ' + icona;
    
    popup.style.display = 'flex';
    popup.classList.remove('hidden');
}

// Funzione per chiudere
function closeUniversalPopup() {
    const popup = document.getElementById('universalPopup');
    if (popup) popup.style.display = 'none';
}

function getNumeriGiocatoriIn() {
  // Filtra i giocatori con stato "In" e prende solo il valore del numero
  const numeriIn = giocatoriObj
    .filter(g => g.stato === "In")
    .map(g => g.numero); // Prende il valore così com'è (es. 11 o "11")

  // 2. Ordina l'array in modo numerico crescente
  numeriIn.sort((a, b) => parseInt(a) - parseInt(b));

  // Crea la stringa finale unendo i valori con la virgola
  return `[${numeriIn.join(",")}]`;
}