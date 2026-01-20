let isAdmin = localStorage.getItem("isAdmin") === "true";

let refreshInterval = null; // Gestisce il loop di aggiornamento

function parseItalianDate(dateStr, timeStr) {
      const [giorno, mese, anno] = dateStr.split("/").map(Number);
      const [ore, minuti] = timeStr.split(":").map(Number);
      return new Date(anno, mese - 1, giorno, ore, minuti);
}

// Funzione aggiornata per gestire la cache e l'ottimizzazione rete
function caricaListaPartite(filtroCampionato = null) {
    const container = document.getElementById("listaPartite");
    const cacheDati = localStorage.getItem("cache_partite");

    // 1. Uso immediato della cache se disponibile per velocità istantanea
    if (cacheDati) {
        try {
            const datiLocali = JSON.parse(cacheDati);
            container.classList.remove("loading");
            renderizzaPartite(datiLocali, filtroCampionato);
            console.log("Dati caricati dalla cache locale.");
        } catch (e) {
            console.error("Errore lettura cache:", e);
        }
    }

    // 2. Caricamento dal server solo se la cache è vuota o se richiesto esplicitamente
    if (!cacheDati) {
        fetchPartiteDalServer(filtroCampionato);
    }
}

function fetchPartiteDalServer(filtroCampionato) {
    const container = document.getElementById("listaPartite");
    container.classList.add("loading");

    // 1. Facciamo partire il cronometro
    const startTime = performance.now();

    fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
            // 2. Calcoliamo la fine e stampiamo in console
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2); // Arrotonda a 2 decimali
            console.log("fetchPartiteDalServer() " + duration + " ms");

            const partite = Array.isArray(data) ? data : data.data;
            // Aggiorna la cache con i nuovi dati freschi
            localStorage.setItem("cache_partite", JSON.stringify(partite));
            container.classList.remove("loading");
            renderizzaPartite(partite, filtroCampionato);
        })
        .catch(err => {
            console.error("Errore fetch, provo a usare la cache:", err);
            
            // Tenta di recuperare i dati dalla cache se il server fallisce
            const cacheDati = localStorage.getItem("cache_partite");
            if (cacheDati) {
                const datiLocali = JSON.parse(cacheDati);
                container.classList.remove("loading");
                renderizzaPartite(datiLocali, filtroCampionato);
                // Opzionale: mostra un piccolo avviso che i dati sono offline
                console.warn("Visualizzazione dati in modalità offline (cache)");
            } else {
                container.innerHTML = "Errore: server non raggiungibile e nessuna cache disponibile.";
                container.classList.remove("loading");
            }
        });
}

// Funzione dedicata al recupero dati dal server
function OLDfetchPartiteDalServer(filtroCampionato) {
    const container = document.getElementById("listaPartite");
    container.classList.add("loading");

    fetch(url + "?sheet=Partite")
        .then(res => res.json())
        .then(data => {
            const partite = Array.isArray(data) ? data : data.data;
            // Salva i nuovi dati in cache per il prossimo accesso
            localStorage.setItem("cache_partite", JSON.stringify(partite));
            container.classList.remove("loading");
            renderizzaPartite(partite, filtroCampionato);
        })
        .catch(err => {
            console.error("Errore fetch:", err);
            container.innerHTML = "Errore nel caricamento dati.";
        });
}

