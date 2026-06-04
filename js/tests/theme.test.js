import { setupTestEnv, cleanup } from './testHelper.js';
import { renderSettings } from '../views/settings.js';
import { db } from '../db.js';

const { expect } = chai;

function normalizeFontFamily(font) {
    if (!font) return '';
    return font.toLowerCase().replace(/['"]/g, '').trim();
}

describe('Theme Fonts Settings & Application Tests', () => {
    let testEnv;
    let container;
    let appInstance;
    let savedSettings = null;

    beforeEach(() => {
        savedSettings = {
            theme: 'dark',
            colorScheme: 'default',
            themeFonts: {},
            customSuggestions: {
                typ: [],
                format: [],
                zustand: [],
                bestand: []
            }
        };

        testEnv = setupTestEnv({
            settings: savedSettings
        });
        container = testEnv.container;
        appInstance = testEnv.appInstance;
    });

    afterEach(() => {
        cleanup();
    });

    it('sollte standardmäßig keine Inline-Schriftart-Overrides auf body haben', () => {
        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('');
        expect(document.body.style.getPropertyValue('--font-display')).to.equal('');
    });

    it('sollte benutzerdefinierte Schriftarten anwenden, wenn sie konfiguriert sind', () => {
        savedSettings.colorScheme = 'newsprint';
        savedSettings.themeFonts = {
            newsprint: {
                '--font-primary': 'Georgia, serif',
                '--font-display': "'Bangers', cursive",
                '--font-typewriter': 'Courier New, monospace'
            }
        };

        appInstance.applyTheme();

        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('Georgia, serif');
        expect(document.body.style.getPropertyValue('--font-display')).to.equal("'Bangers', cursive");
        expect(document.body.style.getPropertyValue('--font-typewriter')).to.equal('Courier New, monospace');
    });

    it('sollte alte Schriftarten entfernen, wenn das Farbschema zu einem ohne Einstellungen wechselt', () => {
        // Setzt zuerst Newsprint mit Custom Fonts
        savedSettings.colorScheme = 'newsprint';
        savedSettings.themeFonts = {
            newsprint: {
                '--font-primary': 'Georgia, serif',
                '--font-display': "'Bangers', cursive"
            }
        };
        appInstance.applyTheme();
        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('Georgia, serif');

        // Wechsel zu default ohne custom fonts
        savedSettings.colorScheme = 'default';
        appInstance.applyTheme();
        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('');
        expect(document.body.style.getPropertyValue('--font-display')).to.equal('');
    });

    it('sollte die korrekte Anzahl an Feldern für jedes Design im Einstellungs-UI rendern', () => {
        const viewContainer = container.querySelector('#view-container');
        renderSettings(viewContainer);

        // Standardmäßig sollte default (Vibrant Modern) aktiv sein -> 2 Felder
        const select = viewContainer.querySelector('#settings-font-theme-select');
        expect(viewContainer.innerHTML).to.contain('Schriftarten anpassen');
        expect(select).to.not.be.null;
        expect(select.value).to.equal('default');

        let fontConfigGroups = viewContainer.querySelectorAll('.font-config-group');
        expect(fontConfigGroups.length).to.equal(2);

        // Zu Newsprint wechseln -> 3 Felder
        select.value = 'newsprint';
        select.dispatchEvent(new Event('change'));

        fontConfigGroups = viewContainer.querySelectorAll('.font-config-group');
        expect(fontConfigGroups.length).to.equal(3);
        expect(fontConfigGroups[2].dataset.varName).to.equal('--font-typewriter');

        // Zu Cyberpunk wechseln -> 3 Felder
        select.value = 'cyberpunk';
        select.dispatchEvent(new Event('change'));

        fontConfigGroups = viewContainer.querySelectorAll('.font-config-group');
        expect(fontConfigGroups.length).to.equal(3);
        expect(fontConfigGroups[2].dataset.varName).to.equal('--font-code');

        // Zu Gotham wechseln -> 2 Felder
        select.value = 'gotham';
        select.dispatchEvent(new Event('change'));

        fontConfigGroups = viewContainer.querySelectorAll('.font-config-group');
        expect(fontConfigGroups.length).to.equal(2);
    });

    it('sollte die Schriftart-Einstellungen in der Datenbank speichern und sofort anwenden', () => {
        const viewContainer = container.querySelector('#view-container');
        renderSettings(viewContainer);

        const select = viewContainer.querySelector('#settings-font-theme-select');
        select.value = 'default';
        select.dispatchEvent(new Event('change'));

        const groups = viewContainer.querySelectorAll('.font-config-group');
        const primaryGroup = Array.from(groups).find(g => g.dataset.varName === '--font-primary');
        const primarySelect = primaryGroup.querySelector('.font-preset-select');
        const primaryInput = primaryGroup.querySelector('.font-custom-input');

        // Custom Font auswählen
        primarySelect.value = 'custom';
        primarySelect.dispatchEvent(new Event('change'));
        primaryInput.value = 'MyCustomFont';

        // Speichern klicken
        const originalAlert = window.alert;
        window.alert = () => {};

        const saveBtn = viewContainer.querySelector('#btn-save-theme-fonts');
        saveBtn.click();

        window.alert = originalAlert;

        // In DB prüfen
        expect(db.getSettings().themeFonts.default['--font-primary']).to.equal('MyCustomFont');

        // Im body prüfen (wurde sofort über window.app.applyTheme() angewendet)
        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('MyCustomFont');
    });

    it('sollte die Schriftart-Einstellungen beim Klick auf "Zurücksetzen" zurücksetzen', () => {
        savedSettings.themeFonts = {
            default: {
                '--font-primary': 'SomeSavedFont'
            }
        };

        const viewContainer = container.querySelector('#view-container');
        renderSettings(viewContainer);

        const select = viewContainer.querySelector('#settings-font-theme-select');
        select.value = 'default';
        select.dispatchEvent(new Event('change'));

        // Mock alert
        const originalAlert = window.alert;
        window.alert = () => {};

        const resetBtn = viewContainer.querySelector('#btn-reset-theme-fonts');
        resetBtn.click();

        window.alert = originalAlert;

        // In DB prüfen
        expect(db.getSettings().themeFonts.default).to.be.undefined;
        
        // Im body prüfen
        expect(document.body.style.getPropertyValue('--font-primary')).to.equal('');
    });

    it('sollte eine Live-Schriftartenvorschau anzeigen, wenn eine Schriftart ausgewählt oder eingegeben wird', () => {
        const viewContainer = container.querySelector('#view-container');
        renderSettings(viewContainer);

        const select = viewContainer.querySelector('#settings-font-theme-select');
        select.value = 'default';
        select.dispatchEvent(new Event('change'));

        const groups = viewContainer.querySelectorAll('.font-config-group');
        const primaryGroup = Array.from(groups).find(g => g.dataset.varName === '--font-primary');
        const primarySelect = primaryGroup.querySelector('.font-preset-select');
        const primaryInput = primaryGroup.querySelector('.font-custom-input');
        const primaryPreview = primaryGroup.querySelector('.font-preview');

        expect(primaryPreview).to.not.be.null;
        
        // Sollte standardmäßig den defaultPreset-Wert nutzen
        expect(normalizeFontFamily(primaryPreview.style.fontFamily)).to.equal(normalizeFontFamily("'Inter', sans-serif"));

        // Preset ändern -> Vorschau aktualisiert
        primarySelect.value = "'Bangers', cursive";
        primarySelect.dispatchEvent(new Event('change'));
        expect(normalizeFontFamily(primaryPreview.style.fontFamily)).to.equal(normalizeFontFamily("'Bangers', cursive"));

        // Custom auswählen und eingeben -> Vorschau aktualisiert
        primarySelect.value = "custom";
        primarySelect.dispatchEvent(new Event('change'));
        primaryInput.value = "MyTemporaryFont";
        primaryInput.dispatchEvent(new Event('input'));
        expect(normalizeFontFamily(primaryPreview.style.fontFamily)).to.equal(normalizeFontFamily("MyTemporaryFont"));
    });
});
