import { db } from '../db.js';
import { openModal } from './form.js';

let currentViewType = 'list'; 
let searchTerm = '';
let sortBy = 'titel'; 
let sortOrder = 'asc'; 
let activeFilters = {
    verlag: [],
    format: [],
    bestand: []
};

export async function renderCollection(container) {
    const comics = await db.getAllComics();
    const verlage = [...new Set(comics.map(c => c.verlag).filter(Boolean))].sort();
    const formate = [...new Set(comics.map(c => c.format).filter(Boolean))].sort();
    const bestände = [...new Set(comics.map(c => c.bestand).filter(Boolean))].sort();

    const html = `
        <div class="view-controls" style="flex-wrap: wrap; gap: 15px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; flex: 1;">
                <h2 class="view-title" style="margin-bottom: 0; white-space: nowrap;">Sammlung</h2>
                
                <!-- Direkt sichtbare Multi-Filter -->
                <div class="direct-filters" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    ${renderMultiSelect('verlag', 'Verlag', verlage)}
                    ${renderMultiSelect('format', 'Format', formate)}
                    ${renderMultiSelect('bestand', 'Bestand', bestände)}
                    
                    <button id="btn-reset-filters-direct" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Alle Filter zurücksetzen">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
            </div>

            <div class="view-toggles">
                <button class="view-toggle-btn ${currentViewType === 'list' ? 'active' : ''}" data-type="list" title="Listenansicht">
                    <i class="fa-solid fa-list"></i>
                </button>
                <button class="view-toggle-btn ${currentViewType === 'tiles' ? 'active' : ''}" data-type="tiles" title="Kachelansicht">
                    <i class="fa-solid fa-border-all"></i>
                </button>
                <button class="view-toggle-btn ${currentViewType === 'details' ? 'active' : ''}" data-type="details" title="Detailansicht">
                    <i class="fa-solid fa-table-cells-large"></i>
                </button>
            </div>
        </div>
        
        <div id="collection-grid">
            <!-- Items injected here -->
        </div>
    `;
    container.innerHTML = html;
    updateGrid();
}

function renderMultiSelect(key, label, options) {
    const selected = activeFilters[key] || [];
    const isActive = selected.length > 0;
    const displayText = isActive ? `${label} (${selected.length})` : label;
    
    return `
        <div class="multi-select-container" style="position: relative;">
            <button class="btn btn-secondary multi-select-trigger ${isActive ? 'active-filter' : ''}" 
                    data-key="${key}" 
                    style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: ${isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)'}; border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; color: ${isActive ? 'var(--primary-color)' : 'inherit'}; min-width: 100px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>${displayText}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; opacity: 0.6;"></i>
            </button>
            <div class="multi-select-dropdown" id="dropdown-${key}" style="display: none; position: absolute; top: 42px; left: 0; z-index: 1000; background: #1e293b; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); min-width: 240px; max-height: 400px; overflow-y: auto; padding: 8px;">
                <style>
                    .filter-option:hover { background: rgba(255,255,255,0.05); }
                    .filter-checkbox:checked + span { color: var(--primary-color); font-weight: bold; }
                </style>
                ${options.map(opt => `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; font-size: 0.85rem; border-radius: 6px; transition: background 0.2s; margin-bottom: 2px;" class="filter-option">
                        <input type="checkbox" class="filter-checkbox" data-key="${key}" value="${opt}" ${selected.includes(opt) ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px;">
                        <span style="flex: 1; color: var(--text-main);">${opt}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;
}

export function attachCollectionEvents() {
    // Dropdown Toggles
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.multi-select-trigger');
        if (trigger) {
            const key = trigger.dataset.key;
            const dropdown = document.getElementById(`dropdown-${key}`);
            const isVisible = dropdown.style.display === 'block';
            
            // Andere schließen
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
            
            if (!isVisible) dropdown.style.display = 'block';
            e.stopPropagation();
        } else if (!e.target.closest('.multi-select-dropdown')) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
        }
    });

    // Checkbox Events
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('filter-checkbox')) {
            const key = e.target.dataset.key;
            const value = e.target.value;
            if (e.target.checked) {
                if (!activeFilters[key].includes(value)) activeFilters[key].push(value);
            } else {
                activeFilters[key] = activeFilters[key].filter(v => v !== value);
            }
            
            // Button-Text und Stil aktualisieren
            const trigger = document.querySelector(`.multi-select-trigger[data-key="${key}"]`);
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            const selectedCount = activeFilters[key].length;
            const isActive = selectedCount > 0;

            trigger.querySelector('span').textContent = isActive ? `${label} (${selectedCount})` : label;
            trigger.style.background = isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)';
            trigger.style.borderColor = isActive ? 'var(--primary-color)' : 'var(--border-color)';
            trigger.style.color = isActive ? 'var(--primary-color)' : 'inherit';

            updateGrid();
        }
    });

    // Reset Button
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-reset-filters-direct')) {
            activeFilters = { verlag: [], format: [], bestand: [] };
            const container = document.getElementById('view-container');
            renderCollection(container);
        }
    });

    // Sortierung über Header
    document.addEventListener('click', (e) => {
        const header = e.target.closest('.sortable-header');
        if (header) {
            const newSortBy = header.dataset.sort;
            if (sortBy === newSortBy) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = newSortBy;
                sortOrder = 'asc';
            }
            updateGrid();
        }
    });

    // Ansichtsumschaltung
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-toggle-btn');
        if (btn) {
            document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentViewType = btn.dataset.type;
            updateGrid();
        }
    });

    // Globale Suche
    document.addEventListener('global-search', (e) => {
        searchTerm = e.detail.query.toLowerCase();
        updateGrid();
    });
}

