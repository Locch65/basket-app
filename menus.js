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
      if (quartoAttuale && (val === quartoAttuale || quartoAttuale.toString().startsWith("Q" + val.charAt(0)))) {
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
      renderPlayerListLive();
      updateScoreboard(matchIsLive || isReviewMode);

    } else {
      console.error("Funzione salvaStatoLive non trovata!");
    }

    document.body.removeChild(overlay);
  };
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
  const oraSalvatatYt = oraInizioDiretta;

  content.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align:center;">Diretta Youtube</h2>
        
        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">URL:</label>
        <input type="text" id="ytUrl" style="width:100%; padding:10px; margin-bottom:15px; font-size:1.4rem;" 
               placeholder="https://www.youtube.com/watch?v=..." value="${urlIniziale}">

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">Ora inizio Diretta (HH:mm:ss):</label>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="time" id="ytOraInizio" step="1" style="flex: 1; padding:10px; font-size:1.4rem;" value="${oraSalvatatYt}">
            <button id="ytCalcolaBtn" disabled style="padding: 10px; font-size: 1.6rem; cursor: not-allowed; opacity: 0.5; background-color: #3498db; color: white; border: none; border-radius: 5px;">
                Calcola
            </button>
        </div>

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">Offset Inizio Partita (secondi):</label>
        <input type="number" id="ytOffset" style="width:100%; padding:10px; margin-bottom:15px; font-size:1.4rem;" 
               placeholder="Esempio: 30" value="${matchStartTime || ""}">

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">API Key:</label>
        <input type="text" id="ytApiKey" style="width:100%; padding:10px; margin-bottom:25px; font-size:1.4rem;" 
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

    console.log("Dati salvati correttamente nel localStorage.");

    dettagliGara.oraInizioDiretta = oraInizioDiretta;
    dettagliGara.videoURL = finalUrl;
    saveToFirebaseHistory('partite/', dettagliGara); 

    saveToServerMatchData(); // Invia i dati al foglio Google
    document.body.removeChild(overlay);
  };
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

function gestisciConvocazioni() {
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

    dettagliGara.convocazioni = convocazioni;
    saveToFirebaseHistory('partite/', dettagliGara); 

    saveToServerMatchData();

    popup.remove();

    // aggiorna la pagina per ricaricare le convocazioni
    location.reload();
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
