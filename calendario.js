let ordineCalendario = "desc";
let refreshInterval = null; // Gestisce il loop di aggiornamento

function parseItalianDate(dateStr, timeStr) {
    const [giorno, mese, anno] = dateStr.split("/").map(Number);
    const [ore, minuti] = timeStr.split(":").map(Number);
    return new Date(anno, mese - 1, giorno, ore, minuti);
}

function caricaListaPartite(filtroCampionato = null) {
    const container = document.getElementById("listaPartite");
    const cacheDati = localStorage.getItem("cache_partite");

    // Mostra subito la cache se esiste (UX reattiva)
    if (cacheDati) {
        renderizzaPartite(JSON.parse(cacheDati), filtroCampionato, ordineCalendario);
    }

    // Forza comunque il fetch per aggiornare la vista
    fetchPartiteDalServer(filtroCampionato);
}

// Funzione aggiornata per gestire la cache e l'ottimizzazione rete
function OLDOKcaricaListaPartite(filtroCampionato = null) {
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




function fetchPartiteDalServer(filtroCampionato, forceFetchfromGoogle = false) {
    const container = document.getElementById("listaPartite");
    container.classList.add("loading");

    // 1. Facciamo partire il cronometro
    const startTime = performance.now();

//    if (!USE_FIREBASE || true) { // ATTENZIONE: scommentare
    if (!USE_FIREBASE || forceFetchfromGoogle) { // ATTENZIONE: scommentare
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

            partite.forEach(p => {
                console.log("Salvo la partita su Firebase: " + p.matchId);
                saveToFirebaseHistory('partite/' + p.matchId, p); 
            });

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
    else {
        // 2. Chiamata a Firebase tramite la funzione asincrona creata in precedenza
        readFromFirebaseHistory("partite/")
        .then(data => {
            // Calcoliamo la durata della richiesta
            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            console.log("readFromFirebaseHistory() " + duration + " ms");

            if (data) {
                // Se i dati esistono, aggiorniamo la mappa, la cache e renderizziamo
                const partite = Array.isArray(data) ? data : Object.values(data);
                salvaDatiMappa(partite);
                
                localStorage.setItem("cache_partite", JSON.stringify(partite));
                container.classList.remove("loading");
                renderizzaPartite(partite, filtroCampionato, ordineCalendario);
            } else {
                // Se Firebase restituisce null (percorso vuoto o errore connessione), 
                // lanciamo un errore per finire nel blocco catch e usare la cache
                throw new Error("Nessun dato da Firebase o problema di connessione");
            }
        })
        .catch(err => {
            console.error("Errore Firebase, provo a usare la cache:", err);

            // Tenta di recuperare i dati dalla cache se Firebase fallisce
            const cacheDati = localStorage.getItem("cache_partite");
            if (cacheDati) {
                const datiLocali = JSON.parse(cacheDati);
                container.classList.remove("loading");
                renderizzaPartite(datiLocali, filtroCampionato, ordineCalendario);
                console.warn("Visualizzazione dati in modalità offline (cache)");
                container.classList.remove("loading");
            } else {
                container.innerHTML = "Errore: Firebase non raggiungibile e nessuna cache disponibile.";
                container.classList.remove("loading");
            }
        });
    }
    container.classList.remove("loading");
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

let chartStatsCampionato = null;

function mostraStatisticheCampionato() {
    let modal = document.getElementById('modalStatsCampionato');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalStatsCampionato';
        modal.className = 'popup';
        modal.style.display = 'none';
        modal.innerHTML = `
            <style>
                /* Stili per lo Switch */
                .switch-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                    background: rgba(0,0,0,0.05);
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #ccc;
                    transition: .3s;
                    border-radius: 24px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }
                input:checked + .slider { background-color: #dc3545; }
                input:checked + .slider:before { transform: translateX(22px); }
                .label-toggle { font-size: 0.85rem; font-weight: bold; color: #ffffff; }
            </style>

            <div class="popup-content" style="max-width: 95%; width: 600px; max-height: 90vh; overflow-y: auto; padding: 20px;">
                <h2 style="margin-bottom:15px; text-align:center;">Statistiche Campionato</h2>
                
                <div class="filter-group" style="margin-bottom: 15px; display: flex; justify-content: center; gap: 15px;">
                    <label><input type="radio" name="statCamp" value="U14"> U14</label>
                    <label><input type="radio" name="statCamp" value="U15"> U15</label>
                    <label><input type="radio" name="statCamp" value="Tutti" checked> Tutti</label>
                </div>

                <div class="switch-container">
                    <span class="label-toggle">Punti Gara</span>
                    <label class="switch">
                        <input type="checkbox" id="toggleTipoGrafico">
                        <span class="slider"></span>
                    </label>
                    <span class="label-toggle">Progressivo</span>
                </div>

                <div id="containerTabellaStats"></div>

                <div style="height: 280px; margin-top: 10px;">
                    <canvas id="canvasStatsCampionato"></canvas>
                </div>

                <button class="close-btn" style="margin-top:20px; width:100%; padding:12px; background:#444; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Chiudi</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        
        modal.querySelectorAll('input[name="statCamp"], #toggleTipoGrafico').forEach(el => {
            el.addEventListener('change', () => {
                const filtroCat = modal.querySelector('input[name="statCamp"]:checked').value;
                elaboraDatiStats(filtroCat);
            });
        });
    }

    modal.style.display = 'flex';
    elaboraDatiStats("Tutti");
}

function OKmostraStatisticheCampionato() {
    // 1. Creazione o recupero del Modal
    let modal = document.getElementById('modalStatsCampionato');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalStatsCampionato';
        modal.className = 'popup'; // Usa le tue classi CSS esistenti
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="popup-content" style="max-width: 90%; width: 600px; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin-bottom:15px;">Statistiche Campionato</h2>
                
                <div class="filter-group" style="margin-bottom: 20px; display: flex; justify-content: center; gap: 15px;">
                    <label><input type="radio" name="statCamp" value="U14"> U14</label>
                    <label><input type="radio" name="statCamp" value="U15"> U15</label>
                    <label><input type="radio" name="statCamp" value="Tutti" checked> Tutti</label>
                </div>

                <div id="containerTabellaStats"></div>

                <div style="height: 250px; margin-top: 20px;">
                    <canvas id="canvasStatsCampionato"></canvas>
                </div>

                <button class="close-btn" style="margin-top:20px; width:100%; padding:10px; background:#666; color:#fff; border:none; border-radius:5px; cursor:pointer;">Chiudi</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Eventi
        modal.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        modal.querySelectorAll('input[name="statCamp"]').forEach(radio => {
            radio.addEventListener('change', () => elaboraDatiStats(radio.value));
        });
    }

    modal.style.display = 'flex';
    elaboraDatiStats("Tutti");
}

function elaboraDatiStats(filtro) {
    const cache = localStorage.getItem("cache_partite");
    if (!cache) return;
    const partite = JSON.parse(cache);

    let filtrate = partite.filter(p => p.punteggioA !== null && p.punteggioB !== null && p.statoPartita.toLowerCase().includes("terminata") && !isInTheFuture(p.data));

    if (filtro !== "Tutti") {
        filtrate = filtrate.filter(p => String(p.matchId).includes(filtro));
    }

    filtrate.sort((a, b) => parseItalianDate(a.data, a.orario) - parseItalianDate(b.data, b.orario));

    let stats = { vinte: 0, perse: 0, fatti: 0, subiti: 0 };
    const datiGrafico = [];
    
    let accumuloNoi = 0;
    let accumuloLoro = 0;

    filtrate.forEach(p => {
        const pA = parseInt(p.punteggioA) || 0;
        const pB = parseInt(p.punteggioB) || 0;
        const isPolismileA = (p.squadraA === "Polismile A");
        
        const puntiNoi = isPolismileA ? pA : pB;
        const puntiLoro = isPolismileA ? pB : pA;

        if (puntiNoi > puntiLoro) stats.vinte++;
        else if (puntiNoi < puntiLoro) stats.perse++;
        
        stats.fatti += puntiNoi;
        stats.subiti += puntiLoro;

        accumuloNoi += puntiNoi;
        accumuloLoro += puntiLoro;
        
        datiGrafico.push({ 
            data: p.data, 
            puntiGaraNoi: puntiNoi, 
            puntiGaraLoro: puntiLoro,
            progNoi: accumuloNoi,
            progLoro: accumuloLoro
        });
    });

    const containerTab = document.getElementById("containerTabellaStats");
    containerTab.innerHTML = `
        <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 0.9rem; margin-bottom: 10px;">
            <tr style="background: #eee; color: #333;">
                <th style="padding:8px; border:1px solid #ddd;">Vinte</th>
                <th style="padding:8px; border:1px solid #ddd;">Perse</th>
                <th style="padding:8px; border:1px solid #ddd;">Punti Polismile A</th>
                <th style="padding:8px; border:1px solid #ddd;">Punti Subiti</th>
            </tr>
            <tr>
                <td style="padding:10px; border:1px solid #ddd; color:green; font-weight:bold;">${stats.vinte}</td>
                <td style="padding:10px; border:1px solid #ddd; color:red; font-weight:bold;">${stats.perse}</td>
                <td style="padding:10px; border:1px solid #ddd;">${stats.fatti}</td>
                <td style="padding:10px; border:1px solid #ddd;">${stats.subiti}</td>
            </tr>
        </table>
    `;

    const isProgressivo = document.getElementById('toggleTipoGrafico').checked;
    renderGraficoProgressione(datiGrafico, isProgressivo);
}


function OKelaboraDatiStats(filtro) {
    const cache = localStorage.getItem("cache_partite");
    if (!cache) return;
    const partite = JSON.parse(cache);

    let filtrate = partite.filter(p => p.punteggioA !== null && p.punteggioB !== null && p.statoPartita.toLowerCase().includes("terminata") && !isInTheFuture(p.data));

    if (filtro !== "Tutti") {
        filtrate = filtrate.filter(p => String(p.matchId).includes(filtro));
    }

    filtrate.sort((a, b) => parseItalianDate(a.data, a.orario) - parseItalianDate(b.data, b.orario));

    let stats = { vinte: 0, perse: 0, fatti: 0, subiti: 0 };
    const progressione = [];
    
    // Variabili per l'accumulo progressivo
    let accumuloNoi = 0;
    let accumuloLoro = 0;

    filtrate.forEach(p => {
        const pA = parseInt(p.punteggioA) || 0;
        const pB = parseInt(p.punteggioB) || 0;
        const isPolismileA = (p.squadraA === "Polismile A");
        
        const puntiNoi = isPolismileA ? pA : pB;
        const puntiLoro = isPolismileA ? pB : pA;

        // Statistiche semplici
        if (puntiNoi > puntiLoro) stats.vinte++;
        else if (puntiNoi < puntiLoro) stats.perse++;
        stats.fatti += puntiNoi;
        stats.subiti += puntiLoro;

        // Accumulo per il grafico
        accumuloNoi += puntiNoi;
        accumuloLoro += puntiLoro;
        
        progressione.push({ data: p.data, noi: accumuloNoi, loro: accumuloLoro });
    });

    // 2. Rendering Tabella
    const containerTab = document.getElementById("containerTabellaStats");
    containerTab.innerHTML = `
        <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 0.9rem;">
            <thead>
                <tr style="background: #eee; color: #333;">
                    <th style="padding:8px; border:1px solid #ddd;">Vinte</th>
                    <th style="padding:8px; border:1px solid #ddd;">Perse</th>
                    <th style="padding:8px; border:1px solid #ddd;">Punti Fatti</th>
                    <th style="padding:8px; border:1px solid #ddd;">Punti Subiti</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:green;">${stats.vinte}</td>
                    <td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:red;">${stats.perse}</td>
                    <td style="padding:10px; border:1px solid #ddd;">${stats.fatti.totale}</td>
                    <td style="padding:10px; border:1px solid #ddd;">${stats.subiti.totale}</td>
                </tr>
            </tbody>
        </table>
    `;

    // 3. Rendering Grafico
    renderGraficoProgressione(progressione);
}

function renderGraficoProgressione(dati, isProgressivo) {
    const ctx = document.getElementById('canvasStatsCampionato').getContext('2d');
    if (chartStatsCampionato) chartStatsCampionato.destroy();

    // Etichette aggiornate
    const labelNoi = isProgressivo ? 'Progressivo Polismile A' : 'Punti Polismile A';
    const labelLoro = isProgressivo ? 'Progressivo Avversari' : 'Punti Avversari';
    
    const dataNoi = dati.map(d => isProgressivo ? d.progNoi : d.puntiGaraNoi);
    const dataLoro = dati.map(d => isProgressivo ? d.progLoro : d.puntiGaraLoro);

    chartStatsCampionato = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dati.map(d => d.data),
            datasets: [
                {
                    label: labelNoi,
                    data: dataNoi,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: isProgressivo,
                    tension: 0.3,
                    pointRadius: 2, // Pallino ridotto
                    pointHoverRadius: 4
                },
                {
                    label: labelLoro,
                    data: dataLoro,
                    borderColor: '#0056b3',
                    backgroundColor: 'rgba(0, 86, 179, 0.1)',
                    fill: isProgressivo,
                    tension: 0.3,
                    pointRadius: 2, // Pallino ridotto
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { 
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function OKrenderGraficoProgressione(dati) {
    const ctx = document.getElementById('canvasStatsCampionato').getContext('2d');
    
    if (chartStatsCampionato) chartStatsCampionato.destroy();

    chartStatsCampionato = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dati.map(d => d.data),
            datasets: [
                {
                    label: 'Totale Punti Nostri',
                    data: dati.map(d => d.noi),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    fill: true,
                    tension: 0.2
                },
                {
                    label: 'Totale Punti Avversari',
                    data: dati.map(d => d.loro),
                    borderColor: '#0056b3',
                    backgroundColor: 'rgba(0, 86, 179, 0.2)',
                    fill: true,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Punti Progressivi' }
                }
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { mode: 'index', intersect: false }
            }
        }
    });
}

function OLDelaboraDatiStats(filtro) {
    const cache = localStorage.getItem("cache_partite");
    if (!cache) return;
    const partite = JSON.parse(cache);

    // Filtriamo solo le partite TERMINATE (dove ci sono punteggi definiti e passate)
    let filtrate = partite.filter(p => p.punteggioA !== null && p.punteggioB !== null && p.statoPartita.toLowerCase().includes("terminata") && !isInTheFuture(p.data));

    if (filtro !== "Tutti") {
        filtrate = filtrate.filter(p => String(p.matchId).includes(filtro));
    }

    // Ordiniamo per data per il grafico
    filtrate.sort((a, b) => parseItalianDate(a.data, a.orario) - parseItalianDate(b.data, b.orario));

    let stats = {
        vinte: 0, perse: 0,
        fatti: { totale: 0, t1: 0, t2: 0, t3: 0 },
        subiti: { totale: 0, t1: 0, t2: 0, t3: 0 }
    };

    const progressione = [];

    filtrate.forEach(p => {
        const pA = parseInt(p.punteggioA) || 0;
        const pB = parseInt(p.punteggioB) || 0;
        const isPolismileA = (p.squadraA === "Polismile A");
        
        const puntiNoi = isPolismileA ? pA : pB;
        const puntiLoro = isPolismileA ? pB : pA;

        // Vinte/Perse
        if (puntiNoi > puntiLoro) stats.vinte++;
        else if (puntiNoi < puntiLoro) stats.perse++;

        // Punti e dettaglio (usando le note se presenti)
        const note = JSON.parse(p.note || '{}');
        // Qui assumiamo che nelle note ci siano i contatori globali della partita
        // Se non ci sono, usiamo solo il punteggio totale
        stats.fatti.totale += puntiNoi;
        stats.subiti.totale += puntiLoro;

        // Esempio di recupero canestri se salvati nelle note (da adattare ai tuoi nomi campi)
        // Se i dati non sono disponibili, questa parte rimarrà a 0 o calcolata via history
        
        progressione.push({ data: p.data, noi: puntiNoi, loro: puntiLoro });
    });

    // 2. Rendering Tabella
    const containerTab = document.getElementById("containerTabellaStats");
    containerTab.innerHTML = `
        <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 0.9rem;">
            <thead>
                <tr style="background: #eee; color: #333;">
                    <th style="padding:8px; border:1px solid #ddd;">Vinte</th>
                    <th style="padding:8px; border:1px solid #ddd;">Perse</th>
                    <th style="padding:8px; border:1px solid #ddd;">Punti Fatti</th>
                    <th style="padding:8px; border:1px solid #ddd;">Punti Subiti</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:green;">${stats.vinte}</td>
                    <td style="padding:10px; border:1px solid #ddd; font-weight:bold; color:red;">${stats.perse}</td>
                    <td style="padding:10px; border:1px solid #ddd;">${stats.fatti.totale}</td>
                    <td style="padding:10px; border:1px solid #ddd;">${stats.subiti.totale}</td>
                </tr>
            </tbody>
        </table>
    `;

    // 3. Rendering Grafico
    renderGraficoProgressione(progressione);
}

function OLDrenderGraficoProgressione(dati) {
    const ctx = document.getElementById('canvasStatsCampionato').getContext('2d');
    
    if (chartStatsCampionato) chartStatsCampionato.destroy();

    chartStatsCampionato = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dati.map(d => d.data),
            datasets: [
                {
                    label: 'Noi',
                    data: dati.map(d => d.noi),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Avversari',
                    data: dati.map(d => d.loro),
                    borderColor: '#0056b3',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
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

    document.getElementById("btnApriStats")?.addEventListener("click", () => {
        // Chiude il menu hamburger prima di aprire il popup
        document.getElementById("menu").classList.add("hidden");
        
        // Chiama la funzione per mostrare le statistiche
        mostraStatisticheCampionato();
    });

    // Bottone Aggiorna (Forza Fetch)
    if (isAdmin) {
        const btn = document.getElementById("updateBtn");
        if (btn) {
            btn.style.display = "inline-block";
            btn.addEventListener("click", () => {
                const container = document.getElementById("listaPartite");
                localStorage.removeItem("cache_partite");
                if (container) {
                    container.innerHTML = "Caricamento Calendario...";
                    container.classList.add("loading");
                }
                const filtroAttuale = document.querySelector('input[name="camp"]:checked')?.value || "Tutti";
                fetchPartiteDalServer(filtroAttuale, true);
            });
        }
    }

    // 4. ESECUZIONE CARICAMENTO INIZIALE
    filtraPartite(campionatoSalvato, titolo);
}

// Avvio unico
document.addEventListener("DOMContentLoaded", init);
window.addEventListener('DOMContentLoaded', injectUniversalPopup);