import { db } from '../db.js';
import { initAutocomplete } from '../components/autocomplete.js';

export function renderSettings(container) {
    const settings = db.getSettings();

    const html = `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Einstellungen</h2>
        </div>
        
        <div class="details-grid">
            <!-- Sektion: Design & Themes -->
            <div class="details-card" style="flex-direction: column;">
                <h3><i class="fa-solid fa-palette"></i> Design & Themes</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Passe das Aussehen deiner ComicVault an.</p>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">Farbschema</label>
                    <select id="settings-color-scheme" class="form-control">
                        <option value="default" ${settings.colorScheme === 'default' ? 'selected' : ''}>Vibrant Modern</option>
                        <option value="hero" ${settings.colorScheme === 'hero' ? 'selected' : ''}>Classic Hero</option>
                        <option value="gotham" ${settings.colorScheme === 'gotham' ? 'selected' : ''}>Midnight Gotham</option>
                        <option value="newsprint" ${settings.colorScheme === 'newsprint' ? 'selected' : ''}>Retro Newsprint</option>
                        <option value="cyberpunk" ${settings.colorScheme === 'cyberpunk' ? 'selected' : ''}>Cyberpunk Panel</option>
                        <option value="emerald" ${settings.colorScheme === 'emerald' ? 'selected' : ''}>Emerald Forest</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Modus</label>
                    <button class="btn btn-secondary" id="settings-toggle-dark" style="justify-content: flex-start; width: 100%;">
                        ${settings.theme === 'light' ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode'}
                    </button>
                </div>
            </div>

            <!-- Sektion: Standardwerte -->
            <div class="details-card" style="flex-direction: column;">
                <h3><i class="fa-solid fa-sliders"></i> Standardwerte</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Vorausgefüllte Felder für neue Comic-Einträge.</p>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Währung</label>
                        <select id="settings-currency" class="form-control">
                            <option value="€" ${settings.currency === '€' ? 'selected' : ''}>Euro (€)</option>
                            <option value="$" ${settings.currency === '$' ? 'selected' : ''}>Dollar ($)</option>
                            <option value="£" ${settings.currency === '£' ? 'selected' : ''}>Pfund (£)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Sprache</label>
                        <input type="text" id="settings-default-language" class="form-control" value="${settings.defaultLanguage || 'deutsch'}" placeholder="z.B. deutsch">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Zustand</label>
                        <input type="text" id="settings-default-condition" class="form-control" value="${settings.defaultCondition || 'neu'}" placeholder="z.B. neu">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Verlag</label>
                        <input type="text" id="settings-default-publisher" class="form-control" value="${settings.defaultPublisher || ''}" placeholder="z.B. Panini">
                    </div>
                </div>
                
                <button class="btn btn-primary" id="btn-save-defaults" style="margin-top: 24px; align-self: flex-start; width: 100%;">
                    Standardwerte speichern
                </button>
            </div>

            <!-- Sektion: Vorschlagslisten verwalten -->
            <div class="details-card" style="flex-direction: column; grid-column: span 2;">
                <h3><i class="fa-solid fa-list-check"></i> Vorschlagslisten verwalten</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Verwalte die vordefinierten Werte für die Autovervollständigung.</p>
                
                <div style="display: grid; grid-template-columns: minmax(180px, 200px) 1fr; gap: 20px; width: 100%;">
                    <div class="form-group">
                        <label class="form-label">Datenfeld auswählen</label>
                        <select id="settings-suggestion-field" class="form-control">
                            <option value="typ">Typ</option>
                            <option value="format">Format</option>
                            <option value="zustand">Zustand</option>
                            <option value="bestand">Bestand</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label class="form-label">Aktive Vorschläge</label>
                        <div id="settings-suggestions-tags" style="display: flex; flex-wrap: wrap; gap: 8px; min-height: 42px; padding: 10px; background-color: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                            <!-- Tags werden dynamisch gerendert -->
                        </div>
                        
                        <div id="settings-suggestions-error" style="color: var(--danger); font-size: 0.85rem; display: none; padding: 8px 12px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); margin-top: 4px; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span class="error-msg"></span>
                        </div>
                        
                        <div style="display: flex; gap: 12px; margin-top: 8px;">
                            <input type="text" id="settings-new-suggestion" class="form-control" style="flex: 1;" placeholder="Neuen Vorschlag eingeben...">
                            <button class="btn btn-primary" id="btn-add-suggestion" style="padding: 8px 16px; white-space: nowrap;">
                                <i class="fa-solid fa-plus"></i> Hinzufügen
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sektion: Datenverwaltung -->
            <div class="details-card" style="flex-direction: column;">
                <h3><i class="fa-solid fa-database"></i> Datenverwaltung</h3>
                <p style="color: var(--text-secondary); margin-bottom: 16px;">Exportiere deine Daten oder sichere sie.</p>
                
                <button class="btn btn-secondary" id="btn-export-json" style="margin-bottom: 12px; justify-content: flex-start;">
                    <i class="fa-solid fa-file-export"></i> Sammlung als JSON exportieren
                </button>
                
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <h4 style="color: var(--danger); margin-bottom: 8px;">Gefahrenzone</h4>
                    <button class="btn btn-danger" id="btn-clear-database" style="width: 100%; justify-content: flex-start;">
                        <i class="fa-solid fa-trash-can"></i> Datenbank vollständig leeren
                    </button>
                </div>
            </div>
            
            <!-- Sektion: Info -->
            <div class="details-card" style="flex-direction: column; justify-content: center; align-items: center; text-align: center;">
                <img src="comicvault_logo.png" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 0 20px var(--primary-color);">
                <h3 style="margin: 0;">ComicVault</h3>
                <p style="color: var(--text-secondary); margin-top: 4px;">
                    Version 1.2.5<br>
                    &copy; 2026 ComicVault Team
                </p>
                <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary);">
                    Daten werden in Firestore gespeichert.
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    // Vorschlagslisten-Steuerung
    const fieldSelect = document.getElementById('settings-suggestion-field');
    const tagsContainer = document.getElementById('settings-suggestions-tags');
    const newSugInput = document.getElementById('settings-new-suggestion');
    const addSugBtn = document.getElementById('btn-add-suggestion');
    const errorContainer = document.getElementById('settings-suggestions-error');
    const errorSpan = errorContainer.querySelector('.error-msg');

    function showError(message) {
        errorSpan.textContent = message;
        errorContainer.style.display = 'flex';
    }

    function hideError() {
        errorContainer.style.display = 'none';
        errorSpan.textContent = '';
    }

    async function renderTags() {
        const field = fieldSelect.value;
        const currentSettings = db.getSettings();
        const list = currentSettings.customSuggestions[field] || [];
        
        tagsContainer.innerHTML = '';
        if (list.length === 0) {
            tagsContainer.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.9rem;">Keine Vorschläge definiert.</span>';
            return;
        }

        list.forEach(val => {
            const tag = document.createElement('div');
            tag.className = 'suggestion-tag';
            tag.textContent = val;

            const removeSpan = document.createElement('span');
            removeSpan.className = 'suggestion-tag-remove';
            removeSpan.innerHTML = '&times;';
            removeSpan.title = 'Löschen';
            
            removeSpan.addEventListener('click', async (e) => {
                e.stopPropagation();
                hideError();
                // 1. Prüfen, ob der Wert in Comics oder Wunschliste verwendet wird
                const [comics, wishes] = await Promise.all([
                    db.getAllComics(),
                    db.getWishlist()
                ]);
                const allItems = [...comics, ...wishes];
                const isUsed = allItems.some(item => String(item[field] || '').toLowerCase() === val.toLowerCase());
                
                if (isUsed) {
                    showError(`Der Wert "${val}" kann nicht gelöscht werden, da er aktuell in deiner Sammlung oder Wunschliste verwendet wird.`);
                    return;
                }

                // 2. Entfernen
                const updatedSettings = db.getSettings();
                updatedSettings.customSuggestions[field] = (updatedSettings.customSuggestions[field] || []).filter(v => v !== val);
                db.saveSettings(updatedSettings);
                renderTags();
            });

            tag.appendChild(removeSpan);
            tagsContainer.appendChild(tag);
        });
    }

    fieldSelect.addEventListener('change', () => {
        hideError();
        renderTags();
    });
    
    addSugBtn.addEventListener('click', () => {
        hideError();
        const val = newSugInput.value.trim();
        if (!val) return;

        const field = fieldSelect.value;
        const currentSettings = db.getSettings();
        const list = currentSettings.customSuggestions[field] || [];

        if (list.some(v => v.toLowerCase() === val.toLowerCase())) {
            showError(`Der Wert "${val}" existiert bereits in dieser Liste.`);
            return;
        }

        list.push(val);
        list.sort();
        currentSettings.customSuggestions[field] = list;
        db.saveSettings(currentSettings);
        
        newSugInput.value = '';
        newSugInput.focus();
        renderTags();
    });

    newSugInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addSugBtn.click();
        }
    });

    newSugInput.addEventListener('input', hideError);

    // Initial rendern
    renderTags();

    // Theme Events
    document.getElementById('settings-color-scheme').addEventListener('change', (e) => {
        if (window.app) window.app.setColorScheme(e.target.value);
    });

    document.getElementById('settings-toggle-dark').addEventListener('click', () => {
        if (window.app) {
            window.app.toggleTheme();
            const newSettings = db.getSettings();
            const btn = document.getElementById('settings-toggle-dark');
            btn.innerHTML = newSettings.theme === 'light' ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode';
        }
    });

    // Save Defaults
    document.getElementById('btn-save-defaults').addEventListener('click', () => {
        const current = db.getSettings();
        current.currency = document.getElementById('settings-currency').value;
        current.defaultLanguage = document.getElementById('settings-default-language').value;
        current.defaultCondition = document.getElementById('settings-default-condition').value;
        current.defaultPublisher = document.getElementById('settings-default-publisher').value;

        db.saveSettings(current);
        alert('Standardwerte wurden gespeichert.');
    });

    // Export JSON
    document.getElementById('btn-export-json').addEventListener('click', async () => {
        try {
            const comics = await db.getAllComics();
            const wishlist = await db.getWishlist();
            const data = {
                export_date: new Date().toISOString(),
                comics: comics,
                wishlist: wishlist
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `comicvault_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Fehler beim Export: ' + e.message);
        }
    });

    // Clear Database
    document.getElementById('btn-clear-database').addEventListener('click', () => {
        showClearDatabaseModal();
    });

    // Autocomplete für Standardwerte aktivieren
    initAutocomplete(document.getElementById('settings-default-condition'), settings.customSuggestions.zustand || []);
    
    // Verlage dynamisch laden und Autocomplete aktivieren
    Promise.all([db.getAllComics(), db.getWishlist()]).then(([comics, wishes]) => {
        const allPublishers = [...new Set([...comics, ...wishes].map(c => c.verlag).filter(Boolean))].sort();
        initAutocomplete(document.getElementById('settings-default-publisher'), allPublishers);
    });
}

