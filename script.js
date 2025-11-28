// =====================
// VERSIONE SCRIPT
// =====================
const SCRIPT_VERSION = "1.0.9";  // Aggiorna questo numero ad ogni modifica

document.addEventListener("DOMContentLoaded", () => {
  // Mostra la versione nello UI
  const versionDiv = document.getElementById("scriptVersion");
  if (versionDiv) {
    versionDiv.textContent = "Script v" + SCRIPT_VERSION;
  }

  console.log("Script.js versione:", SCRIPT_VERSION);

  // ... resto del tuo codice init() e funzioni
});

// =====================
// DATI INIZIALI
// =====================
const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor",
  "C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9"];

let puntiSquadraB = 0;
let historyB = [];
let contatoriB = {1:0,2:0,3:0};
let ultimoOrdinamento = "numero";

let matchId = document.getElementById("matchId").value;

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
let score = 0;
let scoreB = 0;
let isAdmin = false;
let listaGiocatoriCorrente = []; // per ricaricare la lista dopo login

function login() {
  const pwd = document.getElementById("password").value;
  if (pwd === "basket2025") {   // password hardcoded
    isAdmin = true;
    document.getElementById("login").classList.add("hidden");
	document.getElementById("squadraB").classList.remove("hidden");
    aggiornaTitoli();
	initSquadraBControls(); // collega gli eventi ai bottoni
    // eventualmente puoi ricaricare la lista giocatori per mostrare i bottoni
    renderGiocatori(listaGiocatoriCorrente);
  } else {
    alert("Password errata. Accesso negato.");
  }
}

