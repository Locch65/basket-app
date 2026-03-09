function gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    // 1. CARICAMENTO DATI ESISTENTI (Popola l'oggetto dai dati salvati)
    let tempiGara = {};
    try { 
        tempiGara = (typeof dettagliGara.note === 'string') 
            ? JSON.parse(dettagliGara.note) 
            : (dettagliGara.note || {});
    } catch(e) { tempiGara = {}; }

    const fasi = [
        { id: 'I0', label: 'Intervallo Iniziale (Go Live)', tipo: 'int' },
        { id: 'Q1', label: 'QUARTO 1', tipo: 'q' },
        { id: 'I1', label: 'Intervallo 1', tipo: 'int' },
        { id: 'Q2', label: 'QUARTO 2', tipo: 'q' },
        { id: 'I2', label: 'Intervallo 2', tipo: 'int' },
        { id: 'Q3', label: 'QUARTO 3', tipo: 'q' },
        { id: 'I3', label: 'Intervallo 3', tipo: 'int' },
        { id: 'Q4', label: 'QUARTO 4', tipo: 'q' },
        { id: 'I4', label: 'Intervallo 4', tipo: 'int' },
        { id: 'OT1', label: 'Overtime 1', tipo: 'ot' },
        { id: 'I5', label: 'Intervallo 5', tipo: 'int' },
        { id: 'OT2', label: 'Overtime 2', tipo: 'ot' },
        { id: 'Terminata', label: 'TERMINATA', tipo: 'end' }
    ];

    // Funzione per gestire l'abilitazione dei bottoni e del checkbox
    const aggiornaStatoBottoni = (container) => {
        const buttons = container.querySelectorAll('.btn-fase');
        const checkHighlights = container.querySelector('#checkHighlights');
        const labelHighlights = container.querySelector('#labelHighlights');
        
        buttons.forEach((btn, i) => {
            const idFase = btn.dataset.fase;
            
            // Regole di sblocco:
            // 1. Il primo tasto è sempre attivo.
            // 2. Un tasto è attivo se quello precedente è stato "iniziato" (ha un orario).
            // 3. "Terminata" è sempre cliccabile se almeno il Quarto 4 è stato iniziato.
            
            const fasePrecedenteId = i > 0 ? fasi[i-1].id : null;
            
            // Un tasto è cliccabile se quello precedente è stato iniziato
            const fasePrecedenteIniziata = fasePrecedenteId 
                ? (tempiGara[fasePrecedenteId]?.inizio && tempiGara[fasePrecedenteId]?.inizio !== "--:--") 
                : true;

            if (i === 0 || fasePrecedenteIniziata) {
                btn.disabled = false;
                btn.style.opacity = "1";
            } else {
                // Sblocca TERMINATA se Q4 è iniziato
                const q4Iniziato = tempiGara['Q4']?.inizio && tempiGara['Q4']?.inizio !== "--:--";
                if (idFase === "Terminata" && q4Iniziato) {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                } else {
                    btn.disabled = true;
                    btn.style.opacity = "0.4";
                }
            }
        });

        // Abilita highlights solo se siamo in stato "Terminata"
        const btnTerminata = container.querySelector('.btn-fase[data-fase="Terminata"]');
        if (btnTerminata && btnTerminata.classList.contains('active')) {
            checkHighlights.disabled = false;
            labelHighlights.style.opacity = "1";
        } else {
            checkHighlights.disabled = true;
            labelHighlights.style.opacity = "0.4";
        }
    };

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.cssText = 'max-width: 380px; max-height: 90vh; overflow-y: auto; padding: 20px;';

    // Generazione HTML con popolamento dinamico dai dati esistenti
    let htmlFasi = fasi.map(fase => {
        // Legge i valori esistenti da tempiGara, altrimenti mette i trattini
        const orari = tempiGara[fase.id] || { inizio: '--:--', fine: '--:--' };
        
        const isSmall = (fase.tipo === 'int' || fase.tipo === 'ot');
        const padding = isSmall ? '8px 10px' : '12px'; 
        const fontSize = isSmall ? '0.9rem' : '1.1rem';
        
        let bgColor = (fase.tipo === 'int') ? '#f8f9fa' : 'white';
        let borderColor = (fase.tipo === 'int') ? '#bdc3c7' : '#3498db';
        let textColor = (fase.tipo === 'int') ? '#7f8c8d' : '#3498db';

        return `
            <div class="fase-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <button class="btn-fase" data-fase="${fase.id}" data-tipo="${fase.tipo}"
                    style="flex: 1; text-align: center; padding: ${padding}; font-size: ${fontSize}; 
                           border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; 
                           color: ${textColor}; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                    ${fase.label}
                </button>
                <div class="fase-times" style="display: flex; flex-direction: column; font-family: monospace; font-size: 1rem; min-width: 45px; color: #666; line-height: 1.1; text-align: center;">
                    <span id="start-${fase.id}">${orari.inizio}</span>
                    ${fase.tipo !== 'end' ? `<span id="end-${fase.id}" style="font-size: 0.9rem; color: #999;">${orari.fine}</span>` : ''}
                </div>
            </div>`;
    }).join('');

    content.innerHTML = `
        <h2 style="margin-bottom: 12px; text-align:center; font-size: 1.4rem;">Cronologia Partita</h2>
        <div id="fasiContainer" style="margin-bottom: 10px;">${htmlFasi}</div>
        
        <div id="labelHighlights" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; opacity: 0.4; transition: opacity 0.3s;">
            <input type="checkbox" id="checkHighlights" disabled style="transform: scale(1.3); cursor: pointer;">
            <label for="checkHighlights" style="font-weight: bold; color: #333; cursor: pointer;">Abilita highlights</label>
        </div>

        <div style="display: flex; justify-content: center; gap: 20px; padding-bottom: 10px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
        <style>
            .btn-fase.active[data-tipo="q"], .btn-fase.active[data-tipo="ot"] { background-color: #dc3545 !important; color: white !important; border-color: #a71d2a !important; }
            .btn-fase.active[data-tipo="int"] { background-color: #6c757d !important; color: white !important; border-color: #495057 !important; }
            .btn-fase.active[data-tipo="end"] { background-color: #0056b3 !important; color: white !important; border-color: #004085 !important; }
            .btn-fase:disabled { filter: grayscale(1); cursor: not-allowed; }
        </style>`;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniFase = content.querySelectorAll('.btn-fase');
    const checkHighlights = content.querySelector('#checkHighlights');
    let faseSelezionata = statoPartita || "I0";
    
    // Ripristina lo stato salvato del checkbox
    if (tempiGara.highlights === true) checkHighlights.checked = true;

    // Evidenzia il bottone corrispondente allo stato attuale
    bottoniFase.forEach(btn => { if (btn.dataset.fase === faseSelezionata) btn.classList.add('active'); });
    
    // Applica le disabilitazioni iniziali basate sui tempi caricati
    aggiornaStatoBottoni(content);

    bottoniFase.forEach((btn, index) => {
        btn.onclick = () => {
            if (btn.disabled) return;
            const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const idFaseAttuale = btn.dataset.fase;

            bottoniFase.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            faseSelezionata = idFaseAttuale;

            document.getElementById(`start-${idFaseAttuale}`).innerText = oraAttuale;
            if (!tempiGara[idFaseAttuale]) tempiGara[idFaseAttuale] = {};
            tempiGara[idFaseAttuale].inizio = oraAttuale;

            if (idFaseAttuale === "Terminata") {
                let ultimaFaseValidaId = null;
                for (let i = index - 1; i >= 0; i--) {
                    const f = fasi[i];
                    if (tempiGara[f.id]?.inizio && tempiGara[f.id]?.inizio !== "--:--") {
                        ultimaFaseValidaId = f.id;
                        break; 
                    }
                }
                if (ultimaFaseValidaId) {
                    const spanEndUltimo = document.getElementById(`end-${ultimaFaseValidaId}`);
                    if (spanEndUltimo) spanEndUltimo.innerText = oraAttuale;
                    tempiGara[ultimaFaseValidaId].fine = oraAttuale;

                    let iniziaPulizia = false;
                    fasi.forEach(f => {
                        if (iniziaPulizia && f.id !== "Terminata") {
                            const sEl = document.getElementById(`start-${f.id}`);
                            const eEl = document.getElementById(`end-${f.id}`);
                            if (sEl) sEl.innerText = "--:--";
                            if (eEl) eEl.innerText = "--:--";
                            tempiGara[f.id] = { inizio: "--:--", fine: "--:--" };
                        }
                        if (f.id === ultimaFaseValidaId) iniziaPulizia = true;
                    });
                }
            } else {
                if (index > 0) {
                    const idPrev = fasi[index - 1].id;
                    const spanEndPrev = document.getElementById(`end-${idPrev}`);
                    if (spanEndPrev && (!tempiGara[idPrev].fine || tempiGara[idPrev].fine === "--:--")) {
                        spanEndPrev.innerText = oraAttuale;
                        tempiGara[idPrev].fine = oraAttuale;
                    }
                }
            }
            aggiornaStatoBottoni(content);
        };
    });

    document.getElementById('liveCancelBtn').onclick = () => document.body.removeChild(overlay);

    document.getElementById('liveSaveBtn').onclick = () => {
        const isTerminata = (faseSelezionata === "Terminata");
        tempiGara.highlights = checkHighlights.checked;

        const dati = {
            goLive: !isTerminata,
            quarto: faseSelezionata,
            terminata: isTerminata,
            noteTempi: JSON.stringify(tempiGara)
        };

        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
            if (typeof renderPlayerListLive === "function") renderPlayerListLive();
            if (typeof updateScoreboard === "function") updateScoreboard(!isTerminata);
        }
        document.body.removeChild(overlay);
    };
}

