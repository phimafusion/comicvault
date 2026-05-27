import { FIELD_CONFIG, defaultVisibleFields } from './templates.js';

export function renderFieldConfigOverlay(visibleFields, currentViewType, onSave) {
    const existing = document.getElementById('field-config-overlay');
    if (existing) existing.remove();

    const viewNames = { list: 'Listenansicht', tiles: 'Kachelansicht', details: 'Detailansicht' };
    const currentViewName = viewNames[currentViewType];
    const activeFields = visibleFields[currentViewType] || [];

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
                    <button class="close-btn" id="btn-close-field-config"><i class="fa-solid fa-xmark"></i></button>
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
                        <button class="btn btn-secondary" id="btn-cancel-field-config">Abbrechen</button>
                        <button class="btn btn-primary" id="btn-save-field-config" style="margin-left: 8px;">Speichern</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    const overlay = document.getElementById('field-config-overlay');

    const closeOverlay = () => {
        overlay.remove();
    };

    document.getElementById('btn-close-field-config').addEventListener('click', closeOverlay);
    document.getElementById('btn-cancel-field-config').addEventListener('click', closeOverlay);

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
        
        closeOverlay();
        if (typeof onSave === 'function') {
            onSave(visibleFields);
        }
    });
}
