import { db } from '../db.js';
import { openModal } from './form.js';
import {
    parseCSV,
    generateXLSX,
    generateCSV,
    importCSVData,
    importJSONData
} from '../services/importExportService.js';

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

            <!-- JSON Backup Import Section -->
            <div class="details-card" style="flex-direction: column;">
                <h3 style="margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fa-solid fa-file-code"></i> JSON Backup Import
                </h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 0.9rem;">
                    Lade hier eine zuvor exportierte JSON-Backup-Datei (.json) hoch, um Comics und Wunschliste wiederherzustellen.
                </p>
                <div class="form-group">
                    <input type="file" id="import-json-file" accept=".json" class="form-control" style="padding: 10px;">
                </div>
                <button class="btn btn-primary" id="btn-import-json" style="margin-top: 16px; align-self: flex-start;">
                    <i class="fa-solid fa-upload"></i> Backup einspielen
                </button>
                <div id="json-import-status" style="margin-top: 16px; font-size: 0.9rem; padding: 12px; border-radius: 8px; background: var(--bg-main); display: none; border: 1px solid var(--border-color); color: var(--danger);">
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
                <div style="display: flex; gap: 12px; margin-top: auto; flex-wrap: wrap;">
                    <button class="btn btn-secondary" id="btn-export-xlsx" style="flex: 1; min-width: 80px;">
                        <i class="fa-solid fa-file-excel"></i> Excel
                    </button>
                    <button class="btn btn-secondary" id="btn-export-csv" style="flex: 1; min-width: 80px;">
                        <i class="fa-solid fa-file-csv"></i> CSV
                    </button>
                    <button class="btn btn-secondary" id="btn-export-json" style="flex: 1; min-width: 80px;">
                        <i class="fa-solid fa-file-code"></i> JSON
                    </button>
                </div>
            </div>

            <!-- URL Import Section -->
            <div class="details-card" style="flex-direction: column;">
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
    document.getElementById('btn-import-json').addEventListener('click', handleJSONImport);
    document.getElementById('btn-export-xlsx').addEventListener('click', () => handleExport('xlsx'));
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

