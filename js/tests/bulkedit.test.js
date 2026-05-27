import { renderCollection, attachCollectionEvents, isSelectModeActive, selectedComicIds, toggleSelectMode } from '../views/collection.js';
import { openBulkEditModal } from '../views/form.js';
import { setupTestEnv, cleanup } from './testHelper.js';
import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault Bulk Edit Tests', () => {
    let testEnv;
    let container;
    let mockComics = [];

    before(() => {
        // Attach event listeners
        attachCollectionEvents();
    });

    beforeEach(async () => {
        mockComics = [
            { id: '1', titel: 'Spider-Man 1', verlag: 'Marvel', serie: 'Spider-Man', preis: 4.99, limitierung: true, bewertung: 8 },
            { id: '2', titel: 'Spider-Man 2', verlag: 'Marvel', serie: 'Spider-Man', preis: 5.99, limitierung: true, bewertung: 8 },
            { id: '3', titel: 'Batman 1', verlag: 'DC', serie: 'Batman', preis: 4.99, limitierung: false, bewertung: 6 }
        ];

        testEnv = setupTestEnv({
            mockComics: mockComics
        });
        container = testEnv.viewContainer;

        selectedComicIds.clear();
        if (isSelectModeActive) {
            toggleSelectMode(); // Reset select mode
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        await renderCollection(container);
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
        cleanup();
    });

    it('sollte das Bulk-Edit-Formular mit einheitlichen Werten vorausfüllen und unterschiedliche Werte als Platzhalter anzeigen', async () => {
        // Open modal for comic 1 and 2 (both have verlag='Marvel', serie='Spider-Man', limitierung=true, bewertung=8 but different titles & prices)
        await openBulkEditModal(['1', '2']);

        const form = document.getElementById('comic-form');
        expect(form).to.not.be.null;

        // Verlag, serie, limitierung, bewertung should be identical and prefilled
        const verlagInput = form.querySelector('input[name="verlag"]');
        expect(verlagInput.value).to.equal('Marvel');
        expect(verlagInput.placeholder).to.not.equal('<verschiedene Werte>');

        const serieInput = form.querySelector('input[name="serie"]');
        expect(serieInput.value).to.equal('Spider-Man');

        const limitierungSelect = form.querySelector('select[name="limitierung"]');
        expect(limitierungSelect.value).to.equal('true');

        const bewertungInput = form.querySelector('input[name="bewertung"]');
        expect(bewertungInput.value).to.equal('8');

        // Title and price are different, so they should have <verschiedene Werte> placeholder
        const titelInput = form.querySelector('input[name="titel"]');
        expect(titelInput.value).to.equal('');
        expect(titelInput.placeholder).to.equal('<verschiedene Werte>');
        expect(titelInput.classList.contains('bulk-different-value')).to.be.true;

        const preisInput = form.querySelector('input[name="preis"]');
        expect(preisInput.value).to.equal('');
        expect(preisInput.placeholder).to.equal('<verschiedene Werte>');
    });

    it('sollte Änderungen an Feldern über Dirty-Tracking erfassen', async () => {
        // Open bulk edit modal
        const allComics = await db.getAllComics();
        
        // Wait for modal DOM render
        await openBulkEditModal(['1', '2']);

        const form = document.getElementById('comic-form');
        const verlagInput = form.querySelector('input[name="verlag"]');
        const priceInput = form.querySelector('input[name="preis"]');

        // Simulating changes triggers input/change listeners
        verlagInput.value = 'Marvel Comics';
        verlagInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Simulate typing in price
        priceInput.value = '6.99';
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait for handlers
        await new Promise(resolve => setTimeout(resolve, 10));

        // In form.js we have internal Set dirtyFields which gets populated. 
        // We will indirect test this through the save logic which submits these fields
    });

    it('sollte nur die veränderten Felder (dirty fields) in der Datenbank aktualisieren und unberührte Felder ignorieren', async () => {
        await openBulkEditModal(['1', '2']);

        const form = document.getElementById('comic-form');
        const verlagInput = form.querySelector('input[name="verlag"]');

        // Only change verlag, leave title and price different and untouched
        verlagInput.value = 'Vertigo';
        verlagInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Click save
        const btnSave = document.getElementById('btn-save-comic');
        expect(btnSave).to.not.be.null;

        btnSave.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Verify update database call
        const call = testEnv.getLastUpdateComicsCall();
        expect(call).to.not.be.null;
        expect(call.ids).to.have.members(['1', '2']);
        
        // Updates object should ONLY contain 'verlag', not title, price, etc.
        expect(call.updates).to.deep.equal({
            verlag: 'Vertigo'
        });
    });
});
