import { App } from '../app.js';
import { db } from '../db.js';
import { renderSettings } from '../views/settings.js';

const { expect } = chai;

describe('Theme Fonts Settings & Application Tests', () => {
    let originalAuth;
    let originalGetSettings;
    let originalSaveSettings;
    let originalGetAllComics;
    let originalGetWishlist;
    let originalNavigate;
    let container;
    let appInstance;
    let savedSettings = null;

    before(() => {
        // Backup Firebase Auth
        originalAuth = firebase.auth;
        firebase.auth = () => ({
            onAuthStateChanged: (callback) => {
                callback({ uid: 'mock-user-id' });
            },
            currentUser: { uid: 'mock-user-id' }
        });

        // Backup DB settings functions
        originalGetSettings = db.getSettings;
        originalSaveSettings = db.saveSettings;
        originalGetAllComics = db.getAllComics;
        originalGetWishlist = db.getWishlist;

        // Custom local mock settings store
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

        db.getSettings = () => JSON.parse(JSON.stringify(savedSettings));
        db.saveSettings = (newSettings) => {
            savedSettings = newSettings;
        };
        db.getAllComics = async () => [];
        db.getWishlist = async () => [];
    });

    after(() => {
        firebase.auth = originalAuth;
        db.getSettings = originalGetSettings;
        db.saveSettings = originalSaveSettings;
        db.getAllComics = originalGetAllComics;
        db.getWishlist = originalGetWishlist;
    });

    beforeEach(() => {
        // Mock navigate to prevent rendering collection/other views asynchronously during settings tests
        originalNavigate = App.prototype.navigate;
        App.prototype.navigate = () => {};

        container = document.createElement('div');
        container.innerHTML = `
            <div id="login-screen" style="display:none;">
                <button id="btn-google-login"></button>
                <div id="login-error"></div>
            </div>
            <div id="app-container" style="display:none;">
                <aside class="sidebar">
                    <button class="nav-item" data-view="collection">Collection</button>
                    <button class="nav-item" data-view="settings">Settings</button>
                    <button id="theme-toggle"></button>
                    <button id="btn-logout"></button>
                </aside>
                <div id="sidebar-overlay"></div>
                <main class="main-content">
                    <header class="top-header">
                        <button id="btn-menu-toggle"></button>
                        <input type="text" id="global-search">
                        <select id="theme-select"></select>
                        <button id="btn-add-new"></button>
                    </header>
                    <div id="view-container"></div>
                </main>
            </div>
        `;
        document.body.appendChild(container);
        
        // Ensure inline font overrides on root are cleared
        const fontVars = ['--font-primary', '--font-display', '--font-typewriter', '--font-code'];
        fontVars.forEach(v => document.documentElement.style.removeProperty(v));

        appInstance = new App();
        window.app = appInstance;
    });

    afterEach(() => {
        if (container) {
            container.remove();
        }
        window.app = null;
        App.prototype.navigate = originalNavigate;
        const fontVars = ['--font-primary', '--font-display', '--font-typewriter', '--font-code'];
        fontVars.forEach(v => document.documentElement.style.removeProperty(v));
    });

    it('sollte standardmäßig keine Inline-Schriftart-Overrides auf documentElement haben', () => {
        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('');
        expect(document.documentElement.style.getPropertyValue('--font-display')).to.equal('');
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

        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('Georgia, serif');
        expect(document.documentElement.style.getPropertyValue('--font-display')).to.equal("'Bangers', cursive");
        expect(document.documentElement.style.getPropertyValue('--font-typewriter')).to.equal('Courier New, monospace');
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
        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('Georgia, serif');

        // Wechsel zu default ohne custom fonts
        savedSettings.colorScheme = 'default';
        appInstance.applyTheme();
        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('');
        expect(document.documentElement.style.getPropertyValue('--font-display')).to.equal('');
    });

    it('sollte die korrekte Anzahl an Feldern für jedes Design im Einstellungs-UI rendern', () => {
        const viewContainer = container.querySelector('#view-container');
        renderSettings(viewContainer);

        // Standardmäßig sollte default (Vibrant Modern) aktiv sein -> 2 Felder
        const select = viewContainer.querySelector('#settings-font-theme-select');
        throw new Error("HTML content is: " + viewContainer.innerHTML);
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
        expect(savedSettings.themeFonts.default['--font-primary']).to.equal('MyCustomFont');

        // Im documentElement prüfen (wurde sofort über window.app.applyTheme() angewendet)
        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('MyCustomFont');
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
        expect(savedSettings.themeFonts.default).to.be.undefined;
        
        // Im documentElement prüfen
        expect(document.documentElement.style.getPropertyValue('--font-primary')).to.equal('');
    });
});
