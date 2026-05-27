import { renderWishlist } from '../views/wishlist.js';
import { setupTestEnv, cleanup } from './testHelper.js';

const { expect } = chai;

describe('ComicVault Wishlist Feature & Transfer Tests', () => {
    let testEnv;
    let container;
    let mockWishes = [];
    let savedComics = [];

    beforeEach(async () => {
        mockWishes = [
            { id: 'w1', titel: 'Batman: The Long Halloween', typ: 'Comic', format: 'Hardcover', preis: 25.00, jahr: 2011, vorbestellt: false, bemerkung: 'Notiz w1' },
            { id: 'w2', titel: 'Spider-Man Blue', typ: 'Comic', format: 'Softcover', preis: 19.99, jahr: 2015, vorbestellt: true, bemerkung: 'Notiz w2' },
            { id: 'w3', titel: 'Saga Vol 1', typ: 'Graphic Novel', format: 'Softcover', preis: 9.99, jahr: 2012, vorbestellt: false, bemerkung: 'Notiz w3' }
        ];
        savedComics = [];

        testEnv = setupTestEnv({
            mockWishes: mockWishes,
            mockComics: savedComics
        });
        
        container = testEnv.viewContainer;

        // Render wishlist
        await renderWishlist(container);
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
        cleanup();
    });

    it('sollte die Wunschliste rendern und die Statistiken anzeigen', () => {
        const totalItems = container.querySelector('#stat-total-items');
        const totalBudget = container.querySelector('#stat-total-budget');
        const totalPreorders = container.querySelector('#stat-total-preorders');

        expect(totalItems.textContent).to.equal('3');
        // Budget: 25.00 + 19.99 + 9.99 = 54.98
        expect(totalBudget.textContent).to.contain('54.98');
        expect(totalPreorders.textContent).to.equal('1');

        const rows = container.querySelectorAll('.wishlist-row');
        expect(rows.length).to.equal(3);
    });

    it('sollte nach Titeln filtern, wenn Text in die Suche eingegeben wird', async () => {
        const searchInput = container.querySelector('#wishlist-search');
        expect(searchInput).to.not.be.null;

        searchInput.value = 'Spider';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        const rows = container.querySelectorAll('.wishlist-row');
        expect(rows.length).to.equal(1);
        expect(rows[0].querySelector('.wish-title-cell').textContent).to.equal('Spider-Man Blue');
    });

    it('sollte die Wünsche sortieren, wenn auf eine Tabellenüberschrift geklickt wird', async () => {
        // Zuerst nach Preis sortieren (Standard ist asc)
        const priceHeader = container.querySelector('.sortable-wish-header[data-sort="preis"]');
        expect(priceHeader).to.not.be.null;

        // Klick 1: Sortiert aufsteigend (9.99 -> 19.99 -> 25.00)
        priceHeader.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        let rows = container.querySelectorAll('.wishlist-row');
        expect(rows[0].querySelector('.wish-title-cell').textContent).to.equal('Saga Vol 1');
        expect(rows[2].querySelector('.wish-title-cell').textContent).to.equal('Batman: The Long Halloween');

        // Klick 2: Sortiert absteigend (25.00 -> 19.99 -> 9.99)
        priceHeader.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        rows = container.querySelectorAll('.wishlist-row');
        expect(rows[0].querySelector('.wish-title-cell').textContent).to.equal('Batman: The Long Halloween');
        expect(rows[2].querySelector('.wish-title-cell').textContent).to.equal('Saga Vol 1');
    });

    it('sollte das Modal zum Verschieben in die Sammlung mit vorausgefüllten Daten (ohne Bemerkung) öffnen', async () => {
        const transferBtns = container.querySelectorAll('.btn-transfer-wish');
        expect(transferBtns.length).to.equal(3);

        // Ersten Wunsch transferieren (Batman: The Long Halloween, ID = w1)
        transferBtns[0].click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Überprüfen, ob das Modal geöffnet wurde
        const modal = document.getElementById('comic-modal');
        expect(modal.style.display).to.equal('flex');

        const modalTitle = document.getElementById('modal-title');
        expect(modalTitle.textContent).to.equal('Aus Wunschliste in Sammlung verschieben');

        // Formularfelder auslesen
        const form = document.getElementById('comic-form');
        const titelInput = form.querySelector('input[name="titel"]');
        const formatInput = form.querySelector('input[name="format"]');
        const preisInput = form.querySelector('input[name="preis"]');
        const jahrInput = form.querySelector('input[name="jahr"]');
        const bemerkungTextarea = form.querySelector('textarea[name="bemerkung"]');

        expect(titelInput.value).to.equal('Batman: The Long Halloween');
        expect(formatInput.value).to.equal('Hardcover');
        expect(preisInput.value).to.equal('25');
        expect(jahrInput.value).to.equal('2011');
        
        // Das Bemerkungsfeld muss verworfen/leer sein!
        expect(bemerkungTextarea.value).to.equal('');
    });

    it('sollte beim Speichern der Übernahme das Comic in die Sammlung speichern und den Wunsch löschen', async () => {
        const transferBtns = container.querySelectorAll('.btn-transfer-wish');
        transferBtns[0].click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Formular abspeichern durch Klick auf Save Button
        const btnSave = document.getElementById('btn-save-comic');
        btnSave.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Das Comic sollte in die Sammlung gespeichert worden sein
        expect(savedComics.length).to.equal(1);
        expect(savedComics[0].titel).to.equal('Batman: The Long Halloween');
        expect(savedComics[0].format).to.equal('Hardcover');

        // Der Wunsch sollte aus der Wunschliste gelöscht worden sein (ID w1 ist weg)
        expect(mockWishes.find(w => w.id === 'w1')).to.be.undefined;
        expect(mockWishes.length).to.equal(2);
    });

    it('sollte Bulk-Aktionen anzeigen und Mehrfachlöschung ausführen', async () => {
        const rows = container.querySelectorAll('.wishlist-row');
        
        // Wähle w1 und w3 aus
        const cb1 = rows[0].querySelector('.wish-item-checkbox');
        const cb3 = rows[2].querySelector('.wish-item-checkbox');

        cb1.checked = true;
        cb1.dispatchEvent(new Event('change', { bubbles: true }));
        cb3.checked = true;
        cb3.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Überprüfen, ob das Bulk Bar sichtbar ist
        const bulkBar = document.getElementById('wishlist-bulk-bar');
        expect(bulkBar.style.display).to.equal('flex');

        const bulkCount = document.getElementById('wishlist-bulk-count');
        expect(bulkCount.textContent).to.equal('2 ausgewählt');

        // Klick auf bulk-delete stubben/auslösen
        const originalConfirm = window.confirm;
        window.confirm = () => true; // Bestätigen

        const btnDelete = document.getElementById('btn-wishlist-bulk-delete');
        btnDelete.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        // Wiederherstellen
        window.confirm = originalConfirm;

        // Wünsche w1 und w3 sollten gelöscht sein
        expect(mockWishes.length).to.equal(1);
        expect(mockWishes[0].id).to.equal('w2');
        expect(bulkBar.classList.contains('show')).to.be.false;
    });

    it('sollte per Bulk-Aktion den Status auf Vorbestellt und Geplant ändern können', async () => {
        const rows = container.querySelectorAll('.wishlist-row');
        
        // w1 und w3 auswählen (beide sind vorbestellt: false)
        const cb1 = rows[0].querySelector('.wish-item-checkbox');
        const cb3 = rows[2].querySelector('.wish-item-checkbox');

        cb1.checked = true;
        cb1.dispatchEvent(new Event('change', { bubbles: true }));
        cb3.checked = true;
        cb3.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Klick auf "Vorbestellt"
        const btnPreorder = document.getElementById('btn-wishlist-bulk-preorder');
        btnPreorder.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Nun sollten alle ausgewählten vorbestellt = true sein
        expect(mockWishes.find(w => w.id === 'w1').vorbestellt).to.be.true;
        expect(mockWishes.find(w => w.id === 'w3').vorbestellt).to.be.true;

        // w2 und w3 auswählen
        const rows2 = container.querySelectorAll('.wishlist-row');
        const cb2 = rows2[1].querySelector('.wish-item-checkbox');
        const cb3_new = rows2[2].querySelector('.wish-item-checkbox');

        cb2.checked = true;
        cb2.dispatchEvent(new Event('change', { bubbles: true }));
        cb3_new.checked = true;
        cb3_new.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Klick auf "Geplant"
        const btnPlan = document.getElementById('btn-wishlist-bulk-plan');
        btnPlan.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockWishes.find(w => w.id === 'w2').vorbestellt).to.be.false;
        expect(mockWishes.find(w => w.id === 'w3').vorbestellt).to.be.false;
    });

    it('sollte per Bulk-Aktion mehrere Wünsche direkt in die Sammlung übertragen', async () => {
        const rows = container.querySelectorAll('.wishlist-row');
        
        // w1 und w2 auswählen
        const cb1 = rows[0].querySelector('.wish-item-checkbox');
        const cb2 = rows[1].querySelector('.wish-item-checkbox');

        cb1.checked = true;
        cb1.dispatchEvent(new Event('change', { bubbles: true }));
        cb2.checked = true;
        cb2.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Bulk-Transfer auslösen
        const originalConfirm = window.confirm;
        window.confirm = () => true; // Bestätigen

        const btnTransfer = document.getElementById('btn-wishlist-bulk-transfer');
        btnTransfer.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        window.confirm = originalConfirm;

        // Comics sollten in der Sammlung sein
        expect(savedComics.length).to.equal(2);
        expect(savedComics[0].titel).to.equal('Batman: The Long Halloween');
        expect(savedComics[0].bestand).to.equal('vorhanden');
        expect(savedComics[1].titel).to.equal('Spider-Man Blue');
        expect(savedComics[1].bestand).to.equal('vorhanden');

        // Wünsche sollten gelöscht sein
        expect(mockWishes.length).to.equal(1);
        expect(mockWishes[0].id).to.equal('w3');
    });
});