function OLD_OK5gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    // 1. CARICAMENTO DATI ESISTENTI
    let tempiGara = {};
    try { 
        tempiGara = (typeof dettagliGara.note === 'string') 
            ? JSON.parse(dettagliGara.note) 
            : (dettagliGara.note || {});
    } catch(e) { tempiGara = {}; }

    const fasi = [
        { id: 'I0', label: 'Intervallo Iniziale (Go Live)', tipo: 'int' },
        { id: 'Q1', label: 'QUARTO 1', tipo: 'q' },
        { id: 'I1', label: 'Intervallo 1', tipo: 'int' },
        { id: 'Q2', label: 'QUARTO 2', tipo: 'q' },
        { id: 'I2', label: 'Intervallo 2', tipo: 'int' },
        { id: 'Q3', label: 'QUARTO 3', tipo: 'q' },
        { id: 'I3', label: 'Intervallo 3', tipo: 'int' },
        { id: 'Q4', label: 'QUARTO 4', tipo: 'q' },
        { id: 'I4', label: 'Intervallo 4', tipo: 'int' },
        { id: 'OT1', label: 'Overtime 1', tipo: 'ot' },
        { id: 'I5', label: 'Intervallo 5', tipo: 'int' },
        { id: 'OT2', label: 'Overtime 2', tipo: 'ot' },
        { id: 'Terminata', label: 'TERMINATA', tipo: 'end' }
    ];

    // Funzione interna per gestire l'abilitazione dei bottoni in sequenza
    const aggiornaStatoBottoni = (container) => {
        const buttons = container.querySelectorAll('.btn-fase');
        const checkHighlights = container.querySelector('#checkHighlights');
        const labelHighlights = container.querySelector('#labelHighlights');
        
        buttons.forEach((btn, i) => {
            const idFase = btn.dataset.fase;
            
            // Regole di sblocco:
            // 1. Il primo tasto è sempre attivo.
            // 2. Un tasto è attivo se quello precedente è stato "iniziato" (ha un orario).
            // 3. "Terminata" è sempre cliccabile se almeno il Quarto 4 è stato iniziato.
            
            const fasePrecedenteId = i > 0 ? fasi[i-1].id : null;
            const fasePrecedenteIniziata = fasePrecedenteId ? (tempiGara[fasePrecedenteId]?.inizio && tempiGara[fasePrecedenteId]?.inizio !== "--:--") : true;

            if (i === 0 || fasePrecedenteIniziata) {
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
            } else {
                // Eccezione per il tasto TERMINATA: sbloccabile dal Q4 in poi
                const q4Iniziato = tempiGara['Q4']?.inizio && tempiGara['Q4']?.inizio !== "--:--";
                if (idFase === "Terminata" && q4Iniziato) {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true;
                    btn.style.opacity = "0.4";
                    btn.style.cursor = "not-allowed";
                }
            }
        });

        const isTerminataActive = container.querySelector('.btn-fase[data-fase="Terminata"]').classList.contains('active');
        if (isTerminataActive) {
            checkHighlights.disabled = false;
            labelHighlights.style.opacity = "1";
        } else {
            checkHighlights.disabled = true;
            labelHighlights.style.opacity = "0.4";
        }
    };

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.cssText = 'max-width: 380px; max-height: 90vh; overflow-y: auto; padding: 20px;';

    let htmlFasi = fasi.map(fase => {
        const orari = tempiGara[fase.id] || { inizio: '--:--', fine: '--:--' };
        const isSmall = (fase.tipo === 'int' || fase.tipo === 'ot');
        const padding = isSmall ? '8px 10px' : '12px'; 
        const fontSize = isSmall ? '0.9rem' : '1.1rem';
        
        let bgColor = (fase.tipo === 'int') ? '#f8f9fa' : 'white';
        let borderColor = (fase.tipo === 'int') ? '#bdc3c7' : '#3498db';
        let textColor = (fase.tipo === 'int') ? '#7f8c8d' : '#3498db';

        return `
            <div class="fase-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <button class="btn-fase" data-fase="${fase.id}" data-tipo="${fase.tipo}"
                    style="flex: 1; text-align: center; padding: ${padding}; font-size: ${fontSize}; 
                           border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; 
                           color: ${textColor}; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                    ${fase.label}
                </button>
                <div class="fase-times" style="display: flex; flex-direction: column; font-family: monospace; font-size: 0.8rem; min-width: 45px; color: #666; line-height: 1.1; text-align: center;">
                    <span id="start-${fase.id}">${orari.inizio}</span>
                    ${fase.tipo !== 'end' ? `<span id="end-${fase.id}" style="font-size: 0.7rem; color: #999;">${orari.fine}</span>` : ''}
                </div>
            </div>`;
    }).join('');

    content.innerHTML = `
        <h2 style="margin-bottom: 12px; text-align:center; font-size: 1.4rem;">Cronologia Partita</h2>
        <div id="fasiContainer" style="margin-bottom: 10px;">${htmlFasi}</div>
        
        <div id="labelHighlights" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; opacity: 0.4; transition: opacity 0.3s;">
            <input type="checkbox" id="checkHighlights" disabled style="transform: scale(1.3); cursor: pointer;">
            <label for="checkHighlights" style="font-weight: bold; color: #333; cursor: pointer;">Abilita highlights</label>
        </div>

        <div style="display: flex; justify-content: center; gap: 20px; padding-bottom: 10px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
        <style>
            .btn-fase.active[data-tipo="q"], .btn-fase.active[data-tipo="ot"] { background-color: #dc3545 !important; color: white !important; border-color: #a71d2a !important; }
            .btn-fase.active[data-tipo="int"] { background-color: #6c757d !important; color: white !important; border-color: #495057 !important; }
            .btn-fase.active[data-tipo="end"] { background-color: #0056b3 !important; color: white !important; border-color: #004085 !important; }
            .btn-fase:disabled { filter: grayscale(1); }
        </style>`;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniFase = content.querySelectorAll('.btn-fase');
    const checkHighlights = content.querySelector('#checkHighlights');
    let faseSelezionata = statoPartita || "I0";
    
    // Pre-seleziona il checkbox se era già salvato come true
    if (tempiGara.highlights === true) checkHighlights.checked = true;

    bottoniFase.forEach(btn => { if (btn.dataset.fase === faseSelezionata) btn.classList.add('active'); });
    aggiornaStatoBottoni(content);

    bottoniFase.forEach((btn, index) => {
        btn.onclick = () => {
            if (btn.disabled) return;
            const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const idFaseAttuale = btn.dataset.fase;

            bottoniFase.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            faseSelezionata = idFaseAttuale;

            // 1. Imposta inizio fase cliccata
            document.getElementById(`start-${idFaseAttuale}`).innerText = oraAttuale;
            if (!tempiGara[idFaseAttuale]) tempiGara[idFaseAttuale] = {};
            tempiGara[idFaseAttuale].inizio = oraAttuale;

            // 2. LOGICA SPECIALE: TERMINATA
            if (idFaseAttuale === "Terminata") {
                let ultimaFaseValidaId = null;
                // Trova l'ultimo Quarto/OT effettivamente iniziato
                for (let i = index - 1; i >= 0; i--) {
                    const f = fasi[i];
                    if (tempiGara[f.id]?.inizio && tempiGara[f.id]?.inizio !== "--:--") {
                        ultimaFaseValidaId = f.id;
                        break; 
                    }
                }
                if (ultimaFaseValidaId) {
                    // Chiudi l'ultimo quarto giocato
                    const spanEndUltimo = document.getElementById(`end-${ultimaFaseValidaId}`);
                    if (spanEndUltimo) spanEndUltimo.innerText = oraAttuale;
                    tempiGara[ultimaFaseValidaId].fine = oraAttuale;

                    // Pulizia automatica delle fasi saltate tra l'ultimo quarto e la fine
                    let iniziaPulizia = false;
                    fasi.forEach(f => {
                        if (iniziaPulizia && f.id !== "Terminata") {
                            const sEl = document.getElementById(`start-${f.id}`);
                            const eEl = document.getElementById(`end-${f.id}`);
                            if (sEl) sEl.innerText = "--:--";
                            if (eEl) eEl.innerText = "--:--";
                            tempiGara[f.id] = { inizio: "--:--", fine: "--:--" };
                        }
                        if (f.id === ultimaFaseValidaId) iniziaPulizia = true;
                    });
                }
            } else {
                // 3. LOGICA STANDARD: Chiudi la fase precedente
                if (index > 0) {
                    const idPrev = fasi[index - 1].id;
                    const spanEndPrev = document.getElementById(`end-${idPrev}`);
                    // Chiudi solo se non era già stata chiusa
                    if (spanEndPrev && (!tempiGara[idPrev].fine || tempiGara[idPrev].fine === "--:--")) {
                        spanEndPrev.innerText = oraAttuale;
                        tempiGara[idPrev].fine = oraAttuale;
                    }
                }
            }
            
            // Aggiorna la disponibilità dei tasti dopo ogni interazione
            aggiornaStatoBottoni(content);
        };
    });

    document.getElementById('liveCancelBtn').onclick = () => document.body.removeChild(overlay);

    document.getElementById('liveSaveBtn').onclick = () => {
        const isTerminata = (faseSelezionata === "Terminata");
        
        // Salvataggio booleano esplicito true/false
        tempiGara.highlights = checkHighlights.checked;

        const dati = {
            goLive: !isTerminata,
            quarto: faseSelezionata,
            terminata: isTerminata,
            noteTempi: JSON.stringify(tempiGara)
        };

        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
            if (typeof renderPlayerListLive === "function") renderPlayerListLive();
            if (typeof updateScoreboard === "function") updateScoreboard(!isTerminata);
        }
        document.body.removeChild(overlay);
    };
}

