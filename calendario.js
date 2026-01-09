let isAdmin = localStorage.getItem("isAdmin") === "true";

let refreshInterval = null; // Gestisce il loop di aggiornamento

function parseItalianDate(dateStr, timeStr) {
      const [giorno, mese, anno] = dateStr.split("/").map(Number);
      const [ore, minuti] = timeStr.split(":").map(Number);
      return new Date(anno, mese - 1, giorno, ore, minuti);
}

/**
 * Funzione principale per caricare le partite.
 * Gestisce la cache immediata e decide se ridisegnare la lista o aggiornare i dati.
 */
function OLD_OKcaricaListaPartite(filtroCampionato = null) {
    const container = document.getElementById("listaPartite");
    const cacheDati = localStorage.getItem("cache_partite");

    // 1. Caricamento immediato dalla Cache (se disponibile)
    if (cacheDati) {
        try {
            const datiLocali = JSON.parse(cacheDati);
            container.classList.remove("loading");
            renderizzaPartite(datiLocali, filtroCampionato);
        } catch (e) {
            console.error("Errore lettura cache:", e);
        }
    }

    // 2. Fetch dei dati aggiornati da Google Sheets
    fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
            container.classList.remove("loading");
            const partite = Array.isArray(data) ? data : data.data;
            if (!Array.isArray(partite)) return;

            // Salva i nuovi dati in cache per il prossimo reload
            localStorage.setItem("cache_partite", JSON.stringify(partite));

            // Se il filtro è attivo o la lista è vuota, eseguiamo un render completo.
            // Altrimenti aggiorniamo chirurgicamente i punteggi/live.
            if (container.querySelector('.match-card')) {
                // Se la lista esiste già, aggiorniamo solo i dati sensibili senza "blink"
                aggiornaDatiSenzaBlink(partite);
            } else {
                renderizzaPartite(partite, filtroCampionato);
            }

            // Gestione Refresh Automatico
            const almenoUnaLive = partite.some(p => p.isLive === "true" || p.isLive === true);
            startRefreshAutomatico(almenoUnaLive, filtroCampionato);
        })
        .catch(err => {
            container.classList.remove("loading");
            if (container.children.length === 0) {
                container.textContent = "Errore di connessione.";
            }
            console.error(err);
        });
}

function caricaListaPartite(filtroCampionato = null) {
    const container = document.getElementById("listaPartite");
    
    // --- NUOVA LOGICA FILTRO LIVE ---
    const urlParams = new URLSearchParams(window.location.search);
    const filterLiveOnly = urlParams.get('live') === 'true';
    const titolo = document.querySelector("h1");
    // --------------------------------

    const cacheDati = localStorage.getItem("cache_partite");

    if (cacheDati) {
        try {
            let datiLocali = JSON.parse(cacheDati);
            
            // Applichiamo il filtro se siamo in modalità live
            if (filterLiveOnly) {
                datiLocali = datiLocali.filter(p => p.isLive === "true" || p.isLive === true);
                if (titolo) titolo.textContent = "Partite in Diretta";
            }
            
            container.classList.remove("loading");
            renderizzaPartite(datiLocali, filtroCampionato);
        } catch (e) { console.error(e); }
    }

    fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
            container.classList.remove("loading");
            let partite = Array.isArray(data) ? data : data.data;

            // Applichiamo lo stesso filtro ai dati freschi dal server
            if (filterLiveOnly) {
                partite = partite.filter(p => p.isLive === "true" || p.isLive === true);
                if (titolo) titolo.textContent = "Partite in Diretta";
            }

            localStorage.setItem("cache_partite", JSON.stringify(partite));
            renderizzaPartite(partite, filtroCampionato);
        });
}

/**
 * Ricostruisce l'intero DOM della lista.
 * Da usare al caricamento o quando si cambia filtro (U14/U15).
 */
