import { db } from '../db.js';
import { openModal } from './form.js';

export function renderImport(container) {
    const html = `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Import / Export</h2>
        </div>
        
        <div class="details-grid" style="grid-template-columns: 1fr 1fr; align-items: start;">
            <!-- Import Section -->
            <div class="details-card" style="flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fa-solid fa-file-excel"></i> Excel / CSV Import
                </h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">
                    Lade hier deine Excel- (.xlsx, .xls) oder CSV-Datei hoch. Die erste Zeile muss die Spaltenüberschriften enthalten.
                </p>
                <div class="form-group">
                    <input type="file" id="import-csv-file" accept=".csv, .xlsx, .xls" class="form-control" style="padding: 10px;">
                </div>
                <button class="btn btn-primary" id="btn-import-csv" style="margin-top: 16px; align-self: flex-start;">
                    <i class="fa-solid fa-upload"></i> Import starten
                </button>
                <div id="csv-import-status" style="margin-top: 16px; font-size: 0.9rem; padding: 12px; border-radius: 8px; background: var(--bg-main); display: none; border: 1px solid var(--border-color); color: var(--danger);">
                </div>
            </div>

            <!-- Export Section -->
            <div class="details-card" style="flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fa-solid fa-download"></i> Sammlung Exportieren
                </h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">
                    Sichere deine gesamte Sammlung als Datei.
                </p>
                <div style="display: flex; gap: 12px; margin-top: auto;">
                    <button class="btn btn-secondary" id="btn-export-csv" style="flex: 1;">
                        <i class="fa-solid fa-file-csv"></i> CSV
                    </button>
                    <button class="btn btn-secondary" id="btn-export-json" style="flex: 1;">
                        <i class="fa-solid fa-file-code"></i> JSON
                    </button>
                </div>
            </div>

            <!-- URL Import Section -->
            <div class="details-card" style="flex-direction: column; grid-column: 1 / -1;">
                <h3 style="margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fa-solid fa-link"></i> Von URL Importieren
                </h3>
                <div style="display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;">
                    <div class="form-group" style="flex: 1; min-width: 200px;">
                        <label class="form-label">URL (Panini, Thalia, etc.)</label>
                        <input type="url" id="import-url" class="form-control" placeholder="https://...">
                    </div>
                    <div class="form-group" style="width: 200px;">
                        <label class="form-label">Ziel</label>
                        <select id="import-target" class="form-control">
                            <option value="collection">Meine Sammlung</option>
                            <option value="wishlist">Wunschliste</option>
                        </select>
                    </div>
                    <button class="btn btn-secondary" id="btn-start-url-import" style="height: 42px;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Laden
                    </button>
                </div>
                <div id="url-import-status" style="margin-top: 12px; font-size: 0.9rem; color: var(--secondary-color); display: none;">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Analysiere Webseite...
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    // Log Overlay (initially hidden)
    const logOverlayHtml = `
        <div id="import-log-overlay" class="modal-overlay" style="display: none;">
            <div class="modal-content" style="height: 80vh;">
                <div class="modal-header">
                    <h2>Import Protokoll</h2>
                </div>
                <div style="padding: 10px 20px;">
                    <div id="import-progress-text" style="margin-bottom: 8px;">Starte Import...</div>
                    <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div id="import-progress-bar" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s ease;"></div>
                    </div>
                </div>
                <div class="modal-body" style="display: flex; gap: 0; overflow: hidden; padding: 0; border-top: 1px solid var(--border-color);">
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border-color);">
                        <div style="padding: 10px 15px; background: rgba(16, 185, 129, 0.05); color: var(--success); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-plus-circle"></i> Neu
                        </div>
                        <div id="log-new" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border-color);">
                        <div style="padding: 10px 15px; background: rgba(6, 182, 212, 0.05); color: var(--secondary-color); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-pen-to-square"></i> Updates
                        </div>
                        <div id="log-updated" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div style="padding: 10px 15px; background: rgba(148, 163, 184, 0.05); color: var(--text-secondary); font-weight: bold; border-bottom: 1px solid var(--border-color); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">
                            <i class="fa-solid fa-forward-step"></i> Übersprungen
                        </div>
                        <div id="log-skipped" style="flex: 1; overflow-y: auto; padding: 10px; font-family: monospace; font-size: 0.8rem; line-height: 1.4;"></div>
                    </div>
                </div>
                <div id="import-live-summary" style="padding: 12px 24px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.1); font-size: 0.85rem; display: flex; gap: 20px;">
                    <span id="sum-new" style="color: var(--success); font-weight: bold;">0 neu</span>
                    <span id="sum-updated" style="color: var(--secondary-color); font-weight: bold;">0 updates</span>
                    <span id="sum-skipped" style="color: var(--text-secondary); font-weight: bold;">0 übersprungen</span>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                    <button class="btn btn-danger" id="btn-cancel-import"><i class="fa-solid fa-stop"></i> Import abbrechen</button>
                    <button class="btn btn-primary" id="btn-confirm-log-overlay" style="display: none;">OK</button>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', logOverlayHtml);

    document.getElementById('btn-confirm-log-overlay').addEventListener('click', () => {
        document.getElementById('import-log-overlay').style.display = 'none';
    });

    document.getElementById('btn-cancel-import').addEventListener('click', () => {
        importAborted = true;
        const btnCancel = document.getElementById('btn-cancel-import');
        btnCancel.disabled = true;
        btnCancel.innerHTML = 'Breche ab...';
    });

    document.getElementById('btn-import-csv').addEventListener('click', handleCSVImport);
    document.getElementById('btn-export-csv').addEventListener('click', () => handleExport('csv'));
    document.getElementById('btn-export-json').addEventListener('click', () => handleExport('json'));
    document.getElementById('btn-start-url-import').addEventListener('click', handleUrlImport);
}

