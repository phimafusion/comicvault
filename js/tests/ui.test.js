import { renderCollection, attachCollectionEvents } from '../views/collection.js';
import { db } from '../db.js';

const { expect } = chai;

describe('ComicVault UI Integration Tests (Collection View)', () => {
    let container;
    let originalGetAllComics;

    before(() => {
        // Event-Listener der Collection-View anbinden
        attachCollectionEvents();

        // Backup der originalen DB-Methode
        originalGetAllComics = db.getAllComics;

        // Mock-Daten für Comics bereitstellen
        db.getAllComics = async () => {
            return [
                { 
                    id: '1', 
                    titel: 'Spider-Man Classic 1', 
                    serie: 'Spider-Man', 
                    verlag: 'Marvel', 
                    bestand: 'vorhanden', 
                    gelesen_am: '2023-05-19', 
                    bewertung: 10, 
                    preis: 5.99,
                    format: 'Heft',
                    bezugsquelle: 'Comicladen'
                },
                { 
                    id: '2', 
                    titel: 'Batman Year One', 
                    serie: 'Batman', 
                    verlag: 'DC', 
                    bestand: 'vorhanden', 
                    gelesen_am: '', 
                    bewertung: 8, 
                    preis: 12.50,
                    format: 'Hardcover',
                    bezugsquelle: 'Online'
                },
                { 
                    id: '3', 
                    titel: 'Superman Rebirth 5', 
                    serie: 'Superman', 
                    verlag: 'DC', 
                    bestand: 'vorbestellt', 
                    gelesen_am: '2023-05-20', 
                    bewertung: 0, 
                    preis: 9.99,
                    format: 'Softcover',
                    bezugsquelle: 'Comicladen'
                }
            ];
        };

        // Test-Container erstellen und in den DOM einhängen
        container = document.createElement('div');
        container.id = 'view-container';
        document.body.appendChild(container);
    });

    after(() => {
        // Mock wiederherstellen
        db.getAllComics = originalGetAllComics;
        // Test-Container entfernen
        if (container) {
            container.remove();
        }
    });

    afterEach(() => {
        // Filter nach jedem Test zurücksetzen durch Klicken des Reset-Buttons
        const resetBtn = container.querySelector('#btn-reset-filters-direct');
        if (resetBtn) {
            resetBtn.click();
        }
    });

    it('sollte die Collection-View rendern und alle Comics anzeigen', async () => {
        await renderCollection(container);
        
        const grid = container.querySelector('#collection-grid');
        expect(grid).to.not.be.null;

        const html = grid.innerHTML;
        expect(html).to.contain('Spider-Man Classic 1');
        expect(html).to.contain('Batman Year One');
        expect(html).to.contain('Superman Rebirth 5');
    });

    it('sollte nach Verlag filtern, wenn die Checkbox aktiviert wird', async () => {
        await renderCollection(container);

        // Finden des Verlags-Dropdowns und der Checkbox
        const checkbox = container.querySelector('.filter-checkbox[data-key="verlag"][value="Marvel"]');
        expect(checkbox).to.not.be.null;

        // Checkbox aktivieren und Change-Event auslösen
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        // Kurz warten, bis der asynchrone DOM-Update-Schritt (updateGrid) ausgeführt wurde
        await new Promise(resolve => setTimeout(resolve, 50));

        const grid = container.querySelector('#collection-grid');
        const html = grid.innerHTML;

        // Marvel Comic muss da sein, DC Comics müssen ausgeblendet sein
        expect(html).to.contain('Spider-Man Classic 1');
        expect(html).to.not.contain('Batman Year One');
        expect(html).to.not.contain('Superman Rebirth 5');
    });

    it('sollte den Zähler für gefilterte Comics korrekt aktualisieren', async () => {
        await renderCollection(container);

        const countEl = container.querySelector('#filter-count');
        expect(countEl).to.not.be.null;

        // Anfangs: 3 von 3 Comics sichtbar
        expect(countEl.textContent).to.equal('3 / 3');

        // Filter anwenden (nur Marvel)
        const checkbox = container.querySelector('.filter-checkbox[data-key="verlag"][value="Marvel"]');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(resolve => setTimeout(resolve, 50));

        // Nach Filter: 1 von 3 Comics sichtbar
        expect(countEl.textContent).to.equal('1 / 3');
    });

    it('sollte data-col Attribute für Spalten in der Listenansicht rendern', async () => {
        await renderCollection(container);
        
        // Listenansicht aktivieren (falls nicht aktiv)
        const listToggle = container.querySelector('.view-toggle-btn[data-type="list"]');
        if (listToggle) {
            listToggle.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const titleCells = Array.from(container.querySelectorAll('[data-col="titel"]'));
        expect(titleCells.length).to.equal(3);
        const titles = titleCells.map(c => c.textContent);
        expect(titles.some(t => t.includes('Spider-Man Classic 1'))).to.be.true;
    });

    it('sollte Spaltenbreite automatisch anpassen, wenn Doppelklick auf Resizer ausgelöst wird', async () => {
        await renderCollection(container);
        
        // Listenansicht aktivieren
        const listToggle = container.querySelector('.view-toggle-btn[data-type="list"]');
        if (listToggle) {
            listToggle.click();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const verlagResizer = container.querySelector('.col-resizer[data-key="verlag"]');
        expect(verlagResizer).to.not.be.null;

        // Doppelklick simulieren
        verlagResizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

        // Prüfen, ob die Breite im localStorage und im Style gesetzt wurde
        const visibleFields = JSON.parse(localStorage.getItem('comicvault_visible_fields') || '{}');
        expect(visibleFields.columnWidths).to.not.be.undefined;
        expect(visibleFields.columnWidths.verlag).to.not.be.undefined;
        expect(visibleFields.columnWidths.verlag).to.contain('px');

        const grid = container.querySelector('#collection-grid');
        expect(grid.style.getPropertyValue('--col-width-verlag')).to.equal(visibleFields.columnWidths.verlag);
    });
});