async function updateGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;

    let comics = await db.getAllComics();
    
    // 1. Suche
    if (searchTerm) {
        comics = comics.filter(c => {
            return [c.titel, c.serie, c.verlag, c.bemerkung].some(val => 
                String(val || '').toLowerCase().includes(searchTerm)
            );
        });
    }

    // 2. Mehrfach-Filter
    if (activeFilters.verlag.length > 0) {
        comics = comics.filter(c => activeFilters.verlag.includes(c.verlag));
    }
    if (activeFilters.format.length > 0) {
        comics = comics.filter(c => activeFilters.format.includes(c.format));
    }
    if (activeFilters.bestand.length > 0) {
        comics = comics.filter(c => activeFilters.bestand.includes(c.bestand));
    }

    // 3. Sortierung
    comics.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (sortBy === 'titel') {
            const sA = (a.serie || a.titel || '').toLowerCase();
            const sB = (b.serie || b.titel || '').toLowerCase();
            if (sA !== sB) return sortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
            return sortOrder === 'asc' ? (a.nummer || 0) - (b.nummer || 0) : (b.nummer || 0) - (a.nummer || 0);
        }

        if (['preis', 'bewertung', 'jahr', 'nummer'].includes(sortBy)) {
            valA = valA || 0;
            valB = valB || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    grid.className = ''; 
    
    if (comics.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 60px; font-style: italic;">Keine Comics mit diesen Filtern gefunden.</p>';
        return;
    }

    if (currentViewType === 'tiles') {
        grid.classList.add('cards-grid');
        grid.innerHTML = comics.map(comic => renderTile(comic)).join('');
    } else if (currentViewType === 'list') {
        grid.classList.add('list-view');
        
        const getIcon = (key) => {
            if (sortBy !== key) return '<i class="fa-solid fa-sort" style="opacity: 0.2; margin-left: 5px;"></i>';
            return sortOrder === 'asc' ? '<i class="fa-solid fa-caret-up" style="margin-left: 5px; color: var(--primary-color);"></i>' : '<i class="fa-solid fa-caret-down" style="margin-left: 5px; color: var(--primary-color);"></i>';
        };

        grid.innerHTML = `
            <div class="list-header" style="display: grid; grid-template-columns: 2fr 50px 1fr 60px 90px 1fr 90px 80px 90px; padding: 12px 20px; font-weight: bold; border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-main); position: sticky; top: 0; z-index: 10;">
                <div class="sortable-header" data-sort="titel" style="cursor:pointer;">TITEL / SERIE ${getIcon('titel')}</div>
                <div class="sortable-header" data-sort="nummer" style="cursor:pointer;">NR. ${getIcon('nummer')}</div>
                <div class="sortable-header" data-sort="verlag" style="cursor:pointer;">VERLAG ${getIcon('verlag')}</div>
                <div class="sortable-header" data-sort="jahr" style="cursor:pointer;">JAHR ${getIcon('jahr')}</div>
                <div class="sortable-header" data-sort="bestand" style="cursor:pointer;">BESTAND ${getIcon('bestand')}</div>
                <div class="sortable-header" data-sort="bezugsquelle" style="cursor:pointer;">QUELLE ${getIcon('bezugsquelle')}</div>
                <div class="sortable-header" data-sort="kaufdatum" style="cursor:pointer;">GEKAUFT ${getIcon('kaufdatum')}</div>
                <div class="sortable-header" data-sort="preis" style="cursor:pointer; text-align: right;">PREIS ${getIcon('preis')}</div>
                <div class="sortable-header" data-sort="gelesen_am" style="cursor:pointer; text-align: right;">GELESEN ${getIcon('gelesen_am')}</div>
            </div>
            <div class="list-items-container">
                ${comics.map(comic => renderListItem(comic)).join('')}
            </div>
        `;
    } else if (currentViewType === 'details') {
        grid.classList.add('details-grid-view');
        grid.innerHTML = comics.map(comic => renderDetailsItem(comic)).join('');
    }

    // Edit Events
    grid.querySelectorAll('.comic-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-delete-item')) return;
            const id = item.dataset.id;
            const comic = (await db.getAllComics()).find(c => c.id === id);
            if (comic) openModal(comic);
        });
    });

    // Delete Events
    grid.querySelectorAll('.btn-delete-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Comic wirklich löschen?')) {
                await db.deleteComic(btn.dataset.id);
                updateGrid();
            }
        });
    });
}