// URL Import Logic
async function handleUrlImport() {
    const url = document.getElementById('import-url').value;
    const target = document.getElementById('import-target').value;
    const status = document.getElementById('url-import-status');

    if (!url) return alert('Bitte gib eine gültige URL ein.');

    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
        const mockData = {
            titel: "Batman: Die Drei Joker",
            verlag: "Panini",
            typ: "Comic",
            serie: "Batman",
            nummer: 1,
            format: "Hardcover",
            jahr: 2021,
            sprache: "Deutsch",
            preis: 29.00,
            bemerkung: "Importiert von URL: " + url
        };
        openModal(mockData, target === 'wishlist');
    }, 1500);
}

// Comparison Helpers
function getChangedFields(oldData, newData) {
    const fields = [
        'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 
        'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 
        'limitiert_auf', 'variant', 'variantname', 'bemerkung', 
        'kaufdatum', 'bestand', 'gelesen_am', 'bewertung'
    ];
    const diffs = [];
    fields.forEach(f => {
        let v1 = oldData[f];
        let v2 = newData[f];

        // Normalize
        if (v1 === null || v1 === undefined) v1 = '';
        if (v2 === null || v2 === undefined) v2 = '';
        
        // Special case for numbers
        if (typeof v1 === 'number' || typeof v2 === 'number') {
            if (Number(v1) !== Number(v2)) diffs.push(f);
            return;
        }

        if (String(v1).trim() !== String(v2).trim()) {
            diffs.push(f);
        }
    });
    return diffs;
}

let importAborted = false;

// URL Import Logic
function parseCurrency(val) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === 'number') return val;
    let str = String(val);
    let clean = str.replace(/[^\d,.]/g, '');
    if (!clean) return null;
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) clean = clean.replace(/\./g, '').replace(',', '.');
    else if (lastDot > lastComma) clean = clean.replace(/,/g, '');
    else if (lastComma !== -1) clean = clean.replace(',', '.');
    return parseFloat(clean);
}

function parseStars(val) {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === 'number') return val <= 5 ? val * 2 : Math.min(val, 10);
    let str = String(val);
    const stars = (str.match(/[★⭐*]/g) || []).length;
    if (stars > 0) return stars * 2;
    const num = parseInt(str.replace(/[^\d]/g, ''));
    if (!isNaN(num)) return num <= 5 ? num * 2 : Math.min(num, 10);
    return 0;
}

