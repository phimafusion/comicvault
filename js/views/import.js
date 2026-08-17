import { db } from '../db.js';
import { escapeHTML, formatCurrency } from '../utils.js';
import { openModal } from './form.js';
import {
    parseCSV,
    generateXLSX,
    generateCSV,
    analyzeCSVImport,
    analyzeJSONImport,
    executeImportPlan
} from '../services/importExportService.js';

let viewContainer = null;

export function renderImport(container) {
    viewContainer = container;
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

    // Log & Preview Overlay (initially hidden)
    const logOverlayHtml = `
        <div id="import-log-overlay" class="modal-overlay" style="display: none;">
            <div class="modal-content" style="height: 80vh;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-magnifying-glass"></i> Import Vorschau & Analyse</h2>
                </div>
                <div style="padding: 10px 20px;">
                    <div id="import-progress-text" style="margin-bottom: 8px;">Initialisiere Vorschau & Analyse...</div>
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
                    <button class="btn btn-danger" id="btn-cancel-import"><i class="fa-solid fa-xmark"></i> Abbrechen</button>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-primary" id="btn-proceed-import" style="display: none;"><i class="fa-solid fa-check"></i> Import jetzt in Datenbank speichern</button>
                        <button class="btn btn-primary" id="btn-confirm-log-overlay" style="display: none;">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', logOverlayHtml);

    const btnConfirm = container.querySelector('#btn-confirm-log-overlay');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const overlay = container.querySelector('#import-log-overlay');
            if (overlay) overlay.style.display = 'none';
        });
    }

    const btnImportCsv = container.querySelector('#btn-import-csv');
    if (btnImportCsv) btnImportCsv.addEventListener('click', handleCSVImport);

    const btnImportJson = container.querySelector('#btn-import-json');
    if (btnImportJson) btnImportJson.addEventListener('click', handleJSONImport);

    const btnExportXlsx = container.querySelector('#btn-export-xlsx');
    if (btnExportXlsx) btnExportXlsx.addEventListener('click', () => handleExport('xlsx'));

    const btnExportCsv = container.querySelector('#btn-export-csv');
    if (btnExportCsv) btnExportCsv.addEventListener('click', () => handleExport('csv'));

    const btnExportJson = container.querySelector('#btn-export-json');
    if (btnExportJson) btnExportJson.addEventListener('click', () => handleExport('json'));

    const btnStartUrl = container.querySelector('#btn-start-url-import');
    if (btnStartUrl) btnStartUrl.addEventListener('click', handleUrlImport);
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

function logNewItem(data, isWishlist, logNewContainer) {
    const prefix = isWishlist ? '[Wunsch] ' : '';
    const suffix = isWishlist ? 'Hinzugefügt' : (data.titel || '');
    const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
    const safeName = escapeHTML(name);
    const safeSuffix = escapeHTML(suffix);
    const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${prefix}${safeName}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${safeSuffix}</span></div>`;
    logNewContainer.insertAdjacentHTML('beforeend', logLine);
    if (!window.__TESTING__) {
        logNewContainer.scrollTop = logNewContainer.scrollHeight;
    }
}

function logUpdatedItem(data, oldData, changedFields, isWishlist, logUpdatedContainer) {
    const prefix = isWishlist ? '[Wunsch] ' : '';
    const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
    const details = formatDiff(data, oldData, changedFields);
    const safeName = escapeHTML(name);
    const logLine = `
        <div style="margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <strong style="color: var(--primary-color);">${prefix}${safeName}</strong>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">
                ${details}
            </div>
        </div>
    `;
    logUpdatedContainer.insertAdjacentHTML('beforeend', logLine);
    if (!window.__TESTING__) {
        logUpdatedContainer.scrollTop = logUpdatedContainer.scrollHeight;
    }
}

function logSkippedItem(data, isWishlist, logSkippedContainer) {
    const prefix = isWishlist ? '[Wunsch] ' : '';
    const suffix = isWishlist ? 'Keine Änderungen' : (data.titel || '');
    const name = isWishlist ? (data.titel || '') : `${data.serie || ''} ${data.nummer ? '#' + data.nummer : ''}`;
    const safeName = escapeHTML(name);
    const safeSuffix = escapeHTML(suffix);
    const logLine = `<div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);"><strong>${prefix}${safeName}</strong><br><span style="color: var(--text-secondary); font-size: 0.75rem;">${safeSuffix}</span></div>`;
    logSkippedContainer.insertAdjacentHTML('beforeend', logLine);
    if (!window.__TESTING__) {
        logSkippedContainer.scrollTop = logSkippedContainer.scrollHeight;
    }
}

