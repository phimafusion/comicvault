import { db } from '../db.js';
import { escapeHTML } from '../utils.js';
import { openModal } from './form.js';

let selectedWishIds = new Set();
let sortBy = 'titel';
let sortOrder = 'asc';
let searchQuery = '';

export async function renderWishlist(container) {
    selectedWishIds.clear();
    searchQuery = '';

    const currency = db.getSettings().currency || '€';

    const html = `
        <div class="view-controls" style="padding-top: 32px; margin-bottom: 15px;">
            <h2 class="view-title">Wunschliste</h2>
        </div>

        <!-- Budget & Stats Cards -->
        <div class="wishlist-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div class="details-card" style="padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Gesamtartikel</span>
                <span id="stat-total-items" style="font-size: 1.8rem; font-weight: 700; color: var(--text-main);">0</span>
            </div>
            <div class="details-card" style="padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Geschätztes Budget</span>
                <span id="stat-total-budget" style="font-size: 1.8rem; font-weight: 700; color: var(--primary-color);">0,00 ${currency}</span>
            </div>
            <div class="details-card" style="padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Vorbestellungen</span>
                <span id="stat-total-preorders" style="font-size: 1.8rem; font-weight: 700; color: var(--secondary-color);">0</span>
            </div>
        </div>

        <!-- Search & Control Actions Bar -->
        <div class="view-controls" style="display: flex; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; padding-top: 0; background: transparent; border: none; box-shadow: none;">
            <div style="display: flex; gap: 10px; flex: 1; max-width: 400px; align-items: center;">
                <div style="position: relative; width: 100%;">
                    <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 0.9rem;"></i>
                    <input type="text" id="wishlist-search" class="form-control" placeholder="Wunschliste filtern..." style="padding-left: 36px; height: 38px; width: 100%;">
                </div>
            </div>
            <div class="header-actions">
                 <button class="btn btn-primary" id="btn-add-wish" style="height: 38px;">
                    <i class="fa-solid fa-plus"></i> Wunsch hinzufügen
                </button>
            </div>
        </div>
        
        <div class="details-card" style="flex-direction: column; border-radius: 12px; border: 1px solid var(--border-color); overflow: hidden; padding: 0;">
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(0,0,0,0.15);">
                            <th style="padding: 12px; width: 40px; text-align: center;">
                                <input type="checkbox" id="bulk-select-all-wishes" style="accent-color: var(--primary-color); width: 16px; height: 16px; cursor: pointer; vertical-align: middle;">
                            </th>
                            <th class="sortable-wish-header" data-sort="typ" style="padding: 12px; cursor: pointer; user-select: none;">Typ <span class="sort-icon-container"></span></th>
                            <th class="sortable-wish-header" data-sort="titel" style="padding: 12px; cursor: pointer; user-select: none;">Name <span class="sort-icon-container"></span></th>
                            <th class="sortable-wish-header" data-sort="format" style="padding: 12px; cursor: pointer; user-select: none;">Format <span class="sort-icon-container"></span></th>
                            <th class="sortable-wish-header" data-sort="preis" style="padding: 12px; cursor: pointer; user-select: none;">Preis <span class="sort-icon-container"></span></th>
                            <th class="sortable-wish-header" data-sort="jahr" style="padding: 12px; cursor: pointer; user-select: none;">Release <span class="sort-icon-container"></span></th>
                            <th class="sortable-wish-header" data-sort="vorbestellt" style="padding: 12px; cursor: pointer; user-select: none;">Status <span class="sort-icon-container"></span></th>
                            <th style="padding: 12px; text-align: right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody id="wishlist-body">
                        <tr><td colspan="8" style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Floating Bulk Action Bar -->
        <div id="wishlist-bulk-bar" class="bulk-action-bar" style="display: none; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(100px); z-index: 1000; background: #1e293b; border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); align-items: center; gap: 12px; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
            <span id="wishlist-bulk-count" style="font-weight: bold; color: var(--primary-color); margin-right: 8px;">0 ausgewählt</span>
            <button class="btn btn-secondary" id="btn-wishlist-bulk-preorder" style="height: 36px; font-size: 0.85rem;"><i class="fa-solid fa-calendar-check"></i> Vorbestellt</button>
            <button class="btn btn-secondary" id="btn-wishlist-bulk-plan" style="height: 36px; font-size: 0.85rem;"><i class="fa-solid fa-calendar-days"></i> Geplant</button>
            <button class="btn btn-secondary" id="btn-wishlist-bulk-transfer" style="height: 36px; font-size: 0.85rem; color: var(--success);"><i class="fa-solid fa-cart-arrow-down"></i> Übernehmen</button>
            <button class="btn btn-danger" id="btn-wishlist-bulk-delete" style="height: 36px; font-size: 0.85rem;"><i class="fa-solid fa-trash"></i> Löschen</button>
            <button class="btn btn-secondary" id="btn-wishlist-bulk-cancel" style="height: 36px; font-size: 0.85rem;">Abbrechen</button>
        </div>

        <style>
            .sortable-wish-header:hover {
                color: var(--primary-color) !important;
            }
            #wishlist-bulk-bar.show {
                transform: translateX(-50%) translateY(0);
            }
            .wishlist-row.selected {
                background-color: rgba(6, 182, 212, 0.08);
            }
            .wishlist-row:hover {
                background-color: rgba(255, 255, 255, 0.02);
            }
            .wishlist-row.selected:hover {
                background-color: rgba(6, 182, 212, 0.12);
            }
        </style>
    `;
    container.innerHTML = html;
    
    // Bind buttons
    document.getElementById('btn-add-wish').addEventListener('click', () => {
        openModal(null, true);
    });

    const searchInput = document.getElementById('wishlist-search');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateWishlistTable();
    });

    document.getElementById('bulk-select-all-wishes').addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.wish-item-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const id = cb.dataset.id;
            if (e.target.checked) {
                selectedWishIds.add(id);
                cb.closest('.wishlist-row')?.classList.add('selected');
            } else {
                selectedWishIds.delete(id);
                cb.closest('.wishlist-row')?.classList.remove('selected');
            }
        });
        updateBulkBar();
    });

    // Header sort events
    container.querySelectorAll('.sortable-wish-header').forEach(header => {
        header.addEventListener('click', () => {
            const newSortBy = header.dataset.sort;
            if (sortBy === newSortBy) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = newSortBy;
                sortOrder = 'asc';
            }
            updateWishlistTable();
        });
    });

    // Bulk bar events
    document.getElementById('btn-wishlist-bulk-cancel').addEventListener('click', () => {
        selectedWishIds.clear();
        const masterCb = document.getElementById('bulk-select-all-wishes');
        if (masterCb) masterCb.checked = false;
        document.querySelectorAll('.wish-item-checkbox').forEach(cb => {
            cb.checked = false;
            cb.closest('.wishlist-row')?.classList.remove('selected');
        });
        updateBulkBar();
    });

    document.getElementById('btn-wishlist-bulk-delete').addEventListener('click', async () => {
        if (selectedWishIds.size === 0) return;
        if (confirm(`${selectedWishIds.size} Wünsche wirklich unwiderruflich löschen?`)) {
            for (const id of selectedWishIds) {
                await db.deleteWish(id);
            }
            selectedWishIds.clear();
            const masterCb = document.getElementById('bulk-select-all-wishes');
            if (masterCb) masterCb.checked = false;
            updateWishlistTable();
            updateBulkBar();
        }
    });

    document.getElementById('btn-wishlist-bulk-preorder').addEventListener('click', async () => {
        if (selectedWishIds.size === 0) return;
        const wishes = await db.getWishlist();
        for (const id of selectedWishIds) {
            const wish = wishes.find(w => w.id === id);
            if (wish) {
                wish.vorbestellt = true;
                await db.saveWish(wish);
            }
        }
        selectedWishIds.clear();
        const masterCb = document.getElementById('bulk-select-all-wishes');
        if (masterCb) masterCb.checked = false;
        updateWishlistTable();
        updateBulkBar();
    });

    document.getElementById('btn-wishlist-bulk-plan').addEventListener('click', async () => {
        if (selectedWishIds.size === 0) return;
        const wishes = await db.getWishlist();
        for (const id of selectedWishIds) {
            const wish = wishes.find(w => w.id === id);
            if (wish) {
                wish.vorbestellt = false;
                await db.saveWish(wish);
            }
        }
        selectedWishIds.clear();
        const masterCb = document.getElementById('bulk-select-all-wishes');
        if (masterCb) masterCb.checked = false;
        updateWishlistTable();
        updateBulkBar();
    });

    document.getElementById('btn-wishlist-bulk-transfer').addEventListener('click', async () => {
        if (selectedWishIds.size === 0) return;
        if (confirm(`${selectedWishIds.size} Wünsche direkt in die Sammlung übertragen?\n(Die Einträge werden mit Standard-Bestand 'vorhanden' angelegt und aus der Wunschliste entfernt.)`)) {
            const wishes = await db.getWishlist();
            for (const id of selectedWishIds) {
                const wish = wishes.find(w => w.id === id);
                if (wish) {
                    const comicData = {
                        titel: wish.titel,
                        typ: wish.typ || '',
                        format: wish.format || '',
                        preis: wish.preis || null,
                        jahr: wish.jahr || null,
                        verlag: '',
                        serie: '',
                        nummer: null,
                        zustand: 'neu',
                        bezugsquelle: '',
                        sprache: 'Deutsch',
                        limitierung: false,
                        limitiert_auf: null,
                        variant: false,
                        variantname: '',
                        kaufdatum: '',
                        bestand: 'vorhanden',
                        gelesen_am: '',
                        bewertung: 0,
                        bild: ''
                    };
                    await db.saveComic(comicData);
                    await db.deleteWish(id);
                }
            }
            selectedWishIds.clear();
            const masterCb = document.getElementById('bulk-select-all-wishes');
            if (masterCb) masterCb.checked = false;
            updateWishlistTable();
            updateBulkBar();
        }
    });
    
    window.addEventListener('wishlist-updated-background', handleBackgroundWishlistUpdate);

    updateWishlistTable();
}