function parseDate(val) {
    if (val === undefined || val === null || val === "") return '';

    let dateObj = null;

    // 1. Falls es bereits ein Date-Objekt ist
    if (val instanceof Date) {
        dateObj = val;
    }
    // 2. Falls es ein langer String ist (z.B. Zeitstempel aus dem Screenshot)
    else if (typeof val === 'string' && val.length > 15) {
        const d = new Date(val);
        if (!isNaN(d)) dateObj = d;
    }

    if (dateObj) {
        // Zeitverschiebung ausgleichen für lokales Datum
        const d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
        const iso = d.toISOString().split('T')[0];
        const [y, m, day] = iso.split('-');
        return `${day}.${m}.${y}`;
    }

    let str = String(val).toLowerCase().trim();
    if (str === 'x' || str === 'nein') return '';

    // Flexibles Format: DD.MM.YYYY, DD.MM.YY, DD/MM/YY, DD-MM-YYYY, YYYY-MM-DD etc.
    const dateMatch = str.match(/(\d{1,4})[\.\-\/\s]+(\d{1,2})[\.\-\/\s]+(\d{1,4})/);
    if (dateMatch) {
        let [_, p1, p2, p3] = dateMatch;
        
        let y, m, d;
        // Wenn der erste Teil 4 Ziffern hat, gehen wir von YYYY-MM-DD aus
        if (p1.length === 4) {
            y = p1; m = p2; d = p3;
        } else {
            // Ansonsten DD-MM-YYYY oder DD-MM-YY
            d = p1; m = p2; y = p3;
            if (y.length === 2) {
                const yearNum = parseInt(y, 10);
                y = (yearNum >= 50 ? '19' : '20') + y;
            } else if (y.length === 1) {
                y = '200' + y;
            }
        }
        
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }

    return str;
}

