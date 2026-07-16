import { db } from '../db.js';
import { initAutocomplete } from '../components/autocomplete.js';
import { getSettingsHtml, getClearDatabaseModalHtml } from './settingsTemplates.js';

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

    const html = getSettingsHtml(settings);
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

    document.getElementById('settings-font-size').addEventListener('change', (e) => {
        const newSize = e.target.value;
        const currentSettings = db.getSettings();
        currentSettings.fontSize = newSize;
        db.saveSettings(currentSettings);
        if (window.app) {
            window.app.applyTheme();
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

    // PWA Install Card Handling
    const installCard = document.getElementById('pwa-install-card');
    if (installCard) {
        if (window.deferredPrompt) {
            installCard.style.display = 'flex';
        }
        
        const installBtn = document.getElementById('btn-pwa-install');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                const promptEvent = window.deferredPrompt;
                if (!promptEvent) return;
                
                promptEvent.prompt();
                const { outcome } = await promptEvent.userChoice;
                console.log(`User prompt choice: ${outcome}`);
                
                window.deferredPrompt = null;
                installCard.style.display = 'none';
            });
        }
    }

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

    const modalHtml = getClearDatabaseModalHtml();

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