function OLD_OK4gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    // 1. CARICAMENTO DATI ESISTENTI
    let tempiGara = {};
    try { 
        tempiGara = (typeof dettagliGara.note === 'string') 
            ? JSON.parse(dettagliGara.note) 
            : (dettagliGara.note || {});
    } catch(e) { tempiGara = {}; }

    const fasi = [
        { id: 'I0', label: 'Intervallo Iniziale (Go Live)', tipo: 'int' },
        { id: 'Q1', label: 'QUARTO 1', tipo: 'q' },
        { id: 'I1', label: 'Intervallo 1', tipo: 'int' },
        { id: 'Q2', label: 'QUARTO 2', tipo: 'q' },
        { id: 'I2', label: 'Intervallo 2', tipo: 'int' },
        { id: 'Q3', label: 'QUARTO 3', tipo: 'q' },
        { id: 'I3', label: 'Intervallo 3', tipo: 'int' },
        { id: 'Q4', label: 'QUARTO 4', tipo: 'q' },
        { id: 'I4', label: 'Intervallo 4', tipo: 'int' },
        { id: 'OT1', label: 'Overtime 1', tipo: 'ot' },
        { id: 'I5', label: 'Intervallo 5', tipo: 'int' },
        { id: 'OT2', label: 'Overtime 2', tipo: 'ot' },
        { id: 'Terminata', label: 'TERMINATA', tipo: 'end' }
    ];

    // Funzione interna per gestire l'abilitazione dei bottoni in sequenza
    const aggiornaStatoBottoni = (container) => {
        const buttons = container.querySelectorAll('.btn-fase');
        buttons.forEach((btn, i) => {
            const idFase = btn.dataset.fase;
            
            // Regole di sblocco:
            // 1. Il primo tasto è sempre attivo.
            // 2. Un tasto è attivo se quello precedente è stato "iniziato" (ha un orario).
            // 3. "Terminata" è sempre cliccabile se almeno il Quarto 4 è stato iniziato.
            
            const fasePrecedenteId = i > 0 ? fasi[i-1].id : null;
            const fasePrecedenteIniziata = fasePrecedenteId ? (tempiGara[fasePrecedenteId]?.inizio && tempiGara[fasePrecedenteId]?.inizio !== "--:--") : true;

            if (i === 0 || fasePrecedenteIniziata) {
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
            } else {
                // Eccezione per il tasto TERMINATA: sbloccabile dal Q4 in poi
                const q4Iniziato = tempiGara['Q4']?.inizio && tempiGara['Q4']?.inizio !== "--:--";
                if (idFase === "Terminata" && q4Iniziato) {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true;
                    btn.style.opacity = "0.4";
                    btn.style.cursor = "not-allowed";
                }
            }
        });
    };

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.cssText = 'max-width: 380px; max-height: 90vh; overflow-y: auto;';

    let htmlFasi = fasi.map(fase => {
        const orari = tempiGara[fase.id] || { inizio: '--:--', fine: '--:--' };
        const isSmall = (fase.tipo === 'int' || fase.tipo === 'ot');
        const padding = isSmall ? '8px 10px' : '12px'; 
        const fontSize = isSmall ? '0.9rem' : '1.1rem';
        
        let bgColor = (fase.tipo === 'int') ? '#f8f9fa' : 'white';
        let borderColor = (fase.tipo === 'int') ? '#bdc3c7' : '#3498db';
        let textColor = (fase.tipo === 'int') ? '#7f8c8d' : '#3498db';

        return `
            <div class="fase-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <button class="btn-fase" data-fase="${fase.id}" data-tipo="${fase.tipo}"
                    style="flex: 1; text-align: center; padding: ${padding}; font-size: ${fontSize}; 
                           border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; 
                           color: ${textColor}; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                    ${fase.label}
                </button>
                <div class="fase-times" style="display: flex; flex-direction: column; font-family: monospace; font-size: 0.8rem; min-width: 45px; color: #666; line-height: 1.1; text-align: center;">
                    <span id="start-${fase.id}">${orari.inizio}</span>
                    ${fase.tipo !== 'end' ? `<span id="end-${fase.id}" style="font-size: 0.7rem; color: #999;">${orari.fine}</span>` : ''}
                </div>
            </div>`;
    }).join('');

    content.innerHTML = `
        <h2 style="margin-bottom: 12px; text-align:center; font-size: 1.4rem;">Cronologia Partita</h2>
        <div id="fasiContainer" style="margin-bottom: 15px;">${htmlFasi}</div>
        <div style="display: flex; justify-content: center; gap: 20px; padding-bottom: 10px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
        <style>
            .btn-fase.active[data-tipo="q"], .btn-fase.active[data-tipo="ot"] { background-color: #dc3545 !important; color: white !important; border-color: #a71d2a !important; }
            .btn-fase.active[data-tipo="int"] { background-color: #6c757d !important; color: white !important; border-color: #495057 !important; }
            .btn-fase.active[data-tipo="end"] { background-color: #0056b3 !important; color: white !important; border-color: #004085 !important; }
            .btn-fase:disabled { filter: grayscale(1); }
        </style>`;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniFase = content.querySelectorAll('.btn-fase');
    let faseSelezionata = statoPartita || "I0";
    
    // Inizializzazione: evidenzia fase attuale e applica blocchi sequenza
    bottoniFase.forEach(btn => { if (btn.dataset.fase === faseSelezionata) btn.classList.add('active'); });
    aggiornaStatoBottoni(content);

    bottoniFase.forEach((btn, index) => {
        btn.onclick = () => {
            if (btn.disabled) return;

            const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const idFaseAttuale = btn.dataset.fase;

            bottoniFase.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            faseSelezionata = idFaseAttuale;

            // 1. Imposta inizio fase cliccata
            document.getElementById(`start-${idFaseAttuale}`).innerText = oraAttuale;
            if (!tempiGara[idFaseAttuale]) tempiGara[idFaseAttuale] = {};
            tempiGara[idFaseAttuale].inizio = oraAttuale;

            // 2. LOGICA SPECIALE: TERMINATA
            if (idFaseAttuale === "Terminata") {
                let ultimaFaseValidaId = null;
                // Trova l'ultimo Quarto/OT effettivamente iniziato
                for (let i = index - 1; i >= 0; i--) {
                    const f = fasi[i];
                    if (tempiGara[f.id]?.inizio && tempiGara[f.id]?.inizio !== "--:--") {
                        ultimaFaseValidaId = f.id;
                        break; 
                    }
                }

                if (ultimaFaseValidaId) {
                    // Chiudi l'ultimo quarto giocato
                    const spanEndUltimo = document.getElementById(`end-${ultimaFaseValidaId}`);
                    if (spanEndUltimo) spanEndUltimo.innerText = oraAttuale;
                    tempiGara[ultimaFaseValidaId].fine = oraAttuale;

                    // Pulizia automatica delle fasi saltate tra l'ultimo quarto e la fine
                    let iniziaPulizia = false;
                    fasi.forEach(f => {
                        if (iniziaPulizia && f.id !== "Terminata") {
                            const sEl = document.getElementById(`start-${f.id}`);
                            const eEl = document.getElementById(`end-${f.id}`);
                            if (sEl) sEl.innerText = "--:--";
                            if (eEl) eEl.innerText = "--:--";
                            tempiGara[f.id] = { inizio: "--:--", fine: "--:--" };
                        }
                        if (f.id === ultimaFaseValidaId) iniziaPulizia = true;
                    });
                }
            } else {
                // 3. LOGICA STANDARD: Chiudi la fase precedente
                if (index > 0) {
                    const idPrev = fasi[index - 1].id;
                    const spanEndPrev = document.getElementById(`end-${idPrev}`);
                    // Chiudi solo se non era già stata chiusa
                    if (spanEndPrev && (!tempiGara[idPrev].fine || tempiGara[idPrev].fine === "--:--")) {
                        spanEndPrev.innerText = oraAttuale;
                        if (!tempiGara[idPrev]) tempiGara[idPrev] = {};
                        tempiGara[idPrev].fine = oraAttuale;
                    }
                }
            }
            
            // Aggiorna la disponibilità dei tasti dopo ogni interazione
            aggiornaStatoBottoni(content);
        };
    });

    document.getElementById('liveCancelBtn').onclick = () => document.body.removeChild(overlay);

    document.getElementById('liveSaveBtn').onclick = () => {
        const isTerminata = (faseSelezionata === "Terminata");
        const dati = {
            goLive: !isTerminata,
            quarto: faseSelezionata,
            terminata: isTerminata,
            noteTempi: JSON.stringify(tempiGara)
        };

        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
            if (typeof renderPlayerListLive === "function") renderPlayerListLive();
            if (typeof updateScoreboard === "function") updateScoreboard(!isTerminata);
        }
        document.body.removeChild(overlay);
    };
}

