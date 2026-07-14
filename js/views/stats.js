import { db } from '../db.js';
import { renderStars } from '../utils.js';
import {
    parseToDate,
    checkDateInRange,
    isComicInTimeframe,
    filterComicsByDropdowns,
    calculateKPIs,
    calculateTypeStats,
    calculateReadingChallenge,
    calculateHighlights,
    calculateTimelineData,
    calculateDistributionData,
    calculateTopLists,
    getEarlyComics,
    calculateInventoryTBRDevelopment,
    groupTBRDataByYear
} from '../services/statsService.js';

let activeStatsFilters = {
    verlag: [],
    format: [],
    bestand: ['vorhanden'],
    sprache: [],
    typ: [],
    serie: [],
    zeitraum: 'all'
};

let statsCharts = {};
let statsEventsAttached = false;

export async function renderStats(container) {
    activeStatsFilters = {
        verlag: [],
        format: [],
        bestand: ['vorhanden'],
        sprache: [],
        typ: [],
        serie: [],
        zeitraum: 'all'
    };
    const comics = await db.getAllComics();
    
    // Filter-Optionen sammeln in einem Durchlauf
    const verlageSet = new Set();
    const formateSet = new Set();
    const beständeSet = new Set();
    const sprachenSet = new Set();
    const typenSet = new Set();
    const serienSet = new Set();
    
    comics.forEach(c => {
        if (c.verlag) verlageSet.add(c.verlag);
        if (c.format) formateSet.add(c.format);
        if (c.bestand) beständeSet.add(c.bestand);
        if (c.sprache) sprachenSet.add(c.sprache);
        if (c.typ) typenSet.add(c.typ);
        if (c.serie) serienSet.add(c.serie);
    });
    
    const verlage = [...verlageSet].sort();
    const formate = [...formateSet].sort();
    const bestände = [...beständeSet].sort();
    const sprachen = [...sprachenSet].sort();
    const typen = [...typenSet].sort();
    const serien = [...serienSet].sort();

    // Jahre für Zeitraum-Auswahl finden
    const yearsSet = new Set();
    comics.forEach(c => {
        const b = parseToDate(c.kaufdatum || c.created_at);
        if (b) yearsSet.add(b.getFullYear());
        const r = parseToDate(c.gelesen_am);
        if (r) yearsSet.add(r.getFullYear());
    });
    const sortedYears = [...yearsSet].sort((a, b) => b - a).filter(y => y >= 2000 && y <= new Date().getFullYear());

    const currentYear = new Date().getFullYear();

    const html = `
        <div class="view-controls view-controls-sticky" style="flex-wrap: wrap; gap: 15px; position: sticky; top: 0; z-index: 90; background-color: var(--bg-main); min-height: 76px; box-sizing: border-box; display: flex; align-items: center; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; flex: 1;">
                <!-- Direkt sichtbare Multi-Filter -->
                <div class="direct-filters" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    ${renderStatsMultiSelect('verlag', 'Verlag', verlage)}
                    ${renderStatsMultiSelect('serie', 'Serie', serien)}
                    ${renderStatsMultiSelect('format', 'Format', formate)}
                    ${renderStatsMultiSelect('bestand', 'Bestand', bestände)}
                    ${renderStatsMultiSelect('sprache', 'Sprache', sprachen)}
                    ${renderStatsMultiSelect('typ', 'Typ', typen)}
                    ${renderTimeframeSelect(sortedYears)}
                    
                    <button id="btn-reset-stats-filters" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Alle Filter zurücksetzen">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- KPI Zähler -->
        <div id="stats-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <!-- Wird von updateStats() befüllt -->
        </div>

        <!-- Typ-spezifische KPIs -->
        <div id="stats-by-type-container" style="margin-bottom: 24px;">
            <!-- Wird von updateStats() befüllt -->
        </div>
        
        <!-- Lese-Challenge & Highlights -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="stats-top-grid">
            <!-- Challenge Card -->
            <div class="details-card" style="flex-direction: column; padding: 24px; position: relative; justify-content: space-between;">
                <div>
                    <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-trophy" style="color: var(--warning);"></i>
                        <span>Lese-Challenge ${currentYear}</span>
                    </h3>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1; justify-content: center;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 0.9rem; color: var(--text-secondary);">Fortschritt:</span>
                        <span style="font-size: 1.5rem; font-family: var(--font-display); font-weight: 800; color: var(--text-primary);" id="challenge-ratio">0 / 50</span>
                    </div>
                    
                    <div style="width: 100%; height: 16px; background-color: var(--bg-main); border-radius: var(--radius-full); overflow: hidden; border: 1px solid var(--border-color);">
                        <div id="challenge-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); border-radius: var(--radius-full); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span id="challenge-percent-text" style="font-size: 0.85rem; font-weight: 600; color: var(--secondary-color);">0% abgeschlossen</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">Ziel:</span>
                            <input type="number" id="input-reading-goal" style="width: 60px; height: 28px; padding: 0 6px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-primary); text-align: center; font-size: 0.85rem; font-weight: 600;" min="1" value="50">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Highlights Card -->
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-bolt" style="color: var(--primary-color);"></i>
                    <span>Averages & Rekorde</span>
                </h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1;" id="stats-highlights">
                    <!-- Wird dynamisch befüllt -->
                </div>
            </div>
        </div>
        
        <!-- Inventory TBR Table -->
        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px;">
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-list-ol" style="color: var(--secondary-color);"></i>
                    <span>Entwicklung des Lesestapels (Bestand)</span>
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
                    Diese Tabelle zeigt die Entwicklung der gelesenen Comics und des Lesestapels (TBR) über die Zeit. Klicke auf ein Jahr, um die Monate auf- oder zuzuklappen.<br>
                    <strong>Hinweis:</strong> Dies umfasst ausschließlich Comics, die aktuell den Status "vorhanden" haben und wird von den oben gewählten Filtern nicht beeinflusst. <br>
                    <span style="display: inline-block; margin-top: 8px;"><strong>Trend-Spalte:</strong> Zeigt die absolute und prozentuale Zu- oder Abnahme des Lesestapels im Vergleich zum Vormonat an. <span style="color: var(--success);">Grün (Negativ)</span> = Stapel schrumpft (mehr gelesen als gekauft). <span style="color: var(--danger);">Rot (Positiv)</span> = Stapel wächst (mehr gekauft als gelesen).</span><br>
                    <span style="display: inline-block; margin-top: 4px;"><strong>Symbole:</strong> 🏆 Lesestärkster Monat &nbsp;&nbsp; 💸 Kaufstärkster Monat</span>
                </p>
                <div style="overflow-x: auto; width: 100%; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;" id="table-inventory-tbr">
                        <!-- Wird dynamisch befüllt -->
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Timeline Chart (TBR-Verlauf) -->
        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px;">
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-chart-line" style="color: var(--secondary-color);"></i>
                    <span>Lesestapel- & Leseaktivitätsverlauf</span>
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
                    Vergleicht den Zuwachs an Käufen (kumuliert) mit den gelesenen Comics (kumuliert). Die gefüllte Fläche zeigt die Größe deines Lesestapels (TBR) über die Zeit.
                </p>
                <div style="position: relative; height: 350px;">
                    <canvas id="chartTimeline"></canvas>
                </div>
            </div>
        </div>

        <!-- Format & Bestands-Verteilung -->
        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" id="distribution-charts-grid">
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-book" style="color: var(--primary-color);"></i>
                    <span>Format-Verteilung</span>
                </h3>
                <div style="position: relative; height: 280px;">
                    <canvas id="chartFormat"></canvas>
                </div>
            </div>
            
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-box-archive" style="color: var(--success);"></i>
                    <span>Bestands-Verteilung</span>
                </h3>
                <div style="position: relative; height: 280px;">
                    <canvas id="chartBestand"></canvas>
                </div>
            </div>
        </div>

        <!-- Ausgaben nach Bezugsquelle -->
        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px;">
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-wallet" style="color: var(--primary-color);"></i>
                    <span>Ausgaben nach Bezugsquelle</span>
                </h3>
                <div style="position: relative; height: 300px;">
                    <canvas id="chartQuellen"></canvas>
                </div>
            </div>
        </div>

        <!-- Top Verlage & Serien -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="stats-tables-grid">
            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-building" style="color: var(--secondary-color);"></i>
                    <span>Top 5 Verlage</span>
                </h3>
                <div style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;" id="table-top-publishers">
                        <!-- Wird dynamisch befüllt -->
                    </table>
                </div>
            </div>

            <div class="details-card" style="flex-direction: column; padding: 24px;">
                <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-tags" style="color: var(--primary-color);"></i>
                    <span>Top 5 Serien</span>
                </h3>
                <div style="overflow-x: auto; width: 100%;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;" id="table-top-series">
                        <!-- Wird dynamisch befüllt -->
                    </table>
                </div>
            </div>
        </div>
        <!-- Diagnostik Container -->
        <div id="stats-debug-container" style="margin-top: 24px; padding: 20px; background: rgba(245, 158, 11, 0.08); border: 1px dashed var(--warning); border-radius: var(--radius-lg); display: none;"></div>
    `;
    
    container.innerHTML = html;
    attachStatsEvents();
    updateStats();
}

