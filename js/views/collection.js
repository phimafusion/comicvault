import { db } from '../db.js';
import { openModal } from './form.js';
import { FIELD_CONFIG, defaultVisibleFields, renderTile, renderListItem, renderDetailsItem } from './collection/templates.js';
import { initColumnManager, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop, handleMouseDown, handleDblClick, autoFitColumn } from './collection/columnManager.js';
import { renderFieldConfigOverlay } from './collection/fieldConfig.js';
import { parseToDate } from '../services/statsService.js';
import {
    isSelectModeActive,
    selectedComicIds,
    toggleSelectMode,
    handleComicClick,
    updateHeaderSelectAllState,
    updateBulkActionBar,
    selectAllComics,
    showBulkDeleteConfirmation,
    resetSelectMode
} from './collection/bulkActions.js';

export let currentViewType = 'list'; 
let searchTerm = '';
let sortBy = 'titel'; 
let sortOrder = 'asc'; 
let activeFilters = {
    verlag: [],
    format: [],
    bestand: ['vorhanden', 'vorbestellt'],
    gelesen: [],
    bezugsquelle: [],
    serie: [],
    kaufdatumStart: '',
    kaufdatumEnd: '',
    gelesenDatumStart: '',
    gelesenDatumEnd: ''
};
let needsAutoFit = true;

let visibleFields = JSON.parse(localStorage.getItem('comicvault_visible_fields')) || JSON.parse(JSON.stringify(defaultVisibleFields));
if (!visibleFields.columnWidths) visibleFields.columnWidths = {};