function OLD_OK3gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    let tempiGara = {};
    try { 
        tempiGara = (typeof dettagliGara.note === 'string') 
            ? JSON.parse(dettagliGara.note) 
            : (dettagliGara.note || {});
    } catch(e) { tempiGara = {}; }

    const fasi = [
        { id: 'I0', label: 'Intervallo Iniziale (Go Live)', tipo: 'int' },
        { id: 'Q1', label: 'QUARTO 1', tipo: 'q' },
        { id: 'I1', label: 'Intervallo 1', tipo: 'int' },
        { id: 'Q2', label: 'QUARTO 2', tipo: 'q' },
        { id: 'I2', label: 'Intervallo 2', tipo: 'int' },
        { id: 'Q3', label: 'QUARTO 3', tipo: 'q' },
        { id: 'I3', label: 'Intervallo 3', tipo: 'int' },
        { id: 'Q4', label: 'QUARTO 4', tipo: 'q' },
        { id: 'I4', label: 'Intervallo 4', tipo: 'int' },
        { id: 'OT1', label: 'Overtime 1', tipo: 'ot' },
        { id: 'I5', label: 'Intervallo 5', tipo: 'int' },
        { id: 'OT2', label: 'Overtime 2', tipo: 'ot' },
        { id: 'Terminata', label: 'TERMINATA', tipo: 'end' }
    ];

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.cssText = 'max-width: 380px; max-height: 90vh; overflow-y: auto;';

    let htmlFasi = fasi.map(fase => {
        const orari = tempiGara[fase.id] || { inizio: '--:--', fine: '--:--' };
        const isSmall = (fase.tipo === 'int' || fase.tipo === 'ot');
        const padding = isSmall ? '8px 10px' : '12px'; 
        const fontSize = isSmall ? '0.9rem' : '1.1rem';
        
        let bgColor = (fase.tipo === 'int') ? '#f8f9fa' : 'white';
        let borderColor = (fase.tipo === 'int') ? '#bdc3c7' : '#3498db';
        let textColor = (fase.tipo === 'int') ? '#7f8c8d' : '#3498db';

        return `
            <div class="fase-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <button class="btn-fase" data-fase="${fase.id}" data-tipo="${fase.tipo}"
                    style="flex: 1; text-align: center; padding: ${padding}; font-size: ${fontSize}; 
                           border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; 
                           color: ${textColor}; font-weight: bold; cursor: pointer; text-transform: uppercase;">
                    ${fase.label}
                </button>
                <div class="fase-times" style="display: flex; flex-direction: column; font-family: monospace; font-size: 0.8rem; min-width: 45px; color: #666; line-height: 1.1; text-align: center;">
                    <span id="start-${fase.id}">${orari.inizio}</span>
                    ${fase.tipo !== 'end' ? `<span id="end-${fase.id}" style="font-size: 0.7rem; color: #999;">${orari.fine}</span>` : ''}
                </div>
            </div>`;
    }).join('');

    content.innerHTML = `
        <h2 style="margin-bottom: 12px; text-align:center; font-size: 1.4rem;">Cronologia Partita</h2>
        <div id="fasiContainer" style="margin-bottom: 15px;">${htmlFasi}</div>
        <div style="display: flex; justify-content: center; gap: 20px; padding-bottom: 10px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
        <style>
            .btn-fase.active[data-tipo="q"], .btn-fase.active[data-tipo="ot"] { background-color: #dc3545 !important; color: white !important; border-color: #a71d2a !important; }
            .btn-fase.active[data-tipo="int"] { background-color: #6c757d !important; color: white !important; border-color: #495057 !important; }
            .btn-fase.active[data-tipo="end"] { background-color: #0056b3 !important; color: white !important; border-color: #004085 !important; }
        </style>`;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniFase = content.querySelectorAll('.btn-fase');
    let faseSelezionata = statoPartita || "I0";
    bottoniFase.forEach(btn => { if (btn.dataset.fase === faseSelezionata) btn.classList.add('active'); });

    bottoniFase.forEach((btn, index) => {
        btn.onclick = () => {
            const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const idFaseAttuale = btn.dataset.fase;

            bottoniFase.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            faseSelezionata = idFaseAttuale;

            // Imposta ora inizio fase attuale
            document.getElementById(`start-${idFaseAttuale}`).innerText = oraAttuale;
            if (!tempiGara[idFaseAttuale]) tempiGara[idFaseAttuale] = {};
            tempiGara[idFaseAttuale].inizio = oraAttuale;

            // --- LOGICA SPECIALE TERMINATA ---
            if (idFaseAttuale === "Terminata") {
                let ultimaFaseValidaId = null;

                // Cerchiamo a ritroso l'ultima fase che è stata INIZIATA (diversa da --:--)
                // Saltiamo la fase "Terminata" stessa (che è l'indice attuale)
                for (let i = index - 1; i >= 0; i--) {
                    const f = fasi[i];
                    const orarioInizioCorrente = tempiGara[f.id]?.inizio;
                    
                    if (orarioInizioCorrente && orarioInizioCorrente !== "--:--") {
                        ultimaFaseValidaId = f.id;
                        break; 
                    }
                }

                if (ultimaFaseValidaId) {
                    // 1. Chiudiamo la fase valida trovata (es. Q4 o OT1)
                    const spanEndUltimo = document.getElementById(`end-${ultimaFaseValidaId}`);
                    if (spanEndUltimo) spanEndUltimo.innerText = oraAttuale;
                    if (!tempiGara[ultimaFaseValidaId]) tempiGara[ultimaFaseValidaId] = {};
                    tempiGara[ultimaFaseValidaId].fine = oraAttuale;

                    // 2. Pulizia di TUTTO ciò che sta tra la fase valida e il tasto Terminata
                    let iniziaPulizia = false;
                    fasi.forEach(f => {
                        // Se siamo oltre la fase che abbiamo appena chiuso e non siamo ancora a "Terminata"
                        if (iniziaPulizia && f.id !== "Terminata") {
                            const s = document.getElementById(`start-${f.id}`);
                            const e = document.getElementById(`end-${f.id}`);
                            if (s) s.innerText = "--:--";
                            if (e) e.innerText = "--:--";
                            tempiGara[f.id] = { inizio: "--:--", fine: "--:--" };
                        }
                        if (f.id === ultimaFaseValidaId) iniziaPulizia = true;
                    });
                }
            } else {
                // Logica standard: chiudi la fase immediatamente precedente (se esisteva)
                if (index > 0) {
                    const idFasePrecedente = fasi[index - 1].id;
                    const spanEndPrev = document.getElementById(`end-${idFasePrecedente}`);
                    if (spanEndPrev) {
                        spanEndPrev.innerText = oraAttuale;
                        if (!tempiGara[idFasePrecedente]) tempiGara[idFasePrecedente] = {};
                        tempiGara[idFasePrecedente].fine = oraAttuale;
                    }
                }
            }
        };
    });

    document.getElementById('liveCancelBtn').onclick = () => document.body.removeChild(overlay);
    document.getElementById('liveSaveBtn').onclick = () => {
        const isTerminata = (faseSelezionata === "Terminata");
        const dati = {
            goLive: !isTerminata,
            quarto: faseSelezionata,
            terminata: isTerminata,
            noteTempi: JSON.stringify(tempiGara)
        };
        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
            if (typeof renderPlayerListLive === "function") renderPlayerListLive();
            if (typeof updateScoreboard === "function") updateScoreboard(!isTerminata);
        }
        document.body.removeChild(overlay);
    };
}