// Unified Workflow for Preview & Confirmation
async function runImportWorkflow({ parseDataFn, analyzeFn, statusDiv, fileInput }) {
    const progressText = document.getElementById('import-progress-text');
    const progressBar = document.getElementById('import-progress-bar');
    const logOverlay = document.getElementById('import-log-overlay');
    const logNew = document.getElementById('log-new');
    const logUpdated = document.getElementById('log-updated');
    const logSkipped = document.getElementById('log-skipped');
    const btnCancel = document.getElementById('btn-cancel-import');
    const btnProceed = document.getElementById('btn-proceed-import');
    const btnConfirm = document.getElementById('btn-confirm-log-overlay');

    statusDiv.style.display = 'none';
    logNew.innerHTML = '';
    logUpdated.innerHTML = '';
    logSkipped.innerHTML = '';

    // Show Log Overlay immediately for Preview Phase
    logOverlay.style.display = 'flex';
    progressText.innerHTML = 'Initialisiere Vorschau & Analyse...';
    progressBar.style.width = '0%';

    // Reset Summary Counters
    document.getElementById('sum-new').textContent = '0 neu';
    document.getElementById('sum-updated').textContent = '0 updates';
    document.getElementById('sum-skipped').textContent = '0 übersprungen';

    btnCancel.style.display = 'inline-block';
    btnCancel.disabled = false;
    btnCancel.innerHTML = '<i class="fa-solid fa-xmark"></i> Abbrechen';
    btnProceed.style.display = 'none';
    btnProceed.disabled = false;
    btnConfirm.style.display = 'none';

    importAborted = false;

    try {
        const inputData = await parseDataFn();

        const onProgress = (current, total, newCount, updatedCount, skipCount) => {
            const percent = Math.round((current / total) * 100);
            progressBar.style.width = percent + '%';
            progressText.innerHTML = `Analysiere & erstelle Vorschau: <strong>${current} von ${total}</strong> (${percent}%)`;

            document.getElementById('sum-new').textContent = `${newCount} neu`;
            document.getElementById('sum-updated').textContent = `${updatedCount} updates`;
            document.getElementById('sum-skipped').textContent = `${skipCount} übersprungen`;
        };

        const analysis = await analyzeFn(inputData, {
            onProgress,
            onLogNew: (item, isWishlist) => logNewItem(item, isWishlist, logNew),
            onLogUpdated: (item, oldItem, fields, isWishlist) => logUpdatedItem(item, oldItem, fields, isWishlist, logUpdated),
            onLogSkipped: (item, isWishlist) => logSkippedItem(item, isWishlist, logSkipped),
            isAborted: () => importAborted
        });

        if (importAborted) {
            progressText.innerHTML = `<i class="fa-solid fa-stop" style="color: var(--danger)"></i> Analyse abgebrochen.`;
            btnCancel.style.display = 'none';
            btnConfirm.style.display = 'inline-block';
            if (viewContainer) viewContainer.dispatchEvent(new CustomEvent('import-completed'));
            return;
        }

        progressText.innerHTML = `<i class="fa-solid fa-circle-info" style="color: var(--secondary-color)"></i> Vorschau abgeschlossen (${analysis.newCount} neu, ${analysis.updatedCount} updates, ${analysis.skipCount} übersprungen). Bitte bestätigen:`;
        progressBar.style.width = '100%';
        btnProceed.style.display = 'inline-block';

        if (viewContainer) {
            viewContainer.dispatchEvent(new CustomEvent('import-preview-ready', { detail: analysis }));
        }

        const handleCancel = () => {
            cleanup();
            logOverlay.style.display = 'none';
            fileInput.value = '';
            if (viewContainer) viewContainer.dispatchEvent(new CustomEvent('import-completed'));
        };

        const handleProceed = async () => {
            cleanup();
            btnProceed.style.display = 'none';
            btnCancel.style.display = 'none';
            progressText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Speichere in Datenbank...`;

            try {
                await executeImportPlan({
                    plannedOps: analysis.plannedOps,
                    clearFirst: inputData.clearFirst,
                    onProgress: (current, total) => {
                        const percent = Math.round((current / total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.innerHTML = `Speichere in Datenbank: <strong>${current} von ${total}</strong> (${percent}%)`;
                    },
                    isAborted: () => importAborted
                });

                progressText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i> Import erfolgreich in Datenbank gespeichert!`;
                btnConfirm.style.display = 'inline-block';
                fileInput.value = '';
            } catch (err) {
                console.error("Save Error:", err);
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--danger)"></i> Fehler beim Speichern: ${err.message}`;
                logOverlay.style.display = 'none';
            } finally {
                if (viewContainer) {
                    viewContainer.dispatchEvent(new CustomEvent('import-completed'));
                }
            }
        };

        const cleanup = () => {
            btnCancel.removeEventListener('click', handleCancel);
            btnProceed.removeEventListener('click', handleProceed);
        };

        btnCancel.addEventListener('click', handleCancel);
        btnProceed.addEventListener('click', handleProceed);

    } catch (error) {
        console.error("Import Error:", error);
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--danger)"></i> Fehler: ${error.message}`;
        logOverlay.style.display = 'none';
        if (viewContainer) viewContainer.dispatchEvent(new CustomEvent('import-completed'));
    }
}