export async function renderCollection(container) {
    needsAutoFit = true;
    const comics = await db.getAllComics();

    // Memoize dates once for the list of comics
    comics.forEach(c => {
        if (c._kaufdatumDate === undefined) {
            c._kaufdatumDate = c.kaufdatum ? parseToDate(c.kaufdatum) : null;
        }
        if (c._gelesenAmDate === undefined) {
            c._gelesenAmDate = c.gelesen_am ? parseToDate(c.gelesen_am) : null;
        }
    });

    const verlageSet = new Set();
    const formateSet = new Set();
    const beständeSet = new Set();
    const quellenSet = new Set();
    const serienSet = new Set();
    
    comics.forEach(c => {
        if (c.verlag) verlageSet.add(c.verlag);
        if (c.format) formateSet.add(c.format);
        if (c.bestand) beständeSet.add(c.bestand);
        if (c.bezugsquelle) quellenSet.add(c.bezugsquelle);
        if (c.serie) serienSet.add(c.serie);
    });
    
    const verlage = [...verlageSet].sort();
    const formate = [...formateSet].sort();
    const bestände = [...beständeSet].sort();
    const quellen = [...quellenSet].sort();
    const serien = [...serienSet].sort();
    const gelesenStatus = ['Ja', 'Nein'];

    const html = `
        <div class="view-controls view-controls-sticky" style="flex-wrap: wrap; gap: 15px; position: sticky; top: 0; z-index: 90; background-color: var(--bg-main); min-height: 76px; box-sizing: border-box; display: flex; align-items: center; border-bottom: 1px solid var(--border-color); margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap; flex: 1;">

                
                <!-- Direkt sichtbare Multi-Filter -->
                <div class="direct-filters" style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                    ${renderMultiSelect('verlag', 'Verlag', verlage)}
                    ${renderMultiSelect('serie', 'Serie', serien)}
                    ${renderMultiSelect('format', 'Format', formate)}
                    ${renderMultiSelect('bestand', 'Bestand', bestände)}
                    ${renderMultiSelect('bezugsquelle', 'Quelle', quellen)}
                    ${renderMultiSelect('gelesen', 'Gelesen', gelesenStatus)}
                    ${renderDateRangeSelect('kaufdatum', 'Gekauft')}
                    ${renderDateRangeSelect('gelesenDatum', 'Gelesen (Datum)')}
                    
                    <button id="btn-reset-filters-direct" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Alle Filter zurücksetzen">
                        <i class="fa-solid fa-rotate-left"></i>
                    </button>
                    <button id="btn-reset-column-widths-direct" class="btn btn-secondary" style="height: 36px; width: 36px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; border-color: transparent;" title="Spaltenbreiten zurücksetzen">
                        <i class="fa-solid fa-arrows-left-right"></i>
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

    // Measure and set sticky height CSS variable dynamically
    const filterBar = container.querySelector('.view-controls-sticky');
    if (filterBar) {
        const updateHeight = () => {
            const rect = filterBar.getBoundingClientRect();
            document.documentElement.style.setProperty('--sticky-filter-height', `${rect.height}px`);
        };
        updateHeight();
        const resizeObserver = new ResizeObserver(updateHeight);
        resizeObserver.observe(filterBar);
    }

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

function displayShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
    }
    return dateStr;
}

function renderDateRangeSelect(key, label) {
    const startVal = activeFilters[`${key}Start`] || '';
    const endVal = activeFilters[`${key}End`] || '';
    const isActive = startVal !== '' || endVal !== '';
    
    let displayText = label;
    if (isActive) {
        if (startVal && endVal) {
            displayText = `${label} (${displayShortDate(startVal)} - ${displayShortDate(endVal)})`;
        } else if (startVal) {
            displayText = `${label} (Ab ${displayShortDate(startVal)})`;
        } else if (endVal) {
            displayText = `${label} (Bis ${displayShortDate(endVal)})`;
        }
    }
    
    return `
        <div class="multi-select-container date-range-container" style="position: relative;">
            <button class="btn btn-secondary multi-select-trigger ${isActive ? 'active-filter' : ''}" 
                    data-key="${key}" 
                    style="height: 36px; font-size: 0.85rem; border-radius: 8px; padding: 0 15px; background: ${isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)'}; border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color)'}; color: ${isActive ? 'var(--primary-color)' : 'inherit'}; min-width: 100px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span>${displayText}</span>
                <i class="fa-solid fa-calendar-days" style="font-size: 0.75rem; opacity: 0.6;"></i>
            </button>
            <div class="multi-select-dropdown" id="dropdown-${key}" style="display: none; position: absolute; top: 42px; left: 0; z-index: 1000; background: #1e293b; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5); min-width: 260px; padding: 16px; flex-direction: column; gap: 12px;">
                <div class="form-group" style="margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px;">
                    <label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Von:</label>
                    <input type="date" class="form-control date-filter-input" data-key="${key}" data-bound="Start" value="${startVal}" style="background-color: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; width: 100%;">
                </div>
                <div class="form-group" style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px;">
                    <label class="form-label" style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Bis:</label>
                    <input type="date" class="form-control date-filter-input" data-key="${key}" data-bound="End" value="${endVal}" style="background-color: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; width: 100%;">
                </div>
                <div style="display: flex; justify-content: space-between; gap: 8px;">
                    <button class="btn btn-secondary btn-date-filter-reset" data-key="${key}" style="padding: 6px 12px; font-size: 0.8rem; flex: 1; font-weight: 600; border-radius: 6px;">Leeren</button>
                    <button class="btn btn-primary btn-date-filter-apply" data-key="${key}" style="padding: 6px 12px; font-size: 0.8rem; flex: 1; font-weight: 600; border-radius: 6px;">Anwenden</button>
                </div>
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

    // Date Filter Apply Click
    const btnApply = e.target.closest('.btn-date-filter-apply');
    if (btnApply) {
        const key = btnApply.dataset.key;
        const dropdown = document.getElementById(`dropdown-${key}`);
        const startInput = dropdown.querySelector(`.date-filter-input[data-bound="Start"]`);
        const endInput = dropdown.querySelector(`.date-filter-input[data-bound="End"]`);
        
        activeFilters[`${key}Start`] = startInput.value;
        activeFilters[`${key}End`] = endInput.value;
        
        dropdown.style.display = 'none';
        
        // Button-Text aktualisieren
        const trigger = document.querySelector(`.multi-select-trigger[data-key="${key}"]`);
        if (trigger) {
            const label = key === 'kaufdatum' ? 'Gekauft' : 'Gelesen (Datum)';
            const isActive = startInput.value !== '' || endInput.value !== '';
            let displayText = label;
            if (isActive) {
                if (startInput.value && endInput.value) {
                    displayText = `${label} (${displayShortDate(startInput.value)} - ${displayShortDate(endInput.value)})`;
                } else if (startInput.value) {
                    displayText = `${label} (Ab ${displayShortDate(startInput.value)})`;
                } else if (endInput.value) {
                    displayText = `${label} (Bis ${displayShortDate(endInput.value)})`;
                }
            }
            
            trigger.querySelector('span').textContent = displayText;
            trigger.style.background = isActive ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-card)';
            trigger.style.borderColor = isActive ? 'var(--primary-color)' : 'var(--border-color)';
            trigger.style.color = isActive ? 'var(--primary-color)' : 'inherit';
        }
        
        updateGrid();
        return;
    }
    
    // Date Filter Reset Click
    const btnReset = e.target.closest('.btn-date-filter-reset');
    if (btnReset) {
        const key = btnReset.dataset.key;
        const dropdown = document.getElementById(`dropdown-${key}`);
        const startInput = dropdown.querySelector(`.date-filter-input[data-bound="Start"]`);
        const endInput = dropdown.querySelector(`.date-filter-input[data-bound="End"]`);
        
        startInput.value = '';
        endInput.value = '';
        
        activeFilters[`${key}Start`] = '';
        activeFilters[`${key}End`] = '';
        
        dropdown.style.display = 'none';
        
        // Button-Text aktualisieren
        const trigger = document.querySelector(`.multi-select-trigger[data-key="${key}"]`);
        if (trigger) {
            const label = key === 'kaufdatum' ? 'Gekauft' : 'Gelesen (Datum)';
            trigger.querySelector('span').textContent = label;
            trigger.style.background = 'var(--bg-card)';
            trigger.style.borderColor = 'var(--border-color)';
            trigger.style.color = 'inherit';
        }
        
        updateGrid();
        return;
    }

    // 2. Reset Button Click
    if (e.target.closest('#btn-reset-filters-direct')) {
        activeFilters = { 
            verlag: [], 
            format: [], 
            bestand: ['vorhanden', 'vorbestellt'], 
            gelesen: [], 
            bezugsquelle: [], 
            serie: [],
            kaufdatumStart: '',
            kaufdatumEnd: '',
            gelesenDatumStart: '',
            gelesenDatumEnd: ''
        };
        const container = document.getElementById('view-container');
        renderCollection(container);
        return;
    }

    // Reset Column Widths Click
    if (e.target.closest('#btn-reset-column-widths-direct')) {
        visibleFields.columnWidths = {};
        localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
        needsAutoFit = true;
        updateGrid();
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
            renderFieldConfigOverlay(visibleFields, currentViewType, (newFields) => {
                visibleFields = newFields;
                localStorage.setItem('comicvault_visible_fields', JSON.stringify(visibleFields));
                updateGrid();
            });
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

    // 6. Klick auf Löschen-Button eines Comics
    const deleteBtn = e.target.closest('.btn-delete-item');
    if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.id;
        if (confirm('Comic wirklich löschen?')) {
            db.deleteComic(id).then(() => {
                needsAutoFit = true;
                updateGrid();
            });
        }
        return;
    }

    // Klick auf "Gelesen markieren" Schnellaktion in der Detailkarte
    const markReadBtn = e.target.closest('.btn-mark-read');
    if (markReadBtn) {
        e.stopPropagation();
        const id = markReadBtn.dataset.id;
        db.getAllComics().then(comics => {
            const comic = comics.find(c => c.id === id);
            if (comic) {
                const now = new Date();
                const d = String(now.getDate()).padStart(2, '0');
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const y = now.getFullYear();
                const germanDate = `${d}.${m}.${y}`;
                
                db.saveComic({ ...comic, gelesen_am: germanDate }).then(() => {
                    needsAutoFit = true;
                    updateGrid();
                });
            }
        });
        return;
    }

    // Klick auf "Bearbeiten" Button in der Detailkarte
    const editBtn = e.target.closest('.btn-edit-item');
    if (editBtn) {
        e.stopPropagation();
        const id = editBtn.dataset.id;
        db.getAllComics().then(comics => {
            const comic = comics.find(c => c.id === id);
            if (comic) openModal(comic);
        });
        return;
    }

    // 7. Klick auf ein Comic-Item (Kachel oder Tabellenzeile)
    const item = e.target.closest('.comic-item');
    if (item) {
        const id = item.dataset.id;
        if (isSelectModeActive) {
            handleComicClick(id, e.target);
            return;
        }
        db.getAllComics().then(comics => {
            const comic = comics.find(c => c.id === id);
            if (comic) openModal(comic);
        });
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

// Background sync update handler
const handleBackgroundComicsUpdate = () => {
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
    document.addEventListener('dblclick', handleDblClick);
    
    window.addEventListener('comics-updated-background', handleBackgroundComicsUpdate);
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
    document.removeEventListener('dblclick', handleDblClick);
    
    window.removeEventListener('comics-updated-background', handleBackgroundComicsUpdate);
    
    resetSelectMode();
    
    eventsAttached = false;
}

export async function updateGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;

    let comics = await db.getAllComics();
    
    // Memoize dates once for the list of comics
    comics.forEach(c => {
        if (c._kaufdatumDate === undefined) {
            c._kaufdatumDate = c.kaufdatum ? parseToDate(c.kaufdatum) : null;
        }
        if (c._gelesenAmDate === undefined) {
            c._gelesenAmDate = c.gelesen_am ? parseToDate(c.gelesen_am) : null;
        }
    });

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

    // Datumsbereichs-Filter
    if (activeFilters.kaufdatumStart) {
        const start = new Date(activeFilters.kaufdatumStart);
        comics = comics.filter(c => {
            const d = c._kaufdatumDate;
            return d && d >= start;
        });
    }
    if (activeFilters.kaufdatumEnd) {
        const end = new Date(activeFilters.kaufdatumEnd);
        end.setHours(23, 59, 59, 999);
        comics = comics.filter(c => {
            const d = c._kaufdatumDate;
            return d && d <= end;
        });
    }
    if (activeFilters.gelesenDatumStart) {
        const start = new Date(activeFilters.gelesenDatumStart);
        comics = comics.filter(c => {
            const d = c._gelesenAmDate;
            return d && d >= start;
        });
    }
    if (activeFilters.gelesenDatumEnd) {
        const end = new Date(activeFilters.gelesenDatumEnd);
        end.setHours(23, 59, 59, 999);
        comics = comics.filter(c => {
            const d = c._gelesenAmDate;
            return d && d <= end;
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
            <div class="list-header" style="display: grid; grid-template-columns: ${gridTemplateColumns}; padding: 12px 20px; font-weight: bold; border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-main); position: sticky; top: var(--sticky-filter-height, 76px); z-index: 10; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ${selectAllHeader}
                ${headers}
                <div style="text-align: right;"><i class="fa-solid fa-trash" style="opacity: 0.3;"></i></div>
            </div>
            <div class="list-items-container">
                ${comics.map(comic => renderListItem(comic, visibleFields, isSelectModeActive, selectedComicIds)).join('')}
            </div>
        `;
        
        // Auto-fit columns dynamically if they do not have a custom saved width (only on initial load/view render)
        if (needsAutoFit) {
            visibleFields.list.forEach(key => {
                if (!visibleFields.columnWidths[key]) {
                    autoFitColumn(key, false);
                }
            });
            needsAutoFit = false;
        }
    } else if (currentViewType === 'details') {
        grid.classList.add('details-grid-view');
        grid.innerHTML = comics.map(comic => renderDetailsItem(comic, visibleFields, isSelectModeActive, selectedComicIds)).join('');
    }

    // Events are now handled via delegation in handleCollectionClick

    // Update Header Checkbox State
    if (isSelectModeActive && currentViewType === 'list') {
        updateHeaderSelectAllState();
    }
}

export { isSelectModeActive, selectedComicIds, toggleSelectMode } from './collection/bulkActions.js';
