import { setupTestEnv, cleanup } from './testHelper.js';

const { expect } = chai;

describe('Responsive Layout & Mobile Menu Tests', () => {
    let testEnv;
    let container;
    let appInstance;

    let originalMatchMedia;

    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
        window.matchMedia = (query) => ({
            matches: false, // Desktop-Modus erzwingen für deterministische Testergebnisse
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => {}
        });

        testEnv = setupTestEnv();
        container = testEnv.container;
        appInstance = testEnv.appInstance;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        cleanup();
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

    it('sollte den Mobile-Layout-Toggle-Button cachen', () => {
        expect(appInstance.btnMobileToggle).to.not.be.null;
    });

    it('sollte bei Klick auf den Mobile-Layout-Toggle-Button die Klasse "mobile-view" auf body toggeln und im localStorage speichern', () => {
        localStorage.removeItem('comicvault_force_mobile');
        appInstance.checkMobileView();
        const initialMobileView = document.body.classList.contains('mobile-view');

        const toggleBtn = container.querySelector('#btn-mobile-toggle');
        
        // Klick auslösen
        toggleBtn.click();
        expect(document.body.classList.contains('mobile-view')).to.equal(!initialMobileView);
        expect(localStorage.getItem('comicvault_force_mobile')).to.equal('true');

        // Erneut klicken
        toggleBtn.click();
        expect(document.body.classList.contains('mobile-view')).to.equal(initialMobileView);
        expect(localStorage.getItem('comicvault_force_mobile')).to.be.null;
    });
});