let importAborted = false;

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

            const onProgress = (current, total, newCount, updatedCount, skipCount) => {
                const percent = Math.round((current / total) * 100);
                progressBar.style.width = percent + '%';
                progressText.innerHTML = `Verarbeite: <strong>${current} von ${total}</strong> (${percent}%)`;

                document.getElementById('sum-new').textContent = `${newCount} neu`;
                document.getElementById('sum-updated').textContent = `${updatedCount} updates`;
                document.getElementById('sum-skipped').textContent = `${skipCount} übersprungen`;
            };

            const onLogNew = (comicData) => {
                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${comicData.titel}</span></div>`;
                logNew.insertAdjacentHTML('beforeend', logLine);
                logNew.scrollTop = logNew.scrollHeight;
            };

            const onLogUpdated = (comicData, oldData, changedFields) => {
                const details = formatDiff(comicData, oldData, changedFields);
                const logLine = `
                    <div style="margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <strong style="color: var(--primary-color);">${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
                            ${details}
                        </div>
                    </div>
                `;
                logUpdated.insertAdjacentHTML('beforeend', logLine);
                logUpdated.scrollTop = logUpdated.scrollHeight;
            };

            const onLogSkipped = (comicData) => {
                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${comicData.titel}</span></div>`;
                logSkipped.insertAdjacentHTML('beforeend', logLine);
                logSkipped.scrollTop = logSkipped.scrollHeight;
            };

            const result = await importCSVData({
                rows,
                onProgress,
                onLogNew,
                onLogUpdated,
                onLogSkipped,
                isAborted: () => importAborted
            });

            progressText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i> Import abgeschlossen.`;
            if (result.aborted) {
                progressText.innerHTML = `<i class="fa-solid fa-stop" style="color: var(--danger)"></i> Import abgebrochen.`;
                const abortMsg = `<div style="color: var(--danger); font-weight: bold; margin-top: 10px;">[ABGEBROCHEN] Import durch Benutzer gestoppt.</div>`;
                logNew.insertAdjacentHTML('beforeend', abortMsg);
                logUpdated.insertAdjacentHTML('beforeend', abortMsg);
                logSkipped.insertAdjacentHTML('beforeend', abortMsg);
            }
            
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
        } else if (format === 'xlsx') {
            const xlsxBuffer = generateXLSX(comics);
            const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            downloadFile(url, "ComicVault_Backup.xlsx");
        }
    } catch (e) {
        console.error("Export Error:", e);
        alert('Export-Fehler.');
    }
}

function downloadFile(dataStr, filename) {
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function handleJSONImport() {
    const fileInput = document.getElementById('import-json-file');
    const statusDiv = document.getElementById('json-import-status');
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
    const reader = new FileReader();

    importAborted = false;

    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const data = JSON.parse(text);
            
            let comicsToImport = [];
            let wishlistToImport = [];
            
            if (Array.isArray(data)) {
                comicsToImport = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data.comics)) {
                    comicsToImport = data.comics;
                }
                if (Array.isArray(data.wishlist)) {
                    wishlistToImport = data.wishlist;
                }
                
                if (comicsToImport.length === 0 && wishlistToImport.length === 0) {
                    throw new Error("Das Backup enthält keine Comics oder Wunschlisten-Einträge.");
                }
            } else {
                throw new Error("Ungültiges JSON-Format. Die Datei muss ein Array von Comics oder ein Backup-Objekt enthalten.");
            }

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

            const onProgress = (current, total, newCount, updatedCount, skipCount) => {
                const percent = Math.round((current / total) * 100);
                progressBar.style.width = percent + '%';
                progressText.innerHTML = `Verarbeite: <strong>${current} von ${total}</strong> (${percent}%)`;

                document.getElementById('sum-new').textContent = `${newCount} neu`;
                document.getElementById('sum-updated').textContent = `${updatedCount} updates`;
                document.getElementById('sum-skipped').textContent = `${skipCount} übersprungen`;
            };

            const onLogNew = (data, isWishlist) => {
                const prefix = isWishlist ? '[Wunsch] ' : '';
                const suffix = isWishlist ? 'Hinzugefügt' : (data.titel || '');
                const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
                
                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${prefix}${name}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${suffix}</span></div>`;
                logNew.insertAdjacentHTML('beforeend', logLine);
                logNew.scrollTop = logNew.scrollHeight;
            };

            const onLogUpdated = (data, oldData, changedFields, isWishlist) => {
                const prefix = isWishlist ? '[Wunsch] ' : '';
                const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
                const details = formatDiff(data, oldData, changedFields);
                
                const logLine = `
                    <div style="margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <strong style="color: var(--primary-color);">${prefix}${name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
                            ${details}
                        </div>
                    </div>
                `;
                logUpdated.insertAdjacentHTML('beforeend', logLine);
                logUpdated.scrollTop = logUpdated.scrollHeight;
            };

            const onLogSkipped = (data, isWishlist) => {
                const prefix = isWishlist ? '[Wunsch] ' : '';
                const suffix = isWishlist ? 'Keine Änderungen' : (data.titel || '');
                const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
                
                const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${prefix}${name}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${suffix}</span></div>`;
                logSkipped.insertAdjacentHTML('beforeend', logLine);
                logSkipped.scrollTop = logSkipped.scrollHeight;
            };

            const result = await importJSONData({
                comicsToImport,
                wishlistToImport,
                onProgress,
                onLogNew,
                onLogUpdated,
                onLogSkipped,
                isAborted: () => importAborted
            });

            progressText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i> JSON-Import abgeschlossen.`;
            if (result.aborted) {
                progressText.innerHTML = `<i class="fa-solid fa-stop" style="color: var(--danger)"></i> Import abgebrochen.`;
                const abortMsg = `<div style="color: var(--danger); font-weight: bold; margin-top: 10px;">[ABGEBROCHEN] Import durch Benutzer gestoppt.</div>`;
                logNew.insertAdjacentHTML('beforeend', abortMsg);
                logUpdated.insertAdjacentHTML('beforeend', abortMsg);
                logSkipped.insertAdjacentHTML('beforeend', abortMsg);
            }
            
            btnCancel.style.display = 'none';
            btnConfirm.style.display = 'inline-block';
            
            fileInput.value = '';

        } catch (error) {
            console.error("JSON Import Error:", error);
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--danger)"></i> Fehler: ${error.message}`;
            if (logOverlay) logOverlay.style.display = 'none';
        }
    };

    reader.readAsText(file);
}

const FIELD_LABELS = {
    titel: 'Titel',
    typ: 'Typ',
    serie: 'Serie',
    nummer: 'Nummer',
    verlag: 'Verlag',
    format: 'Format',
    jahr: 'Jahr',
    zustand: 'Zustand',
    bezugsquelle: 'Quelle',
    preis: 'Preis',
    sprache: 'Sprache',
    limitierung: 'Limitierung',
    limitiert_auf: 'Limitiert auf',
    variant: 'Variant',
    variantname: 'Variantname',
    bemerkung: 'Bemerkung',
    kaufdatum: 'Kaufdatum',
    bestand: 'Bestand',
    gelesen_am: 'Gelesen am',
    bewertung: 'Bewertung',
    isbn: 'ISBN',
    vorbestellt: 'Vorbestellt',
    besonderheit: 'Besonderheit'
};

function formatDiff(newData, oldData, changedFields) {
    return changedFields.map(f => {
        const label = FIELD_LABELS[f] || f;
        let oldVal = oldData[f];
        let newVal = newData[f];

        if (f === 'preis' && oldVal !== null && oldVal !== undefined) oldVal = Number(oldVal).toFixed(2) + ' €';
        if (f === 'preis' && newVal !== null && newVal !== undefined) newVal = Number(newVal).toFixed(2) + ' €';
        if (f === 'limitierung' || f === 'variant' || f === 'vorbestellt') {
            oldVal = oldVal ? 'Ja' : 'Nein';
            newVal = newVal ? 'Ja' : 'Nein';
        }

        const oldDisplay = oldVal !== undefined && oldVal !== null && oldVal !== '' ? oldVal : 'leer';
        const newDisplay = newVal !== undefined && newVal !== null && newVal !== '' ? newVal : 'leer';
        return `<div style="padding-left: 10px; margin-top: 2px;">• ${label}: <span style="text-decoration: line-through; opacity: 0.6;">${oldDisplay}</span> ➔ <span style="color: var(--success); font-weight: bold;">${newDisplay}</span></div>`;
    }).join('');
}