// CSV Import Logic
async function handleCSVImport() {
    const fileInput = document.getElementById('import-csv-file');
    const statusDiv = document.getElementById('csv-import-status');

    if (!fileInput.files || fileInput.files.length === 0) return alert('Bitte wähle zuerst eine Datei aus.');

    const file = fileInput.files[0];
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const parseDataFn = () => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
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
                resolve({ rows, clearFirst: false });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Fehler beim Lesen der Datei."));
        if (isExcel) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
    });

    const analyzeFn = (inputData, options) => analyzeCSVImport({ rows: inputData.rows, ...options });

    await runImportWorkflow({ parseDataFn, analyzeFn, statusDiv, fileInput });
}

// JSON Import Logic
async function handleJSONImport() {
    const fileInput = document.getElementById('import-json-file');
    const statusDiv = document.getElementById('json-import-status');

    if (!fileInput.files || fileInput.files.length === 0) return alert('Bitte wähle zuerst eine Datei aus.');

    const file = fileInput.files[0];

    const parseDataFn = () => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);
                
                let comicsToImport = [];
                let wishlistToImport = [];
                let clearFirst = false;
                
                if (Array.isArray(data)) {
                    comicsToImport = data;
                } else if (data && typeof data === 'object') {
                    clearFirst = true;
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

                resolve({ comicsToImport, wishlistToImport, clearFirst });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Fehler beim Lesen der Datei."));
        reader.readAsText(file);
    });

    const analyzeFn = (inputData, options) => analyzeJSONImport({
        comicsToImport: inputData.comicsToImport,
        wishlistToImport: inputData.wishlistToImport,
        clearFirst: inputData.clearFirst,
        ...options
    });

    await runImportWorkflow({ parseDataFn, analyzeFn, statusDiv, fileInput });
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

        if (f === 'preis' && oldVal !== null && oldVal !== undefined) oldVal = formatCurrency(oldVal);
        if (f === 'preis' && newVal !== null && newVal !== undefined) newVal = formatCurrency(newVal);
        if (f === 'limitierung' || f === 'variant' || f === 'vorbestellt') {
            oldVal = oldVal ? 'Ja' : 'Nein';
            newVal = newVal ? 'Ja' : 'Nein';
        }

        const oldDisplay = oldVal !== undefined && oldVal !== null && oldVal !== '' ? oldVal : 'leer';
        const newDisplay = newVal !== undefined && newVal !== null && newVal !== '' ? newVal : 'leer';
        return `<div style="padding-left: 10px; margin-top: 2px;">• ${label}: <span style="text-decoration: line-through; opacity: 0.6;">${oldDisplay}</span> ➔ <span style="color: var(--success); font-weight: bold;">${newDisplay}</span></div>`;
    }).join('');
}
