import { db } from '../db.js';
import { openModal, openBulkEditModal } from './form.js';
import { FIELD_CONFIG, defaultVisibleFields, renderTile, renderListItem, renderDetailsItem } from './collection/templates.js';
import { initColumnManager, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleMouseDown } from './collection/columnManager.js';

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

let isSelectModeActive = false;
let selectedComicIds = new Set();

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

            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="btn-standalone-toggle ${isSelectModeActive ? 'active' : ''}" id="btn-toggle-select-mode" title="Mehrfachauswahl aktivieren/deaktivieren">
                    <i class="fa-solid fa-square-check"></i>
                </button>
                
                <div class="view-toggles">
                    <button class="view-toggle-btn ${currentViewType === 'list' ? 'active' : ''}" data-type="list" title="Listenansicht">
                        <i class="fa-solid fa-table-list"></i>
                    </button>
                    <button class="view-toggle-btn ${currentViewType === 'tiles' ? 'active' : ''}" data-type="tiles" title="Kachelansicht">
                        <i class="fa-solid fa-grip"></i>
                    </button>
                    <button class="view-toggle-btn ${currentViewType === 'details' ? 'active' : ''}" data-type="details" title="Detailansicht">
                        <i class="fa-solid fa-address-card"></i>
                    </button>
                </div>

                <button class="btn-standalone-toggle" id="btn-configure-fields" title="Angezeigte Felder für diese Ansicht konfigurieren">
                    <i class="fa-solid fa-table-columns"></i>
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

initColumnManager({
    getVisibleFields: () => visibleFields,
    setVisibleFields: (fields) => {
        visibleFields = fields;
        localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
    },
    updateGrid: () => updateGrid()
});

// Combined Click Handler for all collection actions
const handleCollectionClick = (e) => {
    // 1. Dropdown Toggles
    const trigger = e.target.closest('.multi-select-trigger');
    if (trigger) {
        const key = trigger.dataset.key;
        const dropdown = document.getElementById(`dropdown-${key}`);
        const isVisible = dropdown.style.display === 'block';
        
        // Andere schließen
        document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
        
        if (!isVisible) dropdown.style.display = 'block';
        e.stopPropagation();
        return;
    } else if (!e.target.closest('.multi-select-dropdown')) {
        document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
    }

    // 2. Reset Button Click
    if (e.target.closest('#btn-reset-filters-direct')) {
        activeFilters = { verlag: [], format: [], bestand: ['vorhanden', 'vorbestellt'], gelesen: [], bezugsquelle: [], serie: [] };
        const container = document.getElementById('view-container');
        renderCollection(container);
        return;
    }

    // 3. Sortierung über Header Click
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
        return;
    }

    // 4. Ansichtsumschaltung Click
    const btn = e.target.closest('.view-toggle-btn, .btn-standalone-toggle');
    if (btn) {
        if (btn.id === 'btn-toggle-select-mode') {
            toggleSelectMode();
            return;
        }
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

    // 5. Bulk Select All Header Checkbox Click
    if (e.target.id === 'bulk-select-all-header') {
        selectAllComics();
        return;
    }
};

// Checkbox Filter Change Handler
const handleCheckboxChange = (e) => {
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
        if (trigger) {
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            const selectedCount = activeFilters[key].length;
            const isActive = selectedCount > 0;

            trigger.querySelector('span').textContent = isActive ? `${label} (${selectedCount})` : label;
            trigger.style.background = isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)';
            trigger.style.borderColor = isActive ? 'var(--primary-color)' : 'var(--border-color)';
            trigger.style.color = isActive ? 'var(--primary-color)' : 'inherit';
        }

        updateGrid();
    }
};

// Global Search Event Handler
const handleGlobalSearch = (e) => {
    searchTerm = e.detail.query.toLowerCase();
    updateGrid();
};



export function attachCollectionEvents() {
    if (eventsAttached) return;
    eventsAttached = true;

    document.addEventListener('click', handleCollectionClick);
    document.addEventListener('change', handleCheckboxChange);
    document.addEventListener('global-search', handleGlobalSearch);
    
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);
    
    document.addEventListener('mousedown', handleMouseDown);
}

