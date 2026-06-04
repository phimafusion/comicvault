import { db } from '../db.js';
import { initAutocomplete } from '../components/autocomplete.js';

const fontPresets = [
    { name: 'Inter', value: "'Inter', sans-serif" },
    { name: 'Outfit', value: "'Outfit', sans-serif" },
    { name: 'Bangers', value: "'Bangers', cursive" },
    { name: 'Special Elite', value: "'Special Elite', cursive" },
    { name: 'Rajdhani', value: "'Rajdhani', sans-serif" },
    { name: 'Courier New', value: "'Courier New', monospace" },
    { name: 'Georgia', value: "Georgia, serif" },
    { name: 'System UI', value: "system-ui, sans-serif" }
];

const themeFontConfigs = {
    default: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Outfit', sans-serif" }
    ],
    hero: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Bangers', cursive" }
    ],
    gotham: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Outfit', sans-serif" }
    ],
    newsprint: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Special Elite', cursive" },
        { label: 'Schreibmaschinen-Schriftart', varName: '--font-typewriter', defaultPreset: "'Courier New', monospace" }
    ],
    cyberpunk: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Rajdhani', sans-serif" },
        { label: 'Code-Schriftart', varName: '--font-code', defaultPreset: "'Courier New', monospace" }
    ],
    emerald: [
        { label: 'Text-Schriftart', varName: '--font-primary', defaultPreset: "'Inter', sans-serif" },
        { label: 'Titel-Schriftart', varName: '--font-display', defaultPreset: "'Outfit', sans-serif" }
    ]
};