function renderizzaPartite(partite, filtroCampionato) {
    const container = document.getElementById("listaPartite");
    const oggi = new Date();
    const excludePast = document.getElementById("togglePast").checked;
    
    let partiteFiltrate = partite;

    // Filtro per Campionato
    if (filtroCampionato && filtroCampionato !== "Tutti") {
        partiteFiltrate = partiteFiltrate.filter(p =>
            String(p.matchId ?? "").includes(filtroCampionato)
        );
    }

    // Filtro per partite passate
    if (excludePast) {
        const oggiMezzanotte = new Date();
        oggiMezzanotte.setHours(0, 0, 0, 0);
        partiteFiltrate = partiteFiltrate.filter(p => {
            const dataP = parseItalianDate(p.data, p.orario);
            dataP.setHours(0, 0, 0, 0);
            return dataP >= oggiMezzanotte;
        });
    }

    // Ordinamento cronologico
    partiteFiltrate.sort((a, b) => parseItalianDate(a.data, a.orario) - parseItalianDate(b.data, b.orario));

    const frag = document.createDocumentFragment();

    partiteFiltrate.forEach(p => {
        let cat = String(p.matchId).includes("U14") ? "U14" : String(p.matchId).includes("U15") ? "U15" : "Altro";
        let mIdPulito = String(p.matchId).replace("U14 ", "").replace("U15 ", "").trim();

        const card = document.createElement("div");
        card.classList.add("match-card");
        card.setAttribute("data-matchid", p.matchId);

        if (p.isLive === "true" || p.isLive === true) card.classList.add("live-border");
        if (parseItalianDate(p.data, p.orario) < oggi) card.classList.add("past");

        const giorni = ["Dom.", "Lun.", "Mar.", "Mer.", "Gio.", "Ven.", "Sab."];
        const giornoSett = giorni[parseItalianDate(p.data, p.orario).getDay()];

        card.innerHTML = `
            <div class="match-top">
                <span class="campionato ${cat}">${cat}</span>
                <span class="match-id">${mIdPulito}</span>
                <span class="data">${giornoSett} ${p.data}</span>
                <span class="orario">${p.orario}</span>
            </div>
            <div class="match-middle"><span class="luogo">${p.luogo}</span></div>
            <div class="match-bottom">
                <span class="teamA"><span class="team-name">${p.squadraA}</span> <strong>${p.punteggioA ?? "-"}</strong></span>
                <span class="vs">vs</span>
                <span class="teamB"><strong>${p.punteggioB ?? "-"}</strong> <span class="team-name">${p.squadraB}</span></span>
            </div>`;
        
        // Highlight squadra di casa/trasferta
        if (p.casaTrasferta === "Casa") card.querySelector(".teamA .team-name").classList.add("highlight");
        else if (p.casaTrasferta === "Trasferta") card.querySelector(".teamB .team-name").classList.add("highlight");

        card.onclick = () => {
            localStorage.setItem("matchId", p.matchId);
            localStorage.setItem("teamA", p.squadraA);
            localStorage.setItem("teamB", p.squadraB);
            localStorage.setItem("puntiSquadraA", p.punteggioA || 0);
            localStorage.setItem("puntiSquadraB", p.punteggioB || 0);
            localStorage.setItem("convocazioni", p.convocazioni || "");
            localStorage.setItem("videoURL", p.videoURL || "");
            localStorage.setItem("videoId", extractYouTubeId(p.videoURL));
            localStorage.setItem("matchStartTime", extractYoutubeTime(p.videoURL));
            localStorage.setItem("oraInizioDiretta", p.oraInizioDiretta || "");
            localStorage.setItem("isLive", p.isLive || false);
            localStorage.setItem("statoPartita", p.statoPartita || "");
            
            window.location.href = (localStorage.getItem("isAdmin") === "true") ? "match.html" : "direttavideo.html?matchId=" + encodeURIComponent(p.matchId);
        };

        frag.appendChild(card);
    });

    container.replaceChildren(frag);
}

/**
 * Aggiorna i dati nelle card esistenti senza ricreare il DOM.
 * Impedisce il fastidioso flickering della pagina.
 */
function aggiornaDatiSenzaBlink(partite) {
    partite.forEach(p => {
        const card = document.querySelector(`.match-card[data-matchid="${p.matchId}"]`);
        if (card) {
            const scoreA = card.querySelector(".teamA strong");
            const scoreB = card.querySelector(".teamB strong");
            
            // Aggiorna solo se il valore è cambiato
            if (scoreA && scoreA.textContent !== String(p.punteggioA ?? "-")) scoreA.textContent = p.punteggioA ?? "-";
            if (scoreB && scoreB.textContent !== String(p.punteggioB ?? "-")) scoreB.textContent = p.punteggioB ?? "-";

            // Gestione dinamica del bordo live
            if (p.isLive === "true" || p.isLive === true) {
                card.classList.add("live-border");
            } else {
                card.classList.remove("live-border");
            }
        }
    });
}

/**
 * Richiamata dal timer di refresh automatico.
 */
