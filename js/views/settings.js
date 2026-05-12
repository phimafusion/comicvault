import { db } from '../db.js';

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
    document.getElementById('btn-clear-database').addEventListener('click', async () => {
        const confirm1 = confirm('Möchtest du wirklich ALLE Daten (Sammlung & Wunschliste) löschen? Dies kann nicht rückgängig gemacht werden!');
        if (confirm1) {
            const confirm2 = confirm('Bist du dir ABSOLUT sicher? Alle Einträge werden entfernt.');
            if (confirm2) {
                const btn = document.getElementById('btn-clear-database');
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Lösche Datenbank...';

                try {
                    await db.clearAllData();
                    alert('Datenbank wurde erfolgreich geleert.');
                    window.location.reload();
                } catch (e) {
                    alert('Fehler beim Löschen der Daten: ' + e.message);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Datenbank vollständig leeren';
                }
            }
        }
    });
}

