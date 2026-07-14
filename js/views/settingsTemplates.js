export function getSettingsHtml(settings) {
    return `
        <div class="view-controls" style="padding-top: 32px;">
            <h2 class="view-title">Einstellungen</h2>
        </div>
        
        <div class="details-grid">
            <!-- Sektion: Design & Themes -->
            <div class="details-card collapsible" style="flex-direction: column; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-palette" style="color: var(--primary-color);"></i> Design & Themes
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 16px; margin-top: 0;">Passe das Aussehen deiner ComicVault an.</p>
                    
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
            </div>

            <!-- Sektion: Schriftarten anpassen -->
            <div class="details-card collapsible" style="flex-direction: column; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-font" style="color: var(--primary-color);"></i> Schriftarten anpassen
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 16px; margin-top: 0;">Passe die Schriftarten für jedes Design individuell an.</p>
                    
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label">Zu konfigurierendes Design</label>
                        <select id="settings-font-theme-select" class="form-control">
                            <option value="default">Vibrant Modern</option>
                            <option value="hero">Classic Hero</option>
                            <option value="gotham">Midnight Gotham</option>
                            <option value="newsprint">Retro Newsprint</option>
                            <option value="cyberpunk">Cyberpunk Panel</option>
                            <option value="emerald">Emerald Forest</option>
                        </select>
                    </div>
                    
                    <div id="settings-theme-fonts-container" style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
                        <!-- Wird per JS befüllt -->
                    </div>
                    
                    <div style="display: flex; gap: 12px; margin-top: 24px; width: 100%;">
                        <button class="btn btn-primary" id="btn-save-theme-fonts" style="flex: 1;">
                            Speichern
                        </button>
                        <button class="btn btn-secondary" id="btn-reset-theme-fonts" style="flex: 1;">
                            Zurücksetzen
                        </button>
                    </div>
                </div>
            </div>

            <!-- Sektion: Standardwerte -->
            <div class="details-card collapsible" style="flex-direction: column; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-sliders" style="color: var(--primary-color);"></i> Standardwerte
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px; margin-top: 0;">Vorausgefüllte Felder für neue Comic-Einträge.</p>
                    
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
            </div>

            <!-- Sektion: Vorschlagslisten verwalten -->
            <div class="details-card collapsible" style="flex-direction: column; grid-column: span 2; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-list-check" style="color: var(--primary-color);"></i> Vorschlagslisten verwalten
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 16px; margin-top: 0;">Verwalte die vordefinierten Werte für die Autovervollständigung.</p>
                    
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
            </div>

            <!-- Sektion: KI-Verbindung -->
            <div class="details-card collapsible" style="flex-direction: column; grid-column: span 2; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-brain" style="color: var(--primary-color);"></i> KI-Verbindung (Gemini)
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 20px; margin-top: 0; font-size: 0.95rem; line-height: 1.5;">
                        Hinterlege hier deinen persönlichen **Gemini API-Schlüssel** von Google AI Studio, um vollkommen freie, dynamische Analysen und Experteneinschätzungen deiner Sammlung zu generieren. Der Schlüssel wird lokal in deinem Browser gespeichert.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
                        <div class="form-group">
                            <label class="form-label">Gemini API-Schlüssel</label>
                            <div style="display: flex; gap: 12px; align-items: center; position: relative;">
                                <input type="password" id="settings-gemini-api-key" class="form-control" style="flex: 1; padding-right: 40px;" value="${settings.geminiApiKey || ''}" placeholder="AIzaSy...">
                                <button class="btn btn-secondary" id="btn-toggle-api-key-visibility" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: transparent; padding: 6px; cursor: pointer; color: var(--text-secondary); font-size: 1.1rem; height: auto; width: auto; box-shadow: none;">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px; display: block;">
                                Du hast noch keinen Schlüssel? Erstelle dir einen kostenlosen Schlüssel unter <a href="https://aistudio.google.com/" target="_blank" style="color: var(--primary-color); text-decoration: underline; font-weight: 500;">Google AI Studio</a>.
                            </span>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" id="btn-save-gemini-key" style="margin-top: 24px; align-self: flex-start; width: 100%;">
                        API-Schlüssel speichern
                    </button>
                </div>
            </div>

            <!-- Sektion: Datenbank leeren -->
            <div class="details-card collapsible" style="flex-direction: column; grid-column: span 2; border-color: var(--primary-color);">
                <div class="settings-header" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; width: 100%; user-select: none;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-database" style="color: var(--primary-color);"></i> Datenbank leeren
                    </h3>
                    <i class="fa-solid fa-chevron-right toggle-icon" style="color: var(--text-secondary); transition: transform 0.2s ease; transform: rotate(90deg);"></i>
                </div>
                
                <div class="collapsible-content" style="display: flex; flex-direction: column; width: 100%; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <p style="color: var(--text-secondary); margin-bottom: 16px; margin-top: 0;">Verwalte deine gespeicherten Daten.</p>
                    
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
                        <h4 style="color: var(--danger); margin-bottom: 8px;">Gefahrenzone</h4>
                        <button class="btn btn-danger" id="btn-clear-database" style="width: 100%; justify-content: flex-start;">
                            <i class="fa-solid fa-trash-can"></i> Datenbank vollständig leeren
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .settings-header:hover h3 {
                color: var(--primary-color) !important;
            }
            .settings-header:hover .toggle-icon {
                color: var(--primary-color) !important;
            }
        </style>
    `;
}

export function getClearDatabaseModalHtml() {
    return `
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
}