function renderStatsMultiSelect(key, label, options) {
    const selected = activeStatsFilters[key] || [];
    const isActive = selected.length > 0;
    const displayText = isActive ? `${label} (${selected.length})` : label;
    
    return `
        <div class="multi-select-container" style="position: relative;">
            <button class="btn btn-secondary stats-filter-trigger ${isActive ? 'active-filter' : ''}" 
                    data-key="${key}" 
                    style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: ${isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)'}; border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; color: ${isActive ? 'var(--primary-color)' : 'inherit'}; min-width: 100px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>${displayText}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; opacity: 0.6;"></i>
            </button>
            <div class="multi-select-dropdown" id="dropdown-stats-${key}" style="display: none; position: absolute; top: 42px; left: 0; z-index: 1000; background: #1e293b; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); min-width: 240px; max-height: 400px; overflow-y: auto; padding: 8px;">
                ${options.length === 0 ? `
                    <div style="padding: 10px; color: var(--text-secondary); font-size: 0.85rem; text-align: center;">Keine Optionen verfügbar</div>
                ` : options.map(opt => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 6px; transition: background 0.2s; margin-bottom: 2px;" class="filter-option">
                        <input type="checkbox" class="stats-filter-checkbox" data-key="${key}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px;">
                        <span style="flex: 1; color: var(--text-main);">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

function renderTimeframeSelect(years) {
    const val = activeStatsFilters.zeitraum;
    const options = [
        { value: 'all', label: 'Gesamter Zeitraum' },
        { value: 'last6', label: 'Letzte 6 Monate' },
        { value: 'last12', label: 'Letzte 12 Monate' },
        { value: 'thisYear', label: 'Dieses Jahr' },
        { value: 'lastYear', label: 'Letztes Jahr' }
    ];
    years.forEach(y => {
        options.push({ value: `year-${y}`, label: `Jahr ${y}` });
    });
    
    return `
        <div class="timeframe-select-container">
            <select id="select-stats-timeframe" class="btn btn-secondary" style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: var(--bg-card); border: 1px solid var(--border-color); color: inherit; min-width: 140px; text-align: left; cursor: pointer; outline: none;">
                ${options.map(opt => `<option value="${opt.value}" ${val === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
        </div>
    `;
}

const handleGlobalStatsClick = () => {
    document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
};

function attachStatsEvents() {
    // Dropdowns toggeln
    document.querySelectorAll('.stats-filter-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const key = trigger.dataset.key;
            const dropdown = document.getElementById(`dropdown-stats-${key}`);
            const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
            if (!isVisible) dropdown.style.display = 'block';
            e.stopPropagation();
        });
    });

    // Klicks innerhalb des Dropdowns stoppen, damit es nicht einklappt
    document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    if (!statsEventsAttached) {
        document.addEventListener('click', handleGlobalStatsClick);
        statsEventsAttached = true;
    }

    // Checkboxen
    document.querySelectorAll('.stats-filter-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const key = cb.dataset.key;
            const value = cb.value;
            if (cb.checked) {
                if (!activeStatsFilters[key].includes(value)) activeStatsFilters[key].push(value);
            } else {
                activeStatsFilters[key] = activeStatsFilters[key].filter(v => v !== value);
            }
            // Button Text aktualisieren
            const trigger = document.querySelector(`.stats-filter-trigger[data-key="${key}"]`);
            if (trigger) {
                const labelMap = { verlag: 'Verlag', format: 'Format', bestand: 'Bestand', sprache: 'Sprache', typ: 'Typ', serie: 'Serie' };
                const count = activeStatsFilters[key].length;
                trigger.querySelector('span').textContent = count > 0 ? `${labelMap[key]} (${count})` : labelMap[key];
                
                const isActive = count > 0;
                trigger.style.background = isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)';
                trigger.style.borderColor = isActive ? 'var(--primary-color)' : 'var(--border-color)';
                trigger.style.color = isActive ? 'var(--primary-color)' : 'inherit';
            }
            updateStats();
        });
    });

    // Zeitraum ändern
    const timeframeSelect = document.getElementById('select-stats-timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', (e) => {
            activeStatsFilters.zeitraum = e.target.value;
            updateStats();
        });
    }

    // Lese-Jahresziel ändern
    const goalInput = document.getElementById('input-reading-goal');
    if (goalInput) {
        goalInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            e.target.value = val;
            
            const settings = db.getSettings();
            settings.readingGoal = val;
            db.saveSettings(settings);
            
            updateStatsChallengeOnly();
        });
    }

    // Reset Button
    const resetBtn = document.getElementById('btn-reset-stats-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            activeStatsFilters = { verlag: [], format: [], bestand: [], sprache: [], typ: [], serie: [], zeitraum: 'all' };
            const container = document.getElementById('view-container');
            renderStats(container);
        });
    }
}

