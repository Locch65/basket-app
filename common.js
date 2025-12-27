// common.js - Funzioni e variabili condivise
const url = "https://script.google.com/macros/s/AKfycbx4hX7_B0Iqkll1dRNzXa-sgNG6FQJQuqBlairJApKK-fsNDzNl0I70Hma8_-pi4Q75Tw/exec";

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

function CheckYoutubeAndASave(videoId, myApiKey) {
    // 
    // Controlla l'orario di inizio e restituisce una stringa "HH:MM:SS".
    // In caso di errore restituisce "00:00:00".
    // 
    // Funzione interna per formattare la data ISO in HH:MM:SS
    const formattaOrario = (isoString) => {
        try {
            const data = new Date(isoString);
            if (isNaN(data.getTime())) return "00:00:00";
            
            const ore = String(data.getHours()).padStart(2, '0');
            const minuti = String(data.getMinutes()).padStart(2, '0');
            const secondi = String(data.getSeconds()).padStart(2, '0');
            
            return `${ore}:${minuti}:${secondi}`;
        } catch (e) {
            return "00:00:00";
        }
    };

    if (!videoId) {
        return Promise.resolve("00:00:00");
    }

    // 1. Controllo LocalStorage
    var datoSalvato = localStorage.getItem("yt_start_" + videoId);
    if (datoSalvato) {
        console.log("Dato recuperato (cache):", datoSalvato);
        return Promise.resolve(formattaOrario(datoSalvato));
    }

    // 2. Chiamata API YouTube
    return getLiveStartTimeById(videoId, myApiKey)
        .then(function(startTime) {
            // Salviamo il valore originale (ISO) nel localStorage
            localStorage.setItem("yt_start_" + videoId, startTime);
            // Restituiamo il valore formattato
            return formattaOrario(startTime);
        })
        .catch(function(errore) {
            console.error("Errore YouTube:", errore);
            // In caso di errore restituiamo il valore di default
            return "00:00:00";
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
