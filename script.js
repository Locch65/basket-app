// =====================
// VERSIONE SCRIPT
// =====================
const SCRIPT_VERSION = "1.0.34";  // Aggiorna questo numero ad ogni modifica

document.addEventListener("DOMContentLoaded", () => {
  // Mostra la versione nello UI
  const versionDiv = document.getElementById("scriptVersion");
  if (versionDiv) {
    versionDiv.textContent = "Script v" + SCRIPT_VERSION;
  }

  console.log("Script.js versione:", SCRIPT_VERSION);

});

// =====================
// DATI INIZIALI
// =====================
const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor",
  "C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "C. Gallo", "A. Tusa"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "41", "29"];

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


function OLD4initSquadraBControls() {
  if (!isAdmin) return;

// Assicurati che la sezione Squadra B esista e sia nel DOM
  const squadraB = document.getElementById("squadraB");
  if (!squadraB) return;
  
  const controlsContainer = document.getElementById("controlsB");
  const row = document.querySelector(".squadraB-row"); // la riga che contiene punteggio + controlli

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
  
  // Logica di allineamento in base a TeamA
  const rawTeamA = document.getElementById("teamA")?.textContent || "";
  const teamAName = rawTeamA.replace(/\s+/g, " ").trim();

  // Rimuovo la variante precedente e applico quella corretta
  controlsContainer.classList.remove("right", "left"); // Rimuovi entrambe le classi
  
  if (teamAName === "Polismile A") {
    // Se TeamA è "Polismile A" -> Allinea a destra
    controlsContainer.classList.add("right");
  } else {
    // Se TeamA è diverso -> Allinea a sinistra
    controlsContainer.classList.add("left");
  }
}

function OLD3initSquadraBControls() {
  if (!isAdmin) return;

  const controlsContainer = document.getElementById("controlsB");
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

  // 🔎 Logica di allineamento in base al nome di TeamA
  const rawTeamA = document.getElementById("teamA")?.textContent || "";
  const teamAName = rawTeamA.replace(/\s+/g, " ").trim();

  // Rimuovo eventuali classi precedenti
  controlsContainer.classList.remove("left", "right");

  if (teamAName === "Polismile A") {
    controlsContainer.classList.add("right");
  } else {
    controlsContainer.classList.add("left");
  }
}

function OLD2initSquadraBControls() {
  if (!isAdmin) return;

  const controlsContainer = document.getElementById("controlsB");
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

  // 🔎 Logica di allineamento in base al nome di TeamA
  const teamAName = document.getElementById("teamA").textContent.trim();

  // Rimuovo eventuali classi precedenti
  controlsContainer.classList.remove("left", "right");

  if (teamAName === "Polismile A") {
    controlsContainer.classList.add("right");
  } else {
    controlsContainer.classList.add("left");
  }
}

function OLDinitSquadraBControls() {
  if (!isAdmin) return;

  const controlsContainer = document.getElementById("controlsB");
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
  lista.sort((a, b) => {
    if (a.stato === b.stato) return 0;
    return a.stato === "In" ? -1 : 1;
  });

  const outPlayers = lista.filter(g => g.stato === "Out");
  const metà = Math.ceil(outPlayers.length / 2);

  lista.forEach((g) => {
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

    // 👉 Card cliccabile per cambiare stato
    if (isAdmin) {
      div.style.cursor = "pointer";
      div.addEventListener("click", (e) => {
        // Evita che il click sui bottoni punteggio cambi lo stato
        if (e.target.tagName.toLowerCase() === "button") return;
        const nuovoStato = g.stato === "In" ? "Out" : "In";
        setStato(g.id, nuovoStato);
      });
	  
	  // tap prolungato → azione speciale
      addLongPressListener(div, () => {
        showPlayerPopup(g);
      });
    }

    // Bottoni punteggio: solo se admin e giocatore In
    if (isAdmin && g.stato === "In") {
      const controls = document.createElement("div");
      [1,2,3].forEach(p => {
        const btn = document.createElement("button");
        btn.className = "tiro";
        //btn.textContent = p === 1 ? "🏀 +1" : `➕${p}`;
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

    // Append nel contenitore giusto
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
  const puntiA = giocatoriObj.reduce((sum,g)=>sum+g.punteggio,0);
  const puntiASalvati = localStorage.getItem("puntiSquadraA");
  const puntiBSalvati = localStorage.getItem("puntiSquadraB");
  
  const scoreboard = document.getElementById("scoreboard");
  let nuovoTesto = "";
  if (puntiA != parseInt(puntiASalvati, 10) && !isAdmin) {
    nuovoTesto = `${puntiASalvati} - ${puntiBSalvati}`;
  }
  else
  {
    nuovoTesto = (teamA === "Polismile A") ? `${puntiA} - ${puntiSquadraB}` : `${puntiSquadraB} - ${puntiA}`;
	puntiSquadraA = puntiA;
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

let url = "https://script.google.com/macros/s/AKfycbzJp7oDq1_vstaSyfY4jHVHvEH-LMUX2S5Mjg8laQSzwXYdGpWtrcxVr4pg_EM5JAACqQ/exec"

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

// =====================
// INIZIALIZZAZIONE
// =====================
function init() {
  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
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