export function cleanupCollection() {
    document.removeEventListener('click', handleCollectionClick);
    document.removeEventListener('change', handleCheckboxChange);
    document.removeEventListener('global-search', handleGlobalSearch);
    
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('dragend', handleDragEnd);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('drop', handleDrop);
    
    document.removeEventListener('mousedown', handleMouseDown);
    
    // Mehrfachauswahl zurücksetzen
    isSelectModeActive = false;
    selectedComicIds.clear();
    document.body.classList.remove('bulk-select-active');
    const bar = document.getElementById('bulk-action-bar');
    if (bar) bar.remove();
    
    eventsAttached = false;
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
        grid.innerHTML = comics.map(comic => renderTile(comic, visibleFields, isSelectModeActive, selectedComicIds)).join('');
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

        const selectColumn = isSelectModeActive ? '40px ' : '';
        const gridTemplateColumns = selectColumn + visibleFields.list.map(key => `var(--col-width-${key})`).join(' ') + ' 40px';

        const headers = listFields.map(f => `
            <div class="sortable-header" data-sort="${f.key}" draggable="true" title="Zum Sortieren klicken, zum Verschieben ziehen" style="position: relative; cursor:pointer; user-select: none; ${f.align ? 'text-align: ' + f.align : ''}; padding-right: 15px;">
                ${f.label} ${getIcon(f.key)}
                <div class="col-resizer" data-key="${f.key}" style="position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: col-resize; z-index: 20;"></div>
            </div>
        `).join('');

        const selectAllHeader = isSelectModeActive ? `
            <div style="display: flex; align-items: center; justify-content: center;">
                <input type="checkbox" id="bulk-select-all-header" style="accent-color: var(--primary-color); width: 16px; height: 16px; cursor: pointer;">
            </div>
        ` : '';

        grid.innerHTML = `
            <div class="list-header" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; font-weight: bold; border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-main); position: sticky; top: 0; z-index: 10; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ${selectAllHeader}
                ${headers}
                <div style="text-align: right;"><i class="fa-solid fa-trash" style="opacity: 0.3;"></i></div>
            </div>
            <div class="list-items-container">
                ${comics.map(comic => renderListItem(comic, visibleFields, isSelectModeActive, selectedComicIds)).join('')}
            </div>
        `;
    } else if (currentViewType === 'details') {
        grid.classList.add('details-grid-view');
        grid.innerHTML = comics.map(comic => renderDetailsItem(comic, visibleFields, isSelectModeActive, selectedComicIds)).join('');
    }

    // Edit Events
    grid.querySelectorAll('.comic-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            if (e.target.closest('.btn-delete-item')) return;
            const id = item.dataset.id;
            if (isSelectModeActive) {
                handleComicClick(id, e.target);
                return;
            }
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

    // Update Header Checkbox State
    if (isSelectModeActive && currentViewType === 'list') {
        updateHeaderSelectAllState();
    }
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

// --- Bulk Selection / Multi-Delete functions ---

export function toggleSelectMode() {
    isSelectModeActive = !isSelectModeActive;
    selectedComicIds.clear();
    
    // Body-Klasse für CSS-Hiding setzen/entfernen
    document.body.classList.toggle('bulk-select-active', isSelectModeActive);
    
    // update trigger button styling
    const btn = document.getElementById('btn-toggle-select-mode');
    if (btn) {
        btn.classList.toggle('active', isSelectModeActive);
    }
    
    // update grid layout to render checkboxes
    updateGrid();
    
    // show/hide action bar
    updateBulkActionBar();
}

export function handleComicClick(id, target) {
    const isCheckbox = target.classList.contains('bulk-item-checkbox');
    if (selectedComicIds.has(id)) {
        if (!isCheckbox || !target.checked) {
            selectedComicIds.delete(id);
        }
    } else {
        if (!isCheckbox || target.checked) {
            selectedComicIds.add(id);
        }
    }
    
    // Update DOM immediately for speed and fluidity
    const itemEl = document.querySelector(`.comic-item[data-id="${id}"]`);
    if (itemEl) {
        itemEl.classList.toggle('selected', selectedComicIds.has(id));
        const checkbox = itemEl.querySelector('.bulk-item-checkbox');
        if (checkbox && !isCheckbox) {
            checkbox.checked = selectedComicIds.has(id);
        }
    }
    
    updateHeaderSelectAllState();
    updateBulkActionBar();
}

export function updateHeaderSelectAllState() {
    const headerCheckbox = document.getElementById('bulk-select-all-header');
    if (!headerCheckbox) return;
    
    const visibleIds = Array.from(document.querySelectorAll('.comic-item')).map(el => el.dataset.id);
    if (visibleIds.length === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
        return;
    }
    
    const selectedCount = visibleIds.filter(id => selectedComicIds.has(id)).length;
    
    if (selectedCount === 0) {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = false;
    } else if (selectedCount === visibleIds.length) {
        headerCheckbox.checked = true;
        headerCheckbox.indeterminate = false;
    } else {
        headerCheckbox.checked = false;
        headerCheckbox.indeterminate = true;
    }
}

export function updateBulkActionBar() {
    let bar = document.getElementById('bulk-action-bar');
    if (!isSelectModeActive) {
        if (bar) {
            bar.classList.remove('show');
            setTimeout(() => {
                // Nur löschen, wenn es nicht in der Zwischenzeit wieder angezeigt wurde
                if (!isSelectModeActive && bar.parentNode) {
                    bar.remove();
                }
            }, 400);
        }
        return;
    }

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bulk-action-bar';
        bar.className = 'bulk-select-bar';
        document.body.appendChild(bar);
        
        // Trigger reflow
        bar.offsetHeight; 
        bar.classList.add('show');
    }

    const count = selectedComicIds.size;
    bar.innerHTML = `
        <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-square-check" style="color: var(--primary-color);"></i>
            <span>${count} ausgewählt</span>
        </span>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button class="btn btn-secondary" id="bulk-action-select-all" style="height: 34px; padding: 0 12px; font-size: 0.8rem; border-radius: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-check-double"></i> Alle sichtbaren
            </button>
            <button class="btn btn-primary" id="bulk-action-edit" ${count === 0 ? 'disabled' : ''} style="height: 34px; padding: 0 12px; font-size: 0.8rem; border-radius: 6px; background-color: var(--primary-color); border-color: var(--primary-color); color: white; display: flex; align-items: center; gap: 6px; cursor: ${count === 0 ? 'not-allowed' : 'pointer'}; opacity: ${count === 0 ? 0.5 : 1};">
                <i class="fa-solid fa-pen"></i> Bearbeiten
            </button>
            <button class="btn btn-danger" id="bulk-action-delete" ${count === 0 ? 'disabled' : ''} style="height: 34px; padding: 0 12px; font-size: 0.8rem; border-radius: 6px; background-color: var(--danger); border-color: var(--danger); color: white; display: flex; align-items: center; gap: 6px; cursor: ${count === 0 ? 'not-allowed' : 'pointer'}; opacity: ${count === 0 ? 0.5 : 1};">
                <i class="fa-solid fa-trash"></i> Löschen
            </button>
            <button class="btn btn-secondary" id="bulk-action-cancel" style="height: 34px; padding: 0 12px; font-size: 0.8rem; border-radius: 6px; border-color: transparent; background: transparent;">
                Abbrechen
            </button>
        </div>
    `;

    document.getElementById('bulk-action-select-all').addEventListener('click', () => {
        selectAllComics();
    });

    document.getElementById('bulk-action-edit').addEventListener('click', () => {
        if (selectedComicIds.size === 0) return;
        openBulkEditModal(Array.from(selectedComicIds));
    });
    
    document.getElementById('bulk-action-delete').addEventListener('click', () => {
        if (selectedComicIds.size === 0) return;
        showBulkDeleteConfirmation();
    });

    document.getElementById('bulk-action-cancel').addEventListener('click', () => {
        toggleSelectMode();
    });
}