function OLD_OK2gestisciGoLive() {
    const overlay = document.createElement('div');
    overlay.id = 'goLivePopup';
    overlay.className = 'popup';

    // 1. CARICAMENTO DATI ESISTENTI
    let tempiGara = {};
    try { 
        // Assicuriamoci di leggere correttamente il JSON da dettagliGara.note
        tempiGara = (typeof dettagliGara.note === 'string') 
            ? JSON.parse(dettagliGara.note) 
            : (dettagliGara.note || {});
    } catch(e) { tempiGara = {}; }

    const fasi = [
        { id: 'I0', label: 'Intervallo Iniziale (Go Live)', tipo: 'int' },
        { id: 'Q1', label: 'QUARTO 1', tipo: 'q' },
        { id: 'I1', label: 'Intervallo 1', tipo: 'int' },
        { id: 'Q2', label: 'QUARTO 2', tipo: 'q' },
        { id: 'I2', label: 'Intervallo 2', tipo: 'int' },
        { id: 'Q3', label: 'QUARTO 3', tipo: 'q' },
        { id: 'I3', label: 'Intervallo 3', tipo: 'int' },
        { id: 'Q4', label: 'QUARTO 4', tipo: 'q' },
        { id: 'I4', label: 'Intervallo 4', tipo: 'int' },
        { id: 'OT1', label: 'Overtime 1', tipo: 'ot' },
        { id: 'I5', label: 'Intervallo 5', tipo: 'int' },
        { id: 'OT2', label: 'Overtime 2', tipo: 'ot' },
        { id: 'Terminata', label: 'TERMINATA', tipo: 'end' }
    ];

    const content = document.createElement('div');
    content.className = 'popup-content';
    content.style.maxWidth = '380px';
    content.style.maxHeight = '90vh';
    content.style.overflowY = 'auto';

    let htmlFasi = fasi.map(fase => {
        const orari = tempiGara[fase.id] || { inizio: '--:--', fine: '--:--' };
        
        const isSmall = (fase.tipo === 'int' || fase.tipo === 'ot');
        const padding = isSmall ? '8px 10px' : '12px'; 
        const fontSize = isSmall ? '0.9rem' : '1.1rem';
        
        // --- LOGICA COLORI STATO NORMALE ---
        let bgColor = 'white';
        let borderColor = '#3498db';
        let textColor = '#3498db';

        if (fase.tipo === 'int') {
            bgColor = '#f8f9fa';
            borderColor = '#bdc3c7';
            textColor = '#7f8c8d';
        }

        const textTransform = (fase.tipo === 'q' || fase.tipo === 'ot') ? 'uppercase' : 'none';

        return `
            <div class="fase-row" style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <button class="btn-fase" data-fase="${fase.id}" data-tipo="${fase.tipo}"
                    style="flex: 1; text-align: center; padding: ${padding}; font-size: ${fontSize}; 
                           border: 2px solid ${borderColor}; border-radius: 8px; background: ${bgColor}; 
                           color: ${textColor}; font-weight: bold; cursor: pointer; text-transform: ${textTransform};">
                    ${fase.label}
                </button>
                <div class="fase-times" style="display: flex; flex-direction: column; font-family: monospace; font-size: 0.8rem; min-width: 45px; color: #666; line-height: 1.1; text-align: center;">
                    <span id="start-${fase.id}">${orari.inizio}</span>
                    ${fase.tipo !== 'end' ? `<span id="end-${fase.id}" style="font-size: 0.7rem; color: #999;">${orari.fine}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    content.innerHTML = `
        <h2 style="margin-bottom: 12px; text-align:center; font-size: 1.4rem;">Cronologia Partita</h2>
        <div id="fasiContainer" style="margin-bottom: 15px;">
            ${htmlFasi}
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; padding-bottom: 10px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
        <style>
            /* QUARTI E OT SELEZIONATI (ROSSO) */
            .btn-fase.active[data-tipo="q"], 
            .btn-fase.active[data-tipo="ot"] { 
                background-color: #dc3545 !important; 
                color: white !important; 
                border-color: #a71d2a !important; 
            }
            /* INTERVALLI SELEZIONATI (GRIGIO) */
            .btn-fase.active[data-tipo="int"] { 
                background-color: #6c757d !important; 
                color: white !important; 
                border-color: #495057 !important; 
            }
            /* TERMINATA SELEZIONATA (BLU) */
            .btn-fase.active[data-tipo="end"] { 
                background-color: #0056b3 !important; 
                color: white !important; 
                border-color: #004085 !important; 
            }
            .btn-fase:active { transform: scale(0.98); }
        </style>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    const bottoniFase = content.querySelectorAll('.btn-fase');
    let faseSelezionata = statoPartita || "I0";

    bottoniFase.forEach(btn => {
        if (btn.dataset.fase === faseSelezionata) btn.classList.add('active');
    });

    bottoniFase.forEach((btn, index) => {
        btn.onclick = () => {
            const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const idFaseAttuale = btn.dataset.fase;

            bottoniFase.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            faseSelezionata = idFaseAttuale;

            document.getElementById(`start-${idFaseAttuale}`).innerText = oraAttuale;
            if (!tempiGara[idFaseAttuale]) tempiGara[idFaseAttuale] = {};
            tempiGara[idFaseAttuale].inizio = oraAttuale;

            if (index > 0) {
                const idFasePrecedente = fasi[index - 1].id;
                const spanEndPrev = document.getElementById(`end-${idFasePrecedente}`);
                if (spanEndPrev) {
                    spanEndPrev.innerText = oraAttuale;
                    if (!tempiGara[idFasePrecedente]) tempiGara[idFasePrecedente] = {};
                    tempiGara[idFasePrecedente].fine = oraAttuale;
                }
            }
        };
    });

    document.getElementById('liveCancelBtn').onclick = () => document.body.removeChild(overlay);

    document.getElementById('liveSaveBtn').onclick = () => {
        const isTerminata = (faseSelezionata === "Terminata");
        const isGoLive = !isTerminata && (faseSelezionata !== "");

        const dati = {
            goLive: isGoLive,
            quarto: faseSelezionata,
            terminata: isTerminata,
            noteTempi: JSON.stringify(tempiGara)
        };

        if (typeof salvaStatoLive === "function") {
            salvaStatoLive(dati);
            if (typeof renderPlayerListLive === "function") renderPlayerListLive();
            if (typeof updateScoreboard === "function") updateScoreboard(isGoLive);
        }
        document.body.removeChild(overlay);
    };
}

function OLD_OK_gestisciGoLive() {
  const overlay = document.createElement('div');
  overlay.id = 'goLivePopup';
  overlay.className = 'popup';

  const content = document.createElement('div');
  content.className = 'popup-content';
  content.style.textAlign = 'left';

  content.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align:center;">Stato Partita</h2>
        
        <label style="display:block; font-size: 1.2rem; margin-bottom: 10px;">Quarto attuale:</label>
        <div id="quartiContainer" style="display: flex; gap: 8px; margin-bottom: 30px; flex-wrap: wrap;">
            <button class="btn-quarto" data-q="Q1">Q1</button>
            <button class="btn-quarto" data-q="Q2">Q2</button>
            <button class="btn-quarto" data-q="Q3">Q3</button>
            <button class="btn-quarto" data-q="Q4">Q4</button>
            <button class="btn-quarto" data-q="Extra Time" style="flex-basis: 100%; margin-top: 5px;">Extra Time</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="checkGoLive" style="width: 25px; height: 25px;">
                <label for="checkGoLive" style="font-size: 1.2rem;">Go Live</label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" id="checkTerminata" style="width: 25px; height: 25px;">
                <label for="checkTerminata" style="font-size: 1.2rem;">Partita terminata</label>
            </div>
        </div>

        <div style="display: flex; justify-content: center; gap: 20px;">
            <button id="liveSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="liveCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>

        <style>
            .btn-quarto {
                flex: 1;
                min-width: 50px;
                padding: 12px 5px;
                font-size: 1.1rem;
                border: 2px solid #3498db;
                background-color: white;
                color: #3498db;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-quarto.active {
                background-color: #3498db !important;
                color: white !important;
            }
        </style>
    `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const bottoniQuarto = content.querySelectorAll('.btn-quarto');
  const checkGoLive = document.getElementById('checkGoLive');
  const checkTerminata = document.getElementById('checkTerminata');

  // --- 1. LOGICA DI INIZIALIZZAZIONE ---

  checkGoLive.checked = (isLive === true || isLive === "TRUE" || isLive === "true");

  if (statoPartita === "Terminata" || statoPartita === "Fine") {
    checkTerminata.checked = true;
    checkGoLive.checked = false;
  } else {
    checkTerminata.checked = false;
    bottoniQuarto.forEach(btn => {
      const val = btn.dataset.q; // es: "1° Quarto"
      // Se statoPartita è "1" o "1° Quarto", attiva il bottone
      if (quartoAttuale && (val === quartoAttuale || quartoAttuale.toString().startsWith("Q" + val.charAt(0)))) {
        btn.classList.add('active');
      }
    });
  }

  // --- 2. GESTIONE EVENTI ---

  bottoniQuarto.forEach(btn => {
    btn.onclick = () => {
      if (checkTerminata.checked) return;
      bottoniQuarto.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };
  });

  checkTerminata.onchange = () => {
    if (checkTerminata.checked) {
      checkGoLive.checked = false;
      bottoniQuarto.forEach(b => b.classList.remove('active'));
    }
  };

  checkGoLive.onchange = () => {
    if (checkGoLive.checked) checkTerminata.checked = false;
  };

  document.getElementById('liveCancelBtn').onclick = () => {
    document.body.removeChild(overlay);
  };

  // --- 3. FIX TASTO SALVA ---
  document.getElementById('liveSaveBtn').onclick = () => {
    const quartoAttivo = content.querySelector('.btn-quarto.active');

    // Definiamo il nuovo stato correttamente
    let nuovoStato = statoPartita;
    if (checkTerminata.checked) {
      nuovoStato = "Terminata";
    } else if (quartoAttivo) {
      nuovoStato = quartoAttivo.dataset.q;
    }

    const dati = {
      goLive: checkGoLive.checked,
      quarto: quartoAttivo ? quartoAttivo.dataset.q : (checkTerminata.checked ? "Terminata" : statoPartita),
      terminata: checkTerminata.checked
    };

    console.log("Salvataggio in corso:", dati);

    // Chiamata alla funzione di salvataggio
    if (typeof salvaStatoLive === "function") {
      salvaStatoLive(dati);
      renderPlayerListLive();
      updateScoreboard(matchIsLive || isReviewMode);

    } else {
      console.error("Funzione salvaStatoLive non trovata!");
    }

    document.body.removeChild(overlay);
  };
}

function gestisciDirettaYoutube() {
  const overlay = document.createElement('div');
  overlay.id = 'youtubePopup';
  overlay.className = 'popup';

  const content = document.createElement('div');
  content.className = 'popup-content';
  content.style.textAlign = 'left';

  const urlIniziale = (typeof videoURL !== 'undefined') ? videoURL : "";
  const apiKeyCorrente = googleApiKey || "";
  const oraSalvatatYt = oraInizioDiretta;

  content.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align:center;">Diretta Youtube</h2>
        
        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">URL:</label>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="ytUrl" style="flex: 1; padding:10px; font-size:1.4rem;" 
                   placeholder="https://www.youtube.com/watch?v=..." value="${urlIniziale}">
            <button id="ytSearchBtn" style="padding: 10px; font-size: 1.6rem; cursor: pointer; background-color: #3498db; color: white; border: none; border-radius: 5px;">
                Cerca
            </button>
        </div>

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">Ora inizio Diretta (HH:mm:ss):</label>
        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="time" id="ytOraInizio" step="1" style="flex: 1; padding:10px; font-size:1.4rem;" value="${oraSalvatatYt}">
            <button id="ytCalcolaBtn" disabled style="padding: 10px; font-size: 1.6rem; cursor: not-allowed; opacity: 0.5; background-color: #3498db; color: white; border: none; border-radius: 5px;">
                Calcola
            </button>
        </div>

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">Offset Inizio Partita (secondi):</label>
        <input type="number" id="ytOffset" style="width:100%; padding:10px; margin-bottom:15px; font-size:1.4rem;" 
               placeholder="Esempio: 30" value="${matchStartTime || ""}">

        <label style="display:block; font-size:1.6rem; margin-bottom: 5px;">API Key:</label>
        <input type="text" id="ytApiKey" style="width:100%; padding:10px; margin-bottom:25px; font-size:1.4rem;" 
               placeholder="Inserisci la tua Google API Key" value="${apiKeyCorrente}">

        <div style="display: flex; justify-content: center; gap: 20px;">
            <button id="ytSaveBtn" class="convocazioniPopup-confirmBtn">Salva</button>
            <button id="ytCancelBtn" class="convocazioniPopup-closeBtn">Annulla</button>
        </div>
    `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const urlInput = document.getElementById('ytUrl');
  const calcolaBtn = document.getElementById('ytCalcolaBtn');
  const searchBtn = document.getElementById('ytSearchBtn');

  const validaUrl = (valore) => {
    const isValid = valore.startsWith('http://') || valore.startsWith('https://');
    calcolaBtn.disabled = !isValid;
    calcolaBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    calcolaBtn.style.opacity = isValid ? '1' : '0.5';
  };

  validaUrl(urlInput.value.trim());
  urlInput.addEventListener('input', () => validaUrl(urlInput.value.trim()));

  // Collegamento funzioni ai bottoni
  calcolaBtn.onclick = () => calcolaOraInizioDirettaYoutube();
  searchBtn.onclick = () => searchYoutubeLive(); // Funzione richiesta

  document.getElementById('ytCancelBtn').onclick = () => {
    document.body.removeChild(overlay);
  };

  document.getElementById('ytSaveBtn').onclick = () => {
    // ... (resto del codice di salvataggio invariato)
    let finalUrl = urlInput.value.trim();
    const offsetValue = document.getElementById('ytOffset').value;
    const oraInizioValue = document.getElementById('ytOraInizio').value;
    const apiKeyValue = document.getElementById('ytApiKey').value.trim();

    if (offsetValue && parseInt(offsetValue) >= 0) {
      try {
        let urlObj = new URL(finalUrl);
        urlObj.searchParams.set("t", offsetValue + "s");
        urlObj.searchParams.delete("start");
        finalUrl = urlObj.toString();
      } catch (e) {
        if (!finalUrl.includes('t=') && !finalUrl.includes('start=')) {
          const separator = finalUrl.includes('?') ? '&' : '?';
          if (finalUrl !== "") finalUrl = `${finalUrl}${separator}t=${offsetValue}s`;
        } else {
          finalUrl = finalUrl.replace(/([?&])(t|start)=[^&]*/, `$1t=${offsetValue}s`);
        }
      }
    }

    videoURL = finalUrl;
    matchStartTime = offsetValue;
    googleApiKey = apiKeyValue;
    oraInizioDiretta = oraInizioValue;

    localStorage.setItem("googleApiKey", apiKeyValue);
    localStorage.setItem("matchStartTime", offsetValue);
    localStorage.setItem("videoURL", finalUrl);
    localStorage.setItem("oraInizioDiretta", oraInizioDiretta);

    dettagliGara.oraInizioDiretta = oraInizioDiretta;
    dettagliGara.videoURL = finalUrl;
    
    saveToFirebaseHistory('partite/' + matchId, dettagliGara);
    saveToServerMatchData();

    document.body.removeChild(overlay);
  };
}

async function searchYoutubeLive() {
    console.log("Ricerca YouTube Live avviata...");
    
    const apiKeyInserita = document.getElementById("ytApiKey").value.trim();
    
    if (!apiKeyInserita) {
        alert("Inserisci prima l'API Key per effettuare la ricerca.");
        return;
    }

    try {
        // Attendiamo il risultato della funzione asincrona
        const videoId = await getCurrentLiveIdByChannel(apiKeyInserita);
        
        // Costruiamo l'URL completo
        const liveVideoURL = `https://www.youtube.com/watch?v=${videoId}`;
        
        const messaggio = `Trovato Video Live: ${liveVideoURL}\nVuoi usare questo video?`;
        
        if (confirm(messaggio)) {
            const urlInput = document.getElementById('ytUrl');
            if (urlInput) {
                // Aggiorniamo il campo URL
                urlInput.value = liveVideoURL;

                // Trigger manuale dell'evento input per validare il tasto "Calcola"
                urlInput.dispatchEvent(new Event('input'));
                
                console.log("URL aggiornato con il video trovato:", liveVideoURL);
            }
        }
    } catch (error) {
        // Se getCurrentLiveIdByChannel lancia un errore (es. "canale non in live")
        console.error("Errore durante la ricerca:", error.message);
        alert(error.message);
    }
}

function calcolaOraInizioDirettaYoutube() {

  console.log("Eseguo il calcolo dell'ora dall'URL inserito...");

  // 1. Recuperiamo i valori aggiornati dai campi del popup
  const urlInserito = document.getElementById("ytUrl").value.trim();
  const apiKeyInserita = document.getElementById("ytApiKey").value.trim();
  const inputOraInizio = document.getElementById("ytOraInizio");

  // 2. Estraiamo il videoId dall'URL usando la funzione che abbiamo in common.js
  const videoId = extractYouTubeId(urlInserito);

  if (!videoId) {
    alert("URL YouTube non valido. Impossibile estrarre l'ID.");
    return;
  }

  if (!apiKeyInserita) {
    alert("Inserisci l'API Key per procedere al calcolo.");
    return;
  }

  // Cambiamo temporaneamente il testo del bottone per feedback all'utente
  const btn = document.getElementById("ytCalcolaBtn");
  const testoOriginale = btn.textContent;
  btn.textContent = "Attendere...";
  btn.disabled = true;

  // 3. Chiamiamo la funzione che interroga YouTube
  CheckYoutubeAndASave(videoId, apiKeyInserita).then(orario => {
    console.log("Orario inizio partita ricevuto:", orario);

    // 4. Inseriamo il risultato nell'input di tipo "time" del popup
    // orario è già in formato "HH:MM:SS" grazie alla modifica precedente
    inputOraInizio.value = orario;

    // Ripristiniamo il bottone
    btn.textContent = testoOriginale;
    btn.disabled = false;
  }).catch(err => {
    //console.error("Errore nel calcolo:", err);
    alert(err);
    //inputOraInizio.value = "00:00:00";
    btn.textContent = testoOriginale;
    btn.disabled = false;
  });
}

function gestisciConvocazioni() {
  const giocatori = giocatoriA;
  const numeri = numeriMaglia;

  const existingPopup = document.getElementById("convocazioniPopup");
  if (existingPopup) existingPopup.remove();

  const popup = document.createElement("div");
  popup.id = "convocazioniPopup";
  popup.className = "convocazioniPopup-overlay";

  const content = document.createElement("div");
  content.className = "convocazioniPopup-content";

  const title = document.createElement("h2");
  title.textContent = "Convocazioni";
  content.appendChild(title);

  const list = document.createElement("ul");
  list.id = "convocazioniList"; // ID per recuperarlo facilmente
  list.className = "convocazioniPopup-list";
  list.style.maxHeight = "600px";
  list.style.overflowY = "auto";
  list.style.overflowX = "hidden";
  list.style.paddingRight = "10px";
  list.style.listStyle = "none";

  // 1. Mappatura iniziale
  let datiGiocatori = giocatori.map((nomeCompleto, index) => {
    const parts = nomeCompleto.trim().split(" ");
    const nome = parts[0];
    const cognome = parts.slice(1).join(" ");
    return {
      index: index,
      nome: nome,
      cognome: cognome,
      visuale: `${cognome} ${nome}`,
      numeroMaglia: numeri[index],
      selezionato: false // Stato iniziale
    };
  });

  // 2. Recupero convocati salvati per impostare lo stato 'selezionato' iniziale
  let convocatiNum = [];
  if (typeof convocazioni !== 'undefined' && convocazioni.trim() !== "") {
    try {
      const parsed = JSON.parse(convocazioni);
      convocatiNum = Array.isArray(parsed) ? parsed.map(n => Number(n)) : [];
    } catch (e) { console.error("Errore parse convocazioni", e); }
  }
  
  datiGiocatori.forEach(g => {
    if (convocatiNum.includes(Number(g.numeroMaglia))) g.selezionato = true;
  });

  // 3. Funzione per renderizzare la lista ordinata
  const renderList = () => {
    list.innerHTML = ""; // Svuota la lista

    // Ordinamento: Prima i selezionati, poi alfabetico per cognome
    datiGiocatori.sort((a, b) => {
      if (a.selezionato === b.selezionato) {
        return a.cognome.localeCompare(b.cognome);
      }
      return a.selezionato ? -1 : 1;
    });

    datiGiocatori.forEach((item) => {
      const li = document.createElement("li");
      li.className = "convocazioniPopup-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `conv_${item.index}`;
      checkbox.checked = item.selezionato;

      // Al cambio, aggiorna lo stato nel database locale 'datiGiocatori' e ri-renderizza
      checkbox.onchange = () => {
        item.selezionato = checkbox.checked;
        renderList(); 
      };

      const label = document.createElement("label");
      label.htmlFor = `conv_${item.index}`;
      label.innerHTML = `
        <span class="conv-num">${item.numeroMaglia}</span>
        <span class="conv-name">${item.visuale}</span>
      `;

      li.appendChild(checkbox);
      li.appendChild(label);
      list.appendChild(li);
    });
  };

  // Esegui il primo render
  renderList();
  content.appendChild(list);

  // Bottoni Azione
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "convocazioniPopup-buttons";

  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Salva";
  confirmBtn.className = "convocazioniPopup-confirmBtn";
  confirmBtn.onclick = () => {
    // Filtra solo quelli che risultano selezionati nell'array datiGiocatori
    const selezionati = datiGiocatori
      .filter(g => g.selezionato)
      .map(g => Number(g.numeroMaglia));

    convocazioni = JSON.stringify(selezionati);
    localStorage.setItem("convocazioni", convocazioni);

    dettagliGara.convocazioni = convocazioni;
    saveToFirebaseHistory('partite/' + matchId, dettagliGara); 

    saveToServerMatchData();
    popup.remove();
    setTimeout(() => location.reload(), 2000);
  };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Annulla";
  closeBtn.className = "convocazioniPopup-closeBtn";
  closeBtn.onclick = () => popup.remove();

  buttonsContainer.append(confirmBtn, closeBtn);
  content.appendChild(buttonsContainer);
  popup.appendChild(content);
  document.body.appendChild(popup);
}

