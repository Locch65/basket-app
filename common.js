// common.js - Funzioni e variabili condivise
const url =
"https://script.google.com/macros/s/AKfycbyy6uWQYmuXcOa0D-3Ca61hIMXFEgwiYVjaruQOqRVlTTRq2OgCL8bXFvQAJETBwI-WKw/exec"

// ULTIMA FUNZIONANTE "https://script.google.com/macros/s/AKfycbxgrkXvfXs-cFLwSwC4VKOHfFqeucUfuMs4Q7R_epU6TskqIc9CwPjWL2tqAhU_tYLa3Q/exec"

//"https://script.google.com/macros/s/AKfycbyqydQs1oF1P0eFud0uAYgWiHfjkKBcKi2488TybV6CwY4WCGbbcH3VS4BGBVV7pi18DA/exec"
//"https://script.google.com/macros/s/AKfycbw4AW8USh3Cp6VJIZPWyDqqHfG8mixzjP9n9emjuvdgHAW4ZEocABAgrq8yQhoGps1MUw/exec"

// "https://script.google.com/macros/s/AKfycbyYYCrKkjBJ3jBl9k-Tw0x837pAXf0i4ezdu2Tc21OZPVff4h1mjt_uVfhbLjww8_W-pQ/exec"

//"https://script.google.com/macros/s/AKfycbytT1mu9460M0S8naYzM27knn9zOjvmBUdgFUVNN8Uuyf9vwDvdAmpt6Iz6RTwE0q-3/exec"
//"https://script.google.com/macros/s/AKfycbzrNT0V842eP_n7lm-sqINp2XwRHXq5na6YoEfHIHJbe2XxStrGwVQo2a-wNvzbAe3TAA/exec"
//"https://script.google.com/macros/s/AKfycbz-EjPJp_NONG2s4KtJYqZ5shjreIzKg6T2lUmy04wQpEVeQGY4Kxwn6fH_TDdfAx_cCg/exec"
//"https://script.google.com/macros/s/AKfycbxjDtRaQ4Y-ZkL_hwdHkMbeTV5xk8XZFr4G4tq89PzpP7lWIlV7fuKrQYHZR1MH4iwH-w/exec"
//"https://script.google.com/macros/s/AKfycby1NyR0t3GnqQvCQrQM582y9a1GxENcqqSBFdSmuNggzBHQ_vEgBh9dopmv3Jzqrcm3gw/exec"
//"https://script.google.com/macros/s/AKfycbymGqUkCc-q3sVdoIlNZAm75_oFj545EXz3AypZ3CawaY8xG6r7CVOBj6S4OfHR87InTg/exec"
//"https://script.google.com/macros/s/AKfycbxUtOQKQnt68CQ8S8hXNfQ6SKPXw9ag5nEafR5NpjUZvFsW9Bg1go5g30XbIq8yYhYj2g/exec"
//"https://script.google.com/macros/s/AKfycbyUU78OiIboiiiQjyL4PhVWFJwdLzL3lTkdAu_yPX96J-bXDd7pXFpbONhreiRxgyhiaw/exec"
//"https://script.google.com/macros/s/AKfycbwheEeXmUaCPVFSIQdYY4_L8Y46FscJ3QH0xlSL4I-f57fnGYj0Zz8I3T1m2Ja0R1PYsQ/exec"
//"https://script.google.com/macros/s/AKfycbxq20v-2HmWYQE4CH-TVOf6qKFiNc0IvLsYnQLVyqTv1n9s_zTDr0BQdC-kWQxY0Hss9Q/exec"
//"https://script.google.com/macros/s/AKfycby-q20-wr86lZECDqIsLm8WAZY_NEQ2GhY-8QO0UPTsni_CBKghTcxUhsgnsR2DmOwNxA/exec"
//"https://script.google.com/macros/s/AKfycbw2_Fc16irIpvzFI4rTwXp85LF3qnPvgcMFrCdgYBDMy_ZO_NpQPrNabK_SoSrjhlL_NA/exec"
//"https://script.google.com/macros/s/AKfycbx6PhFjEvG85LtS_VJHN0QUWbpx_0PynviQmK273IDRLKsp0vBxN-1TjzlviKvBiPmwQA/exec"
//"https://script.google.com/macros/s/AKfycbzwDJ4W1r9Wh10gDRaOc4IF0vF-GIjFiZKFxBvHrVxWHu6J4coHVpagaQx4PPK-y6gjbQ/exec"
//"https://script.google.com/macros/s/AKfycbwQ7Bt5ZuivxMTcmYKpIGWA-_ChjCB9FuMWgd8DYegDIf9x_PNX2Lt9w625HuDSBHzDpg/exec"
//"https://script.google.com/macros/s/AKfycbxH2mdeKSWbYOnFBxBvT5KAmx83RiYC2tq5t0a7WaXOnnUA_RgPAh2smBQ0Xvsw-UQbSQ/exec"
//"https://script.google.com/macros/s/AKfycbwDGniIbwT2i1ApT4jdKppzjosqUg4RKeaoPKGmaNAkrQ5_yFigpCdrLwo7DzHUnXFTLA/exec"
//"https://script.google.com/macros/s/AKfycbxrxF4QrfXwrKqYlIy-sdSKooaBRcjBwHAmFPW53H8qxUaabR5q2J96rMVjtbSPkBqEWQ/exec"
//"https://script.google.com/macros/s/AKfycbzIMK6y50A0Jpwyy1um-pcyYxys4W9cMXd-sutQGpD7greXovCPDXC0U6lbXrmWvhEgZA/exec"
//"https://script.google.com/macros/s/AKfycbz0tn8zc9uDboqvDg8YtC1PT2-d4BAbPjfnuQboTEkfboIWu4t2eYU7sL4X_f6Fr6T7Tg/exec"
//"https://script.google.com/macros/s/AKfycbzq4NE-vY7lI8eniR9lV-eayYhXtaI97-agenX1Mhu0lHHWkhk4YvARwmyHhP7dnPyn-Q/exec"
//"https://script.google.com/macros/s/AKfycbyEE1MUZ3XCHFOFd5eVFDUhPUOohU0UQd8bc3h00hepesC9zZ17eEJmRFT2scDM9hcPrg/exec"
//"https://script.google.com/macros/s/AKfycbx4hX7_B0Iqkll1dRNzXa-sgNG6FQJQuqBlairJApKK-fsNDzNl0I70Hma8_-pi4Q75Tw/exec";