export function selectAllComics() {
    const visibleItems = Array.from(document.querySelectorAll('.comic-item')).map(el => el.dataset.id);
    if (visibleItems.length === 0) return;

    const allSelected = visibleItems.every(id => selectedComicIds.has(id));
    if (allSelected) {
        visibleItems.forEach(id => selectedComicIds.delete(id));
    } else {
        visibleItems.forEach(id => selectedComicIds.add(id));
    }
    
    // Update DOM
    visibleItems.forEach(id => {
        const itemEl = document.querySelector(`.comic-item[data-id="${id}"]`);
        if (itemEl) {
            itemEl.classList.toggle('selected', selectedComicIds.has(id));
            const checkbox = itemEl.querySelector('.bulk-item-checkbox');
            if (checkbox) checkbox.checked = selectedComicIds.has(id);
        }
    });
    
    updateHeaderSelectAllState();
    updateBulkActionBar();
}

export function showBulkDeleteConfirmation() {
    const existing = document.getElementById('bulk-delete-confirm-modal');
    if (existing) existing.remove();
    
    const count = selectedComicIds.size;
    const modalHtml = `
        <div id="bulk-delete-confirm-modal" class="modal-overlay" style="z-index: 1100;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2>Comics löschen</h2>
                    <button class="close-btn" id="bulk-delete-modal-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 1rem; color: var(--text-main); line-height: 1.5;">
                        Möchtest du die <strong>${count}</strong> ausgewählten Comics wirklich dauerhaft aus deiner Sammlung löschen?
                    </p>
                    <p style="margin: 0; font-size: 0.85rem; color: #ff4444; font-weight: 500;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Diese Aktion kann nicht rückgängig gemacht werden!
                    </p>
                </div>
                <div class="modal-footer" style="padding: 16px 24px;">
                    <button class="btn btn-secondary" id="bulk-delete-modal-cancel">Abbrechen</button>
                    <button class="btn btn-danger" id="bulk-delete-modal-confirm" style="background-color: var(--danger); border-color: var(--danger); color: white;">
                        <i class="fa-solid fa-trash"></i> ${count} Comics löschen
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('bulk-delete-confirm-modal');
    
    const closeModal = () => {
        modal.remove();
    };
    
    document.getElementById('bulk-delete-modal-close').addEventListener('click', closeModal);
    document.getElementById('bulk-delete-modal-cancel').addEventListener('click', closeModal);
    
    document.getElementById('bulk-delete-modal-confirm').addEventListener('click', async () => {
        const confirmBtn = document.getElementById('bulk-delete-modal-confirm');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Lösche...';
        
        try {
            const idsToDelete = Array.from(selectedComicIds);
            await db.deleteComics(idsToDelete);
            
            isSelectModeActive = false;
            selectedComicIds.clear();
            document.body.classList.remove('bulk-select-active');
            
            const bar = document.getElementById('bulk-action-bar');
            if (bar) bar.remove();
            
            closeModal();
            
            // Re-render
            const container = document.getElementById('view-container');
            renderCollection(container);
        } catch (error) {
            console.error('Fehler beim Löschen der Comics:', error);
            alert('Fehler beim Löschen: ' + error.message);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${count} Comics löschen`;
        }
    });
}

export { isSelectModeActive, selectedComicIds };