function showClearDatabaseModal() {
    // Falls das Modal bereits existiert (Sicherheitsmaßnahme), entfernen
    const existing = document.getElementById('db-clear-confirm-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="db-clear-confirm-modal" class="modal-overlay" style="z-index: 1100; opacity: 0; transition: opacity 0.2s ease; display: flex;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2>Datenbank löschen</h2>
                    <button class="close-btn" id="db-clear-modal-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
                    <p style="margin: 0; font-size: 1rem; color: var(--text-main); line-height: 1.5;">
                        Möchtest du wirklich <strong>ALLE Daten</strong> (Sammlung & Wunschliste) unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden!
                    </p>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--danger); font-weight: 500;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Diese Aktion ist endgültig!
                    </p>
                    <div class="form-group" style="margin-top: 8px;">
                        <label class="form-label" style="margin-bottom: 8px;">Bitte gib <strong>DELETE</strong> zur Bestätigung ein:</label>
                        <input type="text" id="db-clear-confirm-input" class="form-control" placeholder="DELETE" style="width: 100%;" autocomplete="off">
                    </div>
                </div>
                <div class="modal-footer" style="padding: 16px 24px;">
                    <button class="btn btn-secondary" id="db-clear-modal-cancel">Abbrechen</button>
                    <button class="btn btn-danger" id="db-clear-modal-confirm" disabled style="background-color: var(--danger); border-color: var(--danger); color: white; opacity: 0.5; cursor: not-allowed;">
                        <i class="fa-solid fa-trash-can"></i> Datenbank leeren
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('db-clear-confirm-modal');
    // Sanfter Fade-In
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 10);

    const closeBtn = document.getElementById('db-clear-modal-close');
    const cancelBtn = document.getElementById('db-clear-modal-cancel');
    const confirmBtn = document.getElementById('db-clear-modal-confirm');
    const confirmInput = document.getElementById('db-clear-confirm-input');

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    const closeModal = () => {
        modal.style.opacity = '0';
        document.removeEventListener('keydown', handleKeyDown);
        setTimeout(() => {
            modal.remove();
        }, 200);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', handleKeyDown);

    confirmInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val === 'DELETE') {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
    });

    confirmBtn.addEventListener('click', async () => {
        if (confirmInput.value !== 'DELETE') return;

        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Lösche Datenbank...';
        confirmInput.disabled = true;
        cancelBtn.disabled = true;
        closeBtn.disabled = true;

        try {
            await db.clearAllData();
            alert('Datenbank wurde erfolgreich geleert.');
            closeModal();
            if (!window.__TESTING__) {
                window.location.reload();
            }
        } catch (e) {
            alert('Fehler beim Löschen der Daten: ' + e.message);
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Datenbank leeren';
            confirmInput.disabled = false;
            cancelBtn.disabled = false;
            closeBtn.disabled = false;
        }
    });

    // Input direkt fokussieren
    setTimeout(() => {
        confirmInput.focus();
    }, 50);
}


