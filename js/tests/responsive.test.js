import { App } from '../app.js';
import { db } from '../db.js';

const { expect } = chai;

describe('Responsive Layout & Mobile Menu Tests', () => {
    let originalAuth;
    let originalGetSettings;
    let originalSaveSettings;
    let container;
    let appInstance;

    before(() => {
        // Backup Firebase Auth
        originalAuth = firebase.auth;
        
        // Mock Firebase Auth to trigger logged-in state immediately
        firebase.auth = () => ({
            onAuthStateChanged: (callback) => {
                callback({ uid: 'mock-user-id' });
            },
            currentUser: { uid: 'mock-user-id' }
        });

        // Backup DB settings
        originalGetSettings = db.getSettings;
        originalSaveSettings = db.saveSettings;

        // Mock settings
        db.getSettings = () => ({
            theme: 'dark',
            colorScheme: 'default',
            customSuggestions: {
                typ: [],
                format: [],
                zustand: [],
                bestand: []
            }
        });
        db.saveSettings = () => {};
    });

    after(() => {
        // Restore backups
        firebase.auth = originalAuth;
        db.getSettings = originalGetSettings;
        db.saveSettings = originalSaveSettings;
    });

    beforeEach(() => {
        // Create full Mock DOM elements required by App cacheDOM
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

        // Instantiate App (will run init, cacheDOM, bindEvents)
        appInstance = new App();
    });

    afterEach(() => {
        // Cleanup DOM
        if (container) {
            container.remove();
        }
    });

    it('sollte den Hamburger-Button und das Sidebar-Overlay cachen', () => {
        expect(appInstance.btnMenuToggle).to.not.be.null;
        expect(appInstance.sidebarOverlay).to.not.be.null;
        expect(appInstance.sidebar).to.not.be.null;
    });

    it('sollte bei Klick auf den Hamburger-Button die Klasse "open" toggeln', () => {
        const toggleBtn = container.querySelector('#btn-menu-toggle');
        const sidebar = container.querySelector('.sidebar');
        const overlay = container.querySelector('#sidebar-overlay');

        expect(sidebar.classList.contains('open')).to.be.false;
        expect(overlay.classList.contains('open')).to.be.false;

        // Klick auslösen zum Öffnen
        toggleBtn.click();
        expect(sidebar.classList.contains('open')).to.be.true;
        expect(overlay.classList.contains('open')).to.be.true;

        // Klick auslösen zum Schließen
        toggleBtn.click();
        expect(sidebar.classList.contains('open')).to.be.false;
        expect(overlay.classList.contains('open')).to.be.false;
    });

    it('sollte bei Klick auf das Sidebar-Overlay die Klasse "open" entfernen', () => {
        const toggleBtn = container.querySelector('#btn-menu-toggle');
        const sidebar = container.querySelector('.sidebar');
        const overlay = container.querySelector('#sidebar-overlay');

        // Menü öffnen
        toggleBtn.click();
        expect(sidebar.classList.contains('open')).to.be.true;

        // Overlay klicken
        overlay.click();
        expect(sidebar.classList.contains('open')).to.be.false;
        expect(overlay.classList.contains('open')).to.be.false;
    });

    it('sollte die Sidebar schließen, wenn ein Navigationselement angeklickt wird', () => {
        const toggleBtn = container.querySelector('#btn-menu-toggle');
        const sidebar = container.querySelector('.sidebar');
        const overlay = container.querySelector('#sidebar-overlay');
        const navItem = container.querySelector('.nav-item[data-view="collection"]');

        // Menü öffnen
        toggleBtn.click();
        expect(sidebar.classList.contains('open')).to.be.true;

        // Auf Nav-Item klicken
        navItem.click();
        expect(sidebar.classList.contains('open')).to.be.false;
        expect(overlay.classList.contains('open')).to.be.false;
    });
});
