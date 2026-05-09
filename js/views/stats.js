import { db } from '../db.js';

let activeStatsFilters = {
    verlag: [],
    format: [],
    bestand: [],
    gelesen: [],
    bezugsquelle: [],
    serie: []
};

let statsCharts = {};

export async function renderStats(container) {
    const comics = await db.getAllComics();
    
    // Filter-Optionen sammeln
    const verlage = [...new Set(comics.map(c => c.verlag).filter(Boolean))].sort();
    const formate = [...new Set(comics.map(c => c.format).filter(Boolean))].sort();
    const bestände = [...new Set(comics.map(c => c.bestand).filter(Boolean))].sort();
    const quellen = [...new Set(comics.map(c => c.bezugsquelle).filter(Boolean))].sort();
    const serien = [...new Set(comics.map(c => c.serie).filter(Boolean))].sort();
    const gelesenStatus = ['Ja', 'Nein'];

    const html = `
        <div class="view-controls" style="flex-wrap: wrap; gap: 15px; margin-bottom: 25px; padding-top: 32px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; flex: 1;">
                <h2 class="view-title" style="margin-bottom: 0; white-space: nowrap;">Statistiken</h2>
                
                <div class="direct-filters" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    ${renderStatsMultiSelect('verlag', 'Verlag', verlage)}
                    ${renderStatsMultiSelect('serie', 'Serie', serien)}
                    ${renderStatsMultiSelect('format', 'Format', formate)}
                    ${renderStatsMultiSelect('bestand', 'Bestand', bestände)}
                    ${renderStatsMultiSelect('bezugsquelle', 'Quelle', quellen)}
                    ${renderStatsMultiSelect('gelesen', 'Gelesen', gelesenStatus)}
                    
                    <button id="btn-reset-stats-filters" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Alle Filter zurücksetzen">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="stats-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px;">
            <!-- Wird von updateStats() befüllt -->
        </div>

        <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="details-card" style="flex-direction: column;">
                <h3 style="margin-bottom: 20px;"><i class="fa-solid fa-box-archive"></i> Bestands-Verteilung</h3>
                <div style="position: relative; height: 300px;"><canvas id="chartBestand"></canvas></div>
            </div>
            <div class="details-card" style="flex-direction: column;">
                <h3 style="margin-bottom: 20px;"><i class="fa-solid fa-hand-holding-dollar"></i> Abgänge (Verkauft/Abgegeben)</h3>
                <div style="position: relative; height: 300px;"><canvas id="chartAbgaenge"></canvas></div>
            </div>
            <div class="details-card" style="flex-direction: column; grid-column: 1 / -1;">
                <h3 style="margin-bottom: 20px;"><i class="fa-solid fa-wallet"></i> Ausgaben nach Bezugsquelle (€)</h3>
                <div style="position: relative; height: 350px;"><canvas id="chartQuellen"></canvas></div>
            </div>
        </div>
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
                ${options.map(opt => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 6px; transition: background 0.2s; margin-bottom: 2px;" class="filter-option">
                        <input type="checkbox" class="stats-filter-checkbox" data-key="${key}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px;">
                        <span style="flex: 1; color: var(--text-main);">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

function attachStatsEvents() {
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

    document.addEventListener('click', () => {
        document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
    });

    document.querySelectorAll('.stats-filter-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const key = cb.dataset.key;
            const value = cb.value;
            if (cb.checked) {
                if (!activeStatsFilters[key].includes(value)) activeStatsFilters[key].push(value);
            } else {
                activeStatsFilters[key] = activeStatsFilters[key].filter(v => v !== value);
            }
            updateStats();
        });
    });

    const resetBtn = document.getElementById('btn-reset-stats-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            activeStatsFilters = { verlag: [], format: [], bestand: [], gelesen: [], bezugsquelle: [], serie: [] };
            const container = document.getElementById('view-container');
            renderStats(container);
        });
    }
}

async function updateStats() {
    let comics = await db.getAllComics();

    // Filter anwenden
    if (activeStatsFilters.verlag.length > 0) comics = comics.filter(c => activeStatsFilters.verlag.includes(c.verlag));
    if (activeStatsFilters.format.length > 0) comics = comics.filter(c => activeStatsFilters.format.includes(c.format));
    if (activeStatsFilters.bestand.length > 0) comics = comics.filter(c => activeStatsFilters.bestand.includes(c.bestand));
    if (activeStatsFilters.bezugsquelle.length > 0) comics = comics.filter(c => activeStatsFilters.bezugsquelle.includes(c.bezugsquelle));
    if (activeStatsFilters.serie.length > 0) comics = comics.filter(c => activeStatsFilters.serie.includes(c.serie));
    if (activeStatsFilters.gelesen.length > 0) {
        comics = comics.filter(c => {
            const status = c.gelesen_am ? 'Ja' : 'Nein';
            return activeStatsFilters.gelesen.includes(status);
        });
    }

    // Berechnungen
    const totalComics = comics.length;
    // Gesamtwert nur für vorhanden/vorbestellt
    const valueComics = comics.filter(c => ['vorhanden', 'vorbestellt'].includes(String(c.bestand).toLowerCase()));
    const totalValue = valueComics.reduce((sum, c) => sum + (c.preis || 0), 0);
    const readComics = comics.filter(c => c.gelesen_am).length;
    const readPercent = totalComics > 0 ? Math.round((readComics / totalComics) * 100) : 0;

    // Summary befüllen
    const summary = document.getElementById('stats-summary');
    if (summary) {
        summary.innerHTML = `
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 24px 20px; border-left: 4px solid var(--primary-color);">
                <div style="font-size: 2.2rem; font-family: var(--font-display); font-weight: 800; color: var(--text-primary)">${totalComics}</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; font-weight: 600; letter-spacing: 1px;">Comics (gefiltert)</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 24px 20px; border-left: 4px solid var(--success);">
                <div style="font-size: 2.2rem; font-family: var(--font-display); font-weight: 800; color: var(--success)">${totalValue.toFixed(2)} €</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; font-weight: 600; letter-spacing: 1px;">Wert (Bestand)</div>
            </div>
            <div class="details-card" style="flex-direction: column; align-items: center; justify-content: center; padding: 24px 20px; border-left: 4px solid var(--secondary-color);">
                <div style="font-size: 2.2rem; font-family: var(--font-display); font-weight: 800; color: var(--secondary-color)">${readPercent}%</div>
                <div style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; font-weight: 600; letter-spacing: 1px;">Gelesen</div>
            </div>
        `;
    }

    // Daten für Charts vorbereiten
    const bestandData = {};
    const abgaengeData = { 'Verkauft': 0, 'Abgegeben': 0, 'Verliehen': 0 };
    const quellenSpend = {};

    comics.forEach(c => {
        const b = c.bestand || 'Unbekannt';
        bestandData[b] = (bestandData[b] || 0) + 1;

        if (['verkauft', 'abgegeben', 'verliehen'].includes(b.toLowerCase())) {
            const key = b.charAt(0).toUpperCase() + b.slice(1);
            abgaengeData[key] = (abgaengeData[key] || 0) + 1;
        }

        if (c.bezugsquelle && c.preis) {
            quellenSpend[c.bezugsquelle] = (quellenSpend[c.bezugsquelle] || 0) + c.preis;
        }
    });

    // Charts zeichnen
    initChart('chartBestand', 'doughnut', Object.keys(bestandData), Object.values(bestandData), 'Anzahl');
    initChart('chartAbgaenge', 'pie', Object.keys(abgaengeData), Object.values(abgaengeData), 'Anzahl');
    
    const sortedQuellen = Object.entries(quellenSpend).sort((a, b) => b[1] - a[1]);
    initChart('chartQuellen', 'bar', sortedQuellen.map(e => e[0]), sortedQuellen.map(e => e[1]), 'Ausgaben in €', true);
}

function initChart(id, type, labels, data, label, isHorizontal = false) {
    const ctx = document.getElementById(id);
    if (!ctx) return;

    if (statsCharts[id]) statsCharts[id].destroy();

    const colors = [
        'rgba(6, 182, 212, 0.7)',  // Primary
        'rgba(139, 92, 246, 0.7)', // Purple
        'rgba(16, 185, 129, 0.7)', // Success
        'rgba(245, 158, 11, 0.7)', // Warning
        'rgba(239, 68, 68, 0.7)',  // Danger
        'rgba(100, 116, 139, 0.7)', // Slate
        'rgba(236, 72, 153, 0.7)', // Pink
    ];

    statsCharts[id] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: colors,
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: isHorizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 11 } }
                }
            },
            scales: type === 'bar' ? {
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            } : {}
        }
    });
}