export function cleanupStats() {
    document.removeEventListener('click', handleGlobalStatsClick);
    statsEventsAttached = false;
    
    // Charts zerstören zur Vermeidung von Speicherlecks
    Object.keys(statsCharts).forEach(key => {
        if (statsCharts[key]) {
            statsCharts[key].destroy();
        }
    });
    statsCharts = {};
}

// Hilfsfunktion zum alleinigen Aktualisieren der Lese-Challenge
async function updateStatsChallengeOnly() {
    const comics = await db.getAllComics();
    const settings = db.getSettings();
    const readingGoal = settings.readingGoal || 50;
    
    const { readThisYearCount, challengePercent } = calculateReadingChallenge(comics, readingGoal);

    const ratioSpan = document.getElementById('challenge-ratio');
    if (ratioSpan) ratioSpan.textContent = `${readThisYearCount} / ${readingGoal}`;
    
    const progressBar = document.getElementById('challenge-progress-bar');
    if (progressBar) progressBar.style.width = `${challengePercent}%`;
    
    const percentText = document.getElementById('challenge-percent-text');
    if (percentText) percentText.textContent = `${challengePercent}% abgeschlossen`;
}

async function updateStats() {
    const allComics = await db.getAllComics();
    
    // 1. Dropdown-Filter anwenden
    const filteredComics = filterComicsByDropdowns(allComics, activeStatsFilters);

    // 2. Zeitraum-Filter für KPIs, Averages und Verteilungs-Charts anwenden
    const kpiComics = filteredComics.filter(c => isComicInTimeframe(c, activeStatsFilters.zeitraum));

    // Berechnungen für KPIs
    const { totalComics, totalValue, readCount, readPercent, tbrCount, tbrValue } = calculateKPIs(kpiComics, activeStatsFilters.zeitraum);

    const currencySymbol = db.getSettings().currency || '€';

    // KPIs befüllen
    const summary = document.getElementById('stats-summary');
    if (summary) {
        summary.innerHTML = `
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 20px; border-left: 4px solid var(--primary-color);">
                <div style="font-size: 2rem; font-family: var(--font-display); font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">${totalComics}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-align: center;">Comics (gefiltert)</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 20px; border-left: 4px solid var(--success);">
                <div style="font-size: 2rem; font-family: var(--font-display); font-weight: 800; color: var(--success); margin-bottom: 4px;">${totalValue.toFixed(2)} ${currencySymbol}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-align: center;">Sammlungswert</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 20px; border-left: 4px solid var(--secondary-color);">
                <div style="font-size: 2rem; font-family: var(--font-display); font-weight: 800; color: var(--secondary-color); margin-bottom: 4px;">${readPercent}%</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-align: center;">Gelesen Quote</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 20px; border-left: 4px solid var(--warning);">
                <div style="font-size: 2rem; font-family: var(--font-display); font-weight: 800; color: var(--warning); margin-bottom: 4px;">${tbrCount}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-align: center;">Lesestapel (TBR)</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 20px; border-left: 4px solid var(--accent-color);">
                <div style="font-size: 2rem; font-family: var(--font-display); font-weight: 800; color: var(--accent-color); margin-bottom: 4px;">${tbrValue.toFixed(2)} ${currencySymbol}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 1px; text-align: center;">Ungelesener Wert</div>
            </div>
        `;
    }

    // 2b. Typ-spezifische KPIs befüllen
    const typeContainer = document.getElementById('stats-by-type-container');
    if (typeContainer) {
        const typeStats = calculateTypeStats(kpiComics, activeStatsFilters.zeitraum);
        if (typeStats.length === 0) {
            typeContainer.innerHTML = '';
            typeContainer.style.display = 'none';
        } else {
            typeContainer.style.display = 'block';
            typeContainer.innerHTML = `
                <div class="details-card" style="flex-direction: column; padding: 24px; overflow-x: auto; border: 1px solid var(--border-color); background: var(--bg-surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);">
                    <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; color: var(--text-primary);">
                        <i class="fa-solid fa-layer-group" style="color: var(--primary-color);"></i>
                        <span>Kennzahlen nach Typ</span>
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                <th style="padding: 12px 16px;">Typ</th>
                                <th style="padding: 12px 16px; text-align: center;">Anzahl</th>
                                <th style="padding: 12px 16px; text-align: right;">Sammlungswert</th>
                                <th style="padding: 12px 16px; text-align: center;">Gelesen Quote</th>
                                <th style="padding: 12px 16px; text-align: center;">Lesestapel (TBR)</th>
                                <th style="padding: 12px 16px; text-align: right;">Ungelesener Wert</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${typeStats.map(stat => `
                                <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" class="stats-type-row" data-type="${stat.type}">
                                    <td data-label="Typ" style="padding: 16px; font-weight: 700; color: var(--text-primary); font-family: var(--font-display); font-size: 0.95rem;">${stat.type}</td>
                                    <td data-label="Anzahl" style="padding: 16px; text-align: center; font-weight: 600; color: var(--primary-color);">${stat.total}</td>
                                    <td data-label="Sammlungswert" style="padding: 16px; text-align: right; font-weight: 600; color: var(--success);">${stat.value.toFixed(2)} ${currencySymbol}</td>
                                    <td data-label="Gelesen Quote" style="padding: 16px; text-align: center;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                            <span style="font-weight: 600; color: var(--secondary-color); min-width: 36px; text-align: right;">${stat.readPercent}%</span>
                                            <div style="width: 60px; height: 6px; background-color: var(--bg-main); border-radius: var(--radius-full); overflow: hidden; border: 1px solid var(--border-color); display: inline-block;">
                                                <div style="width: ${stat.readPercent}%; height: 100%; background-color: var(--secondary-color); border-radius: var(--radius-full);"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Lesestapel (TBR)" style="padding: 16px; text-align: center; font-weight: 600; color: var(--warning);">${stat.tbrCount}</td>
                                    <td data-label="Ungelesener Wert" style="padding: 16px; text-align: right; font-weight: 600; color: var(--accent-color);">${stat.tbrValue.toFixed(2)} ${currencySymbol}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    // Lese-Challenge updaten
    const settings = db.getSettings();
    const readingGoal = settings.readingGoal || 50;
    const { readThisYearCount, challengePercent } = calculateReadingChallenge(allComics, readingGoal);

    const ratioSpan = document.getElementById('challenge-ratio');
    if (ratioSpan) ratioSpan.textContent = `${readThisYearCount} / ${readingGoal}`;
    const progressBar = document.getElementById('challenge-progress-bar');
    if (progressBar) progressBar.style.width = `${challengePercent}%`;
    const percentText = document.getElementById('challenge-percent-text');
    if (percentText) percentText.textContent = `${challengePercent}% abgeschlossen`;
    const goalInput = document.getElementById('input-reading-goal');
    if (goalInput) goalInput.value = readingGoal;

    // Highlights befüllen
    const { avgPrice, speedText, topPurchaseMonth, topPurchaseVal, topReadMonth, topReadVal, maxPriceComic } = calculateHighlights(kpiComics, allComics, activeStatsFilters.zeitraum);
    const teuersterText = maxPriceComic ? `${maxPriceComic.titel} (${Number(maxPriceComic.preis).toFixed(2)} ${currencySymbol})` : '-';

    const highlightsEl = document.getElementById('stats-highlights');
    if (highlightsEl) {
        highlightsEl.innerHTML = `
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Ø Preis pro Comic</span>
                <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${avgPrice} ${currencySymbol}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Leseaktivität</span>
                <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${speedText}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Aktivster Kaufmonat</span>
                <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${topPurchaseMonth} ${topPurchaseVal > 0 ? `(${topPurchaseVal} Käufe)` : ''}</span>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Aktivster Lesemonat</span>
                <span style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${topReadMonth} ${topReadVal > 0 ? `(${topReadVal} gelesen)` : ''}</span>
            </div>
            <div style="display: flex; flex-direction: column; grid-column: 1 / -1; border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Teuerster Comic</span>
                <span style="font-size: 0.95rem; font-weight: 700; color: var(--accent-color); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${teuersterText}">${teuersterText}</span>
            </div>
        `;
    }

    // 3. Timeline-Daten (TBR-Verlauf) vorbereiten
    const displayTimeline = calculateTimelineData(filteredComics, activeStatsFilters.zeitraum);

    // 4. Verteilungsdaten für Diagramme sammeln (aus kpiComics)
    const { formatData, bestandData, quellenSpend } = calculateDistributionData(kpiComics);

    // Top Listen berechnen
    const { topPublishers, topSeries } = calculateTopLists(kpiComics);

    // Tabellen rendern
    const publishersTable = document.getElementById('table-top-publishers');
    if (publishersTable) {
        if (topPublishers.length === 0) {
            publishersTable.innerHTML = `<tr><td style="padding:15px; text-align:center; color:var(--text-secondary);">Keine Verlagsdaten vorhanden.</td></tr>`;
        } else {
            publishersTable.innerHTML = `
                <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem;">
                        <th style="padding: 10px 8px;">Verlag</th>
                        <th style="padding: 10px 8px; text-align: center;">Comics</th>
                        <th style="padding: 10px 8px; text-align: center;">Gelesen</th>
                        <th style="padding: 10px 8px; text-align: right;">Ø Bewertung</th>
                    </tr>
                </thead>
                <tbody>
                    ${topPublishers.map(p => {
                        const avgRate = p.ratedCount > 0 ? (p.ratingSum / p.ratedCount) : 0;
                        return `
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s;">
                                <td data-label="Verlag" style="padding: 10px 8px; font-weight: 600; color: var(--text-primary);">${p.name}</td>
                                <td data-label="Comics" style="padding: 10px 8px; text-align: center; font-weight: 600;">${p.total}</td>
                                <td data-label="Gelesen" style="padding: 10px 8px; text-align: center; color: var(--text-secondary);">${p.read}</td>
                                <td data-label="Ø Bewertung" style="padding: 10px 8px; text-align: right;">${avgRate > 0 ? renderStars(avgRate) : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            `;
        }
    }

    const seriesTable = document.getElementById('table-top-series');
    if (seriesTable) {
        if (topSeries.length === 0) {
            seriesTable.innerHTML = `<tr><td style="padding:15px; text-align:center; color:var(--text-secondary);">Keine Seriendaten vorhanden.</td></tr>`;
        } else {
            seriesTable.innerHTML = `
                <thead>
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem;">
                        <th style="padding: 10px 8px;">Serie</th>
                        <th style="padding: 10px 8px; text-align: center;">Comics</th>
                        <th style="padding: 10px 8px; text-align: center;">Gelesen</th>
                        <th style="padding: 10px 8px; text-align: right;">Ø Bewertung</th>
                    </tr>
                </thead>
                <tbody>
                    ${topSeries.map(s => {
                        const avgRate = s.ratedCount > 0 ? (s.ratingSum / s.ratedCount) : 0;
                        return `
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s;">
                                <td data-label="Serie" style="padding: 10px 8px; font-weight: 600; color: var(--text-primary);">${s.name}</td>
                                <td data-label="Comics" style="padding: 10px 8px; text-align: center; font-weight: 600;">${s.total}</td>
                                <td data-label="Gelesen" style="padding: 10px 8px; text-align: center; color: var(--text-secondary);">${s.read}</td>
                                <td data-label="Ø Bewertung" style="padding: 10px 8px; text-align: right;">${avgRate > 0 ? renderStars(avgRate) : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            `;
        }
    }

    // TBR Table füllen (aus allComics, unbeeinflusst von Filtern)
    const inventoryTbrTable = document.getElementById('table-inventory-tbr');
    if (inventoryTbrTable) {
        const tbrData = calculateInventoryTBRDevelopment(allComics);
        if (tbrData.length === 0) {
            inventoryTbrTable.innerHTML = `<tr><td style="padding:15px; text-align:center; color:var(--text-secondary);">Keine Daten vorhanden.</td></tr>`;
        } else {
            const yearlyData = groupTBRDataByYear(tbrData);
            const currentYear = new Date().getFullYear();
            const monNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
            
            inventoryTbrTable.innerHTML = `
                <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem;">
                        <th style="padding: 10px 16px;">Monat / Jahr</th>
                        <th style="padding: 10px 16px; text-align: center;">Gekauft</th>
                        <th style="padding: 10px 16px; text-align: center;">Ausgaben</th>
                        <th style="padding: 10px 16px; text-align: center;">Gelesen</th>
                        <th style="padding: 10px 16px; text-align: center;">Lesestapel (TBR)</th>
                        <th style="padding: 10px 16px; text-align: center;">Trend</th>
                    </tr>
                </thead>
                <tbody>
                    ${yearlyData.map(y => {
                        const isCurrentYear = y.year === currentYear;
                        
                        // Jahres-Zeile
                        let yearTrendHtml = '';
                        if (y.trend > 0) yearTrendHtml = `<span style="color: var(--danger);"><i class="fa-solid fa-arrow-up"></i> +${y.trend}</span>`;
                        else if (y.trend < 0) yearTrendHtml = `<span style="color: var(--success);"><i class="fa-solid fa-arrow-down"></i> ${y.trend}</span>`;
                        else yearTrendHtml = `<span style="color: var(--text-secondary);"><i class="fa-solid fa-minus"></i> 0</span>`;

                        let html = `
                            <tr class="tbr-year-row" data-year="${y.year}" style="cursor: pointer; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border-color); font-weight: 700;">
                                <td style="padding: 12px 16px; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-chevron-${isCurrentYear ? 'down' : 'right'} tbr-icon-year-${y.year}" style="width: 12px; font-size: 0.8rem; color: var(--primary-color);"></i>
                                    ${y.year}
                                </td>
                                <td style="padding: 12px 16px; text-align: center; color: var(--text-primary);">${y.totalPurchased}</td>
                                <td style="padding: 12px 16px; text-align: center; color: var(--text-primary);">${y.totalSpent.toFixed(2)} ${currencySymbol}</td>
                                <td style="padding: 12px 16px; text-align: center; color: var(--text-primary);">${y.totalRead}</td>
                                <td style="padding: 12px 16px; text-align: center; color: var(--warning);">${y.endTBR}</td>
                                <td style="padding: 12px 16px; text-align: center;">${yearTrendHtml}</td>
                            </tr>
                        `;
                        
                        // Monats-Zeilen
                        html += y.months.map(d => {
                            const monthLabel = monNames[d.date.getMonth()];
                            
                            let trendHtml = '';
                            let trendPercentStr = (d.trendPercent !== undefined && d.trend !== 0) ? ` (${d.trendPercent > 0 ? '+' : ''}${d.trendPercent.toFixed(1)}%)` : '';
                            if (d.trend > 0) {
                                trendHtml = `<span style="color: var(--danger);" title="Lesestapel wächst"><i class="fa-solid fa-arrow-up"></i> +${d.trend}${trendPercentStr}</span>`;
                            } else if (d.trend < 0) {
                                trendHtml = `<span style="color: var(--success);" title="Lesestapel schrumpft"><i class="fa-solid fa-arrow-down"></i> ${d.trend}${trendPercentStr}</span>`;
                            } else {
                                trendHtml = `<span style="color: var(--text-secondary);" title="Keine Veränderung"><i class="fa-solid fa-minus"></i> 0 (0.0%)</span>`;
                            }
                            
                            // Sparklines & Icons
                            const maxSpark = Math.max(d.purchasedThisMonth, d.readThisMonth);
                            const pWidth = maxSpark > 0 ? (d.purchasedThisMonth/maxSpark)*100 : 0;
                            const rWidth = maxSpark > 0 ? (d.readThisMonth/maxSpark)*100 : 0;
                            
                            const pIcon = d.isMaxPurchased ? ' <span title="Kaufstärkster Monat">💸</span>' : '';
                            const rIcon = d.isMaxRead ? ' <span title="Lesestärkster Monat">🏆</span>' : '';

                            return `
                                <tr class="tbr-month-row tbr-year-${y.year}" style="display: ${isCurrentYear ? 'table-row' : 'none'}; border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: background 0.2s; font-size: 0.85rem;">
                                    <td style="padding: 8px 16px; padding-left: 32px; color: var(--text-secondary);">${monthLabel}</td>
                                    <td style="padding: 8px 16px; text-align: center; color: var(--text-secondary);">
                                        <div>${d.purchasedThisMonth}${pIcon}</div>
                                        <div style="width: 40px; height: 3px; background: rgba(255,255,255,0.05); margin: 4px auto 0; border-radius: 2px;"><div style="width: ${pWidth}%; height: 100%; background: var(--danger); border-radius: 2px;"></div></div>
                                    </td>
                                    <td style="padding: 8px 16px; text-align: center; color: var(--text-secondary);">${d.spentThisMonth.toFixed(2)} ${currencySymbol}</td>
                                    <td style="padding: 8px 16px; text-align: center; color: var(--text-secondary);">
                                        <div>${d.readThisMonth}${rIcon}</div>
                                        <div style="width: 40px; height: 3px; background: rgba(255,255,255,0.05); margin: 4px auto 0; border-radius: 2px;"><div style="width: ${rWidth}%; height: 100%; background: var(--success); border-radius: 2px;"></div></div>
                                    </td>
                                    <td style="padding: 8px 16px; text-align: center; font-weight: 600; color: var(--warning);">${d.tbrAtEnd}</td>
                                    <td style="padding: 8px 16px; text-align: center;">${trendHtml}</td>
                                </tr>
                            `;
                        }).join('');
                        
                        return html;
                    }).join('')}
                </tbody>
            `;
            
            // Accordion Logic
            const yearRows = inventoryTbrTable.querySelectorAll('.tbr-year-row');
            yearRows.forEach(row => {
                row.addEventListener('click', () => {
                    const year = row.dataset.year;
                    const monthRows = inventoryTbrTable.querySelectorAll(`.tbr-year-${year}`);
                    const icon = inventoryTbrTable.querySelector(`.tbr-icon-year-${year}`);
                    
                    let isVisible = false;
                    monthRows.forEach(mr => {
                        if (mr.style.display !== 'none') isVisible = true;
                    });
                    
                    if (isVisible) {
                        monthRows.forEach(mr => mr.style.display = 'none');
                        icon.classList.remove('fa-chevron-down');
                        icon.classList.add('fa-chevron-right');
                    } else {
                        monthRows.forEach(mr => mr.style.display = 'table-row');
                        icon.classList.remove('fa-chevron-right');
                        icon.classList.add('fa-chevron-down');
                    }
                });
            });
        }
    }

    // 5. Diagramme zeichnen / aktualisieren
    
    // Timeline Chart: Lesestapel & Aktivität
    const timelineLabels = displayTimeline.map(d => {
        const monNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        return `${monNames[d.date.getMonth()]} ${String(d.date.getFullYear()).slice(-2)}`;
    });
    
    initTimelineChart(
        'chartTimeline', 
        timelineLabels, 
        displayTimeline.map(d => d.purchased),
        displayTimeline.map(d => d.read),
        displayTimeline.map(d => d.tbr)
    );

    // Format Verteilung
    initDoughnutChart('chartFormat', Object.keys(formatData), Object.values(formatData), 'Format');

    // Bestands Verteilung
    initDoughnutChart('chartBestand', Object.keys(bestandData), Object.values(bestandData), 'Bestand');

    // Bezugsquellen Spendings
    const sortedQuellen = Object.entries(quellenSpend).sort((a, b) => b[1] - a[1]);
    initHorizontalBarChart('chartQuellen', sortedQuellen.map(e => e[0]), sortedQuellen.map(e => e[1]), `Ausgaben in ${currencySymbol}`);

    // Diagnose-Container befüllen falls ungewöhnlich frühe Daten vorliegen
    const debugContainer = document.getElementById('stats-debug-container');
    if (debugContainer) {
        const earlyComics = getEarlyComics(filteredComics);
        
        if (earlyComics.length > 0) {
            debugContainer.style.display = 'block';
            debugContainer.innerHTML = `
                <div style="font-weight: 600; color: var(--warning); margin-bottom: 8px; font-family: var(--font-display);">
                    <i class="fa-solid fa-triangle-exclamation"></i> Diagnose: Ungewöhnlich frühe Kaufdaten gefunden (vor 2020)
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">
                    Diese Einträge verschieben den Startpunkt deines zeitlichen Diagramms weit nach hinten. 
                    Wenn dies Eingabefehler sind (z. B. "04.12" vom Browser als April 2012 anstatt 4. Dezember interpretiert), passe das Datum im Comic an:
                    <ul style="margin-top: 8px; padding-left: 20px; color: var(--text-primary);">
                        ${earlyComics.map(c => `<li><strong>${c.titel}</strong>: Eingetragenes Kaufdatum: <code>"${c.kaufdatum}"</code> (interpretiert als ${parseToDate(c.kaufdatum).toLocaleDateString('de-DE')})</li>`).join('')}
                    </ul>
                </div>
            `;
        } else {
            debugContainer.style.display = 'none';
        }
    }
}

// Chart.js Diagramm Initialisierungshelfer

function initTimelineChart(id, labels, purchasedData, readData, tbrData) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    statsCharts[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Lesestapel (TBR)',
                    data: tbrData,
                    borderColor: 'rgba(139, 92, 246, 1)', // Violet
                    backgroundColor: 'rgba(139, 92, 246, 0.1)', // Light violet fill
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5
                },
                {
                    label: 'Käufe (kumuliert)',
                    data: purchasedData,
                    borderColor: 'rgba(6, 182, 212, 1)', // Cyan
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Gelesen (kumuliert)',
                    data: readData,
                    borderColor: 'rgba(16, 185, 129, 1)', // Emerald/Green
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }
                },
                tooltip: {
                    padding: 12,
                    cornerRadius: 8,
                    bodySpacing: 4
                }
            },
            scales: {
                y: { 
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                x: { 
                    ticks: { color: '#94a3b8', font: { size: 10, family: 'Inter' } }, 
                    grid: { display: false } 
                }
            }
        }
    });
}

function initDoughnutChart(id, labels, data, title) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    const colors = [
        'rgba(6, 182, 212, 0.75)',  // Primary
        'rgba(139, 92, 246, 0.75)', // Purple/Violet
        'rgba(16, 185, 129, 0.75)', // Success
        'rgba(244, 63, 94, 0.75)',  // Accent/Rose
        'rgba(245, 158, 11, 0.75)', // Warning
        'rgba(100, 116, 139, 0.75)', // Slate
        'rgba(236, 72, 153, 0.75)'  // Pink
    ];

    statsCharts[id] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anzahl',
                data: data,
                backgroundColor: colors,
                borderColor: 'rgba(30, 41, 59, 0.5)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: '#94a3b8', 
                        font: { size: 11, family: 'Inter' },
                        boxWidth: 12
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function initHorizontalBarChart(id, labels, data, label) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    statsCharts[id] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: 'rgba(6, 182, 212, 0.7)',
                hoverBackgroundColor: 'rgba(6, 182, 212, 0.9)',
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: { 
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                },
                y: { 
                    ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }, 
                    grid: { display: false } 
                }
            }
        }
    });
}
