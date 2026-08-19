import { setupTestEnv, cleanup, tick } from './testHelper.js';
import { renderSubscriptions } from '../views/subscriptions.js';
import { renderDuplicates, openMergeModal } from '../views/duplicates.js';
import { db } from '../db.js';

const { expect } = chai;

describe('Responsives Layout & Mobile Navigationstests', () => {
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

    it('sollte in der Abonnements-Ansicht mobile-fähige Container- und Tabellen-Klassen nutzen', async () => {
        await db.saveSubscription({ titel: 'Spider-Man Abo', verlag: 'Panini', haendler: 'Comic Shop' });
        await renderSubscriptions(container);
        await tick();

        const tableContainer = container.querySelector('.subscriptions-table-container');
        expect(tableContainer).to.not.be.null;

        const table = container.querySelector('table.subscriptions-table');
        expect(table).to.not.be.null;

        const firstRowCells = container.querySelectorAll('#subscriptions-body tr td');
        expect(firstRowCells.length).to.be.at.least(5);
        expect(firstRowCells[0].getAttribute('data-label')).to.equal('Titel');
        expect(firstRowCells[1].getAttribute('data-label')).to.equal('Verlag');
        expect(firstRowCells[2].getAttribute('data-label')).to.equal('Händler');
        expect(firstRowCells[3].getAttribute('data-label')).to.equal('Status');
        expect(firstRowCells[4].getAttribute('data-label')).to.equal('Aktionen');
    });

    it('sollte im Duplikat-Finder mobile-fähige CSS-Klassen für Grids, KPIs und Merge-Table rendern', async () => {
        await db.saveComic({ titel: 'Batman #1', serie: 'Batman', nummer: 1, verlag: 'DC', format: 'Heft', bestand: 'vorhanden' });
        await db.saveComic({ titel: 'Batman #1', serie: 'Batman', nummer: 1, verlag: 'DC', format: 'Heft', bestand: 'vorhanden' });

        await renderDuplicates(container);
        await tick();

        const kpiGrid = container.querySelector('.duplicates-kpi-grid');
        expect(kpiGrid).to.not.be.null;

        const pairHeader = container.querySelector('.duplicates-pair-header');
        expect(pairHeader).to.not.be.null;

        const comparisonGrid = container.querySelector('.duplicate-comparison-grid');
        expect(comparisonGrid).to.not.be.null;

        const specDetails = container.querySelectorAll('.duplicate-spec-details');
        expect(specDetails.length).to.be.at.least(2);

        // Prüfen, dass kein invalider inline @media Style mehr existiert
        const comparisonElem = container.querySelector('.duplicate-comparison-grid');
        expect(comparisonElem.getAttribute('style') || '').to.not.include('@media');

        // Merge Modal öffnen
        const mergeBtn = container.querySelector('.btn-open-merge-pair');
        if (mergeBtn) {
            mergeBtn.click();
            await tick();
            const mergeTable = document.querySelector('table.merge-fields-table');
            expect(mergeTable).to.not.be.null;
        }
    });

    it('sollte sicherstellen, dass das Sidebar Navigationselement im DOM existiert', () => {
        const sidebar = container.querySelector('.sidebar');
        expect(sidebar).to.not.be.null;
    });

    it('sollte Formulare, Winner-Cards und Settings-Grids mit responsiven Klassen ohne harter 4-Spalten Inline-Grids rendern', () => {
        // Formular-Templates prüfen
        import('../views/form/templates.js').then(module => {
            const html = module.generateFormHtml({});
            expect(html).to.include('form-limitation-grid');
            expect(html).to.not.include('grid-template-columns: 0.7fr 0.7fr 0.7fr 1.9fr');
        });

        // Winner-Card Template prüfen
        import('../views/randomPick/randomPickTemplates.js').then(module => {
            const winnerHtml = module.renderWinnerCard({ id: '1', titel: 'Test', nummer: 1, kaufdatum: '2026-01-01' });
            expect(winnerHtml).to.include('winner-card-grid');
            expect(winnerHtml).to.not.include('grid-template-columns: 180px 1fr');
        });

        // Settings-Template prüfen
        import('../views/settingsTemplates.js').then(module => {
            const settingsHtml = module.renderSettingsTemplate({});
            expect(settingsHtml).to.include('settings-layout-grid');
            expect(settingsHtml).to.not.include('grid-template-columns: minmax(180px, 200px) 1fr');
        });
    });
});