function aggiornaPunteggiLive() {
    fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
            const partite = Array.isArray(data) ? data : data.data;
            if (Array.isArray(partite)) {
                localStorage.setItem("cache_partite", JSON.stringify(partite));
                aggiornaDatiSenzaBlink(partite);
            }
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

        // --- AGGIUNTA: Rimuove il parametro ?live dall'URL senza ricaricare la pagina ---
        const url = new URL(window.location);
        url.searchParams.delete('live');
        window.history.replaceState({}, '', url);
        // ---------------------------------------------------------------------------
    
        caricaListaPartite(campionato);
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
function createAdminLoginPopup() {
  const adminBtn = document.getElementById("adminBtn");
  const popup = document.getElementById("adminPopup");
  
  // Elementi interni al popup
  const okBtn = document.getElementById("adminOkBtn");
  const cancelBtn = document.getElementById("adminCancelBtn");
  const pwdInput = document.getElementById("adminPassword");

  // Controllo fondamentale: se manca il tasto del menu o il popup, non possiamo fare nulla
  if (!adminBtn || !popup) {
    console.error("Errore: adminBtn o adminPopup non trovati.");
    return;
  }

  // 1. Gestione tasto Admin/Logout nel Menu (SEMPRE ATTIVO)
  adminBtn.onclick = (e) => {
    e.preventDefault();
    if (isAdmin) {
      if (confirm("Vuoi uscire dalla modalità Admin?")) {
        login("logout");
        document.getElementById("menu").classList.add("hidden");
      }
    } else {
      popup.classList.remove("hidden");
      if (pwdInput) {
        pwdInput.value = "";
        setTimeout(() => pwdInput.focus(), 100);
      }
    }
  };

  // 2. Gestione bottoni interni (se esistono nel DOM)
  if (okBtn) {
    okBtn.onclick = (e) => {
      e.stopPropagation();
      const password = pwdInput ? pwdInput.value : "";
      if (password) {
        login(password);
        popup.classList.add("hidden");
        const menu = document.getElementById("menu");
        if (menu) menu.classList.add("hidden");
      }
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      popup.classList.add("hidden");
    };
  }

  if (pwdInput) {
    pwdInput.onkeypress = (e) => {
      if (e.key === "Enter" && okBtn) {
        okBtn.onclick(e);
      }
    };
  }

  // Chiudi cliccando fuori dal contenuto bianco del popup
  popup.onclick = (e) => {
    if (e.target === popup) {
      popup.classList.add("hidden");
    }
  };
}

function init() {
      const hamburgerBtn = document.getElementById("hamburgerBtn");
      const menu = document.getElementById("menu");
      const toggleTheme1 = document.getElementById("toggleTheme1");
      const campionatoItem = document.querySelector(".has-submenu");
      const submenu = campionatoItem.querySelector(".submenu");
      const togglePast = document.getElementById("togglePast");
      const titolo = document.querySelector("h1");
    
      // Apri/chiudi menu principale
      hamburgerBtn.addEventListener("click", () => {
        menu.classList.toggle("hidden");
      });
    
      // Apri/chiudi sottomenu Campionato
      campionatoItem.addEventListener("click", () => {
        submenu.classList.toggle("hidden");
      });
    
      // Chiudi menu dopo selezione
      menu.querySelectorAll("li, button").forEach(item => {
        item.addEventListener("click", (e) => {
          if (!item.classList.contains("has-submenu")) {
            menu.classList.add("hidden");
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
    
	  //createAdminLoginPopup();
          // Crea il popup (rimarrà nascosto fino al click)
      if (typeof createAdminPopup === "function") {
          createAdminPopup();
      }
  
      isAdmin = localStorage.getItem("isAdmin") === "true";

      const adminBtn = document.getElementById("adminBtn");
      // Al caricamento, se siamo già admin, scriviamo subito Logout
      if (isAdmin && adminBtn) {
          adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      }
  
      if (adminBtn) {
          adminBtn.addEventListener("click", () => {
              const menu = document.getElementById("menu") || document.getElementById("menu1");
              if (menu) menu.classList.add("hidden");
  
              if (isAdmin) {
                  // LOGICA LOGOUT
                  if (confirm("Vuoi uscire dalla modalità Admin?")) {
                      isAdmin = false;
                      localStorage.setItem("isAdmin", "false");
                      localStorage.setItem("AdminPassword", "");
                      adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
                  }
              } else {
                  // LOGICA LOGIN (Apre il popup)
                  const popup = document.getElementById("adminPopup");
                  if (popup) {
                      popup.classList.remove("hidden");
                      document.getElementById("adminPassword").value = "";
                      document.getElementById("adminPassword").focus();
                  }
              }
          });
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