function initSquadraBControls() {
  if (!isAdmin) return;

  const controlsContainer = document.getElementById("controlsB");
  controlsContainer.innerHTML = ""; // pulisco eventuali bottoni precedenti
  //controlsContainer.classList.remove("hidden");

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
function renderGiocatori(lista) {
  console.log(" ***** renderGiocatori ******");
  listaGiocatoriCorrente = lista; // salvo la lista corrente
  const container = document.getElementById("giocatori");
  container.innerHTML = `<h1 id="titoloA">${document.getElementById("teamA").value}</h1>`;
  
  lista.forEach((g) => {
    const div = document.createElement("div");
    div.className = `giocatore ${g.stato.toLowerCase()}`;
    div.setAttribute("data-id", g.id);
    
    let statoBtn = document.createElement("button");
    statoBtn.className = g.stato === "In" ? "stato-btn stato-out" : "stato-btn stato-in";
    statoBtn.textContent = g.stato === "In" ? "Out" : "In";
    statoBtn.addEventListener("click", () => setStato(g.id, g.stato === "In" ? "Out" : "In"));

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
      </div>`;
    
    // Bottoni punteggio: SOLO se admin
    if (isAdmin) {
      const controls = document.createElement("div");
      [1,2,3].forEach(p => {
        const btn = document.createElement("button");
        btn.className = "tiro";
        btn.textContent = p === 1 ? "🏀 +1" : `➕${p}`;
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

    div.querySelector(".nome").appendChild(statoBtn);
    container.appendChild(div);
  });
}

function aggiornaUIGiocatore(g) {
  const span = document.getElementById("punti_" + g.id);
  if (span) {
    span.querySelector(".totale").textContent = g.punteggio;
    span.querySelector(".dettagli").textContent =
      `[${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]`;
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
  salvaSuGoogleSheets(g, punti);
  console.log("Salvato punti:", punti)
}

function undoGiocatore(id) {
  const g = giocatoriObj.find(x => x.id === id);
  undoPunteggio(g);
  aggiornaUIGiocatore(g);
  aggiornaScoreboard();
}

// =====================
// FUNZIONI SQUADRA B
// =====================
function aggiungiPuntiSquadraB(punti) {
  puntiSquadraB += punti;
  contatoriB[punti]++;
  historyB.push(punti);
  aggiornaScoreboard();
}

function undoSquadraB() {
  if (historyB.length === 0) return;
  const last = historyB.pop();
  puntiSquadraB -= last;
  contatoriB[last]--;
  aggiornaScoreboard();
}

// =====================
// SCOREBOARD
// =====================

function aggiornaScoreboard() {
  const puntiA = giocatoriObj.reduce((sum,g)=>sum+g.punteggio,0);
  const scoreboard = document.getElementById("scoreboard");
  const nuovoTesto = `${puntiA} - ${puntiSquadraB}`;

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
function setStato(id, stato) {
  const g = giocatoriObj.find(x => x.id === id);
  g.stato = stato;

  // seleziona il div del giocatore usando data-id
  const div = document.querySelector(`.giocatore[data-id="${id}"]`);
  if (div) {
    div.className = `giocatore ${stato.toLowerCase()}`;
  }
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

function salvaSuGoogleSheets(g) {
  const formData = new FormData();
  formData.append("matchId", matchId);
  formData.append("squadra", document.getElementById("teamA").value);
  formData.append("giocatore", g.displayName);
  formData.append("numero", g.numero);
  formData.append("punti", g.punteggio);   // 👈 invio punteggio cumulativo
  formData.append("dettagli", JSON.stringify(g.contatori)); // 👈 invio contatori cumulativi

  fetch("https://script.google.com/macros/s/AKfycbzKOgXFcCuwOhrfMb3R7ou5Vk79JcWZalqBRSJ2HhuTVBWD07nvTWkzwsPGsz_E7AlnIw/exec", {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => console.log("Salvato su Google Sheets:", data))
  .catch(err => console.error("Errore salvataggio:", err));
}

// =====================
// TITOLI
// =====================
function aggiornaTitoli() {
  document.getElementById("titoloA").textContent = document.getElementById("teamA").value;
  document.getElementById("titoloB").textContent = document.getElementById("teamB").value;
}

function caricaDatiPartita(matchId) {
  const url = "https://script.google.com/macros/s/AKfycbzKOgXFcCuwOhrfMb3R7ou5Vk79JcWZalqBRSJ2HhuTVBWD07nvTWkzwsPGsz_E7AlnIw/exec?matchId=" 
              + encodeURIComponent(matchId);

  fetch(url)
    .then(res => res.json())
    .then(rows => {
      console.log("Dati caricati:", rows);

      // Reset stato locale
      giocatoriObj.forEach(g => {
        g.punteggio = 0;
        g.contatori = {1:0,2:0,3:0};
        g.history = [];
      });
      puntiSquadraB = 0;
      contatoriB = {1:0,2:0,3:0};
      historyB = [];

      // 🔧 Aggiorna subito la UI di tutti i giocatori (anche se rows è vuoto)
      giocatoriObj.forEach(g => aggiornaUIGiocatore(g));

      // Aggiorna i dati dai valori cumulativi
      rows.forEach(r => {
        const punti = parseInt(r.punti, 10) || 0;
        let dettagli = {1:0,2:0,3:0};
        try { dettagli = JSON.parse(r.dettagli); } catch (e) {}

        const g = giocatoriObj.find(x => x.displayName === r.giocatore);
        if (g && r.squadra === document.getElementById("teamA").value) {
          g.punteggio = punti;
          g.contatori = dettagli;
          aggiornaUIGiocatore(g);
        } else {
          puntiSquadraB = punti;
          contatoriB = dettagli;
        }
      });

      // Aggiorna scoreboard
      aggiornaScoreboard();
    })
    .catch(err => {
      console.error("Errore caricamento:", err);
      const scoreboard = document.getElementById("scoreboard");
      scoreboard.textContent = "Errore nel caricamento";
      scoreboard.classList.add("error");
    });
}


// =====================
// AGGIORNAMENTO AUTOMATICO
// =====================

// Avvia il polling periodico
function avviaAggiornamentoAutomatico() {
  const matchSelector = document.getElementById("matchId");

  // Ricarica subito la partita selezionata
  caricaDatiPartita(matchSelector.value);

  // Ogni 5 secondi ricarica i dati
  setInterval(() => {
    const matchId = matchSelector.value;
    caricaDatiPartita(matchId);
  }, 5000);
}

// =====================
// INIZIALIZZAZIONE
// =====================
function init() {
  // Listener sul dropdown
  document.getElementById("matchId").addEventListener("change", (e) => {
	  
    // Mostra subito messaggio di aggiornamento
    document.getElementById("scoreboard").innerHTML = "<div class='loading'>Aggiornamento...</div>";
    //document.getElementById("giocatori").innerHTML = "";
	
    matchId = e.target.value;
    caricaDatiPartita(matchId); // refresh immediato al cambio partita
    console.log("Partita selezionata:", matchId);
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

  // ✅ Rendering iniziale UNA SOLA VOLTA
  renderGiocatori(giocatoriObj);
  //aggiornaTitoli();
  aggiornaScoreboard();

  // ✅ Avvio polling automatico
  avviaAggiornamentoAutomatico();
}

document.addEventListener("DOMContentLoaded", init);

