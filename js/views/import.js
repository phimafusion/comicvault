import { db } from '../db.js';
import { openModal } from './form.js';

export function renderImport(container) {
    const html = `
        <div class="view-controls">
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
                <div id="csv-import-status" style="margin-top: 16px; font-size: 0.9rem; padding: 12px; border-radius: 8px; background: var(--bg-main); display: none; border: 1px solid var(--border-color);">
                    <div id="import-progress-text" style="margin-bottom: 8px;"></div>
                    <div style="width: 100%; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                        <div id="import-progress-bar" style="width: 0%; height: 100%; background: var(--primary-color); transition: width 0.3s ease;"></div>
                    </div>
                    <div id="import-debug-info" style="margin-top: 10px; font-size: 0.75rem; color: var(--text-secondary); max-height: 100px; overflow-y: auto; font-family: monospace;"></div>
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

// Robust Helpers
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
        // Zeitverschiebung ausgleichen für lokales Datum (YYYY-MM-DD)
        const d = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
        return d.toISOString().split('T')[0];
    }

    let str = String(val).toLowerCase().trim();
    if (str === 'x' || str === 'nein') return '';

    // Deutsches Format DD.MM.YYYY oder DD.MM.YY
    const dateMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (dateMatch) {
        let [_, d, m, y] = dateMatch;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Internationales Format YYYY-MM-DD
    const isoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return str.split(' ')[0]; // Nur den Datumsteil nehmen falls Zeit dabei ist

    return str;
}

// CSV Import Logic
async function handleCSVImport() {
    const fileInput = document.getElementById('import-csv-file');
    const statusDiv = document.getElementById('csv-import-status');
    const progressText = document.getElementById('import-progress-text');
    const progressBar = document.getElementById('import-progress-bar');
    const debugInfo = document.getElementById('import-debug-info');

    if (!fileInput.files || fileInput.files.length === 0) return alert('Bitte wähle zuerst eine Datei aus.');

    const file = fileInput.files[0];
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

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

            statusDiv.style.display = 'block';
            debugInfo.innerHTML = '';

            // Bestehende Comics für Dubletten-Prüfung laden
            const existingComics = await db.getAllComics();
            const total = rows.length;
            let current = 0;
            let updatedCount = 0;
            let newCount = 0;

            const batchSize = 5; // Kleiner für bessere Live-Updates im UI

            for (let i = 0; i < rows.length; i += batchSize) {
                const chunk = rows.slice(i, i + batchSize);
                await Promise.all(chunk.map(async (row) => {
                    if (row['Titel'] || row['Serie']) {
                        const comicData = mapRowToComic(row);

                        // Dubletten-Prüfung (Serie + Nummer + Titel)
                        const duplicate = existingComics.find(ex =>
                            String(ex.serie || '').toLowerCase() === String(comicData.serie || '').toLowerCase() &&
                            ex.nummer === comicData.nummer &&
                            String(ex.titel || '').toLowerCase() === String(comicData.titel || '').toLowerCase()
                        );

                        let statusText = "";
                        if (duplicate) {
                            comicData.id = duplicate.id; // Bestehende ID setzen für Update
                            statusText = `<span style="color: var(--secondary-color)">[Update]</span>`;
                            updatedCount++;
                        } else {
                            statusText = `<span style="color: var(--success)">[Neu]</span>`;
                            newCount++;
                        }

                        await db.saveComic(comicData);
                        current++;

                        // UI Update
                        const percent = Math.round((current / total) * 100);
                        progressBar.style.width = percent + '%';
                        progressText.innerHTML = `Verarbeite: <strong>${current} von ${total}</strong> (${percent}%)`;

                        // Detailliertes Log
                        debugInfo.innerHTML += `> ${statusText} ${comicData.serie} ${comicData.nummer ? '#' + comicData.nummer : ''} - ${comicData.titel}<br>`;
                        debugInfo.scrollTop = debugInfo.scrollHeight;
                    } else {
                        current++;
                    }
                }));
            }

            progressText.innerHTML = `<i class="fa-solid fa-check" style="color: var(--success)"></i> Abschluss: ${newCount} neu angelegt, ${updatedCount} aktualisiert.`;
            fileInput.value = '';

        } catch (error) {
            console.error("Import Error:", error);
            statusDiv.style.display = 'block';
            progressText.innerHTML = `<i class="fa-solid fa-xmark" style="color: var(--danger)"></i> Fehler: ${error.message}`;
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
