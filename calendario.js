let ordineCalendario = "desc";
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
            renderizzaPartite(datiLocali, filtroCampionato, ordineCalendario);
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

        const params = new URLSearchParams({
            sheet: "Partite",
            userId: userId,
            action: "Get Calendario Partite",
            details: JSON.stringify(getDeviceData)
        });

        fetch(`${url}?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            // 2. Calcoliamo la fine e stampiamo in console
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2); // Arrotonda a 2 decimali
            console.log("fetchPartiteDalServer() " + duration + " ms");

            const partite = Array.isArray(data) ? data : data.data;
            salvaDatiMappa(partite);

            // Aggiorna la cache con i nuovi dati freschi
            localStorage.setItem("cache_partite", JSON.stringify(partite));
            container.classList.remove("loading");
            renderizzaPartite(partite, filtroCampionato, ordineCalendario);
        })
        .catch(err => {
            console.error("Errore fetch, provo a usare la cache:", err);

            // Tenta di recuperare i dati dalla cache se il server fallisce
            const cacheDati = localStorage.getItem("cache_partite");
            if (cacheDati) {
                const datiLocali = JSON.parse(cacheDati);
                container.classList.remove("loading");
                renderizzaPartite(datiLocali, filtroCampionato, ordineCalendario);
                // Opzionale: mostra un piccolo avviso che i dati sono offline
                console.warn("Visualizzazione dati in modalità offline (cache)");
            } else {
                container.innerHTML = "Errore: server non raggiungibile e nessuna cache disponibile.";
                container.classList.remove("loading");
            }
        });
}

function isInTheFuture(newDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    let tempDate;
    if (typeof newDate === 'string' && newDate.includes('/')) {
        const parti = newDate.split('/');
        tempDate = new Date(parti[2], parti[1] - 1, parti[0]);
    } else {
        tempDate = new Date(newDate);
    }
    return tempDate > today;
}

function renderizzaPartite(partite, filtroCampionato, ordine = 'asc') {
    /**
     * Ricostruisce l'intero DOM della lista.
     * @param {string} ordine - 'asc' per cronologico, 'desc' per il più recente prima.
     */
    const container = document.getElementById("listaPartite");
    const oggi = new Date();
    const excludePast = document.getElementById("togglePast").checked;
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    let partiteFiltrate = partite;

    // Se NON è admin, mostra SOLO U14 e U15
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

    // --- NUOVO ORDINAMENTO DINAMICO ---
    partiteFiltrate.sort((a, b) => {
        const dataA = parseItalianDate(a.data, a.orario);
        const dataB = parseItalianDate(b.data, b.orario);

        return ordine === 'desc' ? dataB - dataA : dataA - dataB;
    });

    const frag = document.createDocumentFragment();

    partiteFiltrate.forEach(p => {
        let cat = String(p.matchId).includes("U14") ? "U14" : String(p.matchId).includes("U15") ? "U15" : "Altro";
        let mIdPulito = String(p.matchId).replace("U14 ", "").replace("U15 ", "").trim();

        const card = document.createElement("div");
        card.classList.add("match-card");
        card.setAttribute("data-matchid", p.matchId);

        if (p.isLive === "true" || p.isLive === true) card.classList.add("live-border");

        const dataPartita = parseItalianDate(p.data, p.orario);
        if (dataPartita < oggi) card.classList.add("past");

        const giorni = ["Dom.", "Lun.", "Mar.", "Mer.", "Gio.", "Ven.", "Sab."];
        const giornoSett = giorni[dataPartita.getDay()];


        const note = JSON.parse(p.note || '{}');
        const hasVideo = p.videoURL && p.videoURL.trim() !== "";
        const hasStats = note.stats || false;
        const hasHighlights = note.highlights || false; 

        card.innerHTML = `
            <div class="match-top">
                <span class="campionato ${cat}">${cat}</span>
                <span class="match-id">${mIdPulito}</span>
                <span class="data">${giornoSett} ${p.data}</span>
                <span class="orario">${p.orario}</span>
                
                <div class="match-icons">
                    <i class="fas fa-video icon-video ${hasVideo ? '' : 'hidden'}" title="Video Integrale"></i>
                    <i class="fas fa-chart-bar icon-stats ${hasStats ? '' : 'hidden'}" title="Statistiche"></i>
                    <i class="fas fa-star icon-highlights ${hasHighlights ? '' : 'hidden'}" title="Highlights"></i>
                </div>
            </div>
            <div class="match-middle"><span class="luogo">${p.luogo}</span></div>
            <div class="match-bottom">
                <span class="teamA"><span class="team-name">${p.squadraA}</span> <strong>${p.punteggioA ?? "-"}</strong></span>
                <span class="vs">vs</span>
                <span class="teamB"><strong>${p.punteggioB ?? "-"}</strong> <span class="team-name">${p.squadraB}</span></span>
            </div>`;

        if (p.casaTrasferta === "Casa") card.querySelector(".teamA .team-name").classList.add("highlight");
        else if (p.casaTrasferta === "Trasferta") card.querySelector(".teamB .team-name").classList.add("highlight");

        card.onclick = () => {
            const inTheFuture = isInTheFuture(p.data);
            const isAdmin = localStorage.getItem("isAdmin") === "true";

            if (!isAdmin && inTheFuture) {
                //alert("Video e Statistiche partita non ancora disponibili!")
                //mostraPopup();
                alertCustom("Video e Statistiche partita non ancora disponibili!");
                return;
            }
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

            const USE_MATCH_HTML = false;
            localStorage.setItem("USE_MATCH_HTML", USE_MATCH_HTML);
            if (USE_MATCH_HTML && localStorage.getItem("isAdmin") === "true") {
                window.location.href = "match.html";
            }
            else {
                window.location.href = "direttavideo.html?matchId=" + encodeURIComponent(p.matchId);
            }
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

async function init() {
    // 1. REGISTRAZIONE UTENTE E DATI INIZIALI
    try {
        await registerUserId();
    } catch (e) { console.error("Errore registrazione:", e); }

    // Recupero stati dal localStorage
    isAdmin = localStorage.getItem("isAdmin") === "true";
    const savedTheme = localStorage.getItem("theme");
    const campionatoSalvato = localStorage.getItem("campionatoSelezionato") || "Tutti";
    const excludePast = localStorage.getItem("excludePast") === "true";
    ordineCalendario = localStorage.getItem("ordineCalendario") || "asc";

    // Riferimenti DOM
    const menu = document.getElementById("menu");
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const toggleTheme1 = document.getElementById("toggleTheme1");
    const togglePast = document.getElementById("togglePast");
    const selectOrdine = document.getElementById("selectOrdine");
    const campRadios = document.querySelectorAll('.camp-radio');
    const titolo = document.querySelector("h1");

    // 2. IMPOSTAZIONE STATO INIZIALE UI
    // Tema
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleTheme1.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }

    // Filtri e Ordine
    if (togglePast) togglePast.checked = excludePast;
    if (selectOrdine) selectOrdine.value = ordineCalendario;
    
    campRadios.forEach(radio => {
        if (radio.value === campionatoSalvato) radio.checked = true;
    });

    // 3. GESTIONE EVENTI (LISTENERS)

    // Hamburger Menu
    hamburgerBtn?.addEventListener("click", () => {
        menu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            menu.classList.add("hidden");
        }
    });

    // Radio Campionato
    campRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const selezione = e.target.value;
            filtraPartite(selezione, titolo);
            setTimeout(() => menu.classList.add("hidden"), 200);
        });
    });

    // Select Ordine
    selectOrdine?.addEventListener("change", (e) => {
        ordineCalendario = e.target.value;
        localStorage.setItem("ordineCalendario", ordineCalendario);
        
        const filtroAttuale = document.querySelector('input[name="camp"]:checked')?.value || "Tutti";
        caricaListaPartite(filtroAttuale);
        menu.classList.add("hidden");
    });

    // Toggle Passate
    togglePast?.addEventListener("change", () => {
        localStorage.setItem("excludePast", togglePast.checked);
        const attuale = localStorage.getItem("campionatoSelezionato") || "Tutti";
        caricaListaPartite(attuale !== "Tutti" ? attuale : null);
        menu.classList.add("hidden");
    });

    // Tema (Dark/Light)
    toggleTheme1?.addEventListener("click", () => {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        toggleTheme1.innerHTML = isDark ? 
            '<i class="fas fa-sun"></i> Light Mode' : 
            '<i class="fas fa-moon"></i> Dark Mode';
        menu.classList.add("hidden");
    });

    // Bottone Aggiorna (Forza Fetch)
    document.getElementById("updateBtn")?.addEventListener("click", () => {
        const container = document.getElementById("listaPartite");
        localStorage.removeItem("cache_partite");
        if (container) {
            container.innerHTML = "Caricamento Calendario...";
            container.classList.add("loading");
        }
        const filtroAttuale = document.querySelector('input[name="camp"]:checked')?.value || "Tutti";
        fetchPartiteDalServer(filtroAttuale);
    });

    // 4. ESECUZIONE CARICAMENTO INIZIALE
    filtraPartite(campionatoSalvato, titolo);
}

// Avvio unico
document.addEventListener("DOMContentLoaded", init);
window.addEventListener('DOMContentLoaded', injectUniversalPopup);