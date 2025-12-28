// common.js - Funzioni e variabili condivise
const url = 
"https://script.google.com/macros/s/AKfycbz0tn8zc9uDboqvDg8YtC1PT2-d4BAbPjfnuQboTEkfboIWu4t2eYU7sL4X_f6Fr6T7Tg/exec"

//"https://script.google.com/macros/s/AKfycbzq4NE-vY7lI8eniR9lV-eayYhXtaI97-agenX1Mhu0lHHWkhk4YvARwmyHhP7dnPyn-Q/exec"
//"https://script.google.com/macros/s/AKfycbyEE1MUZ3XCHFOFd5eVFDUhPUOohU0UQd8bc3h00hepesC9zZ17eEJmRFT2scDM9hcPrg/exec"
//"https://script.google.com/macros/s/AKfycbx4hX7_B0Iqkll1dRNzXa-sgNG6FQJQuqBlairJApKK-fsNDzNl0I70Hma8_-pi4Q75Tw/exec";

const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor","C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "26", "41", "29", "99"];

function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

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