const handleBackgroundWishlistUpdate = () => {
    updateWishlistTable();
};

export function cleanupWishlist() {
    window.removeEventListener('wishlist-updated-background', handleBackgroundWishlistUpdate);
}

async function updateWishlistTable() {
    const tbody = document.getElementById('wishlist-body');
    if (!tbody) return;

    let wishes = await db.getWishlist();

    // 1. Update stats dynamically
    const totalItems = wishes.length;
    const totalBudget = wishes.reduce((sum, w) => sum + (parseFloat(w.preis) || 0), 0);
    const preorderedCount = wishes.filter(w => w.vorbestellt).length;

    const elTotalItems = document.getElementById('stat-total-items');
    const elTotalBudget = document.getElementById('stat-total-budget');
    const elTotalPreorders = document.getElementById('stat-total-preorders');

    const settings = db.getSettings();
    const currency = settings.currency || '€';

    if (elTotalItems) elTotalItems.textContent = totalItems;
    if (elTotalBudget) elTotalBudget.textContent = totalBudget.toFixed(2) + ' ' + currency;
    if (elTotalPreorders) elTotalPreorders.textContent = preorderedCount;

    // Update table header sorting icons
    const headers = document.querySelectorAll('.sortable-wish-header');
    headers.forEach(header => {
        const field = header.dataset.sort;
        const iconContainer = header.querySelector('.sort-icon-container');
        if (iconContainer) {
            if (sortBy !== field) {
                iconContainer.innerHTML = '<i class="fa-solid fa-sort" style="opacity: 0.2; margin-left: 5px; font-size: 0.8rem;"></i>';
            } else {
                iconContainer.innerHTML = sortOrder === 'asc' 
                    ? '<i class="fa-solid fa-caret-up" style="margin-left: 5px; color: var(--primary-color); font-size: 0.8rem;"></i>' 
                    : '<i class="fa-solid fa-caret-down" style="margin-left: 5px; color: var(--primary-color); font-size: 0.8rem;"></i>';
            }
        }
    });

    // 2. Filter wishes
    if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        wishes = wishes.filter(w => 
            String(w.titel || '').toLowerCase().includes(query) ||
            String(w.typ || '').toLowerCase().includes(query) ||
            String(w.format || '').toLowerCase().includes(query)
        );
    }

    // 3. Sort wishes
    wishes.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        if (sortBy === 'preis') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (sortBy === 'jahr') {
            valA = parseInt(valA) || 0;
            valB = parseInt(valB) || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (sortBy === 'vorbestellt') {
            valA = a.vorbestellt ? 1 : 0;
            valB = b.vorbestellt ? 1 : 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
    
    if (wishes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--text-secondary); font-style: italic;">Keine passenden Wünsche gefunden.</td></tr>`;
        return;
    }

    tbody.innerHTML = wishes.map(wish => {
        const isSelected = selectedWishIds.has(wish.id);
        return `
            <tr class="wishlist-row ${isSelected ? 'selected' : ''}" data-id="${wish.id}" style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem; transition: background-color 0.2s;">
                <td style="padding: 12px; text-align: center; vertical-align: middle;">
                    <input type="checkbox" class="wish-item-checkbox" data-id="${wish.id}" ${isSelected ? 'checked' : ''} style="accent-color: var(--primary-color); width: 16px; height: 16px; cursor: pointer; vertical-align: middle;">
                </td>
                <td data-label="Typ" style="padding: 12px; vertical-align: middle;">${escapeHTML(wish.typ) || '-'}</td>
                <td data-label="Name" class="wish-title-cell" style="padding: 12px; font-weight: 600; vertical-align: middle;">${escapeHTML(wish.titel)}</td>
                <td data-label="Format" style="padding: 12px; vertical-align: middle;">${escapeHTML(wish.format) || '-'}</td>
                <td data-label="Preis" style="padding: 12px; vertical-align: middle;">${wish.preis ? wish.preis.toFixed(2) + ' ' + currency : '-'}</td>
                <td data-label="Release" style="padding: 12px; vertical-align: middle;">${escapeHTML(wish.jahr) || '-'}</td>
                <td data-label="Status" style="padding: 12px; vertical-align: middle;">
                    <span class="badge ${wish.vorbestellt ? 'badge-vorbestellt' : 'badge-abgegeben'}" style="font-size: 0.75rem; padding: 4px 8px; border-radius: 6px;">
                        ${wish.vorbestellt ? 'Vorbestellt' : 'Geplant'}
                    </span>
                </td>
                <td data-label="Aktionen" style="padding: 12px; text-align: right; vertical-align: middle; white-space: nowrap;">
                    <button class="btn-transfer-wish" data-id="${wish.id}" title="In Sammlung verschieben" style="background:none; border:none; color:var(--success); cursor:pointer; margin-right:12px; font-size: 1rem;">
                        <i class="fa-solid fa-cart-arrow-down"></i>
                    </button>
                    <button class="btn-edit-wish" data-id="${wish.id}" title="Bearbeiten" style="background:none; border:none; color:var(--secondary-color); cursor:pointer; margin-right:12px; font-size: 1rem;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-delete-wish" data-id="${wish.id}" title="Löschen" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size: 1rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Bind item events
    tbody.querySelectorAll('.btn-edit-wish').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const wish = wishes.find(w => w.id === id);
            if (wish) openModal(wish, true);
        });
    });

    tbody.querySelectorAll('.btn-delete-wish').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Diesen Wunsch wirklich löschen?')) {
                await db.deleteWish(btn.dataset.id);
                selectedWishIds.delete(btn.dataset.id);
                updateWishlistTable();
                updateBulkBar();
            }
        });
    });

    tbody.querySelectorAll('.btn-transfer-wish').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const wish = wishes.find(w => w.id === id);
            if (wish) {
                // Prefill modal and set options to transfer
                openModal(wish, false, { transferFromWishId: wish.id });
            }
        });
    });

    // Bind row click for multi selection
    tbody.querySelectorAll('.wishlist-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.wish-item-checkbox')) return;
            const cb = row.querySelector('.wish-item-checkbox');
            if (cb) {
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    });

    tbody.querySelectorAll('.wish-item-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = cb.dataset.id;
            if (e.target.checked) {
                selectedWishIds.add(id);
                cb.closest('.wishlist-row')?.classList.add('selected');
            } else {
                selectedWishIds.delete(id);
                cb.closest('.wishlist-row')?.classList.remove('selected');
            }
            updateBulkBar();
        });
    });
}

function updateBulkBar() {
    const bar = document.getElementById('wishlist-bulk-bar');
    const countSpan = document.getElementById('wishlist-bulk-count');
    if (!bar || !countSpan) return;

    if (bar.timeoutId) {
        clearTimeout(bar.timeoutId);
        bar.timeoutId = null;
    }

    if (selectedWishIds.size > 0) {
        countSpan.textContent = `${selectedWishIds.size} ausgewählt`;
        bar.style.display = 'flex';
        bar.timeoutId = setTimeout(() => {
            bar.classList.add('show');
            bar.timeoutId = null;
        }, 10);
    } else {
        bar.classList.remove('show');
        bar.timeoutId = setTimeout(() => {
            if (!bar.classList.contains('show')) bar.style.display = 'none';
            bar.timeoutId = null;
        }, 300);
    }
}
