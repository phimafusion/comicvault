import { db } from '../../db.js';
import { openBulkEditModal } from '../form.js';
import { updateGrid, currentViewType, renderCollection } from '../collection.js';

export let isSelectModeActive = false;
export const selectedComicIds = new Set();

export function resetSelectMode() {
    isSelectModeActive = false;
    selectedComicIds.clear();
    document.body.classList.remove('bulk-select-active');
    const bar = document.getElementById('bulk-action-bar');
    if (bar) bar.remove();
}

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
            
            resetSelectMode();
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