// CSV Import Logic
async function handleCSVImport() {
    const fileInput = document.getElementById('import-csv-file');
    const statusDiv = document.getElementById('csv-import-status');
    const progressText = document.getElementById('import-progress-text');
    const progressBar = document.getElementById('import-progress-bar');
    
    const logOverlay = document.getElementById('import-log-overlay');
    const logNew = document.getElementById('log-new');
    const logUpdated = document.getElementById('log-updated');
    const logSkipped = document.getElementById('log-skipped');
    const btnCancel = document.getElementById('btn-cancel-import');
    const btnConfirm = document.getElementById('btn-confirm-log-overlay');

    if (!fileInput.files || fileInput.files.length === 0) return alert('Bitte wähle zuerst eine Datei aus.');

    const file = fileInput.files[0];
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    importAborted = false;

    reader.onload = async (e) => {
        try {
            let rows = [];

            if (isExcel) {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            } else {
                const text = e.target.result;
                rows = parseCSV(text);
            }

            if (rows.length === 0) throw new Error("Die Datei ist leer oder konnte nicht gelesen werden.");

            statusDiv.style.display = 'none';
            logNew.innerHTML = '';
            logUpdated.innerHTML = '';
            logSkipped.innerHTML = '';
            
            // Show Log Overlay immediately
            logOverlay.style.display = 'flex';
            progressText.innerHTML = 'Initialisiere Import...';
            progressBar.style.width = '0%';
            
            // Reset Summary Counters
            document.getElementById('sum-new').textContent = '0 neu';
            document.getElementById('sum-updated').textContent = '0 updates';
            document.getElementById('sum-skipped').textContent = '0 übersprungen';
            
            btnCancel.style.display = 'inline-block';
            btnCancel.disabled = false;
            btnCancel.innerHTML = '<i class="fa-solid fa-stop"></i> Import abbrechen';
            btnConfirm.style.display = 'none';

            // Bestehende Comics für Dubletten-Prüfung laden
            const existingComics = await db.getAllComics();
            const idMap = new Map();
            const contentMap = new Map();
            const coreMap = new Map();

            // Helfer für einen extrem genauen "Fingerabdruck" eines Comics (als Fallback falls keine ID da ist)
            const getExactSignature = (c) => {
                return [
                    c.serie, c.nummer, c.titel, c.verlag, c.format, c.sprache, 
                    c.zustand, c.limitierung, c.variantname, c.preis, c.kaufdatum, c.bemerkung, c.bestand
                ].map(v => String(v || '').toLowerCase().trim()).join('|');
            };

            // Helfer für einen Basis-Fingerabdruck (nur die absoluten Kern-Identifikationsmerkmale)
            const getCoreSignature = (c) => {
                return [
                    c.serie, c.nummer, c.titel, c.verlag, c.format, c.sprache
                ].map(v => String(v || '').toLowerCase().trim()).join('|');
            };

            existingComics.forEach(ex => {
                if (ex.id) idMap.set(ex.id, ex);
                contentMap.set(getExactSignature(ex), ex);
                
                const coreKey = getCoreSignature(ex);
                if (!coreMap.has(coreKey)) coreMap.set(coreKey, []);
                coreMap.get(coreKey).push(ex);
            });

            const total = rows.length;
            let current = 0;
            let updatedCount = 0;
            let newCount = 0;
            let skipCount = 0;

            const batchSize = 50; // Erhöht für besseren Durchsatz

            for (let i = 0; i < rows.length; i += batchSize) {
                if (importAborted) {
                    const abortMsg = `<div style="color: var(--danger); font-weight: bold; margin-top: 10px;">[ABGEBROCHEN] Import durch Benutzer gestoppt.</div>`;
                    logNew.insertAdjacentHTML('beforeend', abortMsg);
                    logUpdated.insertAdjacentHTML('beforeend', abortMsg);
                    logSkipped.insertAdjacentHTML('beforeend', abortMsg);
                    break;
                }

                const chunk = rows.slice(i, i + batchSize);

                for (const row of chunk) {
                    if (importAborted) break;

                    if (row['Titel'] || row['Serie']) {
                        const comicData = mapRowToComic(row);

                        // Dubletten-Prüfung
                        let duplicate = null;
                        let contentKey = getExactSignature(comicData);

                        if (comicData.id) {
                            duplicate = idMap.get(comicData.id);
                        } else {
                            // 1. Suche nach exakter Übereinstimmung ALLER Felder
                            duplicate = contentMap.get(contentKey);
                            
                            // 2. Suche nach Basis-Übereinstimmung (nur Kern-Daten) falls 1 fehlschlägt
                            if (!duplicate) {
                                const coreKey = getCoreSignature(comicData);
                                const coreMatches = coreMap.get(coreKey);
                                
                                if (coreMatches && coreMatches.length > 0) {
                                    // Finde den ersten, der in DIESEM Importlauf noch nicht upgedated wurde
                                    duplicate = coreMatches.find(c => !c._importUsed);
                                }
                            }
                        }

                        let statusText = "";
                        let logDetail = "";

                        if (duplicate) {
                            duplicate._importUsed = true;
                            const changedFields = getChangedFields(duplicate, comicData);
                            
                            if (changedFields.length === 0) {
                                statusText = `<span style="color: var(--text-secondary); font-weight:bold;">[SKIP]</span>`;
                                logDetail = `Keine Änderungen.`;
                                skipCount++;
                                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${comicData.titel}</span></div>`;
                                logSkipped.insertAdjacentHTML('beforeend', logLine);
                                logSkipped.scrollTop = logSkipped.scrollHeight;
                            } else {
                                comicData.id = duplicate.id; // Bestehende ID setzen für Update
                                statusText = `<span style="color: var(--secondary-color); font-weight:bold;">[UPDATE]</span>`;
                                logDetail = `<span style="color: var(--warning)">${changedFields.join(', ')}</span>`;
                                updatedCount++;
                                await db.saveComic(comicData);
                                if (comicData.id) idMap.set(comicData.id, comicData);
                                contentMap.set(contentKey, comicData);

                                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">Fields: ${logDetail}</span></div>`;
                                logUpdated.insertAdjacentHTML('beforeend', logLine);
                                logUpdated.scrollTop = logUpdated.scrollHeight;
                            }
                        } else {
                            statusText = `<span style="color: var(--success); font-weight:bold;">[NEU]</span>`;
                            logDetail = `Angelegt`;
                            newCount++;
                            const newId = await db.saveComic(comicData);
                            comicData.id = newId;
                            idMap.set(newId, comicData);
                            contentMap.set(contentKey, comicData);

                            const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${comicData.titel}</span></div>`;
                            logNew.insertAdjacentHTML('beforeend', logLine);
                            logNew.scrollTop = logNew.scrollHeight;
                        }

                        current++;
                        
                        // Fortschritt sofort aktualisieren
                        const percent = Math.round((current / total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.innerHTML = `Verarbeite: <strong>${current} von ${total}</strong> (${percent}%)`;

                        // Live-Zusammenfassung im Footer aktualisieren
                        document.getElementById('sum-new').textContent = `${newCount} neu`;
                        document.getElementById('sum-updated').textContent = `${updatedCount} updates`;
                        document.getElementById('sum-skipped').textContent = `${skipCount} übersprungen`;
                    } else {
                        current++;
                    }
                }
            }

            progressText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i> Import abgeschlossen.`;
            if (importAborted) progressText.innerHTML = `<i class="fa-solid fa-stop" style="color: var(--danger)"></i> Import abgebrochen.`;
            
            btnCancel.style.display = 'none';
            btnConfirm.style.display = 'inline-block';
            
            fileInput.value = '';

        } catch (error) {
            console.error("Import Error:", error);
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--danger)"></i> Fehler: ${error.message}`;
            if (logOverlay) logOverlay.style.display = 'none';
        }
    };

    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    return lines.slice(1).map(line => {
        let values = [];
        let insideQuote = false;
        let current = '';
        for (let char of line) {
            if (char === '"') insideQuote = !insideQuote;
            else if (char === delimiter && !insideQuote) {
                values.push(current);
                current = '';
            } else current += char;
        }
        values.push(current);
        const row = {};
        headers.forEach((h, i) => row[h] = (values[i] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return row;
    });
}

function mapRowToComic(row) {
    // Liste aller tatsächlichen Keys in der Zeile (für flexiblen Abgleich)
    const rowKeys = Object.keys(row);

    // Hilfsfunktion für extrem flexibles Spalten-Mapping
    const getVal = (targetKeys) => {
        // 1. Erst nach exakten Treffern suchen
        for (const tk of targetKeys) {
            if (row[tk] !== undefined && row[tk] !== null && row[tk] !== "") return row[tk];
        }

        // 2. Dann nach "ähnlichen" Treffern suchen (Ignoriere Case, Leerzeichen, Zeilenumbrüche)
        const normalize = (s) => String(s).toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
        const normalizedTargets = targetKeys.map(normalize);

        for (const rk of rowKeys) {
            const normRk = normalize(rk);
            if (normalizedTargets.includes(normRk)) {
                if (row[rk] !== undefined && row[rk] !== null && row[rk] !== "") return row[rk];
            }
        }
        return null;
    };

    let limitierung = false;
    let limitiert_auf = null;
    const limRaw = String(getVal(['Limitierung', 'Limitiert']) || '').toLowerCase();
    if (limRaw && !['nein', 'keine', 'false', '0'].includes(limRaw)) {
        limitierung = true;
        const numMatch = limRaw.match(/\d+/);
        if (numMatch) limitiert_auf = parseInt(numMatch[0]);
    }

    let variant = false;
    const varRaw = String(getVal(['Variant', 'Variante', 'Variant-Cover']) || '').toLowerCase();
    if (['ja', 'true', 'yes', 'j', '1'].includes(varRaw)) variant = true;

    const bemerkungRaw = String(getVal(['Bemerkung', 'Notiz', 'Info']) || '');
    let bemerkung = bemerkungRaw;

    let gelesenAm = parseDate(getVal(['Gelesen', 'Gelesen am']));
    const gelesenRaw = String(getVal(['Gelesen', 'Gelesen am']) || '').toLowerCase().trim();

    if (gelesenRaw === 'x') {
        gelesenAm = '2023-01-01';
        bemerkung = (bemerkung ? bemerkung + ' ' : '') + '*** Gelesen am Platzhalter, da nicht genau terminierbar [autogenerated] ***';
    }

    let variantname = String(getVal(['Variantename', 'Variantname']) || '');
    if (variant && !variantname && bemerkungRaw.toLowerCase().includes('variant')) {
        variantname = bemerkungRaw;
    }

    let preis = parseCurrency(getVal(['Preis (inkl. Vsk)', 'Preis', 'Kaufpreis']));

    let titel = String(getVal(['Titel', 'Comic Titel', 'Name']) || 'Unbekannt');
    const nummer = getVal(['Numm', 'Nummer', 'Nr', 'No']) !== null ? parseInt(String(getVal(['Numm', 'Nummer', 'Nr', 'No'])).replace(/[^\d]/g, '')) : null;

    // Titel bereinigen: Nummer am Ende entfernen, wenn sie mit dem Nummer-Feld übereinstimmt
    if (nummer !== null && titel) {
        const regex = new RegExp(`\\s+0*${nummer}$`);
        if (regex.test(titel)) {
            titel = titel.replace(regex, '').trim();
        }
    }

    return {
        id: getVal(['id', 'ID']) ? String(getVal(['id', 'ID'])) : null,
        titel: titel,
        typ: String(getVal(['Typ', 'Genre']) || ''),
        serie: String(getVal(['Serie', 'Reihe']) || ''),
        nummer: nummer,
        verlag: String(getVal(['Verlag', 'Publisher']) || ''),
        format: String(getVal(['Format', 'Einband']) || ''),
        jahr: getVal(['Jahr (Serie/Release)', 'Jahr (Serie/I)', 'Jahr', 'Erscheinungsjahr']) !== null ? parseInt(String(getVal(['Jahr (Serie/Release)', 'Jahr (Serie/I)', 'Jahr', 'Erscheinungsjahr'])).replace(/[^\d]/g, '')) : null,
        zustand: String(getVal(['Zustand bei Kauf', 'Zustand']) || ''),
        bezugsquelle: String(getVal(['Bezugsquelle', 'Quelle']) || ''),
        preis: preis,
        sprache: String(getVal(['Sprache', 'Language']) || 'Deutsch'),
        limitierung: limitierung,
        limitiert_auf: limitiert_auf,
        variant: variant,
        variantname: variantname,
        bemerkung: bemerkung,
        kaufdatum: parseDate(getVal(['Kaufdatum', 'Gekauft am'])),
        bestand: String(getVal(['Bestand', 'Lager']) || 'vorhanden'),
        gelesen_am: gelesenAm,
        bewertung: parseStars(getVal(['Bewertung', 'Rating'])),
        bild: ''
    };
}

// Export Logic
async function handleExport(format) {
    try {
        const comics = await db.getAllComics();
        if (comics.length === 0) return alert('Sammlung leer.');
        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(comics, null, 2));
            downloadFile(dataStr, "ComicVault_Backup.json");
        } else if (format === 'csv') {
            const csvStr = generateCSV(comics);
            const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvStr);
            downloadFile(dataStr, "ComicVault_Backup.csv");
        }
    } catch (e) {
        alert('Export-Fehler.');
    }
}

function generateCSV(comics) {
    const fields = ['id', 'titel', 'typ', 'serie', 'nummer', 'verlag', 'format', 'jahr', 'zustand', 'bezugsquelle', 'preis', 'sprache', 'limitierung', 'limitiert_auf', 'variant', 'variantname', 'kaufdatum', 'bestand', 'gelesen_am', 'bewertung', 'bemerkung'];
    const header = fields.join(';');
    const rows = comics.map(c => fields.map(f => {
        let v = c[f] ?? '';
        v = String(v).replace(/"/g, '""');
        return (v.includes(';') || v.includes('\n') || v.includes('"')) ? `"${v}"` : v;
    }).join(';'));
    return [header, ...rows].join('\n');
}

function downloadFile(dataStr, filename) {
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
