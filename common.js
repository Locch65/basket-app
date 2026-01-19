// common.js - Funzioni e variabili condivise
const url = 
"https://script.google.com/macros/s/AKfycbw2_Fc16irIpvzFI4rTwXp85LF3qnPvgcMFrCdgYBDMy_ZO_NpQPrNabK_SoSrjhlL_NA/exec"

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
  "E. Carfora","K. Popa","G. Giacco","H. Taylor","C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "26", "41", "29", "99"];

function getTeamName() {
	return (teamA === "Polismile A") ? teamA : teamB;
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

function hmsToSeconds(hms) {
    if (!hms || typeof hms !== 'string') return 0;
    const [h, m, s] = hms.split(':').map(Number);
    return (h * 3600) + (m * 60) + s;
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

function formattaOrarioRoma (isoString){
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
        .then(function(startTimeISO) {
            // Trasformiamo l'ora ISO ricevuta da YouTube in ora di Roma
            const oraRoma = formattaOrarioRoma(startTimeISO);
            
            // Salviamo l'ora di Roma nel localStorage con la chiave yt_start_
            localStorage.setItem("yt_start_" + videoId, oraRoma);
            
            console.log("Successo! Ora salvata in yt_start_:", oraRoma);
            return oraRoma;
        })
        .catch(function(errore) {
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
    return 0;
  } catch (e) {
    console.error("Input non valido:", e);
    return 0;
  }
}

function createAdminPopup() {
  // Verifica se esiste già per evitare duplicati
  if (document.getElementById("adminPopup")) return;

  const popup = document.createElement("div");
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

  // Funzione per chiudere il popup
  const closePopup = () => {
    document.getElementById("adminPopup").classList.add("hidden");
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
