const url = 
"https://script.google.com/macros/s/AKfycbzXatgfzOvfViJByN7aZpNHQ-Xh-3CipzQZCiqON_Do-ZkfZQBgfGExxG38z0NXEEZ-YA/exec"


function parseItalianDate(dateStr, timeStr) {
      const [giorno, mese, anno] = dateStr.split("/").map(Number);
      const [ore, minuti] = timeStr.split(":").map(Number);
      return new Date(anno, mese - 1, giorno, ore, minuti);
}

function extractYouTubeId(input) {
  try {
    // Caso 0: input già un videoId (11 caratteri alfanumerici tipici di YouTube)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    const urlObj = new URL(input);

    // Caso 1: URL classico con parametro ?v=...
    if (urlObj.searchParams.has("v")) {
      return urlObj.searchParams.get("v");
    }

    // Caso 2: URL corto youtu.be/ID
    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1);
    }

    // Caso 3: URL embed /embed/ID
    if (urlObj.pathname.includes("/embed/")) {
      return urlObj.pathname.split("/embed/")[1].split(/[?&]/)[0];
    }

    // Caso 4: altri formati non previsti
    return "";
  } catch (e) {
    console.error("Input non valido:", e);
    return "";
  }
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
              localStorage.setItem("videoId", extractYouTubeId(p.videoId));
              window.location.href = "match.html";
            });

            frag.appendChild(card);
          });

          container.replaceChildren(frag);
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
