import { renderCollection, cleanupCollection, updateGrid } from '../views/collection.js';
import { setupTestEnv, cleanup } from './testHelper.js';

const { expect } = chai;

describe('ComicVault Sammlungsliste - Datumsbereichs-Filter Tests', () => {
    let testEnv;
    let container;
    let mockComics = [];

    beforeEach(async () => {
        // Mock-Daten mit definierten Kauf- und Lesedaten erstellen
        mockComics = [
            {
                id: 'c1',
                titel: 'Batman #1',
                serie: 'Batman',
                verlag: 'DC',
                format: 'Softcover',
                bestand: 'vorhanden',
                preis: 12.50,
                kaufdatum: '15.01.2026',
                gelesen_am: '10.02.2026',
                typ: 'Comic'
            },
            {
                id: 'c2',
                titel: 'Spider-Man #1',
                serie: 'Spider-Man',
                verlag: 'Marvel',
                format: 'Hardcover',
                bestand: 'vorhanden',
                preis: 20.00,
                kaufdatum: '20.02.2026',
                gelesen_am: '25.02.2026',
                typ: 'Comic'
            },
            {
                id: 'c3',
                titel: 'Saga #1',
                serie: 'Saga',
                verlag: 'Image',
                format: 'Softcover',
                bestand: 'vorhanden',
                preis: 15.00,
                kaufdatum: '05.03.2026',
                gelesen_am: '', // Ungelesen
                typ: 'Graphic Novel'
            },
            {
                id: 'c4',
                titel: 'Spawn #1',
                serie: 'Spawn',
                verlag: 'Image',
                format: 'Heft',
                bestand: 'vorhanden',
                preis: 8.00,
                kaufdatum: '10.11.2025',
                gelesen_am: '12.11.2025',
                typ: 'Comic'
            }
        ];

        testEnv = setupTestEnv({
            mockComics: mockComics
        });
        
        container = testEnv.viewContainer;

        // Render collection
        await renderCollection(container);
        
        // standardmäßig die bestandsfilter leeren, um alle Comics für die Tests zu betrachten
        // (defaultVisibleFields setzt standardmäßig vorbestellt/vorhanden)
        // Aber hier setzen wir im Test den Reset oder wir setzen activeFilters.bestand = [] direkt,
        // um den Test deterministisch zu machen.
        // Das können wir auch einfach über die activeFilters steuern, die in collection.js importiert sind.
        // Da activeFilters in collection.js lokal definiert ist, können wir sie über die Reset-Funktion leeren.
        const btnReset = container.querySelector('#btn-reset-filters-direct');
        if (btnReset) {
            btnReset.click();
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
        cleanupCollection();
        cleanup();
    });

    it('sollte standardmäßig alle Mock-Comics auflisten', () => {
        const items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(4);
    });

    it('sollte nach Kaufdatum (Von-Bereich) filtern', async () => {
        // Von-Kaufdatum auf 2026-02-01 setzen -> c2 (20.02.2026) und c3 (05.03.2026) sollten übrig bleiben
        const dropdownKauf = container.querySelector('#dropdown-kaufdatum');
        expect(dropdownKauf).to.not.be.null;

        const startInput = dropdownKauf.querySelector('.date-filter-input[data-bound="Start"]');
        startInput.value = '2026-02-01';
        
        // Anwenden-Button klicken
        const btnApply = dropdownKauf.querySelector('.btn-date-filter-apply');
        btnApply.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        const items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(2);
        
        const titles = Array.from(items).map(item => item.querySelector('.list-cover').nextElementSibling.textContent);
        expect(titles).to.include('Spider-Man #1');
        expect(titles).to.include('Saga #1');
    });

    it('sollte nach Kaufdatum (Bis-Bereich) filtern', async () => {
        // Bis-Kaufdatum auf 2026-02-15 setzen -> c1 (15.01.2026) und c4 (10.11.2025) sollten übrig bleiben
        const dropdownKauf = container.querySelector('#dropdown-kaufdatum');
        const endInput = dropdownKauf.querySelector('.date-filter-input[data-bound="End"]');
        endInput.value = '2026-02-15';
        
        const btnApply = dropdownKauf.querySelector('.btn-date-filter-apply');
        btnApply.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        const items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(2);
        
        const titles = Array.from(items).map(item => item.querySelector('.list-cover').nextElementSibling.textContent);
        expect(titles).to.include('Batman #1');
        expect(titles).to.include('Spawn #1');
    });

    it('sollte nach Kaufdatum (Von-Bis-Bereich) filtern', async () => {
        // Von 2026-01-01 bis 2026-02-28 -> c1 (15.01.26) und c2 (20.02.26)
        const dropdownKauf = container.querySelector('#dropdown-kaufdatum');
        const startInput = dropdownKauf.querySelector('.date-filter-input[data-bound="Start"]');
        const endInput = dropdownKauf.querySelector('.date-filter-input[data-bound="End"]');
        
        startInput.value = '2026-01-01';
        endInput.value = '2026-02-28';
        
        const btnApply = dropdownKauf.querySelector('.btn-date-filter-apply');
        btnApply.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        const items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(2);
        
        const titles = Array.from(items).map(item => item.querySelector('.list-cover').nextElementSibling.textContent);
        expect(titles).to.include('Batman #1');
        expect(titles).to.include('Spider-Man #1');
    });

    it('sollte nach Gelesen-Datum (Von-Bis-Bereich) filtern', async () => {
        // Von 2026-02-01 bis 2026-02-28 -> c1 (gelesen 10.02.26) und c2 (gelesen 25.02.26)
        const dropdownGelesen = container.querySelector('#dropdown-gelesenDatum');
        const startInput = dropdownGelesen.querySelector('.date-filter-input[data-bound="Start"]');
        const endInput = dropdownGelesen.querySelector('.date-filter-input[data-bound="End"]');
        
        startInput.value = '2026-02-01';
        endInput.value = '2026-02-28';
        
        const btnApply = dropdownGelesen.querySelector('.btn-date-filter-apply');
        btnApply.click();

        await new Promise(resolve => setTimeout(resolve, 50));

        const items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(2);
        
        const titles = Array.from(items).map(item => item.querySelector('.list-cover').nextElementSibling.textContent);
        expect(titles).to.include('Batman #1');
        expect(titles).to.include('Spider-Man #1');
    });

    it('sollte Datumsfilter leeren können', async () => {
        // Erst filtern (Kaufdatum bis 2026-01-01 -> c4)
        const dropdownKauf = container.querySelector('#dropdown-kaufdatum');
        const endInput = dropdownKauf.querySelector('.date-filter-input[data-bound="End"]');
        endInput.value = '2026-01-01';
        
        const btnApply = dropdownKauf.querySelector('.btn-date-filter-apply');
        btnApply.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        let items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(1);
        expect(items[0].querySelector('.list-cover').nextElementSibling.textContent).to.equal('Spawn #1');

        // Jetzt leeren
        const dropdownKauf2 = container.querySelector('#dropdown-kaufdatum');
        const btnReset = dropdownKauf2.querySelector('.btn-date-filter-reset');
        btnReset.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        items = container.querySelectorAll('.list-item');
        expect(items.length).to.equal(4); // Alle wieder da
    });
});