function getPlaceholderImage() {
    return `https://placehold.co/400x600/1e293b/06b6d4?text=POW!&font=impact`;
}

function displayDate(dateStr) {
    if (!dateStr) return '-';
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}.${match[2]}.${match[1]}`;
    if (String(dateStr).length > 15) {
        const d = new Date(dateStr);
        if (!isNaN(d)) return d.toLocaleDateString('de-DE');
    }
    return dateStr;
}

function renderTile(comic) {
    const imgUrl = comic.bild || getPlaceholderImage();
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    return `
        <div class="comic-card comic-item" data-id="${comic.id}">
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen">
                <i class="fa-solid fa-trash"></i>
            </button>
            <img src="${imgUrl}" alt="${comic.titel}" class="comic-cover" onerror="this.src='${getPlaceholderImage()}'">
            <div class="comic-info">
                <span class="comic-series">${comic.serie || comic.verlag} ${comic.nummer ? '#' + comic.nummer : ''}</span>
                <h3 class="comic-title">${comic.titel || 'Ohne Titel'}</h3>
                <div class="comic-meta">
                    <span><i class="fa-solid fa-star" style="color: var(--warning)"></i> ${comic.bewertung ? comic.bewertung / 2 : 0}/5</span>
                    <span class="badge ${bestandClass}">${comic.bestand}</span>
                </div>
            </div>
        </div>
    `;
}

function renderListItem(comic) {
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    return `
        <div class="list-item comic-item" data-id="${comic.id}" style="display: grid; grid-template-columns: 2fr 50px 1fr 60px 90px 1fr 90px 80px 90px; padding: 10px 20px; align-items: center; border-bottom: 1px solid var(--border-color); cursor: pointer; font-size: 0.82rem;">
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px;">
                <h3 class="comic-title" style="margin:0; font-size:0.88rem; display: inline;">${comic.titel || 'Ohne Titel'}</h3>
                <div class="comic-series" style="font-size:0.68rem; color: var(--text-secondary);">${comic.serie || ''}</div>
            </div>
            <div style="font-weight: bold;">${comic.nummer !== null ? '#' + comic.nummer : '-'}</div>
            <div style="color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${comic.verlag || '-'}</div>
            <div>${comic.jahr || '-'}</div>
            <div><span class="badge ${bestandClass}" style="font-size: 0.62rem; padding: 2px 6px;">${comic.bestand}</span></div>
            <div style="color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${comic.bezugsquelle || '-'}</div>
            <div style="font-size: 0.78rem;">${displayDate(comic.kaufdatum)}</div>
            <div style="font-weight: bold; text-align: right; padding-right: 10px;">${comic.preis ? comic.preis.toFixed(2) + ' €' : '-'}</div>
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
                <span style="font-size: 0.78rem;">${displayDate(comic.gelesen_am)}</span>
                <button class="btn-delete-item" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: var(--danger); opacity: 0.2; cursor: pointer; padding: 2px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDetailsItem(comic) {
    const imgUrl = comic.bild || getPlaceholderImage();
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    return `
        <div class="details-card comic-item" data-id="${comic.id}">
            <img src="${imgUrl}" alt="${comic.titel}" class="details-cover" onerror="this.src='${getPlaceholderImage()}'">
            <div class="details-info">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="comic-series">${comic.serie || comic.verlag} ${comic.nummer ? '#' + comic.nummer : ''}</span>
                    <button class="btn-delete-item" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <h3 class="comic-title" style="font-size: 1.4rem; margin-bottom: 12px;">${comic.titel || 'Ohne Titel'}</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: auto;">
                    <div><strong>Typ:</strong> ${comic.typ}</div>
                    <div><strong>Format:</strong> ${comic.format}</div>
                    <div><strong>Verlag:</strong> ${comic.verlag}</div>
                    <div><strong>Sprache:</strong> ${comic.sprache}</div>
                    <div><strong>Kaufdatum:</strong> ${displayDate(comic.kaufdatum)}</div>
                    <div><strong>Preis:</strong> ${comic.preis ? comic.preis.toFixed(2) + ' €' : '-'}</div>
                    <div><strong>Gelesen am:</strong> ${displayDate(comic.gelesen_am)}</div>
                </div>
                
                <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge ${bestandClass}">${comic.bestand}</span>
                    <span style="font-size: 1.1rem; color: var(--warning)"><i class="fa-solid fa-star"></i> ${comic.bewertung ? comic.bewertung / 2 : 0}</span>
                </div>
            </div>
        </div>
    `;
}
