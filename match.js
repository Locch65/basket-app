// =====================
// VERSIONE SCRIPT
// =====================
const SCRIPT_VERSION = "1.0.97";  // Aggiorna questo numero ad ogni modifica

let convocazioni = "";
let puntiSquadraA = 0;
let puntiSquadraB = 0;
let historyB = [];
let contatoriB = {1:0,2:0,3:0};
let ultimoOrdinamento = "numero";
let score = 0;
let scoreB = 0;
let isAdmin = false;
let listaGiocatoriCorrente = []; // per ricaricare la lista dopo login
let matchId = null;
let teamA = "";
let teamB = "";
let isLive = false;
let oraInizioDiretta = "";
let statoPartita = "";
let lastScoreState = ""; 
let lastQuartoState = "";
let quartoAttuale = ""; // Variabile globale per il quarto attuale
let googleApiKey = "";

let refreshTimer = null; // variabile globale per l'ID del timer

const giocatoriObj = giocatoriA.map((nomeCompleto, index) => {
  const [nome, cognome] = nomeCompleto.split(" ");
  return {
    id: `${cognome}_${nome}`,
    numero: numeriMaglia[index],
    nome,
    cognome,
    displayName: `${cognome} ${nome}`,
    punteggio: 0,
    contatori: {1:0,2:0,3:0},
    history: [], // Qui verranno inseriti oggetti {punti: X, ora: "HH:mm:ss"}
    stato: "Out"
  };
});

/**
 * Modifica l'ora di inizio o il timestamp
 * @param {number} incremento - Può essere +1 o -1
 */
function modificaOraInizioDiretta(delta) {
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
    
    console.log("Nuovo Start Time impostato:", oraInizioDiretta);

    
    // Se sei Admin, potresti voler inviare questo aggiornamento al server/DB
    if (isAdmin) {
        salvaDatiPartita(); // La tua funzione esistente per salvare su Google Sheets
    }
}

function calcolaOraInizioDirettaYoutube() {
    console.log("Eseguo il calcolo dell'ora dall'URL inserito...");

    // 1. Recuperiamo i valori aggiornati dai campi del popup
    const urlInserito = document.getElementById("ytUrl").value.trim();
    const apiKeyInserita = document.getElementById("ytApiKey").value.trim();
    const inputOraInizio = document.getElementById("ytOraInizio");

    // 2. Estraiamo il videoId dall'URL usando la funzione che abbiamo in common.js
    const videoId = extractYouTubeId(urlInserito);

    if (!videoId) {
        alert("URL YouTube non valido. Impossibile estrarre l'ID.");
        return;
    }

    if (!apiKeyInserita) {
        alert("Inserisci l'API Key per procedere al calcolo.");
        return;
    }

    // Cambiamo temporaneamente il testo del bottone per feedback all'utente
    const btn = document.getElementById("ytCalcolaBtn");
    const testoOriginale = btn.textContent;
    btn.textContent = "Attendere...";
    btn.disabled = true;

    // 3. Chiamiamo la funzione che interroga YouTube
    CheckYoutubeAndASave(videoId, apiKeyInserita).then(orario => {
        console.log("Orario inizio partita ricevuto:", orario); 
        
        // 4. Inseriamo il risultato nell'input di tipo "time" del popup
        // orario è già in formato "HH:MM:SS" grazie alla modifica precedente
        inputOraInizio.value = orario;

        // Ripristiniamo il bottone
        btn.textContent = testoOriginale;
        btn.disabled = false;
    }).catch(err => {
        //console.error("Errore nel calcolo:", err);
		alert(err);
        //inputOraInizio.value = "00:00:00";
        btn.textContent = testoOriginale;
        btn.disabled = false;
    });
}

function gestisciDirettaYoutube() {
    const overlay = document.createElement('div');
    overlay.id = 'youtubePopup';
    overlay.className = 'popup';

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.textAlign = 'left';

    const urlIniziale = (typeof videoURL !== 'undefined') ? videoURL : "";
    const apiKeyCorrente = googleApiKey || "";
    
    // Recuperiamo l'orario salvato per l'ID corrente (se esiste)
    const videoIdIniziale = extractYouTubeId(urlIniziale);
    //const oraSalvatatYt = videoIdIniziale ? formattaOrarioRoma(localStorage.getItem("yt_start_" + videoIdIniziale) || "") : "";
    //const oraSalvatatYt = videoIdIniziale ? (localStorage.getItem("yt_start_" + videoIdIniziale) || "") : "";
    const oraSalvatatYt = oraInizioDiretta;

    content.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align:center;">Diretta Youtube</h2>
        
        <label style="display:block; font-size:1.2rem; margin-bottom: 5px;">URL:</label>
        <input type="text" id="ytUrl" style="width:100%; padding:10px; margin-bottom:15px; font-size:1rem;" 
               placeholder="https://www.youtube.com/watch?v=..." value="${urlIniziale}">

        <label style="display:block; font-size:1.2rem; margin-bottom: 5px;">Ora inizio Diretta (HH:mm:ss):</label>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="time" id="ytOraInizio" step="1" style="flex: 1; padding:10px; font-size:1rem;" value="${oraSalvatatYt}">
            <button id="ytCalcolaBtn" disabled style="padding: 10px; font-size: 1rem; cursor: not-allowed; opacity: 0.5; background-color: #3498db; color: white; border: none; border-radius: 5px;">
                Calcola
            </button>
        </div>

        <label style="display:block; font-size:1.2rem; margin-bottom: 5px;">Offset Inizio Partita (secondi):</label>
        <input type="number" id="ytOffset" style="width:100%; padding:10px; margin-bottom:15px; font-size:1rem;" 
               placeholder="Esempio: 30" value="${matchStartTime || ""}">

        <label style="display:block; font-size:1.2rem; margin-bottom: 5px;">API Key:</label>
        <input type="text" id="ytApiKey" style="width:100%; padding:10px; margin-bottom:25px; font-size:1rem;" 
               placeholder="Inserisci la tua Google API Key" value="${apiKeyCorrente}">

        <div style="display: flex; justify-content: center; gap: 20px;">
            <button id="ytSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="ytCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const urlInput = document.getElementById('ytUrl');
    const calcolaBtn = document.getElementById('ytCalcolaBtn');

    const validaUrl = (valore) => {
        const isValid = valore.startsWith('http://') || valore.startsWith('https://');
        calcolaBtn.disabled = !isValid;
        calcolaBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
        calcolaBtn.style.opacity = isValid ? '1' : '0.5';
    };

    validaUrl(urlInput.value.trim());
    urlInput.addEventListener('input', () => validaUrl(urlInput.value.trim()));

    calcolaBtn.onclick = () => calcolaOraInizioDirettaYoutube();

    document.getElementById('ytCancelBtn').onclick = () => {
        document.body.removeChild(overlay);
    };

    document.getElementById('ytSaveBtn').onclick = () => {
      let finalUrl = urlInput.value.trim();
      const offsetValue = document.getElementById('ytOffset').value;
      const oraInizioValue = document.getElementById('ytOraInizio').value;
      const apiKeyValue = document.getElementById('ytApiKey').value.trim();
      const videoId = extractYouTubeId(finalUrl);
  
      if (offsetValue && parseInt(offsetValue) >= 0) {
          try {
              let urlObj = new URL(finalUrl);
              urlObj.searchParams.set("t", offsetValue + "s");
              urlObj.searchParams.delete("start");
              finalUrl = urlObj.toString();
          } catch (e) {
              if (!finalUrl.includes('t=') && !finalUrl.includes('start=')) {
                  const separator = finalUrl.includes('?') ? '&' : '?';
                  finalUrl = `${finalUrl}${separator}t=${offsetValue}s`;
              } else {
                  finalUrl = finalUrl.replace(/([?&])(t|start)=[^&]*/, `$1t=${offsetValue}s`);
              }
          }
      }
  
      // --- SALVATAGGIO DATI ---
      videoURL = finalUrl;
      matchStartTime = offsetValue;
      googleApiKey = apiKeyValue;
	  oraInizioDiretta = oraInizioValue;

      // Salvataggio nel localStorage per persistenza
      localStorage.setItem("googleApiKey", apiKeyValue); 
      localStorage.setItem("matchStartTime", offsetValue);
      localStorage.setItem("videoURL", finalUrl);
      localStorage.setItem("oraInizioDiretta", oraInizioDiretta);
      
      // Se è stato inserito un orario manualmente o tramite calcolo, salviamolo per quell'ID
      //if (videoId && oraInizioValue) {
      //    localStorage.setItem("yt_start_" + videoId, oraInizioValue);
      //}
      
      console.log("Dati salvati correttamente nel localStorage.");
      
      salvaDatiPartita(); // Invia i dati al foglio Google
      document.body.removeChild(overlay);
    };
}

function gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.textAlign = 'left';

    content.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align:center;">Stato Partita</h2>
        
        <label style="display:block; font-size: 1.2rem; margin-bottom: 10px;">Quarto attuale:</label>
        <div id="quartiContainer" style="display: flex; gap: 8px; margin-bottom: 30px; flex-wrap: wrap;">
            <button class="btn-quarto" data-q="Q1">Q1</button>
            <button class="btn-quarto" data-q="Q2">Q2</button>
            <button class="btn-quarto" data-q="Q3">Q3</button>
            <button class="btn-quarto" data-q="Q4">Q4</button>
            <button class="btn-quarto" data-q="Extra Time" style="flex-basis: 100%; margin-top: 5px;">Extra Time</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="checkGoLive" style="width: 25px; height: 25px;">
                <label for="checkGoLive" style="font-size: 1.2rem;">Go Live</label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="checkTerminata" style="width: 25px; height: 25px;">
                <label for="checkTerminata" style="font-size: 1.2rem;">Partita terminata</label>
            </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 20px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>

        <style>
            .btn-quarto {
                flex: 1;
                min-width: 50px;
                padding: 12px 5px;
                font-size: 1.1rem;
                border: 2px solid #3498db;
                background-color: white;
                color: #3498db;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-quarto.active {
                background-color: #3498db !important;
                color: white !important;
            }
        </style>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniQuarto = content.querySelectorAll('.btn-quarto');
    const checkGoLive = document.getElementById('checkGoLive');
    const checkTerminata = document.getElementById('checkTerminata');

    // --- 1. LOGICA DI INIZIALIZZAZIONE ---
    
    checkGoLive.checked = (isLive === true || isLive === "TRUE" || isLive === "true");

    if (statoPartita === "Terminata" || statoPartita === "Fine") {
        checkTerminata.checked = true;
        checkGoLive.checked = false;
    } else {
        checkTerminata.checked = false;
        bottoniQuarto.forEach(btn => {
            const val = btn.dataset.q; // es: "1° Quarto"
            // Se statoPartita è "1" o "1° Quarto", attiva il bottone
            if (quartoAttuale && (val === quartoAttuale || quartoAttuale.toString().startsWith("Q"+val.charAt(0)))) {
                btn.classList.add('active');
            }
        });
    }

    // --- 2. GESTIONE EVENTI ---

    bottoniQuarto.forEach(btn => {
        btn.onclick = () => {
            if (checkTerminata.checked) return;
            bottoniQuarto.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    checkTerminata.onchange = () => {
        if (checkTerminata.checked) {
            checkGoLive.checked = false;
            bottoniQuarto.forEach(b => b.classList.remove('active'));
        }
    };

    checkGoLive.onchange = () => {
        if (checkGoLive.checked) checkTerminata.checked = false;
    };

    document.getElementById('liveCancelBtn').onclick = () => {
        document.body.removeChild(overlay);
    };

    // --- 3. FIX TASTO SALVA ---
    document.getElementById('liveSaveBtn').onclick = () => {
        const quartoAttivo = content.querySelector('.btn-quarto.active');
        
        // Definiamo il nuovo stato correttamente
        let nuovoStato = statoPartita; 
        if (checkTerminata.checked) {
            nuovoStato = "Terminata";
        } else if (quartoAttivo) {
            nuovoStato = quartoAttivo.dataset.q;
        }

        const dati = {
            goLive: checkGoLive.checked,
            quarto: quartoAttivo ? quartoAttivo.dataset.q : (checkTerminata.checked ? "Terminata" : statoPartita),
            terminata: checkTerminata.checked
        };
        
        console.log("Salvataggio in corso:", dati);
        
        // Chiamata alla funzione di salvataggio
        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
        } else {
            console.error("Funzione salvaStatoLive non trovata!");
        }
        
        document.body.removeChild(overlay);
    };
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
    
    salvaDatiPartita();
    aggiornaScoreboard(); // Chiamiamo l'aggiornamento per mostrare subito il cambio
}

function addPoints(points) {
  if (!isAdmin) return; // blocco minimo lato client
  score += points;
  document.getElementById("score").textContent = score;

  // Effetto flash già previsto nel tuo CSS
  const sb = document.getElementById("scoreboard");
  sb.classList.add("flash");
  setTimeout(() => sb.classList.remove("flash"), 500);
}

function aggiornaPunteggio(target, punti) {
  target.punteggio += punti;
  target.contatori[punti]++;
  
  // Memorizziamo un oggetto con punti e orario
  const oraCorrente = new Date().toLocaleTimeString('it-IT'); 
  target.history.push({ punti: punti, ora: oraCorrente });
}

function undoPunteggio(target) {
  if (target.history.length === 0) return;
  const lastEntry = target.history.pop(); // Estrae l'oggetto {punti, ora}
  const puntiDaTogliere = lastEntry.punti;
  
  target.punteggio -= puntiDaTogliere;
  target.contatori[puntiDaTogliere]--;
}

function apriConvocazioni() {
  const giocatori = giocatoriA;
  const numeri = numeriMaglia;

  // Rimuove popup esistenti per evitare duplicati
  const existingPopup = document.getElementById("convocazioniPopup");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.id = "convocazioniPopup";
  popup.className = "convocazioniPopup-overlay";

  const content = document.createElement("div");
  content.className = "convocazioniPopup-content";

  const title = document.createElement("h2");
  title.textContent = "Convocazioni";
  content.appendChild(title);

  const list = document.createElement("ul");
  list.className = "convocazioniPopup-list";

  // 1. Mappatura e Ordinamento Alfabetico per Cognome
  let listaOrdinata = giocatori.map((nomeCompleto, index) => {
    const parts = nomeCompleto.trim().split(" ");
    const nome = parts[0];
    const cognome = parts.slice(1).join(" ");
    return {
      index: index,
      nome: nome,
      cognome: cognome,
      visuale: `${cognome} ${nome}`,
      numeroMaglia: numeri[index]
    };
  });

  listaOrdinata.sort((a, b) => a.cognome.localeCompare(b.cognome));

  // 2. Recupero convocati salvati
  let convocatiNum = [];
  if (typeof convocazioni !== 'undefined' && convocazioni.trim() !== "") {
    try {
      const parsed = JSON.parse(convocazioni);
      convocatiNum = Array.isArray(parsed) ? parsed.map(n => Number(n)) : [];
    } catch (e) { console.error("Errore parse convocazioni", e); }
  }

  // 3. Generazione Lista con allineamento
  listaOrdinata.forEach((item) => {
    const li = document.createElement("li");
    li.className = "convocazioniPopup-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `conv_${item.index}`;
    checkbox.value = item.index;
    if (convocatiNum.includes(Number(item.numeroMaglia))) checkbox.checked = true;

    const label = document.createElement("label");
    label.htmlFor = `conv_${item.index}`;
    // Struttura HTML per allineamento CSS
    label.innerHTML = `
      <span class="conv-num">${item.numeroMaglia}</span>
      <span class="conv-name">${item.visuale}</span>
    `;

    li.appendChild(checkbox);
    li.appendChild(label);
    list.appendChild(li);
  });

  content.appendChild(list);

  // Bottoni Azione
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "convocazioniPopup-buttons";

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Salva";
  confirmBtn.className = "convocazioniPopup-confirmBtn";
  confirmBtn.onclick = () => {
    const selezionati = [];
    list.querySelectorAll("input[type=checkbox]:checked").forEach(cb => {
      selezionati.push(Number(numeri[cb.value]));
    });
    convocazioni = JSON.stringify(selezionati);
    localStorage.setItem("convocazioni", convocazioni);
    salvaDatiPartita();

    if (typeof renderGiocatori === "function") renderGiocatori(giocatoriObj);
    popup.remove();
  };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Annulla";
  closeBtn.className = "convocazioniPopup-closeBtn";
  closeBtn.onclick = () => popup.remove();

  buttonsContainer.append(confirmBtn, closeBtn);
  content.appendChild(buttonsContainer);
  popup.appendChild(content);
  document.body.appendChild(popup);
}

function login(pwd) {
  const adminBtn = document.getElementById("adminBtn1");

  // --- CASO LOGOUT ---
  if (isAdmin && pwd === "logout") {
    isAdmin = false;
    localStorage.setItem("isAdmin", isAdmin);
    localStorage.setItem("AdminPassword", "");
    
    if (adminBtn) {
      adminBtn.innerHTML = `<i class="fas fa-user-shield"></i> Admin`;
    }

    const squadraB = document.getElementById("squadraB");
    if (squadraB) squadraB.classList.add("hidden");

    // RIMOZIONE BOTTONI DAL MENU
    ["convocazioniBtnLi", "youtubeBtnLi", "goLiveBtnLi"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    avviaAggiornamentoAutomatico();
    renderGiocatori(listaGiocatoriCorrente);
    return;
  }

  // --- CASO LOGIN ---
  if (pwd === "007") {   
    isAdmin = true;
    interrompiAggiornamentoAutomatico();
    
    if (adminBtn) {
      adminBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Logout`;
    }

    const squadraB = document.getElementById("squadraB");
    if (squadraB) squadraB.classList.remove("hidden");
    
    const menuUl = document.querySelector("#menu ul");
    if (menuUl && !document.getElementById("youtubeBtn")) {
      
      // Creazione LI Convocazioni
      const liConv = document.createElement("li");
      liConv.id = "convocazioniBtnLi";
      liConv.innerHTML = `<button id="menuConvocazioniBtn"><i class="fas fa-list-ul"></i> Convocazioni</button>`;
      
      // Creazione LI Youtube
      const liYoutube = document.createElement("li");
      liYoutube.id = "youtubeBtnLi";
      liYoutube.innerHTML = `<button id="youtubeBtn"><i class="fab fa-youtube"></i> Diretta Youtube</button>`;
      
      // Creazione LI Go Live
      const liGoLive = document.createElement("li");
      liGoLive.id = "goLiveBtnLi";
      liGoLive.innerHTML = `<button id="goLiveBtn"><i class="fas fa-broadcast-tower"></i> Go Live</button>`;
      
      // Append nell'ordine richiesto: Convocazioni, poi Youtube, poi Go Live
      menuUl.appendChild(liConv);
      menuUl.appendChild(liYoutube);
      menuUl.appendChild(liGoLive);
	  
	  // 2. SPOSTA IL LOGOUT ALLA FINE
      // Cerchiamo il LI che contiene il bottone adminBtn (Logout)
      const liLogout = adminBtn.closest("li");
      if (liLogout) {
        menuUl.appendChild(liLogout); // In JS, appendChild su un elemento già esistente lo SPOSTA alla fine
      }

      // Eventi
      document.getElementById("menuConvocazioniBtn").onclick = () => {
        apriConvocazioni();
        document.getElementById("menu").classList.add("hidden");
      };

      document.getElementById("youtubeBtn").onclick = () => {
        gestisciDirettaYoutube();
        document.getElementById("menu").classList.add("hidden");
      };

      document.getElementById("goLiveBtn").onclick = () => {
        gestisciGoLive();
        document.getElementById("menu").classList.add("hidden");
      };
    }

    // initOrdinamenti(); // <-- PUOI RIMUOVERE O COMMENTARE QUESTA CHIAMATA
    aggiornaTitoli();
    initSquadraBControls(); 
    renderGiocatori(listaGiocatoriCorrente);
	abilitaClickQuarto();
	
  } else {
    alert("Password errata.");
  }
}
//
function abilitaClickQuarto() {
  const rettangoloQuarto = document.getElementById("periodoAttuale");
  
  if (isAdmin && rettangoloQuarto) {
    // Aggiunge la classe per il cursore puntatore
    rettangoloQuarto.classList.add("admin-clickable");
    
    // Rimuove eventuali listener precedenti per evitare doppie aperture
    rettangoloQuarto.onclick = () => {
      if (typeof gestisciGoLive === "function") {
        gestisciGoLive(); //
      }
    };
  } else if (rettangoloQuarto) {
    rettangoloQuarto.classList.remove("admin-clickable");
    rettangoloQuarto.onclick = null;
  }
}

function showSquadraBPopup() {
  // Rimuovi eventuale popup già aperto
  const existing = document.getElementById("squadraBPopup");
  if (existing) existing.remove();

  // Contenitore overlay
  const overlay = document.createElement("div");
  overlay.id = "squadraBPopup";
  overlay.className = "popup";

  // Contenuto popup
  const content = document.createElement("div");
  content.className = "popup-content";

  // Header con nome squadra
  const header = document.createElement("h2");
  header.textContent = (teamA === "Polismile A") ? teamB : teamA;
  content.appendChild(header);

  // Riga punteggio (valore corrente)
  const scoreLine = document.createElement("p");
  scoreLine.textContent = `Punteggio: ${puntiSquadraB} [${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
  content.appendChild(scoreLine);

  // Bottoni incremento
  const incContainer = document.createElement("div");
  [1,2,3].forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `+${p}`;
    btn.className = "btn-inc";
    btn.addEventListener("click", () => {
      aggiungiPuntiSquadraB(p, false); // usa la tua funzione
      scoreLine.textContent = `Punteggio: ${puntiSquadraB} [${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
    });
    incContainer.appendChild(btn);
  });
  content.appendChild(incContainer);

  // Bottoni decremento
  const decContainer = document.createElement("div");
  [1,2,3].forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `-${p}`;
    btn.className = "btn-dec";
    btn.addEventListener("click", () => {
      if (contatoriB[p] > 0) {
        // decremento manuale
        puntiSquadraB -= p;
        contatoriB[p]--;
		
		const oraCorrente = new Date().toLocaleTimeString('it-IT');
        historyB.push({ punti: -p, ora: oraCorrente }); // Salvataggio oggetto
        //historyB.push(-p);
        aggiornaScoreboard();
        salvaSquadraB();
		salvaEventoLive("", -p, oraCorrente + "*", "Squadra B");
  	    salvaDatiPartita();
        scoreLine.textContent = `Punteggio: ${puntiSquadraB} [${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
      }
    });
    decContainer.appendChild(btn);
  });
  content.appendChild(decContainer);

  // Bottone chiudi
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Chiudi";
  closeBtn.className = "close-btn";
  closeBtn.addEventListener("click", () => overlay.remove());
  content.appendChild(closeBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // 👉 Chiudi cliccando fuori dal contenuto
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function initSquadraBControls() {
  if (!isAdmin) return;

  // Assicurati che la sezione Squadra B esista e sia nel DOM
  const squadraB = document.getElementById("squadraB");
  if (!squadraB) return;

  const controlsContainer = document.getElementById("controlsB");
  if (!controlsContainer) return;

  controlsContainer.innerHTML = ""; // pulisco eventuali bottoni precedenti

  // Creo dinamicamente i bottoni +1, +2, +3
  [1, 2, 3].forEach(p => {
    const btn = document.createElement("button");
    btn.className = "tiro";
    btn.textContent = `➕${p}`;
    btn.addEventListener("click", () => aggiungiPuntiSquadraB(p, true));
    controlsContainer.appendChild(btn);
  });

  // Bottone undo
  const undoBtn = document.createElement("button");
  undoBtn.className = "undo";
  undoBtn.textContent = "↩️";
  undoBtn.addEventListener("click", undoSquadraB);
  controlsContainer.appendChild(undoBtn);

  // Trova o crea il punteggio
  let punti = squadraB.querySelector("#punti_squadraB");
  if (!punti) {
    punti = document.createElement("span");
    punti.id = "punti_squadraB";
    punti.className = "punteggio";
    punti.textContent = "0"; // valore iniziale
    const row = squadraB.querySelector(".squadraB-row");
    if (row) row.appendChild(punti);
  }

  // Sposta il punteggio dentro controlsB (solo se non è già lì)
  if (punti.parentElement !== controlsContainer) {
    controlsContainer.appendChild(punti);
  }

  // Allineamento in base a TeamA
  const rawTeamA = document.getElementById("teamA")?.textContent || "";
  const teamAName = rawTeamA.replace(/\s+/g, " ").trim();

  controlsContainer.classList.remove("right", "left");
  if (teamAName === "Polismile A") {
    controlsContainer.classList.add("right");
  } else {
    controlsContainer.classList.add("left");
  }

  // 👉 Gestione long tap sull'intero box Squadra B
  const squadraBBox = document.getElementById("squadraB-box") || squadraB;
  if (squadraBBox) {
    addLongPressListener(squadraBBox, () => {
      showSquadraBPopup(); // funzione da definire
    });
  }
}

function showPlayerPopup(g) {
  // Rimuovi eventuale popup già aperto
  const existing = document.getElementById("playerPopup");
  if (existing) existing.remove();

  // Contenitore overlay
  const overlay = document.createElement("div");
  overlay.id = "playerPopup";
  overlay.className = "popup";

  // Contenuto popup
  const content = document.createElement("div");
  content.className = "popup-content";

  // Numero e cognome
  const header = document.createElement("h2");
  //header.textContent = `${g.numero} - ${g.displayName}`;
  header.innerHTML = `<span class="numero">${g.numero}</span> <span class="cognome">${g.displayName}</span>`;
  content.appendChild(header);

  // Punteggio con dettagli
  const scoreLine = document.createElement("p");
  scoreLine.textContent = `Punteggio: ${g.punteggio} [${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]`;
  content.appendChild(scoreLine);

  // Bottoni incremento
  const incContainer = document.createElement("div");
  [1,2,3].forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `+${p}`;
	btn.className = "btn-inc";
    btn.addEventListener("click", () => {
      g.punteggio += p;
      g.contatori[p]++;
      scoreLine.textContent = `Punteggio: ${g.punteggio} [${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]`;
      aggiornaUIGiocatore(g);
      aggiornaScoreboard();
      salvaSuGoogleSheets(g);
	  const oraCorrente = new Date().toLocaleTimeString('it-IT'); 

	  salvaEventoLive(g.numero, p, oraCorrente + "*", getTeamName()); // l'orario è indefinito
	  
	  salvaDatiPartita();
    });
    incContainer.appendChild(btn);
  });
  content.appendChild(incContainer);

  // Bottoni decremento
  const decContainer = document.createElement("div");
  [1,2,3].forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = `-${p}`;
	btn.className = "btn-dec";   // 👈 classe per decremento
    btn.addEventListener("click", () => {
      if (g.contatori[p] > 0) {
        g.punteggio -= p;
        g.contatori[p]--;
        scoreLine.textContent = `Punteggio: ${g.punteggio} [${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]`;
        aggiornaUIGiocatore(g);
        aggiornaScoreboard();
        salvaSuGoogleSheets(g);
		const oraCorrente = new Date().toLocaleTimeString('it-IT'); 
	    salvaEventoLive(g.numero, -p, oraCorrente + "*", getTeamName()); // vengono solo eliminati i punti (in negativo), l'orario è indefinito

  	    salvaDatiPartita();
      }
    });
    decContainer.appendChild(btn);
  });
  content.appendChild(decContainer);

  // Bottone chiudi
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Chiudi";
  closeBtn.className = "close-btn";
  closeBtn.addEventListener("click", () => overlay.remove());
  content.appendChild(closeBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);
  
  // 👉 Chiudi cliccando fuori dal contenuto
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function addLongPressListener(element, callback, duration = 600) {
  // Funzione helper per gestire il tap prolungato
  let timer;

  element.addEventListener("mousedown", () => {
    timer = setTimeout(callback, duration);
  }, { passive: true });
  element.addEventListener("mouseup", () => {
    clearTimeout(timer);
  }, { passive: true });
  element.addEventListener("mouseleave", () => {
    clearTimeout(timer);
  }, { passive: true });

  // Supporto per smartphone (touch)
  element.addEventListener("touchstart", () => {
	// Cancella eventuali timer precedenti se l'utente tocca di nuovo
    clearTimeout(timer);
	
    timer = setTimeout(callback, duration);
  }, { passive: true });
  element.addEventListener("touchend", () => {
    clearTimeout(timer);
  }, { passive: true });
}

function renderGiocatori(lista) {
  listaGiocatoriCorrente = lista;
  
  let convArray;
  if (convocazioni.trim() === "[ALL]") {
    convArray = ["ALL"];
  } else {
    try {
      // es: "[8,29,37]" → [8,29,37] → ["8","29","37"]
      convArray = JSON.parse(convocazioni).map(String);
    } catch(e) {
      convArray = [];
    }
  }
  
  // 🔎 Se l’array contiene solo "ALL", prendi tutti i giocatori
  const convocati = (convArray.length === 1 && convArray[0] === "ALL")
    ? lista
    : lista.filter(g => convArray.map(String).includes(g.numero));

  
  const container = document.getElementById("giocatori");
  container.innerHTML = `
    <div id="giocatori-in"></div>
    <div id="giocatori-out" class="out-grid">
      <div id="out-col1"></div>
      <div id="out-col2"></div>
    </div>
  `;

  const inContainer = document.getElementById("giocatori-in");
  const outCol1 = document.getElementById("out-col1");
  const outCol2 = document.getElementById("out-col2");

  // Ordina: prima In, poi Out
  convocati.sort((a, b) => {
    if (a.stato === b.stato) return 0;
    return a.stato === "In" ? -1 : 1;
  });

  const outPlayers = convocati.filter(g => g.stato === "Out");
  const metà = Math.ceil(outPlayers.length / 2);

  convocati.forEach((g) => {
    const div = document.createElement("div");
    div.className = `giocatore ${g.stato.toLowerCase()}`;
    div.setAttribute("data-id", g.id);

    div.innerHTML = `
      <div class="nome">
        <span class="numero">${g.numero}</span>
        <span class="cognome">${g.displayName}</span>
      </div>
      <div>
        <span id="punti_${g.id}" class="punteggio">
          <span class="totale">${g.punteggio}</span> 
          <span class="dettagli">[${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]</span>
        </span>
      </div>
    `;

    if (isAdmin) {
      div.style.cursor = "pointer";
      div.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "button") return;
        const nuovoStato = g.stato === "In" ? "Out" : "In";
        setStato(g.id, nuovoStato);
      });

      addLongPressListener(div, () => {
        showPlayerPopup(g);
      });
    }

    if (isAdmin && g.stato === "In") {
      const controls = document.createElement("div");
      [1,2,3].forEach(p => {
        const btn = document.createElement("button");
        btn.className = "tiro";
        btn.textContent = `➕${p}`;
        btn.addEventListener("click", () => aggiungiPuntiGiocatore(g.id, p));
        controls.appendChild(btn);
      });
      const undoBtn = document.createElement("button");
      undoBtn.className = "undo";
      undoBtn.textContent = "↩️";
      undoBtn.addEventListener("click", () => undoGiocatore(g.id));
      controls.appendChild(undoBtn);
      div.appendChild(controls);
    }

    if (g.stato === "In") {
      inContainer.appendChild(div);
    } else {
      const idx = outPlayers.indexOf(g);
      if (idx < metà) outCol1.appendChild(div);
      else outCol2.appendChild(div);
    }
  });
}

function aggiungiPuntiGiocatore(id, punti) {
  const g = giocatoriObj.find(x => x.id === id);
  aggiornaPunteggio(g, punti);
  aggiornaScoreboard();

  if (ultimoOrdinamento === "punteggio") {
    // Re-render perché la posizione può cambiare
    ordinaGiocatori(ultimoOrdinamento);

    // Dopo il re-render, applica flash + shake al nuovo nodo
    requestAnimationFrame(() => {
      const span = document.getElementById("punti_" + g.id);
      if (span) {
        // flash punteggio
        span.classList.remove("pulse");
        void span.offsetWidth;
        span.classList.add("pulse");
        setTimeout(() => span.classList.remove("pulse"), 500);
      }
      // shake container
      applyShake(g.id);
    });
  } else {
    // Niente re-render: aggiorna in place e anima subito
    aggiornaUIGiocatore(g);
    applyShake(g.id);
  }

  salvaSuGoogleSheets(g);
  
  const ultimaAzione = g.history[g.history.length - 1];
  const timestampReale = ultimaAzione.ora;
  salvaEventoLive(g.numero, punti, timestampReale, getTeamName());

  salvaDatiPartita();
  
  console.log("Salvato punti:", punti);
}

function aggiornaUIGiocatore(g) {
  const span = document.getElementById("punti_" + g.id);
  if (span) {
    span.querySelector(".totale").textContent = g.punteggio;
    span.querySelector(".dettagli").textContent =
      `[${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]`;

    // Flash sul punteggio
    span.classList.remove("pulse");
    void span.offsetWidth;
    span.classList.add("pulse");
    setTimeout(() => span.classList.remove("pulse"), 500);

    // Shake sul container del giocatore
    const container = document.querySelector(`.giocatore[data-id="${g.id}"]`);
    if (container) {
      container.classList.remove("shake");
      void container.offsetWidth; // forza reflow
      container.classList.add("shake");
      setTimeout(() => container.classList.remove("shake"), 400);
    }
  }
}

function applyShake(id) {
  const container = document.querySelector(`.giocatore[data-id="${id}"]`);
  if (!container) return;

  // Riavvio affidabile dell'animazione, anche se clicchi più volte
  container.classList.remove("shake");
  void container.offsetWidth; // reflow
  container.classList.add("shake");
  setTimeout(() => container.classList.remove("shake"), 400);
}

function animatePunteggio(span) {
  // Rimuovi eventuale classe e forzare reflow per compatibilità CSS
  span.classList.remove("pulse");
  void span.offsetWidth;
  span.classList.add("pulse");
  setTimeout(() => span.classList.remove("pulse"), 500);

  // WAAPI: ignoriamo lo stato delle classi, parte sempre
  if (span.animate) {
    span.animate(
      [
        { backgroundColor: 'yellow', offset: 0 },
        { backgroundColor: 'transparent', offset: 1 }
      ],
      { duration: 500, easing: 'ease-out' }
    );
  }
}

function undoGiocatore(id) {
  const g = giocatoriObj.find(x => x.id === id);
  
  if (g.history.length <= 0) return;
    
  const ultimaAzione = g.history[g.history.length - 1];
  const timestampReale = ultimaAzione.ora;
  const ultimoPunto = ultimaAzione.punti;

  undoPunteggio(g);
  aggiornaUIGiocatore(g);
  aggiornaScoreboard();
  console.log("undoGiocatore: ",g.punteggio );	
  salvaSuGoogleSheets(g);

  salvaEventoLive(g.numero, -ultimoPunto, timestampReale, getTeamName());

  salvaDatiPartita();

}
function aggiungiPuntiSquadraB(punti, memorizzaOrario) {
  puntiSquadraB += punti;
  contatoriB[punti]++;
  
  const oraCorrente = memorizzaOrario ? new Date().toLocaleTimeString('it-IT') : "??";
  historyB.push({ punti: punti, ora: oraCorrente }); // Salvataggio oggetto
  
  aggiornaScoreboard();
  salvaSquadraB();
  
  salvaEventoLive("", punti, oraCorrente, "Squadra B");

  salvaDatiPartita();
}

function undoSquadraB() {
  if (historyB.length === 0) return;
  const lastEntry = historyB.pop();
  const puntiDaTogliere = lastEntry.punti;

  puntiSquadraB -= puntiDaTogliere;
  contatoriB[puntiDaTogliere]--;
  
  aggiornaScoreboard();
  salvaSquadraB();
  
  salvaEventoLive("", -puntiDaTogliere, lastEntry.ora, "Squadra B");

  salvaDatiPartita();
}

function aggiornaScoreboard() {
  const punti = giocatoriObj.reduce((sum, g) => sum + g.punteggio, 0);
  puntiSquadraA = punti;

  // Determiniamo i valori correnti
  const punteggioCorrente = (teamA === "Polismile A") ? `${punti}-${puntiSquadraB}` : `${puntiSquadraB}-${punti}`;
  const quartoCorrente = quartoAttuale;

  // Verifichiamo se qualcosa è cambiato
  const punteggioCambiato = punteggioCorrente !== lastScoreState;
  const quartoCambiato = quartoCorrente !== lastQuartoState;

  // Se nulla è cambiato, usciamo subito dalla funzione
  if (!punteggioCambiato && !quartoCambiato) return;

  const scoreboard = document.getElementById("scoreboard");

  // 1. Aggiornamento selettivo del Punteggio
  if (punteggioCambiato) {
    let divPunteggio = document.getElementById("punteggioNumerico");
    if (!divPunteggio) {
      // Se non esiste (primo avvio), lo creiamo
      divPunteggio = document.createElement("div");
      divPunteggio.id = "punteggioNumerico";
      scoreboard.prepend(divPunteggio); // Lo mette all'inizio
    }
    
    if (teamA === "Polismile A") {
      divPunteggio.innerHTML = `<span id="score">${punti}</span> - <span id="scoreB">${puntiSquadraB}</span>`;
    } else {
      divPunteggio.innerHTML = `<span id="score">${puntiSquadraB}</span> - <span id="scoreB">${punti}</span>`;
    }
    
    // Attiva l'animazione flash solo se cambia il punteggio
    scoreboard.classList.remove("flash");
    void scoreboard.offsetWidth; 
    scoreboard.classList.add("flash");
    
    if (typeof isMobile === "function" && isMobile()) { 
      if (navigator.vibrate) navigator.vibrate(100); // Funziona solo su Android/Chrome
    }
    setTimeout(() => scoreboard.classList.remove("flash"), 500);
  }

  // 2. Aggiornamento selettivo del Quarto (a destra)
  if (quartoCambiato) {
    let spanPeriodo = document.getElementById("periodoAttuale");
    if (!spanPeriodo) {
      spanPeriodo = document.createElement("span");
      spanPeriodo.id = "periodoAttuale";
      scoreboard.appendChild(spanPeriodo); // Lo mette alla fine (destra)
    }
    
    spanPeriodo.textContent = quartoCorrente;

    if (quartoCorrente === "Terminata") {
      spanPeriodo.classList.add("terminata");
    } else {
      spanPeriodo.classList.remove("terminata");
    }
  }

  // 3. Salvataggio dello stato attuale per il prossimo confronto
  lastScoreState = punteggioCorrente;
  lastQuartoState = quartoCorrente;

  // 4. Aggiornamento dettagli Admin per squadra B (sempre se admin)
  if (isAdmin) {
    const puntiBElement = document.getElementById("punti_squadraB");
    if (puntiBElement && contatoriB) {
      puntiBElement.textContent = `[${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
    }
  }
}

function setStato(id, stato) {
  const g = giocatoriObj.find(x => x.id === id);
  if (!g) return;
  g.stato = stato;

  const div = document.querySelector(`.giocatore[data-id="${id}"]`);
  if (div) {
    div.className = `giocatore ${stato.toLowerCase()}`;
  }

  salvaSuGoogleSheets(g);  
  ordinaGiocatori(ultimoOrdinamento);
}

function ordinaGiocatori(criterio) {
  ultimoOrdinamento = criterio;
  let lista = [...giocatoriObj];

  lista.sort((a,b) => {
    if (a.stato !== b.stato) return a.stato === "In" ? -1 : 1;
	if (criterio === "numero") return parseInt(a.numero) - parseInt(b.numero);
    if (criterio === "cognome") return a.cognome.localeCompare(b.cognome);
    if (criterio === "punteggio") return b.punteggio - a.punteggio;
    return 0;
  });

  renderGiocatori(lista);
}

function aggiornaTitoli() {
  document.getElementById("teamA").textContent = teamA
  document.getElementById("teamB").textContent = teamB
  document.getElementById("titoloB").textContent = (teamA === "Polismile A") ? teamB : teamA
}


function OLDsalvaEventoLive(idGiocatore, puntiRealizzati, timestampReale, team) {
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
    formData.append("squadra", team);
    
    // Timestamp reale
    //const timestampReale = new Date().toLocaleTimeString('it-IT');
    formData.append("timestampReale", timestampReale);

    // Ora video (calcolata se hai una funzione o un timer attivo)
    const oraVideo = typeof getCurrentGameTime === 'function' ? getCurrentGameTime() : "00:00:00";
    formData.append("oraVideo", oraVideo);

    // 3. Invio della richiesta fetch
    fetch(url, {
        method: "POST",
        mode: "no-cors", // Cruciale per Google Apps Script
        body: formData   // Passiamo direttamente l'oggetto FormData
    })
    .then(() => {
        console.log(`[LIVE] Inviato con successo: ${idGiocatore} +${puntiRealizzati}`);
    })
    .catch(error => {
        console.error("Errore nell'invio FormData live:", error);
    });
}

function salvaSuGoogleSheets(g) {
  const formData = new FormData();
  formData.append("matchId", matchId);
  formData.append("squadra", document.getElementById("teamA").value);
  formData.append("giocatore", g.displayName);
  formData.append("numero", g.numero);
  formData.append("punti", g.punteggio);   // 👈 invio punteggio cumulativo
  formData.append("dettagli", JSON.stringify(g.contatori)); // 👈 invio contatori cumulativi
  formData.append("stato", g.stato);

  fetch(url, {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => console.log("Salvato su Google Sheets:", data))
  .catch(err => console.error("Errore salvataggio:", err));
}

function salvaSquadraB() {
// --- Salvataggio cumulativo Squadra B ---

  const formData = new FormData();
  formData.append("matchId", matchId);
  formData.append("squadra", document.getElementById("teamB").value);
  formData.append("giocatore", "Squadra B"); // nome fittizio unico
  formData.append("numero", "0");            // opzionale
  formData.append("punti", puntiSquadraB);   // punteggio cumulativo
  formData.append("dettagli", JSON.stringify(contatoriB));

  fetch(url, {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => console.log("Salvato cumulativo Squadra B:", data))
  .catch(err => console.error("Errore salvataggio Squadra B:", err));
}

function caricaDatiPartita(matchId) {
  // Specifichiamo sheet=Statistiche per essere sicuri di attivare la logica corretta
  const url_1 = url + "?sheet=Statistiche&matchId=" + encodeURIComponent(matchId);
  console.log("URL: " + url_1);

  // 1. Facciamo partire il cronometro
  const startTime = performance.now();

  fetch(url_1)
    .then(res => res.json())
    .then(data => { // 'data' ora è l'oggetto { dettagliGara, statisticheGiocatori }
      console.log("Dati caricati:", data);

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

      // 1. GESTIONE DATI PARTITA
      if (data.dettagliGara) {
        const info = data.dettagliGara;
		quartoAttuale = info.statoPartita.replace("° Quarto", "").trim();
		// Se il periodo è un numero singolo da 1 a 4, aggiungiamo "Q"
        if (/^[1-4]$/.test(quartoAttuale)) {
         quartoAttuale = "Q" + quartoAttuale;
        }
        // Esempio: aggiorna variabili globali o elementi UI con i dati della partita
        // nomeSquadraA = info.squadraA;
        // nomeSquadraB = info.squadraB;
        // punteggioA = info.punteggioA;
        // punteggioB = info.punteggioB;
		videoId = extractYouTubeId(info.videoURL),
        matchStartTime = extractYoutubeTime(info.videoURL)
		oraInizioDiretta = info.oraInizioDiretta;
		aggiornaStatoVideo(videoId);
        console.log("Info Partita recuperate:", info.squadraA + " vs " + info.squadraB);
      }

      // 2. GESTIONE STATISTICHE GIOCATORI
      const rows = data.statisticheGiocatori || [];

      rows.forEach(r => {
        const g = giocatoriObj.find(x => String(x.numero) === String(r.numero));
        if (g) {
          g.punteggio = parseInt(r.punti, 10) || 0;
          g.contatori = JSON.parse(r.dettagli || "{}");
          g.stato = (r.stato ?? r.statoGiocatore) === "In" ? "In" : "Out";
        } else if (r.giocatore === "Squadra B") {
          puntiSquadraB = parseInt(r.punti, 10) || 0;
          contatoriB = JSON.parse(r.dettagli || "{}");
        }
      });

      // 3. AGGIORNAMENTO UI
      aggiornaTitoli();
      renderGiocatori(giocatoriObj);
      aggiornaScoreboard();
      ordinaGiocatori(ultimoOrdinamento);
    })
    .catch(err => console.error("Errore nel caricamento dati:", err));
}

function interrompiAggiornamentoAutomatico() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null; // resetto la variabile
    console.log("Aggiornamento automatico interrotto");
  }
}

function avviaAggiornamentoAutomatico() {
  // Avvia il polling periodico

  // Ricarica subito la partita selezionata
  if (!document.hidden) {
    caricaDatiPartita(matchId);
  }
  
  // Ogni 5 secondi ricarica i dati
  if (!isAdmin && (isLive === "true" || isLive === true)) {
	  refreshTimer = setInterval(() => {
		//const matchId = matchSelector.value;
		caricaDatiPartita(matchId);
	  }, 5000);
  }
}

function salvaDatiPartita() {
  
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
      console.log("Risposta dal server:", data);
    })
    .catch(error => {
      console.error("Errore nel salvataggio:", error);
    });
}

// --- FUNZIONE AGGIORNAMENTO BOTTONE VIDEO ---
function aggiornaStatoVideo(videoId) {
    const videoBtn = document.getElementById("videoBtn");
    if (!videoBtn) return;

    // Se videoId non è definito, è nullo o è una stringa vuota, nascondi il bottone
    if (!videoId) {
        videoBtn.style.display = "none";
        return;
    }

    // Se videoId esiste, mostra il bottone
    videoBtn.style.display = "block";

    // Gestione del colore in base a isLive
    // Nota: isLive può essere booleano o stringa "TRUE"/"FALSE" a seconda della sorgente dati
    const live = (isLive === true || isLive === "TRUE" || isLive === "true");

    if (live) {
        // Rosso se isLive è true
        videoBtn.style.backgroundColor = "red";
        videoBtn.style.color = "white";
        videoBtn.textContent = "Live!";
    } else {
        // Blu se isLive è false
        videoBtn.style.backgroundColor = "blue";
        videoBtn.style.color = "white";
        videoBtn.textContent = "Video";
    }
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const clockElement = document.getElementById('digitalClock');
    if (clockElement) {
        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// =====================
// INIZIALIZZAZIONE
// =====================
function init() {
  const versionDiv = document.getElementById("scriptVersion");
  if (versionDiv) {
    versionDiv.textContent = "Basket App v." + SCRIPT_VERSION;
  }

  console.log("Script.js versione:", SCRIPT_VERSION);

  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
  convocazioni = localStorage.getItem("convocazioni");
  videoURL = localStorage.getItem("videoURL");
  videoId = localStorage.getItem("videoId");
  matchStartTime = localStorage.getItem("matchStartTime");
  //oraInizioDiretta = videoId ? formattaOrarioRoma(localStorage.getItem("yt_start_" + videoId) || "") : "";
  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");
  isLive = localStorage.getItem("isLive");
  statoPartita = localStorage.getItem("statoPartita");
  googleApiKey = localStorage.getItem("googleApiKey") || ""; // Recupera il valore salvato  
  
  const savedMatchId = localStorage.getItem("matchId");
  if (savedMatchId && savedMatchId !== "undefined") {
    matchId = savedMatchId;
    console.log("Partita caricata da localStorage:", matchId);
    caricaDatiPartita(matchId);
  } else {
    console.log("Nessun matchId salvato");
  }

  const videoBtn = document.getElementById("videoBtn");

  // Mostra il bottone solo se videoId è diverso da null
  if (videoId !== null && videoId !== "") {
    //videoBtn.style.display = "inline-block";
    // Applica lo stato al bottone Video
    aggiornaStatoVideo(videoId);
  }

  videoBtn.addEventListener("click", () => {
    if (videoId !== null) {
      // passa videoId come query string
      //window.location.href = "direttavideo.html?matchId=" + encodeURIComponent(matchId) + "&videoId=" + encodeURIComponent(videoId);
      localStorage.setItem("videoId", videoId);
      window.location.href = "direttavideo.html?matchId=" + encodeURIComponent(matchId);
    } else {
      // fallback se videoId è nullo
      alert("Nessun videoId disponibile");
    }
  });

  
  // Bottoni ordinamento
  document.querySelector("#ordinamenti button:nth-child(1)")
    .addEventListener("click", () => ordinaGiocatori("numero"));
  document.querySelector("#ordinamenti button:nth-child(2)")
    .addEventListener("click", () => ordinaGiocatori("cognome"));
  document.querySelector("#ordinamenti button:nth-child(3)")
    .addEventListener("click", () => ordinaGiocatori("punteggio"));

  // Input nomi squadre
  document.getElementById("teamA").addEventListener("change", () => {
    aggiornaTitoli(); aggiornaScoreboard();
  });
  document.getElementById("teamB").addEventListener("change", () => {
    aggiornaTitoli(); aggiornaScoreboard();
  });

  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const menu = document.getElementById("menu");
  
  if (hamburgerBtn && menu) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita che il click si propaghi al documento
      menu.classList.toggle("hidden");
    });
  
    // Selezioniamo tutti gli elementi della lista nel menu
    const menuItems = menu.querySelectorAll("li");
    menuItems.forEach(item => {
      item.addEventListener("click", () => {
        menu.classList.add("hidden");
      });
    });
	
    // Chiude il menu se si clicca fuori
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== hamburgerBtn) {
        menu.classList.add("hidden");
      }
    });
  }


  // --- 5. ADMIN & LOGIN ---
  if (typeof createAdminPopup === "function") {
      createAdminPopup(); // Inizializza il popup se la funzione esiste
  }

  // 2. Collega manualmente i bottoni del popup creato da common.js alla logica di match.js
  const popup = document.getElementById("adminPopup");
  const adminConfirmBtn = document.getElementById("confirmAdmin");
  const adminCancelBtn = document.getElementById("closeAdmin");
  const adminPasswordInput = document.getElementById("adminPassword");
  
  if (adminConfirmBtn) {
      adminConfirmBtn.onclick = () => {
          const pwd = adminPasswordInput.value;
          if (pwd) {
              login(pwd); // Chiama la funzione login() definita in match.js
              document.getElementById("adminPopup").classList.add("hidden");
          }
      };
  }
  
  if (adminCancelBtn) {
      adminCancelBtn.onclick = () => {
          document.getElementById("adminPopup").classList.add("hidden");
      };
  }


  isAdmin = localStorage.getItem("isAdmin");
  AdminPassword = localStorage.getItem("AdminPassword");
  if (isAdmin) {
    login(AdminPassword);
  }
  
  // gestione Logout
  const adminBtn = document.getElementById("adminBtn1");
  adminBtn.onclick = (e) => {
    e.preventDefault();
    if (isAdmin) {
      if (confirm("Vuoi uscire dalla modalità Admin?")) {
        login("logout");
        document.getElementById("menu").classList.add("hidden");
      }
    } else {
      const popup = document.getElementById("adminPopup");
      if (popup) {
          popup.classList.remove("hidden");
          document.getElementById("adminPassword").value = "";
          document.getElementById("adminPassword").focus();
      }
      //popup.classList.remove("hidden");
      //if (pwdInput) {
      //  pwdInput.value = "";
      //  setTimeout(() => pwdInput.focus(), 100);
      //}
    }
  };

  aggiornaTitoli();
  renderGiocatori(giocatoriObj);
  aggiornaScoreboard();
  avviaAggiornamentoAutomatico();
  
  // Avvia l'orologio immediatamente e poi ogni secondo
  setInterval(updateClock, 1000);
  updateClock();
}

document.addEventListener("DOMContentLoaded", init);