const giocatoriA = [
  "C. Marasco", "E. Carfora", "K. Popa", "G. Giacco", "H. Taylor", "C. Licata", "L. Migliari", "F. Piazzano", "V. Occhipinti",
  "A. Salvatore", "R. Bontempi", "L. Ostuni", "L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
];

const numeriMaglia = ["55", "5", "18", "4", "21", "15", "34", "20", "31", "25", "11", "23", "17", "9", "26", "41", "29", "99"];

function getTeamName() {
  return (teamA === "Polismile A") ? teamA : teamB;
}

let userId = undefined;

let getDeviceData = undefined;
function registerUserId()
{
  getDeviceData = {
    os: navigator.platform,
    userAgent: navigator.userAgent,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language
  };


  userId = localStorage.getItem('webapp_user_id') || crypto.randomUUID();
  if (!localStorage.getItem('webapp_user_id')) localStorage.setItem('webapp_user_id', userId);

  collectDeviceStats().then(stats => { getDeviceData =stats;});
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

function OLDsecondsToHms(d) {
  d = Number(d);
  var h = Math.floor(d / 3600);
  var m = Math.floor(d % 3600 / 60);
  var s = Math.floor(d % 3600 % 60);
  return (h < 10 ? "0" + h : h) + ":" + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
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
  // Verifica se esiste già per evitare duplicati
  let popup = document.getElementById("adminPopup");

  if (popup) {
    popup.classList.remove("hidden");
    popup.style.display = "flex"; // Lo mostriamo se esiste già
    // Focus dopo la prima creazione
    setTimeout(() => inputPass.focus(), 50);
    return;
  }

  popup = document.createElement("div");
  popup.id = "adminPopup";
  popup.className = "popup hidden";
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

  // Focus dopo la prima creazione
  setTimeout(() => inputPass.focus(), 50);

  // Funzione per chiudere il popup
  const closePopup = () => {
    const p = document.getElementById("adminPopup");
    p.classList.add("hidden");
    p.style.display = "none"; // Forza la scomparsa  
  };

  // Funzione di validazione
  const handleLogin = () => {
    const pass = inputPass.value;
    const storedPassword = localStorage.getItem("AdminPassword") || "";
    if (pass === "007") {
      //    if (pass === storedPassword) { 
      isAdmin = true;
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("AdminPassword", pass);


      // CAMBIO TESTO IN LOGOUT
      const adminBtn = document.getElementById("adminBtn");
      if (adminBtn) {
        adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      }

      closePopup();
    } else {
      alert("Password errata!");
    }
  };
  // 1. Click sul tasto Annulla
  document.getElementById("closeAdmin").onclick = closePopup;

  // 2. Click sul tasto Conferma
  document.getElementById("confirmAdmin").onclick = handleLogin;

  // 3. Tasto Enter nell'input
  inputPass.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  }, { passive: true });

  // 4. NUOVO: Click all'esterno (sull'overlay scuro)
  popup.addEventListener("click", (event) => {
    // Se il target del click è proprio il div 'adminPopup' (l'overlay)
    // e NON il 'popup-content' o i suoi figli
    if (event.target === popup) {
      closePopup();
    }
  }, { passive: true });
}

