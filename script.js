// =====================
// VERSIONE SCRIPT
// =====================
const SCRIPT_VERSION = "1.0.1";  // Aggiorna questo numero ad ogni modifica

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
// RENDERING UI
// =====================
function renderGiocatori(lista) {
  const container = document.getElementById("giocatori");
  container.innerHTML = `<h1 id="titoloA">${document.getElementById("teamA").value}</h1>`;
  
  lista.forEach((g) => {
    const div = document.createElement("div");
    div.className = `giocatore ${g.stato.toLowerCase()}`;
    
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
    
    // Bottoni punteggio
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

    div.querySelector(".nome").appendChild(statoBtn);
    div.appendChild(controls);
    container.appendChild(div);
  });
}

function aggiornaUIGiocatore(g) {
  const span = document.getElementById("punti_" + g.id);
  span.innerHTML = `<span class="totale">${g.punteggio}</span> 
                    <span class="dettagli">[${g.contatori[1]},${g.contatori[2]},${g.contatori[3]}]</span>`;
}

// =====================
// FUNZIONI GIOCATORI
// =====================
function aggiungiPuntiGiocatore(id, punti) {
  const g = giocatoriObj.find(x => x.id === id);
  aggiornaPunteggio(g, punti);
  aggiornaUIGiocatore(g);
  aggiornaScoreboard();
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
  let puntiA = giocatoriObj.reduce((sum,g)=>sum+g.punteggio,0);
  document.getElementById("scoreboard").textContent = `${puntiA} - ${puntiSquadraB}`;
  document.getElementById("punti_squadraB").textContent =
    `[${contatoriB[1]},${contatoriB[2]},${contatoriB[3]}]`;
}

// =====================
// STATO & ORDINAMENTI
// =====================
function setStato(id, stato) {
  const g = giocatoriObj.find(x => x.id === id);
  g.stato = stato;
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
  document.getElementById("titoloA").textContent = document.getElementById("teamA").value;
  document.getElementById("titoloB").textContent = document.getElementById("teamB").value;
}

// =====================
// INIZIALIZZAZIONE
// =====================
function init() {
  // Bottoni ordinamento
  document.querySelector("#ordinamenti button:nth-child(1)")
    .addEventListener("click", () => ordinaGiocatori("numero"));
  document.querySelector("#ordinamenti button:nth-child(2)")
    .addEventListener("click", () => ordinaGiocatori("cognome"));
  document.querySelector("#ordinamenti button:nth-child(3)")
    .addEventListener("click", () => ordinaGiocatori("punteggio"));

  // Bottoni squadra B
  document.querySelector("#squadraB .tiro:nth-child(2)")
    .addEventListener("click", () => aggiungiPuntiSquadraB(1));
  document.querySelector("#squadraB .tiro:nth-child(3)")
    .addEventListener("click", () => aggiungiPuntiSquadraB(2));
  document.querySelector("#squadraB .tiro:nth-child(4)")
    .addEventListener("click", () => aggiungiPuntiSquadraB(3));
  document.querySelector("#squadraB .undo")
    .addEventListener("click", undoSquadraB);

  // Input nomi squadre
  document.getElementById("teamA").addEventListener("change", () => {
    aggiornaTitoli(); aggiornaScoreboard();
  });
  document.getElementById("teamB").addEventListener("change", () => {
    aggiornaTitoli(); aggiornaScoreboard();
  });

  // Rendering iniziale
  renderGiocatori(giocatoriObj);
  aggiornaTitoli();
  aggiornaScoreboard();
}

document.addEventListener("DOMContentLoaded", init);


