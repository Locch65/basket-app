

let refreshInterval = null; // Gestisce il loop di aggiornamento

function parseItalianDate(dateStr, timeStr) {
      const [giorno, mese, anno] = dateStr.split("/").map(Number);
      const [ore, minuti] = timeStr.split(":").map(Number);
      return new Date(anno, mese - 1, giorno, ore, minuti);
}

function caricaListaPartite(filtroCampionato = null) {
      const container = document.getElementById("listaPartite");
      // 🔧 Mostra sempre Loading lampeggiante
      container.classList.add("loading");
      container.textContent = "Loading...";

      fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
          container.classList.remove("loading");
          const partite = Array.isArray(data) ? data : data.data;
          if (!Array.isArray(partite) || partite.length === 0) {
            container.textContent = "Nessuna partita disponibile";
            return;
          }

          let partiteFiltrate = partite;

          // 🔧 Filtro campionato
          if (filtroCampionato) {
            partiteFiltrate = partiteFiltrate.filter(p =>
              String(p.matchId ?? "").includes(filtroCampionato)
            );
          }
    
          // 🔧 Escludi partite passate se toggle attivo
          const excludePast = document.getElementById("togglePast").checked;
          const oggi = new Date();
          if (excludePast) {
            // Normalizza "oggi" a mezzanotte
            oggi.setHours(0, 0, 0, 0);
          
            partiteFiltrate = partiteFiltrate.filter(p => {
              const dataPartita = parseItalianDate(p.data, p.orario);
              // Normalizza anche la data della partita
              dataPartita.setHours(0, 0, 0, 0);
          
              return dataPartita >= oggi;
            });
          }


          // 🔧 Ordina per data crescente
          partiteFiltrate.sort((a, b) => {
            const dataA = parseItalianDate(a.data, a.orario);
            const dataB = parseItalianDate(b.data, b.orario);
            return dataA - dataB;
          });
          const frag = document.createDocumentFragment();
          //const oggi = new Date();

          let almenoUnaLive = false;
		  
          partiteFiltrate.forEach(p => {
            let campionato = "";
            if (String(p.matchId).includes("U14")) {
              campionato = "U14";
            } else if (String(p.matchId).includes("U15")) {
              campionato = "U15";
            } else {
              campionato = "Altro"; // fallback se non contiene U14/U15
            }
			// 🔧 Ripulisci matchId eliminando il nome del campionato
            let matchIdPulito = String(p.matchId)
              .replace("U14 ", "")
              .replace("U15 ", "")
              .trim();
			  
            const card = document.createElement("div");
            card.classList.add("match-card");
			card.setAttribute("data-matchid", p.matchId);
			
            // --- Controllo Live per il bordo ---
            if (p.isLive === "true" || p.isLive === true) {
              card.classList.add("live-border");
              almenoUnaLive = true;
            }
			
            const dataPartita = parseItalianDate(p.data, p.orario);
            if (dataPartita < oggi) {
              card.classList.add("past");
            }

            // Giorni della settimana in italiano (abbreviati)
            const giorniSettimana = ["Dom.", "Lun.", "Mar.", "Mer.", "Gio.", "Ven.", "Sab."];
            
            // Calcola giorno della settimana
            const giornoSettimana = giorniSettimana[dataPartita.getDay()];

            const casaIcon = "🏠";
            const trasfertaIcon = "🚌";
            const icona = (p.casaTrasferta === "Casa") ? casaIcon : trasfertaIcon;

            card.innerHTML = `
              <div class="match-top">
                <span class="campionato ${campionato}">${campionato}</span>
                <span class="match-id">${matchIdPulito}</span>
                <span class="data">${giornoSettimana} ${p.data}</span>
                <span class="orario">${p.orario}</span>
              </div>
              <div class="match-middle">
                <span class="casa">${icona}</span>
                <span class="luogo">${p.luogo}</span>
              </div>
              <div class="match-bottom">
                <span class="teamA"><span class="team-name">${p.squadraA}</span> <strong>${p.punteggioA ?? "-"}</strong></span>
                <span class="vs">vs</span>
                <span class="teamB"><strong>${p.punteggioB ?? "-"}</strong> <span class="team-name">${p.squadraB}</span></span>
              </div>
            `;
            
            if (p.casaTrasferta === "Casa") {
              card.querySelector(".teamA .team-name").classList.add("highlight");
            } else if (p.casaTrasferta === "Trasferta") {
              card.querySelector(".teamB .team-name").classList.add("highlight");
            }

            card.addEventListener("click", () => {
              localStorage.setItem("matchId", p.matchId);
              localStorage.setItem("teamA", p.squadraA);
              localStorage.setItem("teamB", p.squadraB);
              localStorage.setItem("puntiSquadraA", p.punteggioA === "" ? 0 : p.punteggioA);
              localStorage.setItem("puntiSquadraB", p.punteggioB === "" ? 0 : p.punteggioB);
              localStorage.setItem("convocazioni", p.convocazioni);
              localStorage.setItem("videoURL", p.videoURL);
              localStorage.setItem("videoId", extractYouTubeId(p.videoURL));
              localStorage.setItem("matchStartTime", extractYoutubeTime(p.videoURL));
              localStorage.setItem("isLive", p.isLive);
              localStorage.setItem("statoPartita", p.statoPartita);
              window.location.href = "match.html";
            });

            frag.appendChild(card);
          });

          container.replaceChildren(frag);
		  
          // --- LOGICA REFRESH AUTOMATICO ---
          startRefreshAutomatico(almenoUnaLive, filtroCampionato);

        })
        .catch(err => {
          container.classList.remove("loading");
          container.textContent = "Errore caricamento partite: " + err.message;
          console.error(err);
        });
}