async function aggiornaDatiRosterEStats() {
    /**
     * Carica Roster e Statistiche in parallelo e li salva nel localStorage.
     * @returns {Promise<{roster: Array, stats: Array}|null>} I dati caricati o null in caso di errore.
     */
    const loadingEl = document.getElementById("loading");
    
    try {
        // Parametri per le statistiche
        const paramsStats = new URLSearchParams({
            getAllStats: "1",
            userId: userId, // Presuppone userId globale
            action: "Get All Stats",
            details: JSON.stringify(getDeviceData) // Presuppone getDeviceData globale
        });

        // Parametri per il Roster
        const paramsRoster = new URLSearchParams({
            sheet: "Roster",
            userId: userId,
            action: "Get Roster",
            details: JSON.stringify(getDeviceData)
        });

        // Esecuzione parallela delle fetch
        const [resRoster, resStats] = await Promise.all([
            fetch(`${url}?${paramsRoster.toString()}`),
            fetch(`${url}?${paramsStats.toString()}`)
        ]);

        if (!resRoster.ok || !resStats.ok) {
            throw new Error("Risposta server non valida");
        }

        const rosterData = await resRoster.json();
        const statsData = await resStats.json();

        // Salvataggio in cache
        localStorage.setItem("datiRoster", JSON.stringify(rosterData));
        localStorage.setItem("datiTutteLeStats", JSON.stringify(statsData));

        return { roster: rosterData, stats: statsData };

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
  // 
  // Invia un evento di punteggio live al backend utilizzando FormData.
  // @param {string} idGiocatore - L'ID del giocatore (es. "Cognome_Nome").
  // @param {number} puntiRealizzati - I punti segnati (1, 2 o 3).
  // 


  if (!matchId) {
    console.error("Errore: matchId non trovato.");
    return;
  }

  // 1. Creazione dell'oggetto FormData
  const formData = new FormData();

  // 2. Aggiunta dei parametri (il backend leggerà questi tramite e.parameter)
  formData.append("live", "1"); // Attiva il blocco live nel doPost
  formData.append("matchId", matchId);
  formData.append("idGiocatore", idGiocatore);
  formData.append("puntiRealizzati", puntiRealizzati);
  formData.append("action", action);
  formData.append("squadra", team);
  formData.append("AoB", team === teamA ? "A" : "B");

  // Timestamp reale
  //const timestampReale = new Date().toLocaleTimeString('it-IT');
  formData.append("timestampReale", timestampReale);

  // Ora video (calcolata se hai una funzione o un timer attivo)
  const oraVideo = typeof getCurrentGameTime === 'function' ? getCurrentGameTime() : "00:00:00";
  formData.append("oraVideo", oraVideo);

  // 3. Invio della richiesta fetch
  // fetch(url, {
  //   method: "POST",
  //   mode: "no-cors", // Cruciale per Google Apps Script
  //   body: formData   // Passiamo direttamente l'oggetto FormData
  // })
  // .then(() => {
  //   console.log(`[LIVE] Inviato con successo: ${idGiocatore} +${puntiRealizzati}`);
  // })
  // .catch(error => {
  //   console.error("Errore nell'invio FormData live:", error);
  // });

fetch(url, {
  method: "POST",
  body: formData
})
.then(response => {
  if (!response.ok) throw new Error('Errore di rete');
  return response.json(); // Legge il JSON inviato dal doPost
})
.then(data => {
  console.log(`[SERVER RESPONSE] Status: ${data.status}, Message: ${data.message}`);
  console.log(`[LIVE] Elaborato: ${idGiocatore} -> ${puntiRealizzati}`);
})
.catch(error => {
  console.error("Errore nell'invio o nella lettura della risposta:", error);
});

}