function renderizzaPartite(partite, filtroCampionato) {
/**
 * Ricostruisce l'intero DOM della lista.
 * Da usare al caricamento o quando si cambia filtro (U14/U15).
 */
    const container = document.getElementById("listaPartite");
    const oggi = new Date();
    const excludePast = document.getElementById("togglePast").checked;
	const isAdmin = localStorage.getItem("isAdmin") === "true"; // Controllo se è admin
    
    let partiteFiltrate = partite;

    // Se NON è admin, mostra SOLO U14 e U15, escludendo tutto il resto (es. Amichevoli o test)
    if (!isAdmin) {
        partiteFiltrate = partiteFiltrate.filter(p => {
            const mId = String(p.matchId || "");
            return mId.includes("U14") || mId.includes("U15");
        });
    }
	
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

function aggiornaDatiSenzaBlink(partite) {
/**
 * Aggiorna i dati nelle card esistenti senza ricreare il DOM.
 * Impedisce il fastidioso flickering della pagina.
 */
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

function aggiornaPunteggiLive() {
/**
 * Richiamata dal timer di refresh automatico.
 */
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
    const togglePast = document.getElementById("togglePast");
    const titolo = document.querySelector("h1");
    const adminBtn = document.getElementById("adminBtn");
    const campRadios = document.querySelectorAll('.camp-radio');

    // --- 1. GESTIONE MENU PRINCIPALE ---
    // Apri/chiudi menu principale
    hamburgerBtn.addEventListener("click", () => {
        menu.classList.toggle("hidden");
    });

    // Chiudi menu cliccando fuori (opzionale ma utile)
    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });

    // --- 2. FILTRO CAMPIONATO (RADIO BUTTONS) ---
    // Ripristina selezione salvata o default "Tutti"
    const campionatoSalvato = localStorage.getItem("campionatoSelezionato") || "Tutti";
    
    campRadios.forEach(radio => {
        // Imposta lo stato iniziale del radio button
        if (radio.value === campionatoSalvato) {
            radio.checked = true;
        }

        // Evento al cambio selezione
        radio.addEventListener("change", (e) => {
            const selezione = e.target.value;
            filtraPartite(selezione, titolo);
            
            // Chiudi il menu dopo la scelta per migliorare la UX
            setTimeout(() => menu.classList.add("hidden"), 200);
        });
    });

    // --- 3. FILTRO PARTITE PASSATE ---
    // Ripristina stato salvato
    if (localStorage.getItem("excludePast") === "true") {
        togglePast.checked = true;
    }

    togglePast.addEventListener("change", () => {
        localStorage.setItem("excludePast", togglePast.checked ? "true" : "false");
        const attuale = localStorage.getItem("campionatoSelezionato") || "Tutti";
        caricaListaPartite(attuale !== "Tutti" ? attuale : null);
        menu.classList.add("hidden");
    });

    // --- 4. TEMA (DARK/LIGHT MODE) ---
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleTheme1.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }

    toggleTheme1.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        toggleTheme1.innerHTML = isDark ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
        menu.classList.add("hidden");
    });

    // --- 5. ADMIN & LOGIN ---
    if (typeof createAdminPopup === "function") {
        createAdminPopup(); // Inizializza il popup se la funzione esiste
    }

    const isAdmin = localStorage.getItem("isAdmin") === "true";
    if (isAdmin && adminBtn) {
        adminBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
    }

    if (adminBtn) {
        adminBtn.addEventListener("click", () => {
            menu.classList.add("hidden");
            if (localStorage.getItem("isAdmin") === "true") {
                if (confirm("Vuoi uscire dalla modalità Admin?")) {
                    localStorage.setItem("isAdmin", "false");
                    localStorage.setItem("AdminPassword", "");
                    location.reload(); // Ricarica per aggiornare i permessi
                }
            } else {
                const popup = document.getElementById("adminPopup");
                if (popup) {
                    popup.classList.remove("hidden");
                    document.getElementById("adminPassword").value = "";
                    document.getElementById("adminPassword").focus();
                }
            }
        });
    }
    // Gestione del bottone Aggiorna
    document.getElementById("updateBtn").addEventListener("click", () => {
        const container = document.getElementById("listaPartite");
        
        // 1. Svuota la cache locale
        localStorage.removeItem("cache_partite"); 
        
        // 2. Ripristina il testo di caricamento e la classe "loading"
        container.innerHTML = "Caricamento Calendario...";
        container.classList.add("loading");
        
        // 3. Recupera il valore del filtro attuale e forza il fetch dal server
        const filtroAttuale = document.querySelector('input[name="camp"]:checked').value;
        fetchPartiteDalServer(filtroAttuale);
    });	

    // --- 6. CARICAMENTO INIZIALE DATI ---
    // Applica il filtro iniziale in base al salvataggio o al parametro URL
    filtraPartite(campionatoSalvato, titolo);
}

document.addEventListener("DOMContentLoaded", () => {
		init();
});