function filtraPartite(campionato, titolo) {
        console.log("Filtro attivato per:", campionato);
    
        if (campionato && campionato.includes("Tutti")) {
          campionato = null;
          titolo.textContent = "Calendario U14 + U15";
        } else if (campionato === "U14") {
          titolo.textContent = "Calendario U14";
        } else if (campionato === "U15") {
          titolo.textContent = "Calendario U15";
        } else {
          titolo.textContent = "Calendario";
        }
    
        // 👉 Memorizza il campionato selezionato
        localStorage.setItem("campionatoSelezionato", campionato ?? "Tutti");
    
        caricaListaPartite(campionato);
}

function aggiornaPunteggiLive() {
  fetch(url + "?sheet=Partite")
    .then(res => res.json())
    .then(data => {
      const partite = Array.isArray(data) ? data : data.data;
      if (!Array.isArray(partite)) return;

      partite.forEach(p => {
        const card = document.querySelector(`.match-card[data-matchid="${p.matchId}"]`);
        if (card) {
          const teamAscore = card.querySelector(".teamA strong");
          const teamBscore = card.querySelector(".teamB strong");

          const applicaFlash = (elemento, nuovoPunto) => {
            const nuovoValore = String(nuovoPunto ?? "-");
            if (elemento && elemento.textContent !== nuovoValore) {
              elemento.textContent = nuovoValore;
              
              // Reset animazione
              elemento.classList.remove("flash-update");
              void elemento.offsetWidth; 
              elemento.classList.add("flash-update");
            }
          };

          applicaFlash(teamAscore, p.punteggioA);
          applicaFlash(teamBscore, p.punteggioB);
          
          // Aggiorna anche il bordo se la partita finisce o inizia il live
          if (p.isLive === true || p.isLive === "true") {
            card.classList.add("live-border");
          } else {
            card.classList.remove("live-border");
          }
        }
      });
    });
}

function startRefreshAutomatico(attiva, filtro) {
  // Se c'è almeno una partita live e non c'è già un timer attivo
  if (attiva && !refreshInterval) {
    console.log("Partita Live rilevata: avvio loop aggiornamento (5s)");
    refreshInterval = setInterval(() => {
      aggiornaPunteggiLive();
    }, 5000); // 5000 ms = 30 secondi
  } 
  // Se non ci sono più partite live, ferma il timer
  else if (!attiva && refreshInterval) {
    console.log("Nessuna partita Live: stop loop aggiornamento");
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function init() {
      const hamburgerBtn1 = document.getElementById("hamburgerBtn1");
      const menu1 = document.getElementById("menu1");
      const toggleTheme1 = document.getElementById("toggleTheme1");
      const campionatoItem = document.querySelector(".has-submenu");
      const submenu = campionatoItem.querySelector(".submenu");
      const togglePast = document.getElementById("togglePast");
      const titolo = document.querySelector("h1");
    
      // Apri/chiudi menu principale
      hamburgerBtn1.addEventListener("click", () => {
        menu1.classList.toggle("hidden");
      });
    
      // Apri/chiudi sottomenu Campionato
      campionatoItem.addEventListener("click", () => {
        submenu.classList.toggle("hidden");
      });
    
      // Chiudi menu dopo selezione
      menu1.querySelectorAll("li, button").forEach(item => {
        item.addEventListener("click", (e) => {
          if (!item.classList.contains("has-submenu")) {
            menu1.classList.add("hidden");
          }
          e.stopPropagation();
        });
      });
    
      // Funzione filtro campionato
    
      // Associa click agli item campionato
      document.querySelectorAll(".campionato-item").forEach(item => {
        item.addEventListener("click", () => {
          const campionato = item.dataset.campionato;
          filtraPartite(campionato, titolo);
        });
      });
    
      // Toggle per escludere partite passate
      togglePast.addEventListener("change", () => {
        const excludePast = togglePast.checked;
        localStorage.setItem("excludePast", excludePast ? "true" : "false");
    
        const campionatoSalvato = localStorage.getItem("campionatoSelezionato");
        caricaListaPartite(campionatoSalvato && campionatoSalvato !== "Tutti" ? campionatoSalvato : null);
      });
    
      // Ripristina tema salvato
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleTheme1.textContent = "☀️ Light Mode";
      }
    
      // Toggle Dark Mode
      toggleTheme1.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        toggleTheme1.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
      });
    
      // Ripristina stato togglePast
      const savedExcludePast = localStorage.getItem("excludePast");
      if (savedExcludePast === "true") {
        togglePast.checked = true;
      }
    
      // Ripristina campionato selezionato da localStorage + aggiorna titolo
      const campionatoSalvato = localStorage.getItem("campionatoSelezionato");
      if (campionatoSalvato === "U14") {
        titolo.textContent = "Calendario U14";
        caricaListaPartite("U14");
      } else if (campionatoSalvato === "U15") {
        titolo.textContent = "Calendario U15";
        caricaListaPartite("U15");
      } else if (campionatoSalvato === "Tutti") {
        titolo.textContent = "Calendario U14 + U15";
        caricaListaPartite();
      } else {
        titolo.textContent = "Calendario";
        caricaListaPartite();
      }
}

document.addEventListener("DOMContentLoaded", () => {
		init();
});
