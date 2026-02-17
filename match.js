
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
  if (localStorage.getItem("USE_MATCH_HTML") === "false") return;


  teamA = localStorage.getItem("teamA");
  teamB = localStorage.getItem("teamB");
  squadraAvversaria = (teamA === "Polismile A") ? teamB : teamA

  convocazioni = localStorage.getItem("convocazioni");
  videoURL = localStorage.getItem("videoURL");
  videoId = localStorage.getItem("videoId");
  matchStartTime = localStorage.getItem("matchStartTime");
  oraInizioDiretta = localStorage.getItem("oraInizioDiretta");
  isLive = localStorage.getItem("isLive");
  statoPartita = localStorage.getItem("statoPartita");
  googleApiKey = localStorage.getItem("googleApiKey") || ""; // Recupera il valore salvato  

  isAdmin = localStorage.getItem("isAdmin") === "true";
  AdminPassword = localStorage.getItem("AdminPassword");
  // Avvia l'orologio immediatamente e poi ogni secondo
  setInterval(updateClock, 1000);
  updateClock();
}

document.addEventListener("DOMContentLoaded", init);