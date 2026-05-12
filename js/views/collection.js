import { db } from '../db.js';
import { openModal } from './form.js';

let currentViewType = 'list'; 
let searchTerm = '';
let sortBy = 'titel'; 
let sortOrder = 'asc'; 
let activeFilters = {
    verlag: [],
    format: [],
    bestand: ['vorhanden', 'vorbestellt'],
    gelesen: [],
    bezugsquelle: [],
    serie: []
};

const FIELD_CONFIG = {
    titel: { label: 'Titel / Serie', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(150px, 1.5fr)' },
    nummer: { label: 'Nr.', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(40px, auto)' },
    verlag: { label: 'Verlag', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1.2fr)' },
    jahr: { label: 'Jahr', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(50px, auto)' },
    bestand: { label: 'Bestand', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(90px, auto)' },
    bezugsquelle: { label: 'Quelle', defaultList: true, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, 0.8fr)' },
    bewertung: { label: 'Bewertung', defaultList: true, defaultTiles: true, defaultDetails: true, listWidth: 'minmax(100px, auto)' },
    kaufdatum: { label: 'Gekauft', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(85px, auto)' },
    preis: { label: 'Preis', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(75px, auto)', align: 'right' },
    gelesen_am: { label: 'Gelesen', defaultList: true, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(85px, auto)', align: 'right' },
    updated_at: { label: 'Änderung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(85px, auto)', align: 'right' },
    typ: { label: 'Typ', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1fr)' },
    format: { label: 'Format', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(100px, 1fr)' },
    sprache: { label: 'Sprache', defaultList: false, defaultTiles: false, defaultDetails: true, listWidth: 'minmax(80px, auto)' },
    limitierung: { label: 'Limitierung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, auto)' },
    variant: { label: 'Variant', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(80px, auto)' },
    variantname: { label: 'Variantname', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(100px, 1fr)' },
    zustand: { label: 'Zustand', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(100px, auto)' },
    bemerkung: { label: 'Bemerkung', defaultList: false, defaultTiles: false, defaultDetails: false, listWidth: 'minmax(150px, 2fr)' },
    bild: { label: 'Cover-Bild', defaultList: false, defaultTiles: true, defaultDetails: true, listWidth: '0' }
};

const defaultVisibleFields = {
    list: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultList),
    tiles: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultTiles),
    details: Object.keys(FIELD_CONFIG).filter(k => FIELD_CONFIG[k].defaultDetails)
};

let visibleFields = JSON.parse(localStorage.getItem('comicvault_visible_fields')) || JSON.parse(JSON.stringify(defaultVisibleFields));
if (!visibleFields.columnWidths) visibleFields.columnWidths = {};

export async function renderCollection(container) {
    const comics = await db.getAllComics();
    const verlage = [...new Set(comics.map(c => c.verlag).filter(Boolean))].sort();
    const formate = [...new Set(comics.map(c => c.format).filter(Boolean))].sort();
    const bestände = [...new Set(comics.map(c => c.bestand).filter(Boolean))].sort();
    const quellen = [...new Set(comics.map(c => c.bezugsquelle).filter(Boolean))].sort();
    const serien = [...new Set(comics.map(c => c.serie).filter(Boolean))].sort();
    const gelesenStatus = ['Ja', 'Nein'];

    const html = `
        <div class="view-controls" style="flex-wrap: wrap; gap: 15px; margin-bottom: 25px; padding-top: 32px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; flex: 1;">

                
                <!-- Direkt sichtbare Multi-Filter -->
                <div class="direct-filters" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    ${renderMultiSelect('verlag', 'Verlag', verlage)}
                    ${renderMultiSelect('serie', 'Serie', serien)}
                    ${renderMultiSelect('format', 'Format', formate)}
                    ${renderMultiSelect('bestand', 'Bestand', bestände)}
                    ${renderMultiSelect('bezugsquelle', 'Quelle', quellen)}
                    ${renderMultiSelect('gelesen', 'Gelesen', gelesenStatus)}
                    
                    <button id="btn-reset-filters-direct" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Alle Filter zurücksetzen">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                </div>
                <div id="filter-count" style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-color); white-space: nowrap; min-width: 80px; text-align: center;">
                    ...
                </div>
            </div>

            <div class="view-toggles">
                <button class="view-toggle-btn" id="btn-configure-fields" title="Angezeigte Felder für diese Ansicht konfigurieren">
                    <i class="fa-solid fa-table-columns"></i>
                </button>
                <div style="width: 1px; background: var(--border-color); margin: 6px 0;"></div>
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

let eventsAttached = false;
export function attachCollectionEvents() {
    if (eventsAttached) return;
    eventsAttached = true;

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
            activeFilters = { verlag: [], format: [], bestand: ['vorhanden', 'vorbestellt'], gelesen: [], bezugsquelle: [], serie: [] };
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
            if (btn.id === 'btn-configure-fields') {
                renderFieldConfigOverlay();
                return;
            }
            if (btn.dataset.type) {
                document.querySelectorAll('.view-toggle-btn[data-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentViewType = btn.dataset.type;
                updateGrid();
            }
        }
    });

    // Globale Suche
    document.addEventListener('global-search', (e) => {
        searchTerm = e.detail.query.toLowerCase();
        updateGrid();
    });

    // Drag & Drop für Spalten (Listenansicht)
    let draggedColumnKey = null;

    document.addEventListener('dragstart', (e) => {
        const header = e.target.closest('.sortable-header');
        if (header) {
            draggedColumnKey = header.dataset.sort;
            setTimeout(() => {
                header.style.opacity = '0.4';
                header.style.background = 'rgba(255,255,255,0.05)';
            }, 0);
        }
    });

    document.addEventListener('dragend', (e) => {
        if (draggedColumnKey) {
            const header = document.querySelector(`.sortable-header[data-sort="${draggedColumnKey}"]`);
            if (header) {
                header.style.opacity = '1';
                header.style.background = 'transparent';
            }
            document.querySelectorAll('.sortable-header').forEach(h => h.style.borderLeft = '');
            draggedColumnKey = null;
        }
    });

    document.addEventListener('dragover', (e) => {
        const header = e.target.closest('.sortable-header');
        if (header && draggedColumnKey && header.dataset.sort !== draggedColumnKey) {
            e.preventDefault(); // Erlaubt das Drop-Event
            // Visuelles Feedback
            document.querySelectorAll('.sortable-header').forEach(h => h.style.borderLeft = '');
            header.style.borderLeft = '2px solid var(--primary-color)';
        }
    });
    
    document.addEventListener('dragleave', (e) => {
        const header = e.target.closest('.sortable-header');
        if (header) {
            header.style.borderLeft = '';
        }
    });
    document.addEventListener('drop', (e) => {
        const header = e.target.closest('.sortable-header');
        if (header && draggedColumnKey && header.dataset.sort !== draggedColumnKey) {
            e.preventDefault();
            const targetKey = header.dataset.sort;
            
            const list = visibleFields.list;
            const fromIndex = list.indexOf(draggedColumnKey);
            const toIndex = list.indexOf(targetKey);
            
            if (fromIndex > -1 && toIndex > -1) {
                list.splice(fromIndex, 1);
                list.splice(toIndex, 0, draggedColumnKey);
                
                localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
                updateGrid();
            }
        }
    });

    // Spaltenbreiten anpassen (Resize)
    let isResizing = false;
    let currentResizerKey = null;
    let startX, startWidth, headerEl;

    document.addEventListener('mousedown', e => {
        const resizer = e.target.closest('.col-resizer');
        if (resizer) {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            currentResizerKey = resizer.dataset.key;
            startX = e.pageX;
            headerEl = resizer.parentElement;
            startWidth = headerEl.offsetWidth;
            
            document.body.style.cursor = 'col-resize';
            headerEl.style.borderRight = '2px solid var(--primary-color)';
        }
    });

    let resizeTick = false;
    document.addEventListener('mousemove', e => {
        if (!isResizing || resizeTick) return;
        
        resizeTick = true;
        requestAnimationFrame(() => {
            const diff = e.pageX - startX;
            const newWidth = Math.max(40, startWidth + diff);
            
            visibleFields.columnWidths[currentResizerKey] = `${newWidth}px`;
            
            // Performance-Optimierung: Nur die CSS-Variable am Container ändern
            const grid = document.getElementById('collection-grid');
            if (grid) {
                grid.style.setProperty(`--col-width-${currentResizerKey}`, `${newWidth}px`);
            }
            resizeTick = false;
        });
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.cursor = '';
        if (headerEl) headerEl.style.borderRight = '';
        localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
    });
}

async function updateGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;

    let comics = await db.getAllComics();
    const totalCount = comics.length;
    
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
    if (activeFilters.bezugsquelle.length > 0) {
        comics = comics.filter(c => activeFilters.bezugsquelle.includes(c.bezugsquelle));
    }
    if (activeFilters.serie.length > 0) {
        comics = comics.filter(c => activeFilters.serie.includes(c.serie));
    }
    if (activeFilters.gelesen.length > 0) {
        comics = comics.filter(c => {
            const isRead = !!c.gelesen_am;
            const status = isRead ? 'Ja' : 'Nein';
            return activeFilters.gelesen.includes(status);
        });
    }

    // Anzeige der Anzahl aktualisieren
    const filteredCount = comics.length;
    const countEl = document.getElementById('filter-count');
    if (countEl) {
        countEl.textContent = `${filteredCount} / ${totalCount}`;
    }

    // 3. Sortierung
    comics.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (sortBy === 'titel') {
            const sA = (a.serie || a.titel || '').toLowerCase();
            const sB = (b.serie || b.titel || '').toLowerCase();
            if (sA !== sB) return sortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
            
            // Zusätzliche Sortierung nach Jahr (Aquaman 2012 vor Aquaman 2017)
            const jA = a.jahr || 0;
            const jB = b.jahr || 0;
            if (jA !== jB) return sortOrder === 'asc' ? jA - jB : jB - jA;

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

        const listFields = visibleFields.list.map(key => ({ 
            key, 
            ...FIELD_CONFIG[key]
        }));
        
        // CSS-Variablen am Container setzen
        visibleFields.list.forEach(key => {
            const width = visibleFields.columnWidths[key] || FIELD_CONFIG[key].listWidth;
            grid.style.setProperty(`--col-width-${key}`, width);
        });

        const gridTemplateColumns = visibleFields.list.map(key => `var(--col-width-${key})`).join(' ') + ' 40px';

        const headers = listFields.map(f => `
            <div class="sortable-header" data-sort="${f.key}" draggable="true" title="Zum Sortieren klicken, zum Verschieben ziehen" style="position: relative; cursor:pointer; user-select: none; ${f.align ? 'text-align: ' + f.align : ''}; padding-right: 15px;">
                ${f.label} ${getIcon(f.key)}
                <div class="col-resizer" data-key="${f.key}" style="position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 20;"></div>
            </div>
        `).join('');

        grid.innerHTML = `
            <div class="list-header" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; font-weight: bold; border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ${headers}
                <div style="text-align: right;"><i class="fa-solid fa-trash" style="opacity: 0.3;"></i></div>
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

function renderStars(rating) {
    if (!rating) return '-';
    let starsHtml = '<div class="stars-display">';
    for (let i = 1; i <= 5; i++) {
        const val = i * 2;
        if (rating >= val) {
            starsHtml += '<i class="fa-solid fa-star"></i>';
        } else if (rating === val - 1) {
            starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            starsHtml += '<i class="fa-regular fa-star" style="opacity: 0.3;"></i>';
        }
    }
    starsHtml += '</div>';
    return starsHtml;
}

function displayDate(dateStr, shorten = false) {
    if (!dateStr) return '-';
    
    // YYYY-MM-DD (Fallback für alte Einträge)
    const matchIso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchIso) {
        const y = shorten ? matchIso[1].slice(-2) : matchIso[1];
        return `${matchIso[3]}.${matchIso[2]}.${y}`;
    }
    
    // DD.MM.YYYY (Aktuelles Standard-Format)
    const matchGer = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (matchGer) {
        const y = shorten ? matchGer[3].slice(-2) : matchGer[3];
        return `${matchGer[1]}.${matchGer[2]}.${y}`;
    }
    
    // Langes Format (z.B. Zeitstempel)
    if (String(dateStr).length > 15) {
        const d = new Date(dateStr);
        if (!isNaN(d)) {
            const s = d.toLocaleDateString('de-DE');
            if (shorten) {
                const parts = s.split('.');
                if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2].slice(-2)}`;
            }
            return s;
        }
    }
    
    return dateStr;
}

function renderTile(comic) {
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    
    let imgBlock = '';
    if (visibleFields.tiles.includes('bild')) {
        const imgUrl = comic.bild || getPlaceholderImage();
        imgBlock = `<img src="${imgUrl}" alt="${comic.titel}" class="comic-cover" onerror="this.src='${getPlaceholderImage()}'">`;
    }

    const stdFields = ['bild', 'serie', 'titel', 'bewertung', 'bestand'];
    
    let serieBlock = '';
    if (visibleFields.tiles.includes('serie')) {
        serieBlock = `<span class="comic-series">${comic.serie || comic.verlag || ''} ${comic.nummer ? '#' + comic.nummer : ''}</span>`;
    }

    let titelBlock = '';
    if (visibleFields.tiles.includes('titel')) {
        titelBlock = `<h3 class="comic-title">${comic.titel || 'Ohne Titel'}</h3>`;
    }

    let metaBlock = '';
    if (visibleFields.tiles.includes('bewertung') || visibleFields.tiles.includes('bestand')) {
        let bewertung = visibleFields.tiles.includes('bewertung') ? `<span>${renderStars(comic.bewertung)}</span>` : '';
        let bestand = visibleFields.tiles.includes('bestand') ? `<span class="badge ${bestandClass}">${comic.bestand}</span>` : '';
        metaBlock = `<div class="comic-meta">${bewertung}${bestand}</div>`;
    }

    let extraFields = '';
    visibleFields.tiles.forEach(key => {
        if (!stdFields.includes(key)) {
            let val = comic[key] || '-';
            if (key === 'preis') val = (comic.preis !== null && comic.preis !== undefined) ? Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-';
            if (key === 'kaufdatum' || key === 'gelesen_am' || key === 'updated_at' || key === 'created_at') val = displayDate(val);
            extraFields += `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;"><strong>${FIELD_CONFIG[key].label}:</strong> ${val}</div>`;
        }
    });

    return `
        <div class="comic-card comic-item" data-id="${comic.id}">
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen">
                <i class="fa-solid fa-trash"></i>
            </button>
            ${imgBlock}
            <div class="comic-info">
                ${serieBlock}
                ${titelBlock}
                ${extraFields}
                <div style="flex: 1;"></div>
                ${metaBlock}
            </div>
        </div>
    `;
}

function renderListItem(comic) {
    const gridTemplateColumns = visibleFields.list.map(key => `var(--col-width-${key})`).join(' ') + ' 40px';
    const listFields = visibleFields.list.map(key => ({ 
        key, 
        ...FIELD_CONFIG[key]
    }));
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;

    const renderCell = (field) => {
        let val = comic[field.key];
        const align = field.align ? `text-align: ${field.align}; padding-right: 10px;` : '';
        
        switch (field.key) {
            case 'titel':
                return `
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px;">
                    <h3 class="comic-title" style="margin:0; font-size:0.88rem; display: inline;">${comic.titel || 'Ohne Titel'}</h3>
                    <div class="comic-series" style="font-size:0.68rem; color: var(--text-secondary);">${comic.serie || ''}</div>
                </div>`;
            case 'nummer':
                return `<div style="font-weight: bold;">${val !== null && val !== undefined ? '#' + val : '-'}</div>`;
            case 'bestand':
                return `<div><span class="badge ${bestandClass}" style="font-size: 0.62rem; padding: 2px 6px;">${comic.bestand || '-'}</span></div>`;
            case 'preis':
                return `<div style="font-weight: bold; ${align}">${(val !== null && val !== undefined) ? Number(val).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-'}</div>`;
            case 'kaufdatum':
                return `<div style="font-size: 0.78rem;">${displayDate(val)}</div>`;
            case 'gelesen_am':
            case 'updated_at':
            case 'created_at':
                return `<div style="${align} font-size: 0.78rem;">${displayDate(val || (field.key === 'updated_at' ? comic.created_at : ''), true)}</div>`;
            case 'bewertung':
                return `<div style="${align}">${renderStars(val)}</div>`;
            case 'bild':
                const imgUrl = comic.bild || getPlaceholderImage();
                return `<div><img src="${imgUrl}" style="height: 30px; border-radius: 4px; object-fit: cover;"></div>`;
            default:
                return `<div style="color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${align}">${val || '-'}</div>`;
        }
    };

    const cells = listFields.map(renderCell).join('');

    return `
        <div class="list-item comic-item" data-id="${comic.id}" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; align-items: center; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; cursor: pointer; font-size: 0.82rem; background: var(--bg-surface);">
            ${cells}
            <div style="display: flex; justify-content: flex-end;">
                <button class="btn-delete-item list-delete-btn" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: #ff4444; opacity: 0.7; cursor: pointer; padding: 4px; transition: all 0.2s;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDetailsItem(comic) {
    const bestandClass = `badge-${String(comic.bestand || '').toLowerCase().replace(/\s+/g, '-')}`;
    
    let imgBlock = '';
    if (visibleFields.details.includes('bild')) {
        const imgUrl = comic.bild || getPlaceholderImage();
        imgBlock = `<img src="${imgUrl}" alt="${comic.titel}" class="details-cover" onerror="this.src='${getPlaceholderImage()}'">`;
    }

    let headerBlock = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            ${visibleFields.details.includes('serie') ? `<span class="comic-series">${comic.serie || comic.verlag || ''} ${comic.nummer ? '#' + comic.nummer : ''}</span>` : '<div></div>'}
            <button class="btn-delete-item" data-id="${comic.id}" title="Löschen" style="background: none; border: none; color: #ff4444; cursor: pointer; padding: 4px; transition: transform 0.2s;">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        ${visibleFields.details.includes('titel') ? `<h3 class="comic-title" style="font-size: 1.4rem; margin-bottom: 12px;">${comic.titel || 'Ohne Titel'}</h3>` : ''}
    `;

    const stdNonGridFields = ['bild', 'serie', 'titel', 'bestand', 'bewertung'];
    let gridFieldsHtml = '';
    visibleFields.details.forEach(key => {
        if (!stdNonGridFields.includes(key)) {
            let val = comic[key] || '-';
            if (key === 'preis') val = (comic.preis !== null && comic.preis !== undefined) ? Number(comic.preis).toFixed(2) + ' ' + (db.getSettings().currency || '€') : '-';
            if (key === 'kaufdatum' || key === 'gelesen_am' || key === 'updated_at' || key === 'created_at') val = displayDate(val);
            gridFieldsHtml += `<div><strong>${FIELD_CONFIG[key].label}:</strong> <span style="color: var(--text-primary);">${val}</span></div>`;
        }
    });
    
    let footerBlock = '';
    if (visibleFields.details.includes('bestand') || visibleFields.details.includes('bewertung')) {
        let bestand = visibleFields.details.includes('bestand') ? `<span class="badge ${bestandClass}">${comic.bestand || '-'}</span>` : '';
        let bewertung = visibleFields.details.includes('bewertung') ? `<span style="font-size: 1.1rem; color: var(--warning)">${renderStars(comic.bewertung)}</span>` : '';
        footerBlock = `
            <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                ${bestand}${bewertung}
            </div>
        `;
    }

    return `
        <div class="details-card comic-item" data-id="${comic.id}">
            ${imgBlock}
            <div class="details-info">
                ${headerBlock}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: auto;">
                    ${gridFieldsHtml}
                </div>
                ${footerBlock}
            </div>
        </div>
    `;
}

function renderFieldConfigOverlay() {
    const existing = document.getElementById('field-config-overlay');
    if (existing) existing.remove();

    const viewNames = { list: 'Listenansicht', tiles: 'Kachelansicht', details: 'Detailansicht' };
    const currentViewName = viewNames[currentViewType];
    const activeFields = visibleFields[currentViewType];

    // Aktive Felder zuerst (in aktueller Reihenfolge), dann inaktive Felder anfügen
    const inactiveFields = Object.keys(FIELD_CONFIG).filter(key => !activeFields.includes(key));
    const orderedFields = [...activeFields, ...inactiveFields];

    const fieldsHtml = orderedFields.map(key => {
        const isChecked = activeFields.includes(key);
        return `
            <label class="field-config-item" draggable="true" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color); cursor: grab; user-select: none; transition: transform 0.1s ease;">
                <i class="fa-solid fa-grip-vertical" style="color: var(--text-secondary); opacity: 0.5; padding-right: 5px; cursor: grab;"></i>
                <input type="checkbox" class="field-config-checkbox" data-key="${key}" ${isChecked ? 'checked' : ''} style="accent-color: var(--primary-color); width: 18px; height: 18px; cursor: pointer;">
                <span style="font-size: 0.9rem; color: var(--text-primary); flex: 1; cursor: pointer;">${FIELD_CONFIG[key].label}</span>
            </label>
        `;
    }).join('');

    const html = `
        <div id="field-config-overlay" class="modal-overlay" style="display: flex; z-index: 2000;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Angezeigte Felder</h2>
                    <button class="close-btn" onclick="document.getElementById('field-config-overlay').remove()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div style="padding: 16px 24px; background: rgba(0,0,0,0.1); border-bottom: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
                    Ziehe die Felder an den sechs Punkten (<i class="fa-solid fa-grip-vertical"></i>) hoch oder runter, um die Reihenfolge für die <strong>${currentViewName}</strong> zu ändern.
                </div>
                <div class="modal-body" id="field-config-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; padding: 16px 24px;">
                    ${fieldsHtml}
                </div>
                <div class="modal-footer" style="justify-content: space-between;">
                    <button class="btn btn-secondary" id="btn-reset-field-config" style="color: var(--warning); border-color: transparent; padding-left: 0;" title="Auf Standard-Felder zurücksetzen"><i class="fa-solid fa-rotate-left"></i> Standard</button>
                    <div>
                        <button class="btn btn-secondary" onclick="document.getElementById('field-config-overlay').remove()">Abbrechen</button>
                        <button class="btn btn-primary" id="btn-save-field-config" style="margin-left: 8px;">Speichern</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    // Drag & Drop Logik
    const list = document.getElementById('field-config-list');
    let draggedItem = null;

    list.addEventListener('dragstart', e => {
        const item = e.target.closest('.field-config-item');
        if (!item) return;
        draggedItem = item;
        setTimeout(() => {
            item.style.opacity = '0.4';
            item.style.background = 'var(--bg-surface)';
        }, 0);
    });

    list.addEventListener('dragend', e => {
        const item = e.target.closest('.field-config-item');
        if (!item) return;
        item.style.opacity = '1';
        item.style.background = 'var(--bg-main)';
        draggedItem = null;
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        if (!draggedItem) return;
        const afterElement = getDragAfterElement(list, e.clientY);
        if (afterElement == null) {
            list.appendChild(draggedItem);
        } else {
            list.insertBefore(draggedItem, afterElement);
        }
    });

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.field-config-item:not([style*="opacity: 0.4"])')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Standard wiederherstellen (baut HTML-Liste neu auf)
    document.getElementById('btn-reset-field-config').addEventListener('click', () => {
        visibleFields.columnWidths = {}; // Auch Breiten zurücksetzen
        const defaults = defaultVisibleFields[currentViewType];
        const inactive = Object.keys(FIELD_CONFIG).filter(key => !defaults.includes(key));
        const defaultOrdered = [...defaults, ...inactive];
        
        const resetHtml = defaultOrdered.map(key => {
            const isChecked = defaults.includes(key);
            return `
                <label class="field-config-item" draggable="true" style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-main); border-radius: 8px; border: 1px solid var(--border-color); cursor: grab; user-select: none; transition: transform 0.1s ease;">
                    <i class="fa-solid fa-grip-vertical" style="color: var(--text-secondary); opacity: 0.5; padding-right: 5px; cursor: grab;"></i>
                    <input type="checkbox" class="field-config-checkbox" data-key="${key}" ${isChecked ? 'checked' : ''} style="accent-color: var(--primary-color); width: 18px; height: 18px; cursor: pointer;">
                    <span style="font-size: 0.9rem; color: var(--text-primary); flex: 1; cursor: pointer;">${FIELD_CONFIG[key].label}</span>
                </label>
            `;
        }).join('');
        list.innerHTML = resetHtml;
    });

    // Speichern (Reihenfolge entspricht dem DOM)
    document.getElementById('btn-save-field-config').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.field-config-checkbox');
        const newFields = [];
        checkboxes.forEach(cb => {
            if (cb.checked) newFields.push(cb.dataset.key);
        });
        
        visibleFields[currentViewType] = newFields;
        localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
        
        document.getElementById('field-config-overlay').remove();
        updateGrid();
    });
}
