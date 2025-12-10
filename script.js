// =====================
// VERSIONE SCRIPT
// =====================
const SCRIPT_VERSION = "1.0.37";  // Aggiorna questo numero ad ogni modifica



// =====================
// DATI INIZIALI
// =====================
const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor",
  "C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "26", "41", "29"];

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
    history: [],
    stato: "Out"
  };
});


function addPoints(points) {
  if (!isAdmin) return; // blocco minimo lato client
  score += points;
  document.getElementById("score").textContent = score;

  // Effetto flash già previsto nel tuo CSS
  const sb = document.getElementById("scoreboard");
  sb.classList.add("flash");
  setTimeout(() => sb.classList.remove("flash"), 500);
}

// =====================
// FUNZIONI GENERICHE
// =====================
function aggiornaPunteggio(target, punti) {
  target.punteggio += punti;
  target.contatori[punti]++;
  target.history.push(punti);
}

function undoPunteggio(target) {
  if (target.history.length === 0) return;
  const last = target.history.pop();
  target.punteggio -= last;
  target.contatori[last]--;
}

function apriConvocazioni() {
  const giocatori = giocatoriA;
  const numeri = numeriMaglia;

  // Se il popup esiste già, lo rimuovo
  const existingPopup = document.getElementById("convocazioniPopup");
  if (existingPopup) existingPopup.remove();

  // Overlay
  const popup = document.createElement("div");
  popup.id = "convocazioniPopup";
  popup.className = "convocazioniPopup-overlay";

  // Contenuto
  const content = document.createElement("div");
  content.className = "convocazioniPopup-content";

  const title = document.createElement("h2");
  title.textContent = "Convocazioni";
  content.appendChild(title);

  // Lista giocatori
  const list = document.createElement("ul");
  list.className = "convocazioniPopup-list";

  // Converto la stringa globale convocazioni in array di numeri
  let convocatiNum = [];
  if (convocazioni && convocazioni.trim() !== "") {
    try {
      const parsed = JSON.parse(convocazioni); // es. "[10, 7, 5]"
      convocatiNum = Array.isArray(parsed) ? parsed.map(n => Number(n)) : [];
    } catch (e) {
      console.warn("Formato convocazioni non valido:", convocazioni);
    }
  }

  giocatori.forEach((nomeCompleto, index) => {
    const li = document.createElement("li");
    li.className = "convocazioniPopup-item";

    // Split nome e cognome
    const parts = nomeCompleto.trim().split(" ");
    let visuale = nomeCompleto; // fallback
    if (parts.length >= 2) {
      const nome = parts[0];
      const cognome = parts.slice(1).join(" ");
      visuale = `${cognome} ${nome}`;
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `conv_${index}`;
    checkbox.value = index; // salvo l'indice

    const numeroMaglia = Number(numeri[index]); // normalizzo a numero
    if (convocatiNum.includes(numeroMaglia)) {
      checkbox.checked = true;
    }

    const label = document.createElement("label");
    label.htmlFor = `conv_${index}`;
    label.textContent = `${numeri[index]} - ${visuale}`;

    li.appendChild(checkbox);
    li.appendChild(label);
    list.appendChild(li);
  });

  content.appendChild(list);

  // Bottoni
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Conferma";
  confirmBtn.className = "convocazioniPopup-confirmBtn";
  confirmBtn.addEventListener("click", () => {
    const selezionati = [];
    list.querySelectorAll("input[type=checkbox]:checked").forEach(cb => {
      const idx = parseInt(cb.value, 10);
      selezionati.push(Number(numeri[idx])); // salvo come numeri
    });

    // Memorizzo nella variabile globale come stringa "[x, y, z]"
    convocazioni = "[" + selezionati.join(", ") + "]";
    localStorage.setItem("convocazioni", convocazioni);
    renderGiocatori(giocatoriObj);
    //alert("Convocazioni salvate: " + convocazioni);
	popup.remove();
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Chiudi";
  closeBtn.className = "convocazioniPopup-closeBtn";
  closeBtn.addEventListener("click", () => {
    popup.remove();
  });

  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "convocazioniPopup-buttons";
  buttonsContainer.appendChild(confirmBtn);
  buttonsContainer.appendChild(closeBtn);

  content.appendChild(buttonsContainer);
  popup.appendChild(content);
  document.body.appendChild(popup);
}

function initOrdinamenti() {
  const ordinamenti = document.getElementById("ordinamenti");

  // Se sei Admin, aggiungi il bottone Convocazioni
  if (isAdmin) {
    // Evita di aggiungerlo due volte
    if (!ordinamenti.querySelector(".convocazioni-btn")) {
      const convocazioniBtn = document.createElement("button");
      convocazioniBtn.className = "convocazioni-btn";
      convocazioniBtn.textContent = "Convocazioni";

      // 👉 qui puoi aggiungere l’evento click
      convocazioniBtn.addEventListener("click", () => {
        apriConvocazioni(); // funzione da definire
      });

      ordinamenti.appendChild(convocazioniBtn);
    }
  }
}

// =====================
// FUNZIONI LOGIN
// =====================
function login(pwd) {
  if (pwd === "007") {   // password hardcoded
    isAdmin = true;
	interrompiAggiornamentoAutomatico();
	
    // Nascondi elementi non necessari e mostra strumenti admin
    const loginDiv = document.getElementById("login");
	document.getElementById("squadraB").classList.remove("hidden");
	
	initOrdinamenti();
    aggiornaTitoli();
	initSquadraBControls(); // collega gli eventi ai bottoni
    // eventualmente puoi ricaricare la lista giocatori per mostrare i bottoni
    renderGiocatori(listaGiocatoriCorrente);
  } else {
    alert("Password errata. Accesso negato.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const adminBtn = document.getElementById("adminBtn");
  const popup = document.getElementById("adminPopup");
  const okBtn = document.getElementById("adminOkBtn");
  const cancelBtn = document.getElementById("adminCancelBtn");
  const pwdInput = document.getElementById("adminPassword");

  adminBtn.addEventListener("click", () => {
    popup.classList.remove("hidden");
    pwdInput.value = "";
    pwdInput.focus();
  });

  okBtn.addEventListener("click", () => {
    login(pwdInput.value.trim());
    // Chiudi solo se login riuscito
    if (isAdmin) popup.classList.add("hidden");
  });

  cancelBtn.addEventListener("click", () => {
    popup.classList.add("hidden");
  });

  // Invio con Enter
  pwdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      okBtn.click();
    } else if (e.key === "Escape") {
      popup.classList.add("hidden");
    }
  });

  // Chiudi cliccando fuori dalla finestra
  popup.addEventListener("click", (e) => {
    if (e.target === popup) popup.classList.add("hidden");
  });
});


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
    btn.addEventListener("click", () => aggiungiPuntiSquadraB(p));
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
    // opzionale: valore iniziale
    punti.textContent = "0";
    // inseriscilo temporaneamente nella riga per non perderlo
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
}