function normalizeFontFamily(font) {
    if (!font) return '';
    return font.toLowerCase().replace(/['"]/g, '').trim();
}

export function renderSettings(container) {
    const settings = db.getSettings();

    const html = `
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
    container.innerHTML = html;

    // Collapsible Logic
    const collapsibles = container.querySelectorAll('.collapsible');
    collapsibles.forEach(card => {
        const header = card.querySelector('.settings-header');
        const content = card.querySelector('.collapsible-content');
        const icon = card.querySelector('.toggle-icon');

        header.addEventListener('click', () => {
            const isCollapsed = content.style.display === 'none';
            if (isCollapsed) {
                content.style.display = 'flex';
                icon.style.transform = 'rotate(90deg)';
                card.style.borderColor = 'var(--primary-color)';
            } else {
                content.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
                card.style.borderColor = 'var(--border-color)';
            }
        });
    });

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

    // Schriftarten anpassen Logik
    function renderFontConfigsForTheme(themeName) {
        const fontContainer = document.getElementById('settings-theme-fonts-container');
        if (!fontContainer) return;

        const currentSettings = db.getSettings();
        const customFonts = (currentSettings.themeFonts && currentSettings.themeFonts[themeName]) || {};

        const configs = themeFontConfigs[themeName] || [];
        fontContainer.innerHTML = '';

        configs.forEach((cfg) => {
            const savedVal = customFonts[cfg.varName] || '';
            
            let matchedPreset = null;
            if (savedVal) {
                matchedPreset = fontPresets.find(p => normalizeFontFamily(p.value) === normalizeFontFamily(savedVal));
            }

            const isCustom = savedVal && !matchedPreset;
            const selectedValue = isCustom ? 'custom' : (matchedPreset ? matchedPreset.value : '');

            const groupDiv = document.createElement('div');
            groupDiv.className = 'form-group font-config-group';
            groupDiv.dataset.varName = cfg.varName;
            groupDiv.style.display = 'flex';
            groupDiv.style.flexDirection = 'column';
            groupDiv.style.gap = '8px';

            groupDiv.innerHTML = `
                <label class="form-label">${cfg.label} (<code style="font-size:0.8rem; color:var(--primary-color);">${cfg.varName}</code>)</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <select class="form-control font-preset-select">
                        <option value="" ${!selectedValue ? 'selected' : ''}>-- Standard-Schriftart --</option>
                        ${fontPresets.map(p => `<option value="${p.value}" ${selectedValue === p.value ? 'selected' : ''}>${p.name}</option>`).join('')}
                        <option value="custom" ${selectedValue === 'custom' ? 'selected' : ''}>Eigene Schriftart...</option>
                    </select>
                    <input type="text" class="form-control font-custom-input" 
                           placeholder="Schriftart-Name (z.B. 'Roboto', sans-serif)" 
                           value="${isCustom ? savedVal : ''}" 
                           style="display: ${isCustom ? 'block' : 'none'};">
                    <div class="font-preview" style="font-size: 1rem; margin-top: 4px; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px dashed var(--border-color); background-color: var(--bg-main); transition: var(--transition);">
                        ComicVault - Die ultimative Comicsammlung!
                    </div>
                </div>
            `;

            const select = groupDiv.querySelector('.font-preset-select');
            const customInput = groupDiv.querySelector('.font-custom-input');
            const preview = groupDiv.querySelector('.font-preview');

            const updatePreview = () => {
                let fontValue = '';
                if (select.value === 'custom') {
                    fontValue = customInput.value.trim();
                } else {
                    fontValue = select.value;
                }

                if (fontValue) {
                    preview.style.fontFamily = fontValue;
                } else {
                    preview.style.fontFamily = cfg.defaultPreset;
                }
            };

            select.addEventListener('change', (e) => {
                if (e.target.value === 'custom') {
                    customInput.style.display = 'block';
                    customInput.focus();
                } else {
                    customInput.style.display = 'none';
                }
                updatePreview();
            });

            customInput.addEventListener('input', updatePreview);

            // Initial preview application
            updatePreview();

            fontContainer.appendChild(groupDiv);
        });
    }

    const activeColorScheme = settings.colorScheme || 'default';
    const fontThemeSelect = document.getElementById('settings-font-theme-select');
    if (fontThemeSelect) {
        fontThemeSelect.value = activeColorScheme;
        renderFontConfigsForTheme(activeColorScheme);

        fontThemeSelect.addEventListener('change', (e) => {
            renderFontConfigsForTheme(e.target.value);
        });
    }

    const saveThemeFontsBtn = document.getElementById('btn-save-theme-fonts');
    if (saveThemeFontsBtn) {
        saveThemeFontsBtn.addEventListener('click', () => {
            const themeName = fontThemeSelect.value;
            const currentSettings = db.getSettings();
            
            if (!currentSettings.themeFonts) {
                currentSettings.themeFonts = {};
            }
            if (!currentSettings.themeFonts[themeName]) {
                currentSettings.themeFonts[themeName] = {};
            }

            const groups = container.querySelectorAll('.font-config-group');
            groups.forEach(group => {
                const varName = group.dataset.varName;
                const select = group.querySelector('.font-preset-select');
                const customInput = group.querySelector('.font-custom-input');

                let fontValue = '';
                if (select.value === 'custom') {
                    fontValue = customInput.value.trim();
                } else {
                    fontValue = select.value;
                }

                if (fontValue) {
                    currentSettings.themeFonts[themeName][varName] = fontValue;
                } else {
                    delete currentSettings.themeFonts[themeName][varName];
                }
            });

            db.saveSettings(currentSettings);
            
            if (window.app) {
                window.app.applyTheme();
            }
            
            alert('Schriftarten für dieses Design wurden gespeichert.');
        });
    }

    const resetThemeFontsBtn = document.getElementById('btn-reset-theme-fonts');
    if (resetThemeFontsBtn) {
        resetThemeFontsBtn.addEventListener('click', () => {
            const themeName = fontThemeSelect.value;
            const currentSettings = db.getSettings();
            
            if (currentSettings.themeFonts && currentSettings.themeFonts[themeName]) {
                delete currentSettings.themeFonts[themeName];
                db.saveSettings(currentSettings);
            }

            if (window.app) {
                window.app.applyTheme();
            }

            renderFontConfigsForTheme(themeName);
            alert('Schriftarten wurden auf Standard zurückgesetzt.');
        });
    }

    // Theme Events
    document.getElementById('settings-color-scheme').addEventListener('change', (e) => {
        const newScheme = e.target.value;
        if (window.app) window.app.setColorScheme(newScheme);
        const fSelect = document.getElementById('settings-font-theme-select');
        if (fSelect) {
            fSelect.value = newScheme;
            renderFontConfigsForTheme(newScheme);
        }
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

    // Save Gemini Key
    const saveKeyBtn = document.getElementById('btn-save-gemini-key');
    if (saveKeyBtn) {
        saveKeyBtn.addEventListener('click', () => {
            const current = db.getSettings();
            current.geminiApiKey = document.getElementById('settings-gemini-api-key').value.trim();
            db.saveSettings(current);
            alert('Gemini API-Schlüssel wurde erfolgreich gespeichert.');
        });
    }

    // Toggle API Key visibility
    const toggleKeyVisibilityBtn = document.getElementById('btn-toggle-api-key-visibility');
    if (toggleKeyVisibilityBtn) {
        toggleKeyVisibilityBtn.addEventListener('click', () => {
            const input = document.getElementById('settings-gemini-api-key');
            const icon = toggleKeyVisibilityBtn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fa-solid fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fa-solid fa-eye';
            }
        });
    }

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