// =====================
// RENDERING UI
// =====================
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

// Funzione helper per gestire il tap prolungato
function addLongPressListener(element, callback, duration = 600) {
  let timer;

  element.addEventListener("mousedown", () => {
    timer = setTimeout(callback, duration);
  });
  element.addEventListener("mouseup", () => {
    clearTimeout(timer);
  });
  element.addEventListener("mouseleave", () => {
    clearTimeout(timer);
  });

  // Supporto per smartphone (touch)
  element.addEventListener("touchstart", () => {
    timer = setTimeout(callback, duration);
  });
  element.addEventListener("touchend", () => {
    clearTimeout(timer);
  });
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

// Animazione affidabile: Web Animations API + classe 'pulse'
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

// =====================
// FUNZIONI GIOCATORI
// =====================
function aggiungiPuntiGiocatore(id, punti) {
  const g = giocatoriObj.find(x => x.id === id);
  aggiornaPunteggio(g, punti);
  aggiornaUIGiocatore(g);
  aggiornaScoreboard();

  salvaSuGoogleSheets(g);
  console.log("Salvato punti:", punti)
}


function undoGiocatore(id) {
  const g = giocatoriObj.find(x => x.id === id);
  undoPunteggio(g);
  aggiornaUIGiocatore(g);
  aggiornaScoreboard();
  console.log("undoGiocatore: ",g.punteggio );	
  salvaSuGoogleSheets(g);

}

// =====================
// FUNZIONI SQUADRA B
// =====================
function aggiungiPuntiSquadraB(punti) {
  puntiSquadraB += punti;
  contatoriB[punti]++;
  historyB.push(punti);
  aggiornaScoreboard();
  salvaSquadraB();
}


function undoSquadraB() {
  if (historyB.length === 0) return;
  const last = historyB.pop();
  puntiSquadraB -= last;
  contatoriB[last]--;
  aggiornaScoreboard();
  salvaSquadraB();

}

// =====================
// SCOREBOARD
// =====================
function aggiornaScoreboard() {
  const punti = giocatoriObj.reduce((sum,g)=>sum+g.punteggio,0);
  const puntiASalvati = localStorage.getItem("puntiSquadraA");
  const puntiBSalvati = localStorage.getItem("puntiSquadraB");
  
  const scoreboard = document.getElementById("scoreboard");
  let nuovoTesto = "";
  let difference = (teamA === "Polismile A") ? punti != parseInt(puntiASalvati, 10) : punti != parseInt(puntiBSalvati, 10)
  if (difference && !isAdmin) {
    nuovoTesto = `${puntiASalvati} - ${puntiBSalvati}`;
  }
  else
  {
    nuovoTesto = (teamA === "Polismile A") ? `${punti} - ${puntiSquadraB}` : `${puntiSquadraB} - ${punti}`;
	puntiSquadraA = punti;
  }

  if (scoreboard.textContent !== nuovoTesto) {
    scoreboard.textContent = nuovoTesto;

    // Forza reflow e applica transizione
    scoreboard.classList.remove("flash");
    void scoreboard.offsetWidth; // forza reflow
    scoreboard.classList.add("flash");

    // Dopo 500ms torna allo stato normale
    setTimeout(() => scoreboard.classList.remove("flash"), 500);
  }

  if (isAdmin) {
    document.getElementById("punti_squadraB").textContent =
      `[${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
  }
}


// =====================
// STATO & ORDINAMENTI
// =====================
// =====================
// CAMBIO STATO
// =====================
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

// =====================
// TITOLI
// =====================
function aggiornaTitoli() {
  document.getElementById("teamA").textContent = teamA
  document.getElementById("teamB").textContent = teamB
}

let url = 
"https://script.google.com/macros/s/AKfycbzJpH70VkGlk-o12vYd4RyPtlpNhkRWbxsEOoemgWFoaV0QGRIsJJ7yuNjReHU2a6WS1w/exec";


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

// --- Salvataggio cumulativo Squadra B ---
function salvaSquadraB() {

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
  const url_1 = url + "?matchId=" + encodeURIComponent(matchId);
  console.log("URL: " + url_1)
  fetch(url_1)
    .then(res => res.json())
    .then(rows => {
      console.log("Dati caricati:", rows);

      aggiornaTitoli();

      // … poi aggiorni i giocatori
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
      renderGiocatori(giocatoriObj);
      aggiornaScoreboard();
      ordinaGiocatori(ultimoOrdinamento);
    });
}


// =====================
// AGGIORNAMENTO AUTOMATICO
// =====================
function interrompiAggiornamentoAutomatico() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null; // resetto la variabile
    console.log("Aggiornamento automatico interrotto");
  }
}

// Avvia il polling periodico
function avviaAggiornamentoAutomatico() {
  //const matchSelector = document.getElementById("matchId");

  // Ricarica subito la partita selezionata
  if (!document.hidden) {
    caricaDatiPartita(matchId);
  }
  
  // Ogni 5 secondi ricarica i dati
  if (!isAdmin) {
	  refreshTimer = setInterval(() => {
		//const matchId = matchSelector.value;
		caricaDatiPartita(matchId);
	  }, 5000);
  }
}

function SalvaPunteggi() {
  
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

    // Aggiungi la variabile convocazioni
    formData.append("convocazioni", convocazioni);

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
  
  const savedMatchId = localStorage.getItem("matchId");
  if (savedMatchId && savedMatchId !== "undefined") {
    matchId = savedMatchId;
    console.log("Partita caricata da localStorage:", matchId);
    caricaDatiPartita(matchId);
  } else {
    console.log("Nessun matchId salvato");
  }

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

  // Hamburger
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
      window.location.href = "./partite.html";
    });
  }

  aggiornaTitoli();
  renderGiocatori(giocatoriObj);
  aggiornaScoreboard();
  avviaAggiornamentoAutomatico();
}

document.addEventListener("DOMContentLoaded", init);
